import type { MarketTick } from '@foliolive/shared-types';

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 * Ensures reproducible price trajectories when initialized with the same seed.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed = 42) {
    this.state = seed >>> 0;
  }

  // Returns pseudo-random float in [0, 1)
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Box-Muller transform to generate standard normal sample N(0, 1)
  public nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

export type AssetClass = 'EQUITY' | 'FIXED_INCOME' | 'COMMODITY';

export type Sector =
  'TECHNOLOGY' | 'FINANCIALS' | 'HEALTHCARE' | 'CONSUMER_DISCRETIONARY' | 'ENERGY';

export interface InstrumentConfig {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: Sector;
  currency: string;
  initialPrice: number;
  annualizedVolatility: number; // sigma, e.g. 0.25 for 25%
  drift: number; // mu, e.g. 0.08 for 8%
  tickSize: number; // minimum price increment
}

export interface ShockEvent {
  id: string;
  sector?: Sector | 'ALL';
  magnitude: number; // e.g. -0.04 for -4% drop
  timestamp: string;
  description: string;
}

export class MarketSimulator {
  private rng: DeterministicRNG;
  private seed: number;
  private configs: Map<string, InstrumentConfig> = new Map();
  private prices: Map<string, number> = new Map();
  private basePrices: Map<string, number> = new Map();
  private highs: Map<string, number> = new Map();
  private lows: Map<string, number> = new Map();
  private volumes: Map<string, number> = new Map();
  private lastTicks: Map<string, MarketTick> = new Map();

  // Sector intra-correlation factor rho (0 = independent, 1 = perfectly correlated)
  private sectorCorrelations: Record<Sector, number> = {
    TECHNOLOGY: 0.65,
    FINANCIALS: 0.6,
    HEALTHCARE: 0.45,
    CONSUMER_DISCRETIONARY: 0.55,
    ENERGY: 0.7,
  };

  private totalTicks = 0;
  private isStressMode = false;
  private tickIntervalMs: number;
  private onTickCallbacks: Array<(tick: MarketTick) => void> = [];
  private onBatchCallbacks: Array<(ticks: MarketTick[]) => void> = [];
  private onShockCallbacks: Array<(shock: ShockEvent) => void> = [];
  private timer: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  constructor(seed = 42, defaultIntervalMs = 120) {
    this.seed = seed;
    this.rng = new DeterministicRNG(seed);
    this.tickIntervalMs = defaultIntervalMs;
    this.initializeDefaultInstruments();
  }

  private initializeDefaultInstruments(): void {
    const defaultInstruments: InstrumentConfig[] = [
      // Technology Equities
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        currency: 'USD',
        initialPrice: 343.83,
        annualizedVolatility: 0.22,
        drift: 0.08,
        tickSize: 0.01,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        currency: 'USD',
        initialPrice: 531.01,
        annualizedVolatility: 0.2,
        drift: 0.1,
        tickSize: 0.01,
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        currency: 'USD',
        initialPrice: 215.38,
        annualizedVolatility: 0.45,
        drift: 0.25,
        tickSize: 0.01,
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        currency: 'USD',
        initialPrice: 324.89,
        annualizedVolatility: 0.24,
        drift: 0.09,
        tickSize: 0.01,
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        assetClass: 'EQUITY',
        sector: 'TECHNOLOGY',
        currency: 'USD',
        initialPrice: 612.49,
        annualizedVolatility: 0.35,
        drift: 0.15,
        tickSize: 0.01,
      },

      // Financials Equities
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        assetClass: 'EQUITY',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 339.3,
        annualizedVolatility: 0.18,
        drift: 0.07,
        tickSize: 0.01,
      },
      {
        symbol: 'GS',
        name: 'Goldman Sachs Group',
        assetClass: 'EQUITY',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 925.17,
        annualizedVolatility: 0.23,
        drift: 0.08,
        tickSize: 0.01,
      },
      {
        symbol: 'MS',
        name: 'Morgan Stanley',
        assetClass: 'EQUITY',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 190.13,
        annualizedVolatility: 0.21,
        drift: 0.06,
        tickSize: 0.01,
      },
      {
        symbol: 'BAC',
        name: 'Bank of America Corp.',
        assetClass: 'EQUITY',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 50.85,
        annualizedVolatility: 0.22,
        drift: 0.05,
        tickSize: 0.01,
      },

