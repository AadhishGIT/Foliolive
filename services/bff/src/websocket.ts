import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'node:url';
import {
  WebSocketClientMessageSchema,
  type WebSocketClientMessage,
  type WebSocketServerMessage,
  type MarketTick,
  type LivePortfolioUpdate,
  type PortfolioRiskSummary,
  type AlertNotification,
} from '@foliolive/shared-types';
import { authService, type TokenPayload } from './auth';
import type { MarketSimulator } from './simulator';
import type { RealtimeEngine } from './realtime-engine';
import { config } from './config';
import { logger } from './logger';
import {
  wsConnectionsGauge,
  wsMessagesSentCounter,
  wsMessagesReceivedCounter,
  backpressureDropsCounter,
} from './metrics';

export interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  connectionId: string;
  correlationId: string;
  user: TokenPayload;
  subscribedTopics: Set<string>;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private simulator: MarketSimulator;
  private realtimeEngine: RealtimeEngine;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchInterval: NodeJS.Timeout | null = null;

  // Coalescing buffers for the current 100ms batch window
  private pendingTicks: Map<string, MarketTick> = new Map();
  private pendingPortfolioUpdates: Map<string, LivePortfolioUpdate> = new Map();
  private pendingRiskUpdates: Map<string, PortfolioRiskSummary> = new Map();
  private pendingAlerts: AlertNotification[] = [];
  private pendingClearedAlerts: Array<{
    alertId: string;
    portfolioId: string;
    clearedAt: string;
    currentValue: number;
    thresholdValue: number;
  }> = [];

  constructor(server: HttpServer, simulator: MarketSimulator, realtimeEngine: RealtimeEngine) {
    this.simulator = simulator;
    this.realtimeEngine = realtimeEngine;

    this.wss = new WebSocketServer({
      noServer: true,
      path: '/ws',
    });

    this.setupUpgradeHandling(server);
    this.setupConnectionHandling();
    this.setupSimulatorHooks();
    this.setupHeartbeat();
    this.setupBatchCoalescer();
  }

  private setupUpgradeHandling(server: HttpServer): void {
    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const { pathname, query } = parseUrl(request.url || '', true);

      if (pathname !== '/ws') {
        socket.destroy();
        return;
      }

      // 1. Authenticate via token query param or Bearer header
      let token: string | undefined = undefined;

      if (query.token && typeof query.token === 'string') {
        token = query.token;
      } else if (request.headers.authorization?.startsWith('Bearer ')) {
        token = request.headers.authorization.substring(7);
      }

      if (!token) {
        logger.warn('WebSocket connection rejected: Missing auth token');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const user = authService.verifyAccessToken(token);
      if (!user) {
        logger.warn('WebSocket connection rejected: Invalid or expired token');
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // Upgrade connection
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as AuthenticatedWebSocket;
        const corrId =
          (request.headers['x-correlation-id'] as string) ||
          (query.correlationId as string) ||
          `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        client.isAlive = true;
        client.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        client.correlationId = corrId;
        client.user = user;
        client.subscribedTopics = new Set<string>();

        this.wss.emit('connection', client, request);
      });
    });
  }

  private setupConnectionHandling(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as AuthenticatedWebSocket;
      wsConnectionsGauge.inc();

      logger.info(
        {
          connectionId: client.connectionId,
          correlationId: client.correlationId,
          user: client.user.sub,
          role: client.user.role,
        },
        'Authenticated WebSocket client connected'
      );

      // Default subscriptions for quick start
      client.subscribedTopics.add('prices');
      client.subscribedTopics.add('alerts');
      client.subscribedTopics.add('portfolio:port_global_alpha_01');
      client.subscribedTopics.add('risk:port_global_alpha_01');

      // Send CONNECTED handshake message
      const connectedMessage: WebSocketServerMessage = {
        type: 'CONNECTED',
        payload: {
          connectionId: client.connectionId,
          serverTime: new Date().toISOString(),
          authenticatedUser: client.user.sub,
          role: client.user.role,
        },
      };
      this.sendToClient(client, connectedMessage);

      // Pong heartbeat tracking
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle incoming client messages
      client.on('message', (data: string | Buffer) => {
        this.handleClientMessage(client, data);
      });

      client.on('close', (code, reason) => {
        wsConnectionsGauge.dec();
        logger.info(
          {
            connectionId: client.connectionId,
            user: client.user.sub,
            code,
            reason: reason.toString(),
          },
          'WebSocket client disconnected'
        );
      });

      client.on('error', (err) => {
        logger.error(
          { connectionId: client.connectionId, err: err.message },
          'WebSocket client error'
        );
      });
    });
  }

  private handleClientMessage(client: AuthenticatedWebSocket, rawData: string | Buffer): void {
    try {
      const text = rawData.toString();
      const json = JSON.parse(text);

      // Validate schema with Zod
      const parseResult = WebSocketClientMessageSchema.safeParse(json);
      if (!parseResult.success) {
        this.sendToClient(client, {
          type: 'ERROR',
          payload: {
            code: 'INVALID_MESSAGE_SCHEMA',
            message: 'Incoming message does not match WebSocketClientMessage schema',
          },
        });
        return;
      }

      const message: WebSocketClientMessage = parseResult.data;
      wsMessagesReceivedCounter.inc({ type: message.type });

      switch (message.type) {
        case 'SUBSCRIBE': {
          if (message.topics && Array.isArray(message.topics)) {
            for (const topic of message.topics) {
              client.subscribedTopics.add(topic);
            }
          }
          if (message.payload?.topic) {
            client.subscribedTopics.add(message.payload.topic);
          }
          logger.debug(
            { connectionId: client.connectionId, topics: Array.from(client.subscribedTopics) },
            'Topics subscribed'
          );
          break;
        }

        case 'UNSUBSCRIBE': {
          if (message.topics && Array.isArray(message.topics)) {
            for (const topic of message.topics) {
              client.subscribedTopics.delete(topic);
            }
          }
          if (message.payload?.topic) {
            client.subscribedTopics.delete(message.payload.topic);
          }
          break;
        }

        case 'SUBSCRIBE_PORTFOLIO': {
          const portId = message.payload?.portfolioId || 'port_global_alpha_01';
          client.subscribedTopics.add(`portfolio:${portId}`);
          client.subscribedTopics.add(`risk:${portId}`);
          break;
        }

        case 'UNSUBSCRIBE_PORTFOLIO': {
          const portId = message.payload?.portfolioId || 'port_global_alpha_01';
          client.subscribedTopics.delete(`portfolio:${portId}`);
          client.subscribedTopics.delete(`risk:${portId}`);
          break;
        }

        case 'SUBSCRIBE_MARKET': {
          client.subscribedTopics.add('prices');
          break;
        }

        case 'UNSUBSCRIBE_MARKET': {
          client.subscribedTopics.delete('prices');
          break;
        }

        case 'PING': {
          this.sendToClient(client, {
            type: 'PONG',
            payload: { timestamp: Date.now() },
          });
          break;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { connectionId: client.connectionId, err: msg },
        'Failed to parse client message'
      );
      this.sendToClient(client, {
        type: 'ERROR',
        payload: { code: 'PARSE_ERROR', message: 'Malformed JSON payload' },
      });
    }
  }

  private setupSimulatorHooks(): void {
    // When simulator produces ticks, buffer them and evaluate realtime portfolio risk
    this.simulator.onTick((tick: MarketTick) => {
      this.pendingTicks.set(tick.symbol, tick);
    });

    this.simulator.onBatch((_ticks: MarketTick[]) => {
      // Re-evaluate portfolio valuations and risk limits
      const evaluation = this.realtimeEngine.evaluateAll();

      for (const update of evaluation.liveUpdates) {
        this.pendingPortfolioUpdates.set(update.portfolioId, update);
      }

      for (const risk of evaluation.riskUpdates) {
        this.pendingRiskUpdates.set(risk.portfolioId, risk);
      }

      if (evaluation.firedAlerts.length > 0) {
        this.pendingAlerts.push(...evaluation.firedAlerts);
      }

      if (evaluation.clearedAlerts.length > 0) {
        this.pendingClearedAlerts.push(...evaluation.clearedAlerts);
      }
    });

    this.realtimeEngine.onAlertFired((alert: AlertNotification) => {
      this.pendingAlerts.push(alert);
    });

    this.realtimeEngine.onAlertCleared((cleared) => {
      this.pendingClearedAlerts.push(cleared);
    });
  }

  /**
   * Batch Coalescer Loop: Every 100ms, coalesce buffered updates and broadcast
   * a single batched frame to all subscribed clients.
   */
  private setupBatchCoalescer(): void {
    this.batchInterval = setInterval(() => {
      this.flushBatch();
    }, config.simulator.batchIntervalMs);
  }

  public flushBatch(): void {
    if (
      this.pendingTicks.size === 0 &&
      this.pendingPortfolioUpdates.size === 0 &&
      this.pendingRiskUpdates.size === 0 &&
      this.pendingAlerts.length === 0 &&
      this.pendingClearedAlerts.length === 0
    ) {
      return;
    }

    const ticks = Array.from(this.pendingTicks.values());
    const portfolioUpdates = Array.from(this.pendingPortfolioUpdates.values());
    const riskUpdates = Array.from(this.pendingRiskUpdates.values());
    const alerts = [...this.pendingAlerts];
    const clearedAlerts = [...this.pendingClearedAlerts];

    // Clear buffer for next window
    this.pendingTicks.clear();
    this.pendingPortfolioUpdates.clear();
    this.pendingRiskUpdates.clear();
    this.pendingAlerts = [];
    this.pendingClearedAlerts = [];

    const nowIso = new Date().toISOString();

    for (const ws of this.wss.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const client = ws as AuthenticatedWebSocket;

      // Filter batch content based on client topic subscriptions
      const clientTicks = client.subscribedTopics.has('prices') ? ticks : [];

      const clientPortfolioUpdates = portfolioUpdates.filter(
        (p) =>
          client.subscribedTopics.has(`portfolio:${p.portfolioId}`) ||
          client.subscribedTopics.has('portfolio:*')
      );

      const clientRiskUpdates = riskUpdates.filter(
        (r) =>
          client.subscribedTopics.has(`risk:${r.portfolioId}`) ||
          client.subscribedTopics.has('risk:*')
      );

      const clientAlerts = client.subscribedTopics.has('alerts') ? alerts : [];
      const clientCleared = client.subscribedTopics.has('alerts') ? clearedAlerts : [];

      // Only send if there is data relevant to this client
      if (
        clientTicks.length === 0 &&
        clientPortfolioUpdates.length === 0 &&
        clientRiskUpdates.length === 0 &&
        clientAlerts.length === 0 &&
        clientCleared.length === 0
      ) {
        continue;
      }

      const batchMessage: WebSocketServerMessage = {
        type: 'BATCH',
        payload: {
          batchIntervalMs: config.simulator.batchIntervalMs,
          ticks: clientTicks,
          portfolioUpdates: clientPortfolioUpdates,
          riskUpdates: clientRiskUpdates,
          alerts: clientAlerts,
          clearedAlerts: clientCleared,
          timestamp: nowIso,
        },
      };

      this.sendToClient(client, batchMessage);
    }
  }

  /**
   * Sends a typed message to a client with backpressure protection.
   */
  public sendToClient(client: AuthenticatedWebSocket, message: WebSocketServerMessage): boolean {
    if (client.readyState !== WebSocket.OPEN) return false;

    // Backpressure check: if client buffer > 1MB, drop frame to protect process memory
    if (client.bufferedAmount > config.websocket.maxBackpressureBytes) {
      backpressureDropsCounter.inc();
      logger.warn(
        { connectionId: client.connectionId, bufferedAmount: client.bufferedAmount },
        'WebSocket backpressure threshold exceeded; dropping frame'
      );
      return false;
    }

    const payload = JSON.stringify(message);
    client.send(payload);
    wsMessagesSentCounter.inc({ type: message.type });
    return true;
  }

  /**
   * Broadcasts a direct server message to all subscribed clients.
   */
  public broadcast(message: WebSocketServerMessage): void {
    for (const ws of this.wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws as AuthenticatedWebSocket, message);
      }
    }
  }

  /**
   * Heartbeat ping-pong to detect stale / dead connections.
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const ws of this.wss.clients) {
        const client = ws as AuthenticatedWebSocket;
        if (!client.isAlive) {
          logger.info(
            { connectionId: client.connectionId },
            'Terminating stale WebSocket connection (missed ping)'
          );
          client.terminate();
          continue;
        }

        client.isAlive = false;
        client.ping();
      }
    }, config.websocket.heartbeatIntervalMs);
  }

  public getConnectedClientsCount(): number {
    return this.wss.clients.size;
  }

  public close(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.batchInterval) clearInterval(this.batchInterval);
    this.wss.close();
  }
}
