import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  RiskGauge,
  StatMetric,
  Badge,
} from '@foliolive/ui';

export interface VaRMetricsCardsProps {
  portfolioAUM?: number;
  parametricVaR95?: number;
  historicalVaR99?: number;
  expectedShortfall95?: number;
  portfolioBeta?: number;
}

export function VaRMetricsCards({
  portfolioAUM = 125_430_800,
  parametricVaR95 = 1_840_250,
  historicalVaR99 = 2_610_000,
  expectedShortfall95 = 2_420_000,
  portfolioBeta = 1.08,
}: VaRMetricsCardsProps) {
  const pVaRPercent = (parametricVaR95 / portfolioAUM) * 100;
  const hVaRPercent = (historicalVaR99 / portfolioAUM) * 100;
  const esPercent = (expectedShortfall95 / portfolioAUM) * 100;

  // Thresholds
  const pVaRThreshold = 2.5; // 2.5% max limit
  const hVaRThreshold = 3.2; // 3.2% max limit
  const esThreshold = 3.0; // 3.0% max limit

  return (
    <div className="space-y-4">
      {/* 3 VaR Gauges Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Parametric VaR 95% */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400">
                Parametric VaR (95%, 1-Day)
              </CardTitle>
              <Badge variant={pVaRPercent > pVaRThreshold ? 'destructive' : 'success'}>
                {pVaRPercent > pVaRThreshold ? 'Limit Breached' : 'Within Limit'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              ${(parametricVaR95 / 1_000_000).toFixed(2)}M{' '}
              <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                ({pVaRPercent.toFixed(2)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <RiskGauge
              value={pVaRPercent}
              min={0}
              max={4.0}
              threshold={pVaRThreshold}
              label="Parametric VaR 95%"
              unit="%"
              size={160}
            />
            <div className="w-full flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1 border-t border-slate-200 dark:border-slate-800/60 pt-1.5">
              <span>
                Policy Limit: <strong>{pVaRThreshold.toFixed(1)}%</strong>
              </span>
              <span>
                Headroom: <strong>{(pVaRThreshold - pVaRPercent).toFixed(2)}%</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Historical VaR 99% */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400">
                Historical Simulation (99%, 1-Day)
              </CardTitle>
              <Badge variant={hVaRPercent > hVaRThreshold ? 'destructive' : 'success'}>
                {hVaRPercent > hVaRThreshold ? 'Limit Breached' : 'Within Limit'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              ${(historicalVaR99 / 1_000_000).toFixed(2)}M{' '}
              <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                ({hVaRPercent.toFixed(2)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <RiskGauge
              value={hVaRPercent}
              min={0}
              max={5.0}
              threshold={hVaRThreshold}
              label="Historical VaR 99%"
              unit="%"
              size={160}
            />
            <div className="w-full flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1 border-t border-slate-200 dark:border-slate-800/60 pt-1.5">
              <span>
                Policy Limit: <strong>{hVaRThreshold.toFixed(1)}%</strong>
              </span>
              <span>
                Headroom: <strong>{(hVaRThreshold - hVaRPercent).toFixed(2)}%</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expected Shortfall CVaR */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400">
                Expected Shortfall / CVaR (95%)
              </CardTitle>
              <Badge variant={esPercent > esThreshold ? 'warning' : 'success'}>
                {esPercent > esThreshold ? 'Tail Warning' : 'Tail Safe'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              ${(expectedShortfall95 / 1_000_000).toFixed(2)}M{' '}
              <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                ({esPercent.toFixed(2)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <RiskGauge
              value={esPercent}
              min={0}
              max={5.0}
              threshold={esThreshold}
              label="Expected Shortfall 95%"
              unit="%"
              size={160}
            />
            <div className="w-full flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1 border-t border-slate-200 dark:border-slate-800/60 pt-1.5">
              <span>
                Tail Loss Limit: <strong>{esThreshold.toFixed(1)}%</strong>
              </span>
              <span>
                Headroom: <strong>{(esThreshold - esPercent).toFixed(2)}%</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auxiliary Risk Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatMetric
          label="Portfolio Beta (vs S&P 500)"
          value={portfolioBeta.toFixed(2)}
          unit="Aggressive"
          trend="up"
        />
        <StatMetric
          label="Max Historical Drawdown"
          value="-14.2%"
          unit="Peak: Nov 2025"
          trend="down"
        />
        <StatMetric
          label="Gross / Net Leverage"
          value="1.00x / 1.00x"
          unit="Unleveraged"
          trend="neutral"
        />
        <StatMetric label="Volatility (Annualized)" value="16.4%" unit="S&P: 13.8%" trend="up" />
      </div>
    </div>
  );
}
