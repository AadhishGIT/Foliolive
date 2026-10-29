import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { MarketSimulator } from '../src/simulator';
import { LiveMarketService } from '../src/live-market-service';
import { createBffServer, type BffServerInstance } from '../src/server';

describe('LiveMarketService & Market Sync', () => {
  let simulator: MarketSimulator;
  let service: LiveMarketService;

  beforeEach(() => {
    simulator = new MarketSimulator(42);
    service = new LiveMarketService(simulator, {
      enabled: true,
      provider: 'yahoo',
      pollIntervalMs: 50000,
      symbols: ['AAPL', 'MSFT'],
    });
  });

  afterEach(() => {
    service.stop();
  });

  it('initializes with default options and tracks configured symbols', () => {
    const status = service.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.provider).toBe('yahoo');
    expect(status.symbolCount).toBe(2);
    expect(status.isRunning).toBe(false);
  });

  it('updates simulator price when updateLivePrice is called', () => {
    const tick = simulator.updateLivePrice('AAPL', 345.5, 340.0, 348.0, 339.0, 150000);
    expect(tick).toBeDefined();
    expect(tick?.symbol).toBe('AAPL');
    expect(tick?.price).toBe(345.5);
    expect(tick?.change).toBe(5.5);
    expect(tick?.changePercent).toBeCloseTo(1.62, 1);

    expect(simulator.getPrice('AAPL')).toBe(345.5);
    expect(simulator.getLastTick('AAPL')?.price).toBe(345.5);
  });

  it('retains last known price when external fetch encounters error', async () => {
    // Mock global fetch to reject
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline test'));

    const beforePrice = simulator.getPrice('AAPL');
    const updatedCount = await service.syncQuotes();

    expect(updatedCount).toBe(0);
    expect(service.getStatus().failedSyncs).toBe(1);
    expect(service.getStatus().lastError).toBe('Network offline test');
    expect(simulator.getPrice('AAPL')).toBe(beforePrice);

    global.fetch = originalFetch;
  });

  it('parses valid chart quote and updates simulator', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const sym = url.includes('AAPL') ? 'AAPL' : 'MSFT';
      const price = sym === 'AAPL' ? 343.83 : 531.01;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: {
                  regularMarketPrice: price,
                  chartPreviousClose: price - 2.0,
                  regularMarketDayHigh: price + 3.0,
                  regularMarketDayLow: price - 3.0,
                  regularMarketVolume: 250000,
                },
              },
            ],
          },
        }),
      } as Response);
    });

    const updated = await service.syncQuotes();
    expect(updated).toBe(2);
    expect(simulator.getPrice('AAPL')).toBe(343.83);
    expect(simulator.getPrice('MSFT')).toBe(531.01);
    expect(service.getStatus().successfulSyncs).toBe(1);

    global.fetch = originalFetch;
  });
});

describe('Live Market REST Endpoints', () => {
  let bff: BffServerInstance;

  beforeEach(async () => {
    bff = createBffServer({ seed: 42 });
    await bff.start(0);
  });

  afterEach(async () => {
    await bff.stop();
  });

  it('GET /api/market/live-status returns live market status', async () => {
    const res = await request(bff.app).get('/api/market/live-status').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.provider).toBeDefined();
    expect(res.body.data.symbolCount).toBeGreaterThan(0);
  });

  it('POST /api/market/live-sync triggers manual market sync', async () => {
    const res = await request(bff.app).post('/api/market/live-sync').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Successfully synced');
    expect(res.body.data).toBeDefined();
  });
});
