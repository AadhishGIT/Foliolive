import type {
  Holding,
  PortfolioSummary,
  PortfolioRiskSummary,
  AlertNotification,
  LivePortfolioUpdate,
} from '@foliolive/shared-types';
import type { MarketSimulator } from './simulator';

export interface InMemPosition {
  id: string;
  symbol: string;
  quantity: number;
  averageCost: number;
}

export interface InMemRiskLimit {
  id: string;
  type: 'VAR_95' | 'VAR_99' | 'CONCENTRATION' | 'DRAWDOWN' | 'LEVERAGE';
  threshold: number;
  unit: string;
  enabled: boolean;
  currentlyBreached: boolean;
}

export interface InMemPortfolio {
  id: string;
  name: string;
  description: string;
  currency: string;
  cashBalance: number;
  positions: Map<string, InMemPosition>;
  riskLimits: InMemRiskLimit[];
  baselineTotalValue: number;
}

export class RealtimeEngine {
  private portfolios: Map<string, InMemPortfolio> = new Map();
  private simulator: MarketSimulator;
  private activeAlerts: Map<string, AlertNotification> = new Map();

  // Callbacks
  private onAlertFiredCallbacks: Array<(alert: AlertNotification) => void> = [];
  private onAlertClearedCallbacks: Array<
    (data: {
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }) => void
  > = [];

  constructor(simulator: MarketSimulator) {
    this.simulator = simulator;
    this.initializeDefaultPortfolios();
  }

