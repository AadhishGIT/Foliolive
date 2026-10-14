import http from 'node:http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer, WebSocket } from 'ws';
import client from 'prom-client';
import { MarketSimulator } from './simulator';
import type { WebSocketClientMessage, WebSocketServerMessage, User } from '@foliolive/shared-types';

// Prometheus setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'foliolive_bff_' });

const wsConnectionsGauge = new client.Gauge({
  name: 'foliolive_bff_active_websocket_connections',
  help: 'Number of active WebSocket connections',
});

const ticksBroadcastCounter = new client.Counter({
  name: 'foliolive_bff_market_ticks_broadcast_total',
  help: 'Total number of market ticks broadcast to clients',
});

export interface ServerInstance {
  server: http.Server;
  wss: WebSocketServer;
  tickInterval: ReturnType<typeof setInterval>;
}

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'foliolive-bff',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Auth mock for Phase 0 / local dev
  app.post('/api/v1/auth/login', (req: Request, res: Response) => {
    const { username = 'pm_demo' } = req.body;
    const user: User = {
      id: 'usr_01',
      username,
      email: `${username}@foliolive.internal`,
      fullName: 'Institutional Portfolio Manager',
      role: 'PORTFOLIO_MANAGER',
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        token: 'mock-jwt-token-for-dev',
        expiresIn: 86400,
        user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Portfolio summary mock for Phase 0
  app.get('/api/v1/portfolio/summary', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        id: 'port_global_alpha_01',
        name: 'Global Multi-Asset Alpha Fund',
        description: 'Flagship institutional long-biased alpha strategy',
        currency: 'USD',
        totalValue: 125430800.5,
        cashBalance: 8420000.0,
        totalUnrealizedPnL: 14210350.2,
        totalRealizedPnL: 3820400.0,
        dailyPnL: 482150.8,
        dailyPnLPercent: 0.38,
        holdingsCount: 10,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

export function startServer(port = 4000, seed = 42): ServerInstance {
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const simulator = new MarketSimulator(seed);

  const activeClients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    activeClients.add(ws);
    wsConnectionsGauge.inc();

    const welcomeMsg: WebSocketServerMessage = {
      type: 'CONNECTED',
      payload: {
        connectionId: Math.random().toString(36).substring(2, 10),
        serverTime: new Date().toISOString(),
      },
    };
    ws.send(JSON.stringify(welcomeMsg));

    ws.on('message', (data: string) => {
      try {
        const clientMsg: WebSocketClientMessage = JSON.parse(data.toString());
        if (clientMsg.type === 'PING') {
          const pong: WebSocketServerMessage = {
            type: 'PONG',
            payload: { timestamp: Date.now() },
          };
          ws.send(JSON.stringify(pong));
        }
      } catch {
        // Ignore
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
      wsConnectionsGauge.dec();
    });
  });

  // Broadcast market tick periodically
  const tickInterval = setInterval(() => {
    if (activeClients.size === 0) return;

    const tick = simulator.generateTick();
    const tickMsg: WebSocketServerMessage = {
      type: 'TICK',
      payload: tick,
    };
    const serialized = JSON.stringify(tickMsg);

    for (const client of activeClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
    ticksBroadcastCounter.inc();
  }, 1000);

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.info(`[BFF] Realtime Gateway listening on port ${port} (HTTP & WS)`);
  });

  return { server, wss, tickInterval };
}
