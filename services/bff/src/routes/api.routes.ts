import { Router, type Request, type Response } from 'express';
import { SimulatorControlSchema } from '@foliolive/shared-types';
import type { MarketSimulator, Sector } from '../simulator';
import type { RealtimeEngine } from '../realtime-engine';
import { logger } from '../logger';

export function createApiRouter(
  simulator: MarketSimulator,
  realtimeEngine: RealtimeEngine
): Router {
  const router = Router();

  /**
   * GET /api/portfolio-overview/:id
   * BFF aggregation endpoint: returns portfolio details, live holdings with P&L,
   * risk metrics snapshot, and active alerts in a single HTTP round-trip.
   */
  router.get('/portfolio-overview/:id', (req: Request, res: Response) => {
    const portfolioId = req.params.id as string;
    if (!portfolioId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Portfolio ID parameter is required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const portfolio = realtimeEngine.getPortfolio(portfolioId);

    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: { code: 'PORTFOLIO_NOT_FOUND', message: `Portfolio ${portfolioId} not found` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const summary = realtimeEngine.getPortfolioSummary(portfolioId);
    const holdings = realtimeEngine.getHoldings(portfolioId);
    const { riskSummary } = realtimeEngine.evaluatePortfolio(portfolio);
    const alerts = realtimeEngine.getActiveAlerts(portfolioId);

    res.json({
      success: true,
      data: {
        portfolioId,
        summary,
        holdings,
        risk: riskSummary,
        alerts,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/portfolios
   * Lists all available portfolios with live summary metrics.
   */
  router.get('/portfolios', (_req: Request, res: Response) => {
    const portfolios = realtimeEngine.getAllPortfolios().map((p) => {
      const summary = realtimeEngine.getPortfolioSummary(p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        currency: p.currency,
        totalValue: summary?.totalValue || 0,
        dailyPnL: summary?.dailyPnL || 0,
        dailyPnLPercent: summary?.dailyPnLPercent || 0,
        holdingsCount: p.positions.size,
      };
    });

    res.json({
      success: true,
      data: portfolios,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/market-overview
   * Returns all 27 instruments with live prices, 24h change, high/low, and sector breakdown.
   */
  router.get('/market-overview', (_req: Request, res: Response) => {
    const configs = simulator.getInstrumentConfigs();
    const ticks = configs.map((c) => {
      const lastTick = simulator.getLastTick(c.symbol);
      return {
        symbol: c.symbol,
        name: c.name,
        assetClass: c.assetClass,
        sector: c.sector,
        currency: c.currency,
        price: lastTick?.price || c.initialPrice,
        bid: lastTick?.bid || c.initialPrice - 0.01,
        ask: lastTick?.ask || c.initialPrice + 0.01,
        change: lastTick?.change || 0,
        changePercent: lastTick?.changePercent || 0,
        high: lastTick?.high || c.initialPrice,
        low: lastTick?.low || c.initialPrice,
        volume: lastTick?.volume || 100000,
        timestamp: lastTick?.timestamp || new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      data: ticks,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/alerts
   * Returns active risk alerts, optionally filtered by ?portfolioId=...
   */
  router.get('/alerts', (req: Request, res: Response) => {
    const portfolioId = req.query.portfolioId as string | undefined;
    const alerts = realtimeEngine.getActiveAlerts(portfolioId);

    res.json({
      success: true,
      data: alerts,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/simulator/status
   * Returns status of the market simulator.
   */
  router.get('/simulator/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: simulator.getStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/simulator/control
   * Runtime controls: stress mode, tick interval, shock injection, price reset.
   */
  router.post('/simulator/control', (req: Request, res: Response) => {
    const parseResult = SimulatorControlSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { stressMode, tickIntervalMs, triggerShock, shockMagnitude, shockSector, resetPrices } =
      parseResult.data;

    let actionSummary = '';

    if (resetPrices) {
      simulator.reset();
      actionSummary += 'Simulator reset to initial prices; ';
    }

    if (typeof stressMode === 'boolean') {
      simulator.setStressMode(stressMode);
      actionSummary += `Stress mode ${stressMode ? 'enabled (100 ticks/sec)' : 'disabled (standard rate)'}; `;
    }

    if (typeof tickIntervalMs === 'number') {
      simulator.setTickIntervalMs(tickIntervalMs);
      actionSummary += `Tick interval set to ${tickIntervalMs}ms; `;
    }

    if (triggerShock) {
      const mag = typeof shockMagnitude === 'number' ? shockMagnitude : -0.05;
      const validSectors: Array<Sector | 'ALL'> = [
        'ALL',
        'TECHNOLOGY',
        'FINANCIALS',
        'HEALTHCARE',
        'CONSUMER_DISCRETIONARY',
        'ENERGY',
      ];
      const sectorParam = validSectors.find((s) => s === shockSector);
      const shock = simulator.triggerManualShock(mag, sectorParam);
      actionSummary += `Manual shock triggered (${(shock.magnitude * 100).toFixed(1)}%); `;
    }

    logger.info({ actionSummary }, 'Market simulator control updated');

    res.json({
      success: true,
      message: actionSummary.trim() || 'No changes made',
      data: simulator.getStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