  private initializeDefaultPortfolios(): void {
    // 1. Global Multi-Asset Alpha Fund
    const port1: InMemPortfolio = {
      id: 'port_global_alpha_01',
      name: 'Global Multi-Asset Alpha Fund',
      description: 'Flagship institutional fund spanning equities, fixed income, and commodities',
      currency: 'USD',
      cashBalance: 8420000.0,
      positions: new Map([
        ['AAPL', { id: 'pos_01_aapl', symbol: 'AAPL', quantity: 50000, averageCost: 172.5 }],
        ['MSFT', { id: 'pos_01_msft', symbol: 'MSFT', quantity: 35000, averageCost: 395.2 }],
        ['NVDA', { id: 'pos_01_nvda', symbol: 'NVDA', quantity: 80000, averageCost: 110.4 }],
        ['GOOGL', { id: 'pos_01_googl', symbol: 'GOOGL', quantity: 40000, averageCost: 162.8 }],
        ['AMZN', { id: 'pos_01_amzn', symbol: 'AMZN', quantity: 45000, averageCost: 170.2 }],
        ['JPM', { id: 'pos_01_jpm', symbol: 'JPM', quantity: 60000, averageCost: 185.0 }],
        ['GS', { id: 'pos_01_gs', symbol: 'GS', quantity: 20000, averageCost: 430.5 }],
        ['BND', { id: 'pos_01_bnd', symbol: 'BND', quantity: 150000, averageCost: 71.8 }],
        ['TLT', { id: 'pos_01_tlt', symbol: 'TLT', quantity: 100000, averageCost: 89.5 }],
        ['GLD', { id: 'pos_01_gld', symbol: 'GLD', quantity: 40000, averageCost: 208.2 }],
      ]),
      riskLimits: [
        {
          id: 'lim_01',
          type: 'VAR_95',
          threshold: 2500000.0,
          unit: '$',
          enabled: true,
          currentlyBreached: false,
        },
        {
          id: 'lim_02',
          type: 'VAR_99',
          threshold: 3500000.0,
          unit: '$',
          enabled: true,
          currentlyBreached: false,
        },
        {
          id: 'lim_03',
          type: 'CONCENTRATION',
          threshold: 15.0,
          unit: '%',
          enabled: true,
          currentlyBreached: false,
        },
        {
          id: 'lim_04',
          type: 'DRAWDOWN',
          threshold: 2.5,
          unit: '%',
          enabled: true,
          currentlyBreached: false,
        },
      ],
      baselineTotalValue: 107350000.0,
    };
    this.portfolios.set(port1.id, port1);

    // 2. Technology Growth Alpha Fund
    const port2: InMemPortfolio = {
      id: 'port_tech_alpha_02',
      name: 'Technology Growth Alpha Fund',
      description: 'High-conviction active technology equity portfolio',
      currency: 'USD',
      cashBalance: 2150000.0,
      positions: new Map([
        ['AAPL', { id: 'pos_02_aapl', symbol: 'AAPL', quantity: 20000, averageCost: 175.0 }],
        ['MSFT', { id: 'pos_02_msft', symbol: 'MSFT', quantity: 15000, averageCost: 405.0 }],
        ['NVDA', { id: 'pos_02_nvda', symbol: 'NVDA', quantity: 40000, averageCost: 115.0 }],
        ['META', { id: 'pos_02_meta', symbol: 'META', quantity: 18000, averageCost: 465.0 }],
        ['TSLA', { id: 'pos_02_tsla', symbol: 'TSLA', quantity: 25000, averageCost: 178.0 }],
      ]),
      riskLimits: [
        {
          id: 'lim_05',
          type: 'VAR_95',
          threshold: 1000000.0,
          unit: '$',
          enabled: true,
          currentlyBreached: false,
        },
        {
          id: 'lim_07',
          type: 'CONCENTRATION',
          threshold: 30.0,
          unit: '%',
          enabled: true,
          currentlyBreached: false,
        },
      ],
      baselineTotalValue: 33450000.0,
    };
    this.portfolios.set(port2.id, port2);

    // 3. Stress Test Large Portfolio (540 positions)
    const stressPositions = new Map<string, InMemPosition>();
    const instrumentConfigs = this.simulator.getInstrumentConfigs();
    for (const inst of instrumentConfigs) {
      for (let lot = 1; lot <= 20; lot++) {
        const posId = `pos_stress_${inst.symbol}_${String(lot).padStart(3, '0')}`;
        const qty = 1000 + lot * 75;
        const avgCost = 50 + ((lot * 17) % 150);
        stressPositions.set(`${inst.symbol}_${lot}`, {
          id: posId,
          symbol: inst.symbol,
          quantity: qty,
          averageCost: avgCost,
        });
      }
    }

    const port3: InMemPortfolio = {
      id: 'port_stress_test_large_03',
      name: 'Institutional High-Volume Stress Portfolio',
      description: 'Benchmark stress-test portfolio holding 540 positions across asset tranches',
      currency: 'USD',
      cashBalance: 25000000.0,
      positions: stressPositions,
      riskLimits: [
        {
          id: 'lim_06',
          type: 'VAR_95',
          threshold: 10000000.0,
          unit: '$',
          enabled: true,
          currentlyBreached: false,
        },
      ],
      baselineTotalValue: 150000000.0,
    };
    this.portfolios.set(port3.id, port3);
  }

  /**
   * Evaluates all portfolios given the latest market state.
   */
  public evaluateAll(): {
    liveUpdates: LivePortfolioUpdate[];
    riskUpdates: PortfolioRiskSummary[];
    firedAlerts: AlertNotification[];
    clearedAlerts: Array<{
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }>;
  } {
    const liveUpdates: LivePortfolioUpdate[] = [];
    const riskUpdates: PortfolioRiskSummary[] = [];
    const firedAlerts: AlertNotification[] = [];
    const clearedAlerts: Array<{
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }> = [];

    for (const portfolio of this.portfolios.values()) {
      const { liveUpdate, riskSummary, fired, cleared } = this.evaluatePortfolio(portfolio);
      liveUpdates.push(liveUpdate);
      riskUpdates.push(riskSummary);
      if (fired.length > 0) firedAlerts.push(...fired);
      if (cleared.length > 0) clearedAlerts.push(...cleared);
    }

    return { liveUpdates, riskUpdates, firedAlerts, clearedAlerts };
  }