      // Healthcare Equities
      {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        assetClass: 'EQUITY',
        sector: 'HEALTHCARE',
        currency: 'USD',
        initialPrice: 271.04,
        annualizedVolatility: 0.14,
        drift: 0.04,
        tickSize: 0.01,
      },
      {
        symbol: 'PFE',
        name: 'Pfizer Inc.',
        assetClass: 'EQUITY',
        sector: 'HEALTHCARE',
        currency: 'USD',
        initialPrice: 29.45,
        annualizedVolatility: 0.2,
        drift: 0.02,
        tickSize: 0.01,
      },
      {
        symbol: 'UNH',
        name: 'UnitedHealth Group',
        assetClass: 'EQUITY',
        sector: 'HEALTHCARE',
        currency: 'USD',
        initialPrice: 407.1,
        annualizedVolatility: 0.17,
        drift: 0.08,
        tickSize: 0.01,
      },
      {
        symbol: 'LLY',
        name: 'Eli Lilly and Company',
        assetClass: 'EQUITY',
        sector: 'HEALTHCARE',
        currency: 'USD',
        initialPrice: 1288.3,
        annualizedVolatility: 0.28,
        drift: 0.18,
        tickSize: 0.01,
      },

      // Consumer Discretionary Equities
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        assetClass: 'EQUITY',
        sector: 'CONSUMER_DISCRETIONARY',
        currency: 'USD',
        initialPrice: 254.6,
        annualizedVolatility: 0.28,
        drift: 0.12,
        tickSize: 0.01,
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        assetClass: 'EQUITY',
        sector: 'CONSUMER_DISCRETIONARY',
        currency: 'USD',
        initialPrice: 404.22,
        annualizedVolatility: 0.52,
        drift: 0.1,
        tickSize: 0.01,
      },
      {
        symbol: 'HD',
        name: 'The Home Depot Inc.',
        assetClass: 'EQUITY',
        sector: 'CONSUMER_DISCRETIONARY',
        currency: 'USD',
        initialPrice: 317.56,
        annualizedVolatility: 0.18,
        drift: 0.06,
        tickSize: 0.01,
      },
      {
        symbol: 'NKE',
        name: 'NIKE Inc.',
        assetClass: 'EQUITY',
        sector: 'CONSUMER_DISCRETIONARY',
        currency: 'USD',
        initialPrice: 37.15,
        annualizedVolatility: 0.24,
        drift: 0.04,
        tickSize: 0.01,
      },

      // Energy Equities
      {
        symbol: 'XOM',
        name: 'Exxon Mobil Corp.',
        assetClass: 'EQUITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 182.02,
        annualizedVolatility: 0.22,
        drift: 0.07,
        tickSize: 0.01,
      },
      {
        symbol: 'CVX',
        name: 'Chevron Corp.',
        assetClass: 'EQUITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 229.2,
        annualizedVolatility: 0.21,
        drift: 0.06,
        tickSize: 0.01,
      },
      {
        symbol: 'SLB',
        name: 'SLB (Schlumberger)',
        assetClass: 'EQUITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 53.75,
        annualizedVolatility: 0.3,
        drift: 0.05,
        tickSize: 0.01,
      },

      // Fixed Income ETFs
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        assetClass: 'FIXED_INCOME',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 71.19,
        annualizedVolatility: 0.06,
        drift: 0.03,
        tickSize: 0.01,
      },
      {
        symbol: 'TLT',
        name: 'iShares 20+ Year Treasury Bond',
        assetClass: 'FIXED_INCOME',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 80.99,
        annualizedVolatility: 0.12,
        drift: 0.03,
        tickSize: 0.01,
      },
      {
        symbol: 'HYG',
        name: 'iShares High Yield Corporate Bond',
        assetClass: 'FIXED_INCOME',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 77.59,
        annualizedVolatility: 0.09,
        drift: 0.05,
        tickSize: 0.01,
      },
      {
        symbol: 'AGG',
        name: 'iShares Core U.S. Aggregate Bond',
        assetClass: 'FIXED_INCOME',
        sector: 'FINANCIALS',
        currency: 'USD',
        initialPrice: 95.89,
        annualizedVolatility: 0.05,
        drift: 0.03,
        tickSize: 0.01,
      },

      // Commodity ETFs
      {
        symbol: 'GLD',
        name: 'SPDR Gold Shares',
        assetClass: 'COMMODITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 373.51,
        annualizedVolatility: 0.15,
        drift: 0.06,
        tickSize: 0.01,
      },
      {
        symbol: 'SLV',
        name: 'iShares Silver Trust',
        assetClass: 'COMMODITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 49.06,
        annualizedVolatility: 0.26,
        drift: 0.07,
        tickSize: 0.01,
      },
      {
        symbol: 'USO',
        name: 'United States Oil Fund',
        assetClass: 'COMMODITY',
        sector: 'ENERGY',
        currency: 'USD',
        initialPrice: 166.57,
        annualizedVolatility: 0.38,
        drift: 0.04,
        tickSize: 0.01,
      },
    ];

    for (const inst of defaultInstruments) {
      this.configs.set(inst.symbol, inst);
      this.prices.set(inst.symbol, inst.initialPrice);
      this.basePrices.set(inst.symbol, inst.initialPrice);
      this.highs.set(inst.symbol, inst.initialPrice);
      this.lows.set(inst.symbol, inst.initialPrice);
      this.volumes.set(inst.symbol, 100000 + Math.floor(this.rng.next() * 500000));
      this.createInitialTick(inst);
    }
  }

  private createInitialTick(inst: InstrumentConfig): void {
    const spread = Number((inst.initialPrice * 0.0003).toFixed(2)) || 0.01;
    const tick: MarketTick = {
      symbol: inst.symbol,
      price: inst.initialPrice,
      bid: Number((inst.initialPrice - spread / 2).toFixed(2)),
      ask: Number((inst.initialPrice + spread / 2).toFixed(2)),
      volume: this.volumes.get(inst.symbol) || 100000,
      change: 0,
      changePercent: 0,
      high: inst.initialPrice,
      low: inst.initialPrice,
      open: inst.initialPrice,
      previousClose: inst.initialPrice,
      timestamp: new Date().toISOString(),
    };
    this.lastTicks.set(inst.symbol, tick);
  }

  /**
   * Resets the simulator state back to initial seed and prices.
   */
  public reset(seed = this.seed): void {
    this.seed = seed;
    this.rng = new DeterministicRNG(seed);
    this.totalTicks = 0;
    for (const [symbol, config] of this.configs) {
      this.prices.set(symbol, config.initialPrice);
      this.highs.set(symbol, config.initialPrice);
      this.lows.set(symbol, config.initialPrice);
      this.volumes.set(symbol, 100000);
      this.createInitialTick(config);
    }
  }

  /**
   * Generates a step for all instruments with sector correlation and optional shocks.
   * dt is time step in fractions of a year (assuming 252 trading days, 6.5 hours/day).
   */
  public step(dtSeconds = 0.5): MarketTick[] {
    this.totalTicks++;
    const dt = dtSeconds / (252 * 6.5 * 3600); // fraction of trading year

    // 1. Generate sector shocks Z_sector ~ N(0, 1)
    const sectorShocks = new Map<Sector, number>();
    for (const sector of Object.keys(this.sectorCorrelations) as Sector[]) {
      sectorShocks.set(sector, this.rng.nextGaussian(0, 1));
    }

    // 2. Check for rare stochastic jump / shock event (0.2% probability per step)
    let activeShock: ShockEvent | null = null;
    if (this.rng.next() < 0.002) {
      const sectors = Object.keys(this.sectorCorrelations) as Sector[];
      const chosenSector = sectors[Math.floor(this.rng.next() * sectors.length)];
      // Shock magnitude between -4% and +3%
      const magnitude = this.rng.next() * 0.07 - 0.04;
      activeShock = {
        id: `shock_${Date.now()}_${Math.floor(this.rng.next() * 1000)}`,
        sector: chosenSector,
        magnitude,
        timestamp: new Date().toISOString(),
        description: `Macro volatility spike in ${chosenSector} sector (${(magnitude * 100).toFixed(2)}%)`,
      };
      this.notifyShock(activeShock);
    }

    const updatedTicks: MarketTick[] = [];

    // 3. Update each instrument price via GBM + Sector Factor Model
    for (const [symbol, config] of this.configs) {
      const currentPrice = this.prices.get(symbol) || config.initialPrice;
      const basePrice = this.basePrices.get(symbol) || config.initialPrice;
      const sectorZ = sectorShocks.get(config.sector) || 0;
      const idioZ = this.rng.nextGaussian(0, 1);
      const rho = this.sectorCorrelations[config.sector] || 0.5;

      // Correlated standard normal: Z_eff = sqrt(rho)*Z_sector + sqrt(1-rho)*Z_idio
      const zEff = Math.sqrt(rho) * sectorZ + Math.sqrt(1 - rho) * idioZ;

      // Continuous Geometric Brownian Motion log-return:
      // S_{t+dt} = S_t * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z_eff)
      const mu = config.drift;
      const sigma = config.annualizedVolatility;
      const driftTerm = (mu - 0.5 * sigma * sigma) * dt;
      const diffusionTerm = sigma * Math.sqrt(dt) * zEff;

      let logReturn = driftTerm + diffusionTerm;

      // Apply shock event if this instrument is in the shocked sector
      if (activeShock && (activeShock.sector === config.sector || activeShock.sector === 'ALL')) {
        logReturn += activeShock.magnitude;
      }

      let newPrice = currentPrice * Math.exp(logReturn);

      // Guardrail: avoid negative or extreme prices (< 10% or > 1000% initial)
      if (newPrice < config.initialPrice * 0.1) newPrice = config.initialPrice * 0.1;
      if (newPrice > config.initialPrice * 10.0) newPrice = config.initialPrice * 10.0;

      // Round to tickSize
      newPrice = Math.round(newPrice / config.tickSize) * config.tickSize;
      newPrice = Number(newPrice.toFixed(2));

      // Update High/Low/Volume
      const currentHigh = Math.max(this.highs.get(symbol) || newPrice, newPrice);
      const currentLow = Math.min(this.lows.get(symbol) || newPrice, newPrice);
      const tradeVolume = Math.floor(10 + this.rng.next() * 500);
      const totalVolume = (this.volumes.get(symbol) || 100000) + tradeVolume;

      this.prices.set(symbol, newPrice);
      this.highs.set(symbol, currentHigh);
      this.lows.set(symbol, currentLow);
      this.volumes.set(symbol, totalVolume);

      const change = Number((newPrice - basePrice).toFixed(2));
      const changePercent = Number(((change / basePrice) * 100).toFixed(2));
      const spread = Number((newPrice * 0.0003).toFixed(2)) || 0.01;
      const bid = Number((newPrice - spread / 2).toFixed(2));
      const ask = Number((newPrice + spread / 2).toFixed(2));

      const tick: MarketTick = {
        symbol,
        price: newPrice,
        bid,
        ask,
        volume: totalVolume,
        change,
        changePercent,
        high: currentHigh,
        low: currentLow,
        open: basePrice,
        previousClose: basePrice,
        timestamp: new Date().toISOString(),
      };

      this.lastTicks.set(symbol, tick);
      updatedTicks.push(tick);
      this.notifyTick(tick);
    }

    this.notifyBatch(updatedTicks);
    return updatedTicks;
  }

  /**
   * Manually triggers a market or sector shock event.
   */
  public triggerManualShock(magnitude: number, sector?: Sector | 'ALL'): ShockEvent {
    const shockSector = !sector || sector === 'ALL' ? undefined : sector;
    const shock: ShockEvent = {
      id: `manual_shock_${Date.now()}`,
      sector: shockSector || 'ALL',
      magnitude,
      timestamp: new Date().toISOString(),
      description: `Manual shock injected into ${shockSector || 'entire market'} (${(magnitude * 100).toFixed(1)}%)`,
    };

    for (const [symbol, config] of this.configs) {
      if (!shockSector || config.sector === shockSector) {
        const cur = this.prices.get(symbol) || config.initialPrice;
        const newPrice = Math.max(1, Number((cur * (1 + magnitude)).toFixed(2)));
        this.prices.set(symbol, newPrice);
      }
    }

    this.notifyShock(shock);
    return shock;
  }

  /**
   * Ingests a real-time market quote from an external provider (Yahoo Finance / Finnhub).
   * Updates current price, baseline, high/low/volume, and notifies WebSocket clients.
   */
  public updateLivePrice(
    symbol: string,
    livePrice: number,
    prevClose?: number,
    high?: number,
    low?: number,
    volume?: number
  ): MarketTick | null {
    const sym = symbol.toUpperCase();
    const config = this.configs.get(sym);
    if (!config) return null;

    const basePrice = prevClose ?? this.basePrices.get(sym) ?? config.initialPrice;
    const currentHigh = Math.max(this.highs.get(sym) || livePrice, high || livePrice);
    const currentLow = Math.min(this.lows.get(sym) || livePrice, low || livePrice);
    const currentVolume = volume ?? (this.volumes.get(sym) || 100000) + 100;

    this.prices.set(sym, livePrice);
    this.highs.set(sym, currentHigh);
    this.lows.set(sym, currentLow);
    this.volumes.set(sym, currentVolume);
    if (prevClose !== undefined) {
      this.basePrices.set(sym, prevClose);
    }

    const change = Number((livePrice - basePrice).toFixed(2));
    const changePercent = Number(((change / basePrice) * 100).toFixed(2));
    const spread = Number((livePrice * 0.0003).toFixed(2)) || 0.01;
    const bid = Number((livePrice - spread / 2).toFixed(2));
    const ask = Number((livePrice + spread / 2).toFixed(2));

    const tick: MarketTick = {
      symbol: sym,
      price: livePrice,
      bid,
      ask,
      volume: currentVolume,
      change,
      changePercent,
      high: currentHigh,
      low: currentLow,
      open: basePrice,
      previousClose: basePrice,
      timestamp: new Date().toISOString(),
    };

    this.lastTicks.set(sym, tick);
    this.notifyTick(tick);
    this.notifyBatch([tick]);
    return tick;
  }

  // Simulator lifecycle controls
  public start(): void {
    if (this.timer) return;
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      this.step(this.isStressMode ? 0.05 : 0.5);
    }, this.tickIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setStressMode(enabled: boolean): void {
    this.isStressMode = enabled;
    this.tickIntervalMs = enabled ? 10 : 120; // 100 updates/sec vs ~8 ticks/sec
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  public setTickIntervalMs(intervalMs: number): void {
    this.tickIntervalMs = Math.max(5, intervalMs);
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  // Getters
  public getPrice(symbol: string): number {
    return this.prices.get(symbol.toUpperCase()) || 100.0;
  }

  public getAllPrices(): Map<string, number> {
    return new Map(this.prices);
  }

  public getLastTick(symbol: string): MarketTick | undefined {
    return this.lastTicks.get(symbol.toUpperCase());
  }

  public getAllLastTicks(): MarketTick[] {
    return Array.from(this.lastTicks.values());
  }

  public getInstrumentConfigs(): InstrumentConfig[] {
    return Array.from(this.configs.values());
  }

  public getStatus() {
    return {
      running: this.timer !== null,
      stressMode: this.isStressMode,
      tickIntervalMs: this.tickIntervalMs,
      ticksPerSecond: Math.round(1000 / this.tickIntervalMs),
      totalTicks: this.totalTicks,
      instrumentCount: this.configs.size,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  // Subscriptions & listeners
  public onTick(cb: (tick: MarketTick) => void): () => void {
    this.onTickCallbacks.push(cb);
    return () => {
      this.onTickCallbacks = this.onTickCallbacks.filter((c) => c !== cb);
    };
  }

  public onBatch(cb: (ticks: MarketTick[]) => void): () => void {
    this.onBatchCallbacks.push(cb);
    return () => {
      this.onBatchCallbacks = this.onBatchCallbacks.filter((c) => c !== cb);
    };
  }

  public onShock(cb: (shock: ShockEvent) => void): () => void {
    this.onShockCallbacks.push(cb);
    return () => {
      this.onShockCallbacks = this.onShockCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyTick(tick: MarketTick): void {
    for (const cb of this.onTickCallbacks) {
      cb(tick);
    }
  }

  private notifyBatch(ticks: MarketTick[]): void {
    for (const cb of this.onBatchCallbacks) {
      cb(ticks);
    }
  }

  private notifyShock(shock: ShockEvent): void {
    for (const cb of this.onShockCallbacks) {
      cb(shock);
    }
  }
}
