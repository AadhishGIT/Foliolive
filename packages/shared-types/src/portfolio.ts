export type AssetClass = 'EQUITY' | 'FIXED_INCOME' | 'COMMODITY' | 'CRYPTO' | 'FX' | 'DERIVATIVE';

export type Sector =
  | 'TECHNOLOGY'
  | 'FINANCIALS'
  | 'HEALTHCARE'
  | 'CONSUMER_DISCRETIONARY'
  | 'COMMUNICATION_SERVICES'
  | 'INDUSTRIALS'
  | 'ENERGY'
  | 'MATERIALS'
  | 'UTILITIES'
  | 'REAL_ESTATE';

export interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: Sector;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dailyPnL: number;
  weightPercent: number;
  currency: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  id: string;
  name: string;
  description: string;
  currency: string;
  totalValue: number;
  cashBalance: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  holdingsCount: number;
  updatedAt: string;
}

export interface PortfolioAllocation {
  portfolioId: string;
  byAssetClass: Record<AssetClass, number>;
  bySector: Record<Sector, number>;
  topHoldings: Array<{
    symbol: string;
    name: string;
    weightPercent: number;
    marketValue: number;
  }>;
}