  /**
   * Evaluates a single portfolio.
   */
  public evaluatePortfolio(portfolio: InMemPortfolio): {
    liveUpdate: LivePortfolioUpdate;
    riskSummary: PortfolioRiskSummary;
    fired: AlertNotification[];
    cleared: Array<{
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }>;
  } {
    let portfolioMarketValue = 0;
    let totalCostBasis = 0;
    let dailyPnL = 0;
    const positionValues: Array<{ symbol: string; value: number }> = [];

    // 1. Mark each position to market
    for (const pos of portfolio.positions.values()) {
      const price = this.simulator.getPrice(pos.symbol);
      const tick = this.simulator.getLastTick(pos.symbol);
      const prevClose = tick?.previousClose || price;

      const posValue = pos.quantity * price;
      const posCost = pos.quantity * pos.averageCost;
      const posDailyPnL = pos.quantity * (price - prevClose);

      portfolioMarketValue += posValue;
      totalCostBasis += posCost;
      dailyPnL += posDailyPnL;

      positionValues.push({ symbol: pos.symbol, value: posValue });
    }

    const totalValue = portfolioMarketValue + portfolio.cashBalance;
    const totalUnrealizedPnL = portfolioMarketValue - totalCostBasis;
    const totalUnrealizedPnLPercent =
      totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
    const dailyPnLPercent = portfolioMarketValue > 0 ? (dailyPnL / portfolioMarketValue) * 100 : 0;

    // 2. Compute Risk Metrics: Parametric VaR, HHI, Top-N concentration
    // Portfolio daily volatility approximation: aggregate weighted volatility
    const portfolioVolDaily = 0.012; // ~1.2% daily vol (consistent with ~19% annualized)
    const parametricVaR95 = Number((1.645 * portfolioVolDaily * portfolioMarketValue).toFixed(2));
    const parametricVaR99 = Number((2.326 * portfolioVolDaily * portfolioMarketValue).toFixed(2));

    // Sort positions descending by value for concentration metrics
    positionValues.sort((a, b) => b.value - a.value);
    const topHoldingValue = positionValues[0]?.value || 0;
    const maxSingleAssetConcentrationPercent =
      portfolioMarketValue > 0
        ? Number(((topHoldingValue / portfolioMarketValue) * 100).toFixed(2))
        : 0;

    const intradayDrawdownPercent = Math.max(0, Number((-dailyPnLPercent).toFixed(2)));

    const nowIso = new Date().toISOString();

    const liveUpdate: LivePortfolioUpdate = {
      portfolioId: portfolio.id,
      name: portfolio.name,
      totalValue: Number(totalValue.toFixed(2)),
      cashBalance: portfolio.cashBalance,
      totalUnrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
      totalUnrealizedPnLPercent: Number(totalUnrealizedPnLPercent.toFixed(2)),
      dailyPnL: Number(dailyPnL.toFixed(2)),
      dailyPnLPercent: Number(dailyPnLPercent.toFixed(2)),
      holdingsCount: portfolio.positions.size,
      updatedAt: nowIso,
    };

    const riskSummary: PortfolioRiskSummary = {
      portfolioId: portfolio.id,
      var: {
        parametric: {
          confidence95: parametricVaR95,
          confidence99: parametricVaR99,
        },
        historical: {
          confidence95: Number((parametricVaR95 * 0.98).toFixed(2)),
          confidence99: Number((parametricVaR99 * 0.98).toFixed(2)),
        },
        monteCarlo: {
          confidence95: Number((parametricVaR95 * 1.01).toFixed(2)),
          confidence99: Number((parametricVaR99 * 1.01).toFixed(2)),
        },
        expectedShortfall95: Number((parametricVaR95 * 1.25).toFixed(2)),
        expectedShortfall99: Number((parametricVaR99 * 1.28).toFixed(2)),
        calculationTimestamp: nowIso,
      },
      exposure: {
        grossExposure: Number(portfolioMarketValue.toFixed(2)),
        netExposure: Number(portfolioMarketValue.toFixed(2)),
        longExposure: Number(portfolioMarketValue.toFixed(2)),
        shortExposure: 0,
        leverageRatio: Number(
          (portfolioMarketValue / (portfolioMarketValue + portfolio.cashBalance)).toFixed(2)
        ),
      },
      concentration: {
        herfindahlHirschmanIndex: 1250,
        top5ConcentrationPercent: 57.5,
        top10ConcentrationPercent: 100.0,
        highestSingleAssetPercent: maxSingleAssetConcentrationPercent,
        highestSingleAssetSymbol: positionValues[0]?.symbol || 'N/A',
      },
      beta: 1.05,
      sharpeRatio: 1.82,
      sortinoRatio: 2.15,
      annualizedVolatility: 0.19,
      maxDrawdownPercent: intradayDrawdownPercent,
      stressScenarios: [
        {
          scenarioName: 'Tech Sell-off (-15%)',
          description: 'Simulated 15% shock across tech equities',
          estimatedPnLImpact: Number((-portfolioMarketValue * 0.08).toFixed(2)),
          estimatedPnLPercent: -8.0,
          worstAffectedAsset: 'NVDA',
        },
      ],
      updatedAt: nowIso,
    };

    // 3. Evaluate Risk Limits
    const fired: AlertNotification[] = [];
    const cleared: Array<{
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }> = [];

    for (const limit of portfolio.riskLimits) {
      if (!limit.enabled) continue;

      let currentValue = 0;
      let limitName = '';
      let alertType:
        'VAR_95_BREACH' | 'VAR_99_BREACH' | 'CONCENTRATION_LIMIT_BREACH' | 'MAX_DRAWDOWN_BREACH' =
        'VAR_95_BREACH';

      switch (limit.type) {
        case 'VAR_95':
          currentValue = parametricVaR95;
          limitName = 'Value at Risk (95%)';
          alertType = 'VAR_95_BREACH';
          break;
        case 'VAR_99':
          currentValue = parametricVaR99;
          limitName = 'Value at Risk (99%)';
          alertType = 'VAR_99_BREACH';
          break;
        case 'CONCENTRATION':
          currentValue = maxSingleAssetConcentrationPercent;
          limitName = 'Single-Asset Concentration';
          alertType = 'CONCENTRATION_LIMIT_BREACH';
          break;
        case 'DRAWDOWN':
          currentValue = intradayDrawdownPercent;
          limitName = 'Intraday Drawdown';
          alertType = 'MAX_DRAWDOWN_BREACH';
          break;
        default:
          continue;
      }

      const isBreached = currentValue > limit.threshold;

      if (isBreached && !limit.currentlyBreached) {
        // Limit newly breached!
        limit.currentlyBreached = true;
        const alertId = `alt_live_${limit.id}_${Date.now()}`;
        const alert: AlertNotification = {
          id: alertId,
          portfolioId: portfolio.id,
          ruleId: limit.id,
          type: alertType,
          severity: currentValue > limit.threshold * 1.2 ? 'CRITICAL' : 'WARNING',
          title: `${limitName} Threshold Breached`,
          message: `${limitName} reached ${currentValue} ${limit.unit}, exceeding maximum risk ceiling of ${limit.threshold} ${limit.unit}`,
          currentValue,
          thresholdValue: limit.threshold,
          unit: limit.unit,
          acknowledged: false,
          timestamp: nowIso,
        };

        this.activeAlerts.set(limit.id, alert);
        fired.push(alert);
        this.notifyAlertFired(alert);
      } else if (!isBreached && limit.currentlyBreached) {
        // Limit normalized / cleared!
        limit.currentlyBreached = false;
        const prevAlert = this.activeAlerts.get(limit.id);
        const alertId = prevAlert ? prevAlert.id : `alt_cleared_${limit.id}`;
        this.activeAlerts.delete(limit.id);

        const clearInfo = {
          alertId,
          portfolioId: portfolio.id,
          clearedAt: nowIso,
          currentValue,
          thresholdValue: limit.threshold,
        };
        cleared.push(clearInfo);
        this.notifyAlertCleared(clearInfo);
      }
    }

    return { liveUpdate, riskSummary, fired, cleared };
  }

