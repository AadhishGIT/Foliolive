export interface HoldingPosition {
  id: string;
  symbol: string;
  name: string;
  sector:
    | 'TECHNOLOGY'
    | 'FINANCIALS'
    | 'HEALTHCARE'
    | 'CONSUMER_DISCRETIONARY'
    | 'CONSUMER_STAPLES'
    | 'ENERGY'
    | 'INDUSTRIALS'
    | 'UTILITIES'
    | 'MATERIALS'
    | 'REAL_ESTATE';
  assetClass: 'EQUITY' | 'FIXED_INCOME' | 'COMMODITY' | 'DERIVATIVE';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  prevClose: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  weightPercent: number;
  currency: string;
  lastUpdated: string;
}

// Pseudo-random number generator (Mulberry32) for determinism
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECTOR_NAMES: Record<HoldingPosition['sector'], string[]> = {
  TECHNOLOGY: [
    'Apple Inc.',
    'Microsoft Corp.',
    'NVIDIA Corp.',
    'Alphabet Inc.',
    'Amazon.com Inc.',
    'Meta Platforms',
    'Broadcom Inc.',
    'ASML Holding',
    'Salesforce Inc.',
    'Adobe Inc.',
    'Qualcomm Inc.',
    'Advanced Micro Devices',
    'ServiceNow Inc.',
    'Intuit Inc.',
    'Applied Materials',
  ],
  FINANCIALS: [
    'JPMorgan Chase & Co.',
    'Berkshire Hathaway',
    'Visa Inc.',
    'Mastercard Inc.',
    'Bank of America',
    'Wells Fargo & Co.',
    'Goldman Sachs Group',
    'Morgan Stanley',
    'BlackRock Inc.',
    'Citigroup Inc.',
    'S&P Global Inc.',
    'Chubb Limited',
    'American Express Co.',
  ],
  HEALTHCARE: [
    'Eli Lilly and Co.',
    'UnitedHealth Group',
    'Johnson & Johnson',
    'Novo Nordisk A/S',
    'Merck & Co. Inc.',
    'AbbVie Inc.',
    'AstraZeneca PLC',
    'Thermo Fisher Scientific',
    'Abbott Laboratories',
    'Pfizer Inc.',
    'Danaher Corp.',
    'Novartis AG',
  ],
  CONSUMER_DISCRETIONARY: [
    'Tesla Inc.',
    'The Home Depot',
    'Costco Wholesale',
    'McDonalds Corp.',
    'LVMH Moet Hennessy',
    'Nike Inc.',
    'Starbucks Corp.',
    'Target Corp.',
    'Booking Holdings',
    'TJX Companies',
    "Lowe's Companies",
  ],
  CONSUMER_STAPLES: [
    'Procter & Gamble',
    'PepsiCo Inc.',
    'Coca-Cola Co.',
    'Walmart Inc.',
    'Philip Morris Intl',
    'Unilever PLC',
    'Mondelez International',
    'Colgate-Palmolive',
    'Estee Lauder Cos.',
  ],
  ENERGY: [
    'Exxon Mobil Corp.',
    'Chevron Corp.',
    'Shell PLC',
    'TotalEnergies SE',
    'ConocoPhillips',
    'BP p.l.c.',
    'Schlumberger Ltd.',
    'EOG Resources',
    'Marathon Petroleum',
    'Phillips 66',
  ],
  INDUSTRIALS: [
    'General Electric Co.',
    'Caterpillar Inc.',
    'Union Pacific Corp.',
    'Raytheon Technologies',
    'Honeywell International',
    'Boeing Co.',
    'Deere & Co.',
    'Lockheed Martin Corp.',
    'United Parcel Service',
  ],
  UTILITIES: [
    'NextEra Energy',
    'Southern Co.',
    'Duke Energy Corp.',
    'Constellation Energy',
    'Iberdrola SA',
    'American Electric Power',
    'Sempra Energy',
  ],
  MATERIALS: [
    'Linde PLC',
    'BHP Group Ltd.',
    'Rio Tinto Group',
    'Air Products & Chemicals',
    'Freeport-McMoRan',
    'Sherwin-Williams Co.',
    'Ecolab Inc.',
  ],
  REAL_ESTATE: [
    'Prologis Inc.',
    'American Tower Corp.',
    'Equinix Inc.',
    'Crown Castle Inc.',
    'Public Storage',
    'Realty Income Corp.',
    'Simon Property Group',
  ],
};

const SECTORS: HoldingPosition['sector'][] = [
  'TECHNOLOGY',
  'FINANCIALS',
  'HEALTHCARE',
  'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES',
  'ENERGY',
  'INDUSTRIALS',
  'UTILITIES',
  'MATERIALS',
  'REAL_ESTATE',
];

/**
 * Generates an institutional portfolio of N positions deterministically.
 */
