export interface VaRHorizonMetric {
  confidence95: number;
  confidence99: number;
}

export interface VaRMetrics {
  parametric: VaRHorizonMetric;
  historical: VaRHorizonMetric;
  monteCarlo: VaRHorizonMetric;
  expectedShortfall95: number;
  expectedShortfall99: number;
  calculationTimestamp: string;
}

export interface ExposureMetric {
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  leverageRatio: number;
}

export interface ConcentrationMetric {
  herfindahlHirschmanIndex: number; // HHI
  top5ConcentrationPercent: number;
  top10ConcentrationPercent: number;
  highestSingleAssetPercent: number;
  highestSingleAssetSymbol: string;
}

export interface StressScenarioResult {
  scenarioName: string;
  description: string;
  estimatedPnLImpact: number;
  estimatedPnLPercent: number;
  worstAffectedAsset: string;
}

export interface PortfolioRiskSummary {
  portfolioId: string;
  var: VaRMetrics;
  exposure: ExposureMetric;
  concentration: ConcentrationMetric;
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  annualizedVolatility: number;
  maxDrawdownPercent: number;
  stressScenarios: StressScenarioResult[];
  updatedAt: string;
}