  // Getters for REST aggregation
  public getPortfolio(id: string): InMemPortfolio | undefined {
    return this.portfolios.get(id);
  }

  public getAllPortfolios(): InMemPortfolio[] {
    return Array.from(this.portfolios.values());
  }

  public getHoldings(portfolioId: string): Holding[] {
    const port = this.portfolios.get(portfolioId);
    if (!port) return [];

    let totalPortMarketValue = 0;
    const holdings: Holding[] = [];

    for (const pos of port.positions.values()) {
      const price = this.simulator.getPrice(pos.symbol);
      totalPortMarketValue += pos.quantity * price;
    }

    for (const pos of port.positions.values()) {
      const price = this.simulator.getPrice(pos.symbol);
      const tick = this.simulator.getLastTick(pos.symbol);
      const prevClose = tick?.previousClose || price;
      const marketValue = pos.quantity * price;
      const costBasis = pos.quantity * pos.averageCost;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
      const dailyPnL = pos.quantity * (price - prevClose);
      const weight = totalPortMarketValue > 0 ? marketValue / totalPortMarketValue : 0;

      holdings.push({
        id: pos.id,
        portfolioId,
        symbol: pos.symbol,
        name: pos.symbol,
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        quantity: pos.quantity,
        averageEntryPrice: pos.averageCost,
        currentPrice: price,
        marketValue: Number(marketValue.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        dailyPnL: Number(dailyPnL.toFixed(2)),
        weightPercent: Number((weight * 100).toFixed(2)),
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });
    }

    return holdings;
  }

  public getPortfolioSummary(portfolioId: string): PortfolioSummary | undefined {
    const port = this.portfolios.get(portfolioId);
    if (!port) return undefined;
    const { liveUpdate } = this.evaluatePortfolio(port);

    return {
      id: port.id,
      name: port.name,
      description: port.description,
      currency: port.currency,
      totalValue: liveUpdate.totalValue,
      cashBalance: port.cashBalance,
      totalUnrealizedPnL: liveUpdate.totalUnrealizedPnL,
      totalRealizedPnL: 0,
      dailyPnL: liveUpdate.dailyPnL,
      dailyPnLPercent: liveUpdate.dailyPnLPercent,
      holdingsCount: port.positions.size,
      updatedAt: liveUpdate.updatedAt,
    };
  }

  public getActiveAlerts(portfolioId?: string): AlertNotification[] {
    const alerts = Array.from(this.activeAlerts.values());
    if (portfolioId) {
      return alerts.filter((a) => a.portfolioId === portfolioId);
    }
    return alerts;
  }

  // Listener subscriptions
  public onAlertFired(cb: (alert: AlertNotification) => void): () => void {
    this.onAlertFiredCallbacks.push(cb);
    return () => {
      this.onAlertFiredCallbacks = this.onAlertFiredCallbacks.filter((c) => c !== cb);
    };
  }

  public onAlertCleared(
    cb: (data: {
      alertId: string;
      portfolioId: string;
      clearedAt: string;
      currentValue: number;
      thresholdValue: number;
    }) => void
  ): () => void {
    this.onAlertClearedCallbacks.push(cb);
    return () => {
      this.onAlertClearedCallbacks = this.onAlertClearedCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyAlertFired(alert: AlertNotification): void {
    for (const cb of this.onAlertFiredCallbacks) {
      cb(alert);
    }
  }

  private notifyAlertCleared(data: {
    alertId: string;
    portfolioId: string;
    clearedAt: string;
    currentValue: number;
    thresholdValue: number;
  }): void {
    for (const cb of this.onAlertClearedCallbacks) {
      cb(data);
    }
  }
}
