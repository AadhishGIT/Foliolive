import http from 'node:http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { httpLogger, logger } from './logger';
import { metricsRegistry } from './metrics';
import { MarketSimulator } from './simulator';
import { RealtimeEngine } from './realtime-engine';
import { WebSocketGateway } from './websocket';
import { createAuthRouter } from './routes/auth.routes';
import { createApiRouter } from './routes/api.routes';

export interface BffServerInstance {
  app: express.Application;
  server: http.Server;
  simulator: MarketSimulator;
  realtimeEngine: RealtimeEngine;
  wsGateway: WebSocketGateway;
  start: (port?: number) => Promise<http.Server>;
  stop: () => Promise<void>;
}

export function createBffServer(options?: {
  seed?: number;
  defaultIntervalMs?: number;
}): BffServerInstance {
  const app = express();
  const server = http.createServer(app);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: config.isDev ? false : undefined,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS allowlist configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In dev, allow localhost on any port
        if (config.isDev && /^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Cookie parser for httpOnly refresh tokens
  app.use(cookieParser());

  // JSON request body parser
  app.use(express.json());

  // HTTP structured logging
  app.use(httpLogger);

  // Prometheus /metrics endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
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

  // Instantiate Simulator and Realtime Engine
  const simulator = new MarketSimulator(
    options?.seed ?? config.simulator.defaultSeed,
    options?.defaultIntervalMs ?? config.simulator.defaultTickIntervalMs
  );
  const realtimeEngine = new RealtimeEngine(simulator);

  // Instantiate WebSocket Gateway
  const wsGateway = new WebSocketGateway(server, simulator, realtimeEngine);

  // Mount Auth routes: /auth/login, /auth/refresh, /auth/logout, /auth/me, /auth/demo-users
  app.use('/auth', createAuthRouter());

  // Mount Aggregation & Simulator API routes: /api/portfolio-overview, /api/market-overview, etc.
  app.use('/api', createApiRouter(simulator, realtimeEngine));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    logger.error({ err: err.message, stack: err.stack }, 'Unhandled error in BFF');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.isDev ? err.message : 'Internal Server Error',
      },
      timestamp: new Date().toISOString(),
    });
  });

  const start = (port = config.port): Promise<http.Server> => {
    return new Promise((resolve) => {
      server.listen(port, config.host, () => {
        logger.info(
          { port, host: config.host },
          `Foliolive BFF & WebSocket Server listening on http://${config.host}:${port}`
        );
        simulator.start();
        resolve(server);
      });
    });
  };

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      simulator.stop();
      wsGateway.close();
      server.close(() => {
        logger.info('Foliolive BFF server stopped');
        resolve();
      });
    });
  };

  return {
    app,
    server,
    simulator,
    realtimeEngine,
    wsGateway,
    start,
    stop,
  };
}
