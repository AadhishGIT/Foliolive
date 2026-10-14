import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createBffServer, type BffServerInstance } from '../src/server';

describe('BFF Aggregation Endpoints & Simulator Control', () => {
  let bff: BffServerInstance;

  beforeAll(async () => {
    bff = createBffServer({ seed: 42 });
    await bff.start(0);
  });

  afterAll(async () => {
    await bff.stop();
  });

  it('GET /health returns UP status and service identifier', async () => {
    const res = await request(bff.app).get('/health').expect(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('foliolive-bff');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/portfolio-overview/:id aggregates summary, holdings, risk, and alerts', async () => {
    const res = await request(bff.app)
      .get('/api/portfolio-overview/port_global_alpha_01')
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.portfolioId).toBe('port_global_alpha_01');
    expect(data.summary).toBeDefined();
    expect(data.summary.totalValue).toBeGreaterThan(90000000);
    expect(data.summary.cashBalance).toBe(8420000);

    expect(data.holdings).toBeDefined();
    expect(data.holdings.length).toBe(10);
    const aapl = data.holdings.find((h: { symbol: string }) => h.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl.quantity).toBe(50000);
    expect(aapl.currentPrice).toBeGreaterThan(0);

    expect(data.risk).toBeDefined();
    expect(data.risk.var.parametric.confidence95).toBeGreaterThan(0);
    expect(data.risk.exposure.grossExposure).toBeGreaterThan(0);
  });

  it('GET /api/portfolio-overview/unknown returns 404', async () => {
    const res = await request(bff.app).get('/api/portfolio-overview/unknown_portfolio').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PORTFOLIO_NOT_FOUND');
  });

  it('GET /api/portfolios returns list of portfolios with summary metrics', async () => {
    const res = await request(bff.app).get('/api/portfolios').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0].id).toBe('port_global_alpha_01');
  });

  it('GET /api/market-overview returns all 27 instruments with live pricing', async () => {
    const res = await request(bff.app).get('/api/market-overview').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(27);

    const symbols = res.body.data.map((d: { symbol: string }) => d.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('NVDA');
    expect(symbols).toContain('JPM');
    expect(symbols).toContain('BND');
    expect(symbols).toContain('GLD');
  });

  it('GET /api/simulator/status returns engine running state', async () => {
    const res = await request(bff.app).get('/api/simulator/status').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.running).toBe(true);
    expect(res.body.data.instrumentCount).toBe(27);
  });

  it('POST /api/simulator/control updates stress mode and injects manual shock', async () => {
    // 1. Enable stress mode
    const stressRes = await request(bff.app)
      .post('/api/simulator/control')
      .send({ stressMode: true })
      .expect(200);

    expect(stressRes.body.success).toBe(true);
    expect(stressRes.body.data.stressMode).toBe(true);
    expect(stressRes.body.data.tickIntervalMs).toBe(10);

    // 2. Trigger manual shock
    const shockRes = await request(bff.app)
      .post('/api/simulator/control')
      .send({ triggerShock: true, shockMagnitude: -0.06 })
      .expect(200);

    expect(shockRes.body.success).toBe(true);
    expect(shockRes.body.message).toContain('Manual shock triggered');

    // 3. Reset stress mode
    await request(bff.app).post('/api/simulator/control').send({ stressMode: false }).expect(200);
  });
});
