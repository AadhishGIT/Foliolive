import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConnectionStatus } from '../src/client';
import { RealtimeClient } from '../src/client';
import type {
  MarketTick,
  PortfolioRiskSummary,
  AlertNotification,
  LivePortfolioUpdate,
  BatchUpdatePayload,
} from '@foliolive/shared-types';

// Mock WebSocket implementation for deterministic testing
class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public static OPEN = 1;
  public static CLOSED = 3;

  public url: string;
  public readyState: number = MockWebSocket.OPEN;
  public sentMessages: string[] = [];

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((error: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  public send(data: string): void {
    this.sentMessages.push(data);
  }

  public close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }

  // Helper to simulate incoming server message
  public simulateServerMessage(data: object): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to trigger open event
  public simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen();
    }
  }
}

describe('RealtimeClient Unit & Reliability Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    // Inject mock WebSocket into global scope
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('initializes in DISCONNECTED state and transitions to CONNECTING and CONNECTED on open', () => {
    const statuses: ConnectionStatus[] = [];
    const client = new RealtimeClient({
      url: 'ws://localhost:4000/ws',
      token: 'test-jwt-token',
      heartbeatIntervalMs: 5000,
    });

    client.onStatusChange((status) => statuses.push(status));
    expect(client.getStatus()).toBe('DISCONNECTED');

    client.connect();
    expect(client.getStatus()).toBe('CONNECTING');
    expect(statuses).toEqual(['CONNECTING']);

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:4000/ws?token=test-jwt-token');

    ws.simulateOpen();
    expect(client.getStatus()).toBe('CONNECTED');
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED']);

    client.disconnect();
    expect(client.getStatus()).toBe('DISCONNECTED');
  });

  it('emits periodic PING heartbeats at configured interval', () => {
    const client = new RealtimeClient({
      url: 'ws://localhost:4000/ws',
      heartbeatIntervalMs: 5000,
    });

    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    expect(ws.sentMessages.length).toBe(0);

    // Advance 5s
    vi.advanceTimersByTime(5000);
    expect(ws.sentMessages.length).toBe(1);
    const ping1 = JSON.parse(ws.sentMessages[0]);
    expect(ping1.type).toBe('PING');
    expect(typeof ping1.clientTimestamp).toBe('number');

    // Advance another 5s
    vi.advanceTimersByTime(5000);
    expect(ws.sentMessages.length).toBe(2);

    client.disconnect();
  });

  it('resubscribes to portfolios and market symbols after reconnection', () => {
    const client = new RealtimeClient({
      url: 'ws://localhost:4000/ws',
      initialReconnectDelayMs: 500,
    });

    client.connect();
    const ws1 = MockWebSocket.instances[0];
    ws1.simulateOpen();

    // Subscribe to portfolio and market symbols
    client.subscribePortfolio('portfolio-institutional-alpha');
    client.subscribeMarket(['AAPL', 'MSFT', 'NVDA']);

    expect(ws1.sentMessages.length).toBe(2);
    expect(JSON.parse(ws1.sentMessages[0])).toEqual({
      type: 'SUBSCRIBE_PORTFOLIO',
      payload: { portfolioId: 'portfolio-institutional-alpha' },
    });
    expect(JSON.parse(ws1.sentMessages[1])).toEqual({
      type: 'SUBSCRIBE_MARKET',
      payload: { symbols: ['AAPL', 'MSFT', 'NVDA'] },
    });

    // Simulate unexpected connection drop
    ws1.close();
    expect(client.getStatus()).toBe('RECONNECTING');

    // Advance past reconnect delay + jitter (500ms + max 500ms jitter)
    vi.advanceTimersByTime(1100);

    // Verify a new WebSocket was instantiated
    expect(MockWebSocket.instances.length).toBe(2);
    const ws2 = MockWebSocket.instances[1];

    // Open connection
    ws2.simulateOpen();
    expect(client.getStatus()).toBe('CONNECTED');

    // Verify that resubscribeAll automatically re-sent both subscriptions
    const reSentMessages = ws2.sentMessages.map((m) => JSON.parse(m));
    expect(reSentMessages).toContainEqual({
      type: 'SUBSCRIBE_PORTFOLIO',
      payload: { portfolioId: 'portfolio-institutional-alpha' },
    });
    expect(reSentMessages).toContainEqual({
      type: 'SUBSCRIBE_MARKET',
      payload: { symbols: ['AAPL', 'MSFT', 'NVDA'] },
    });

    client.disconnect();
  });

  it('applies exponential backoff with jitter and respects maxReconnectAttempts', () => {
    const client = new RealtimeClient({
      url: 'ws://localhost:4000/ws',
      initialReconnectDelayMs: 200,
      maxReconnectAttempts: 3,
    });

    client.connect();
    expect(MockWebSocket.instances.length).toBe(1);

    // First disconnect
    MockWebSocket.instances[0].close();
    expect(client.getStatus()).toBe('RECONNECTING');

    // Attempt 1: ~200ms + jitter
    vi.advanceTimersByTime(750);
    expect(MockWebSocket.instances.length).toBe(2);

    // Disconnect attempt 1
    MockWebSocket.instances[1].close();
    expect(client.getStatus()).toBe('RECONNECTING');

    // Attempt 2: 200 * 1.5 = 300ms + jitter
    vi.advanceTimersByTime(850);
    expect(MockWebSocket.instances.length).toBe(3);

    // Disconnect attempt 2
    MockWebSocket.instances[2].close();
    expect(client.getStatus()).toBe('RECONNECTING');

    // Attempt 3: 200 * 1.5^2 = 450ms + jitter
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances.length).toBe(4);

    // Disconnect attempt 3 (reaches limit)
    MockWebSocket.instances[3].close();
    // After exceeding maxReconnectAttempts, transitions to DISCONNECTED
    expect(client.getStatus()).toBe('DISCONNECTED');
  });

  it('handles message ordering and dispatches to typed subscribers accurately', () => {
    const client = new RealtimeClient({ url: 'ws://localhost:4000/ws' });
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const receivedTicks: MarketTick[] = [];
    const receivedLiveUpdates: LivePortfolioUpdate[] = [];
    const receivedRisks: PortfolioRiskSummary[] = [];
    const receivedAlerts: AlertNotification[] = [];

    client.onTick((tick) => receivedTicks.push(tick));
    client.onLivePortfolioUpdate((update) => receivedLiveUpdates.push(update));
    client.onRiskUpdate((risk) => receivedRisks.push(risk));
    client.onAlert((alert) => receivedAlerts.push(alert));

    // 1. Simulate individual TICK
    const mockTick: MarketTick = {
      symbol: 'AAPL',
      price: 185.5,
      change: 2.1,
      changePercent: 1.15,
      timestamp: Date.now(),
      volume: 1500000,
    };
    ws.simulateServerMessage({ type: 'TICK', payload: mockTick });
    expect(receivedTicks).toHaveLength(1);
    expect(receivedTicks[0].symbol).toBe('AAPL');

    // 2. Simulate PORTFOLIO_UPDATE with liveUpdate
    const mockLiveUpdate: LivePortfolioUpdate = {
      portfolioId: 'p-1',
      totalMarketValue: 5000000,
      totalUnrealizedPnL: 250000,
      totalDailyPnL: 12500,
      cashBalance: 1000000,
      timestamp: Date.now(),
    };
    ws.simulateServerMessage({
      type: 'PORTFOLIO_UPDATE',
      payload: {
        portfolioId: 'p-1',
        holdings: [],
        totalValue: 5000000,
        unrealizedPnL: 250000,
        dailyPnL: 12500,
        timestamp: Date.now(),
        liveUpdate: mockLiveUpdate,
      },
    });
    expect(receivedLiveUpdates).toHaveLength(1);
    expect(receivedLiveUpdates[0].totalMarketValue).toBe(5000000);

    // 3. Simulate RISK_UPDATE
    const mockRisk: PortfolioRiskSummary = {
      portfolioId: 'p-1',
      var95: 120000,
      var99: 185000,
      parametricVar95: 115000,
      parametricVar99: 178000,
      historicalVar95: 122000,
      historicalVar99: 189000,
      expectedShortfall: 210000,
      grossExposure: 6000000,
      netExposure: 5000000,
      top5Concentration: 38.5,
      top10Concentration: 62.0,
      herfindahlIndex: 1250,
      beta: 1.08,
      timestamp: Date.now(),
    };
    ws.simulateServerMessage({ type: 'RISK_UPDATE', payload: mockRisk });
    expect(receivedRisks).toHaveLength(1);
    expect(receivedRisks[0].var95).toBe(120000);

    // 4. Simulate ALERT_FIRED
    const mockAlert: AlertNotification = {
      id: 'alert-1',
      portfolioId: 'p-1',
      limitType: 'VAR_95',
      severity: 'CRITICAL',
      threshold: 100000,
      actualValue: 120000,
      message: 'VaR 95% breached institutional threshold',
      timestamp: Date.now(),
    };
    ws.simulateServerMessage({ type: 'ALERT_FIRED', payload: mockAlert });
    expect(receivedAlerts).toHaveLength(1);
    expect(receivedAlerts[0].severity).toBe('CRITICAL');

    client.disconnect();
  });

  it('unpacks BATCH messages and sequentially fans out to all registered handlers', () => {
    const client = new RealtimeClient({ url: 'ws://localhost:4000/ws' });
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const ticks: string[] = [];
    const batchUpdates: BatchUpdatePayload[] = [];

    client.onTick((t) => ticks.push(t.symbol));
    client.onBatch((b) => batchUpdates.push(b));

    const batchPayload: BatchUpdatePayload = {
      timestamp: Date.now(),
      ticks: [
        { symbol: 'MSFT', price: 420, change: 3, changePercent: 0.7, timestamp: Date.now() },
        { symbol: 'GOOGL', price: 175, change: -1, changePercent: -0.5, timestamp: Date.now() },
      ],
      portfolioUpdates: [],
      riskUpdates: [],
    };

    ws.simulateServerMessage({ type: 'BATCH', payload: batchPayload });

    expect(batchUpdates).toHaveLength(1);
    expect(ticks).toEqual(['MSFT', 'GOOGL']);

    client.disconnect();
  });
});