export function generateHoldings(count = 500, seed = 42): HoldingPosition[] {
  const rng = mulberry32(seed);
  const holdings: HoldingPosition[] = [];

  const coreSymbols = [
    {
      sym: 'AAPL',
      name: 'Apple Inc.',
      sector: 'TECHNOLOGY' as const,
      price: 185.5,
      entry: 172.5,
      qty: 50000,
    },
    {
      sym: 'MSFT',
      name: 'Microsoft Corp.',
      sector: 'TECHNOLOGY' as const,
      price: 420.2,
      entry: 395.2,
      qty: 35000,
    },
    {
      sym: 'NVDA',
      name: 'NVIDIA Corp.',
      sector: 'TECHNOLOGY' as const,
      price: 125.0,
      entry: 110.4,
      qty: 80000,
    },
    {
      sym: 'GOOGL',
      name: 'Alphabet Inc.',
      sector: 'TECHNOLOGY' as const,
      price: 175.8,
      entry: 162.8,
      qty: 40000,
    },
    {
      sym: 'AMZN',
      name: 'Amazon.com Inc.',
      sector: 'CONSUMER_DISCRETIONARY' as const,
      price: 182.4,
      entry: 170.2,
      qty: 45000,
    },
    {
      sym: 'JPM',
      name: 'JPMorgan Chase & Co.',
      sector: 'FINANCIALS' as const,
      price: 198.5,
      entry: 180.0,
      qty: 30000,
    },
    {
      sym: 'LLY',
      name: 'Eli Lilly and Co.',
      sector: 'HEALTHCARE' as const,
      price: 785.0,
      entry: 720.0,
      qty: 12000,
    },
    {
      sym: 'XOM',
      name: 'Exxon Mobil Corp.',
      sector: 'ENERGY' as const,
      price: 118.2,
      entry: 112.5,
      qty: 35000,
    },
    {
      sym: 'UNH',
      name: 'UnitedHealth Group',
      sector: 'HEALTHCARE' as const,
      price: 495.6,
      entry: 510.0,
      qty: 15000,
    },
    {
      sym: 'V',
      name: 'Visa Inc.',
      sector: 'FINANCIALS' as const,
      price: 275.4,
      entry: 260.0,
      qty: 25000,
    },
  ];

  let runningTotalValue = 0;

  // First insert core holdings
  for (let i = 0; i < Math.min(count, coreSymbols.length); i++) {
    const c = coreSymbols[i]!;
    const prevClose = +(c.price * (1 - (rng() * 0.04 - 0.02))).toFixed(2);
    const dailyChange = +(c.price - prevClose).toFixed(2);
    const dailyChangePercent = +((dailyChange / prevClose) * 100).toFixed(2);
    const marketValue = +(c.qty * c.price).toFixed(2);
    const costBasis = +(c.qty * c.entry).toFixed(2);
    const unrealizedPnL = +(marketValue - costBasis).toFixed(2);
    const unrealizedPnLPercent = +((unrealizedPnL / costBasis) * 100).toFixed(2);

    runningTotalValue += marketValue;

    holdings.push({
      id: `pos_${String(i + 1).padStart(5, '0')}`,
      symbol: c.sym,
      name: c.name,
      sector: c.sector,
      assetClass: 'EQUITY',
      quantity: c.qty,
      entryPrice: c.entry,
      markPrice: c.price,
      prevClose,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      dailyChange,
      dailyChangePercent,
      weightPercent: 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    });
  }

  // Synthesize remaining positions up to count
  for (let i = coreSymbols.length; i < count; i++) {
    const sector = SECTORS[Math.floor(rng() * SECTORS.length)] || 'TECHNOLOGY';
    const names = SECTOR_NAMES[sector];
    const baseName = names[Math.floor(rng() * names.length)] || 'Global Holding';
    const suffixNum = Math.floor(i / 10);
    const name = suffixNum > 0 ? `${baseName} Series-${suffixNum}` : baseName;
    const sym = `SYN${String(i).padStart(4, '0')}`;

    const basePrice = +(20 + rng() * 300).toFixed(2);
    const priceDrift = (rng() - 0.48) * 0.15;
    const markPrice = +(basePrice * (1 + priceDrift)).toFixed(2);
    const entryPrice = +(basePrice * (1 + (rng() - 0.5) * 0.1)).toFixed(2);
    const prevClose = +(markPrice * (1 - (rng() * 0.03 - 0.015))).toFixed(2);

    const qty = Math.floor(500 + rng() * 15000);
    const marketValue = +(qty * markPrice).toFixed(2);
    const costBasis = +(qty * entryPrice).toFixed(2);
    const unrealizedPnL = +(marketValue - costBasis).toFixed(2);
    const unrealizedPnLPercent = +((unrealizedPnL / costBasis) * 100).toFixed(2);
    const dailyChange = +(markPrice - prevClose).toFixed(2);
    const dailyChangePercent = +((dailyChange / prevClose) * 100).toFixed(2);

    const assetClassRoll = rng();
    const assetClass: HoldingPosition['assetClass'] =
      assetClassRoll > 0.85
        ? 'FIXED_INCOME'
        : assetClassRoll > 0.8
          ? 'COMMODITY'
          : assetClassRoll > 0.75
            ? 'DERIVATIVE'
            : 'EQUITY';

    runningTotalValue += marketValue;

    holdings.push({
      id: `pos_${String(i + 1).padStart(5, '0')}`,
      symbol: sym,
      name,
      sector,
      assetClass,
      quantity: qty,
      entryPrice,
      markPrice,
      prevClose,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      dailyChange,
      dailyChangePercent,
      weightPercent: 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    });
  }

  // Calculate portfolio weight %
  for (const h of holdings) {
    h.weightPercent = +((h.marketValue / runningTotalValue) * 100).toFixed(3);
  }

  return holdings;
}
