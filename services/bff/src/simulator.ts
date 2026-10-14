import type { MarketTick } from '@foliolive/shared-types';

export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  // Returns pseudo-random float between 0 and 1
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns standard normal sample (Box-Muller transform)
  public nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

export interface InstrumentConfig {
  symbol: string;
  name: string;
  initialPrice: number;
  annualizedVolatility: number; // e.g. 0.25 for 25%
  drift: number;
}

export class MarketSimulator {
  private rng: DeterministicRNG;
  private prices: Map<string, number> = new Map();
  private basePrices: Map<string, number> = new Map();
  private configs: Map<string, InstrumentConfig> = new Map();

  constructor(seed = 42) {
    this.rng = new DeterministicRNG(seed);
    this.initializeDefaultInstruments();
  }

  private initializeDefaultInstruments(): void {
    const defaults: InstrumentConfig[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        initialPrice: 185.5,
        annualizedVolatility: 0.22,
        drift: 0.08,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        initialPrice: 420.2,
        annualizedVolatility: 0.2,
        drift: 0.1,
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        initialPrice: 125.0,
        annualizedVolatility: 0.45,
        drift: 0.25,
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        initialPrice: 175.8,
        annualizedVolatility: 0.24,
        drift: 0.09,
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        initialPrice: 182.4,
        annualizedVolatility: 0.28,
        drift: 0.12,
      },
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        initialPrice: 198.6,
        annualizedVolatility: 0.18,
        drift: 0.07,
      },
      {
        symbol: 'GS',
        name: 'Goldman Sachs Group',
        initialPrice: 460.0,
        annualizedVolatility: 0.23,
        drift: 0.08,
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        initialPrice: 72.4,
        annualizedVolatility: 0.06,
        drift: 0.03,
      },
      {
        symbol: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        initialPrice: 91.2,
        annualizedVolatility: 0.12,
        drift: 0.02,
      },
      {
        symbol: 'GLD',
        name: 'SPDR Gold Shares',
        initialPrice: 215.3,
        annualizedVolatility: 0.14,
        drift: 0.05,
      },
    ];

    for (const inst of defaults) {
      this.configs.set(inst.symbol, inst);
      this.prices.set(inst.symbol, inst.initialPrice);
      this.basePrices.set(inst.symbol, inst.initialPrice);
    }
  }

  // Geometric Brownian Motion step: S_{t+dt} = S_t * exp((drift - 0.5 * vol^2) * dt + vol * sqrt(dt) * Z)
  public generateTick(symbol?: string): MarketTick {
    const symbols = Array.from(this.configs.keys());
    const targetSymbol = symbol ?? symbols[Math.floor(this.rng.next() * symbols.length)]!;
    const config = this.configs.get(targetSymbol)!;
    const currentPrice = this.prices.get(targetSymbol)!;
    const basePrice = this.basePrices.get(targetSymbol)!;

    // dt corresponds to ~1/252 trading days / 23400 trading seconds per day * 1 sec
    const dt = 1 / (252 * 23400);
    const z = this.rng.nextGaussian();
    const driftTerm = (config.drift - 0.5 * Math.pow(config.annualizedVolatility, 2)) * dt;
    const diffusionTerm = config.annualizedVolatility * Math.sqrt(dt) * z;
    const newPrice = Math.max(
      0.01,
      Number((currentPrice * Math.exp(driftTerm + diffusionTerm)).toFixed(2))
    );

    this.prices.set(targetSymbol, newPrice);

    const spread = Number((newPrice * 0.0004).toFixed(2));
    const bid = Number((newPrice - spread / 2).toFixed(2));
    const ask = Number((newPrice + spread / 2).toFixed(2));
    const change = Number((newPrice - basePrice).toFixed(2));
    const changePercent = Number(((change / basePrice) * 100).toFixed(2));
    const volume = Math.floor(this.rng.next() * 1000) + 10;

    return {
      symbol: targetSymbol,
      price: newPrice,
      bid,
      ask,
      volume,
      change,
      changePercent,
      high: Math.max(newPrice, basePrice * 1.02),
      low: Math.min(newPrice, basePrice * 0.98),
      open: basePrice,
      previousClose: basePrice,
      timestamp: new Date().toISOString(),
    };
  }

  public getAllCurrentPrices(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [sym, price] of this.prices.entries()) {
      res[sym] = price;
    }
    return res;
  }
}
