import type {
  WebSocketClientMessage,
  WebSocketServerMessage,
  MarketTick,
  PortfolioRiskSummary,
  AlertNotification,
  PortfolioUpdateServerMessage,
  AlertClearedServerMessage,
  LivePortfolioUpdate,
  BatchUpdatePayload,
} from '@foliolive/shared-types';

export type PortfolioUpdatePayload = PortfolioUpdateServerMessage['payload'];
export type AlertClearedPayload = AlertClearedServerMessage['payload'];

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface RealtimeClientOptions {
  url: string;
  token?: string;
  heartbeatIntervalMs?: number;
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export type RealtimeEventHandler<T> = (data: T) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedPortfolios = new Set<string>();
  private subscribedSymbols = new Set<string>();

  private tickListeners = new Set<RealtimeEventHandler<MarketTick>>();
  private portfolioListeners = new Set<RealtimeEventHandler<PortfolioUpdatePayload>>();
  private livePortfolioListeners = new Set<RealtimeEventHandler<LivePortfolioUpdate>>();
  private riskListeners = new Set<RealtimeEventHandler<PortfolioRiskSummary>>();
  private alertListeners = new Set<RealtimeEventHandler<AlertNotification>>();
  private alertClearedListeners = new Set<RealtimeEventHandler<AlertClearedPayload>>();
  private batchListeners = new Set<RealtimeEventHandler<BatchUpdatePayload>>();
  private statusListeners = new Set<RealtimeEventHandler<ConnectionStatus>>();

  private readonly url: string;
  private readonly token?: string;
  private readonly heartbeatIntervalMs: number;
  private readonly initialReconnectDelayMs: number;
  private readonly maxReconnectDelayMs: number;
  private readonly maxReconnectAttempts: number;

  constructor(options: RealtimeClientOptions) {
    this.url = options.url;
    this.token = options.token;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15000;
    this.initialReconnectDelayMs = options.initialReconnectDelayMs ?? 2500;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 15000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 3;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public connect(): void {
    if (this.ws && (this.status === 'CONNECTED' || this.status === 'CONNECTING')) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    const authUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;

    try {
      this.ws = new WebSocket(authUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.resubscribeAll();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data as string);
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public subscribePortfolio(portfolioId: string): void {
    this.subscribedPortfolios.add(portfolioId);
    this.send({
      type: 'SUBSCRIBE_PORTFOLIO',
      payload: { portfolioId },
    });
  }

  public unsubscribePortfolio(portfolioId: string): void {
    this.subscribedPortfolios.delete(portfolioId);
    this.send({
      type: 'UNSUBSCRIBE_PORTFOLIO',
      payload: { portfolioId },
    });
  }

  public subscribeMarket(symbols: string[]): void {
    for (const sym of symbols) {
      this.subscribedSymbols.add(sym);
    }
    this.send({
      type: 'SUBSCRIBE_MARKET',
      payload: { symbols },
    });
  }

  public unsubscribeMarket(symbols: string[]): void {
    for (const sym of symbols) {
      this.subscribedSymbols.delete(sym);
    }
    this.send({
      type: 'UNSUBSCRIBE_MARKET',
      payload: { symbols },
    });
  }

  public onTick(handler: RealtimeEventHandler<MarketTick>): () => void {
    this.tickListeners.add(handler);
    return () => this.tickListeners.delete(handler);
  }

  public onPortfolioUpdate(handler: RealtimeEventHandler<PortfolioUpdatePayload>): () => void {
    this.portfolioListeners.add(handler);
    return () => this.portfolioListeners.delete(handler);
  }

  public onLivePortfolioUpdate(handler: RealtimeEventHandler<LivePortfolioUpdate>): () => void {
    this.livePortfolioListeners.add(handler);
    return () => this.livePortfolioListeners.delete(handler);
  }

  public onRiskUpdate(handler: RealtimeEventHandler<PortfolioRiskSummary>): () => void {
    this.riskListeners.add(handler);
    return () => this.riskListeners.delete(handler);
  }

  public onAlert(handler: RealtimeEventHandler<AlertNotification>): () => void {
    this.alertListeners.add(handler);
    return () => this.alertListeners.delete(handler);
  }

  public onAlertCleared(handler: RealtimeEventHandler<AlertClearedPayload>): () => void {
    this.alertClearedListeners.add(handler);
    return () => this.alertClearedListeners.delete(handler);
  }

  public onBatch(handler: RealtimeEventHandler<BatchUpdatePayload>): () => void {
    this.batchListeners.add(handler);
    return () => this.batchListeners.delete(handler);
  }

  public onStatusChange(handler: RealtimeEventHandler<ConnectionStatus>): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  private send(msg: WebSocketClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(raw: string): void {
    try {
      const parsed: WebSocketServerMessage = JSON.parse(raw);
      switch (parsed.type) {
        case 'TICK':
          for (const listener of this.tickListeners) {
            listener(parsed.payload);
          }
          break;
        case 'PORTFOLIO_UPDATE':
          for (const listener of this.portfolioListeners) {
            listener(parsed.payload);
          }
          if (parsed.payload.liveUpdate) {
            for (const listener of this.livePortfolioListeners) {
              listener(parsed.payload.liveUpdate);
            }
          }
          break;
        case 'RISK_UPDATE':
          for (const listener of this.riskListeners) {
            listener(parsed.payload);
          }
          break;
        case 'ALERT_FIRED':
          for (const listener of this.alertListeners) {
            listener(parsed.payload);
          }
          break;
        case 'ALERT_CLEARED':
          for (const listener of this.alertClearedListeners) {
            listener(parsed.payload);
          }
          break;
        case 'BATCH':
          for (const listener of this.batchListeners) {
            listener(parsed.payload);
          }
          if (parsed.payload.ticks) {
            for (const tick of parsed.payload.ticks) {
              for (const listener of this.tickListeners) {
                listener(tick);
              }
            }
          }
          if (parsed.payload.portfolioUpdates) {
            for (const update of parsed.payload.portfolioUpdates) {
              for (const listener of this.livePortfolioListeners) {
                listener(update);
              }
            }
          }
          if (parsed.payload.riskUpdates) {
            for (const risk of parsed.payload.riskUpdates) {
              for (const listener of this.riskListeners) {
                listener(risk);
              }
            }
          }
          if (parsed.payload.alerts) {
            for (const alert of parsed.payload.alerts) {
              for (const listener of this.alertListeners) {
                listener(alert);
              }
            }
          }
          if (parsed.payload.clearedAlerts) {
            for (const cleared of parsed.payload.clearedAlerts) {
              for (const listener of this.alertClearedListeners) {
                listener(cleared);
              }
            }
          }
          break;
        case 'PONG':
        case 'CONNECTED':
        case 'ERROR':
          break;
      }
    } catch {
      // Ignored malformed message
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'PING',
        clientTimestamp: Date.now(),
      });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('DISCONNECTED');
      return;
    }

    this.setStatus('RECONNECTING');
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.initialReconnectDelayMs * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    );
    const jitter = Math.random() * 500;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay + jitter);
  }

  private resubscribeAll(): void {
    for (const portfolioId of this.subscribedPortfolios) {
      this.send({
        type: 'SUBSCRIBE_PORTFOLIO',
        payload: { portfolioId },
      });
    }

    if (this.subscribedSymbols.size > 0) {
      this.send({
        type: 'SUBSCRIBE_MARKET',
        payload: { symbols: Array.from(this.subscribedSymbols) },
      });
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      for (const listener of this.statusListeners) {
        listener(status);
      }
    }
  }
}
