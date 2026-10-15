import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@foliolive/ui';
import { ShieldAlert, Zap } from 'lucide-react';
import { VaRMetricsCards } from './components/VaRMetricsCards';
import { MethodExplainerDialog } from './components/MethodExplainerDialog';
import { ExposureBarChart } from './components/ExposureBarChart';
import { ConcentrationChart } from './components/ConcentrationChart';
import { CorrelationHeatmap } from './components/CorrelationHeatmap';
import { VaRHistoryChart } from './components/VaRHistoryChart';
import { getGlobalMfeBus, type PortfolioRiskSummary } from '@foliolive/shared-types';

export interface RiskAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

export function RiskApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: RiskAppProps) {
  const [currentPortfolioId, setCurrentPortfolioId] = useState(portfolioId);
  const [riskMetrics, setRiskMetrics] = useState({
    parametricVaR95: 1_840_250,
    historicalVaR99: 2_610_000,
    expectedShortfall95: 2_420_000,
    portfolioBeta: 1.08,
  });

  // Cross-MFE Event Bus subscriptions
  useEffect(() => {
    setCurrentPortfolioId(portfolioId);

    const bus = getGlobalMfeBus();
    const unsubPortfolio = bus.subscribe('PORTFOLIO_CHANGED', (payload) => {
      setCurrentPortfolioId(payload.portfolioId);
    });

    const unsubRisk = bus.subscribe('RISK_LIVE_UPDATE', (summary: PortfolioRiskSummary) => {
      setRiskMetrics((prev) => ({
        ...prev,
        parametricVaR95: summary.var?.parametric?.confidence95 || prev.parametricVaR95,
        historicalVaR99: summary.var?.historical?.confidence99 || prev.historicalVaR99,
        expectedShortfall95: summary.var?.expectedShortfall95 || prev.expectedShortfall95,
        portfolioBeta: summary.beta || prev.portfolioBeta,
      }));
    });

    // Standalone gentle variance update
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isStandalone || bus.getState().connectionStatus !== 'CONNECTED') {
      timer = setInterval(() => {
        setRiskMetrics((prev) => {
          const delta = (Math.random() - 0.49) * 20_000;
          return {
            ...prev,
            parametricVaR95: Math.round(prev.parametricVaR95 + delta),
            historicalVaR99: Math.round(prev.historicalVaR99 + delta * 1.3),
            expectedShortfall95: Math.round(prev.expectedShortfall95 + delta * 1.2),
          };
        });
      }, 2000);
    }

    return () => {
      unsubPortfolio();
      unsubRisk();
      if (timer) clearInterval(timer);
    };
  }, [portfolioId, isStandalone]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Explainer Dialog */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            Institutional Risk Engine & Value-at-Risk (VaR)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Portfolio ID:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              {currentPortfolioId}
            </span>
            <span>•</span>
            <span>
              Confidence Intervals:{' '}
              <strong className="text-slate-900 dark:text-white">95% & 99%</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStandalone && (
            <Badge variant="outline" className="text-xs">
              Standalone Mode
            </Badge>
          )}
          <MethodExplainerDialog />
        </div>
      </div>

      {/* VaR Metrics & Gauges */}
      <VaRMetricsCards
        portfolioAUM={125_430_800}
        parametricVaR95={riskMetrics.parametricVaR95}
        historicalVaR99={riskMetrics.historicalVaR99}
        expectedShortfall95={riskMetrics.expectedShortfall95}
        portfolioBeta={riskMetrics.portfolioBeta}
      />

      {/* D3 Exposure & Concentration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExposureBarChart />
        <ConcentrationChart />
      </div>

      {/* Correlation Heatmap & VaR Exceedance History Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <CorrelationHeatmap />
        </div>
        <div className="lg:col-span-7">
          <VaRHistoryChart />
        </div>
      </div>

      {/* Stress Testing Scenarios Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Historical Stress Testing Scenarios & Tail Shocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {[
              {
                name: '2008 GFC Repeat Scenario',
                magnitude: '-11.3%',
                impact: '-$14,173,000',
                risk: 'CRITICAL',
                badgeVariant: 'destructive' as const,
                desc: 'Credit spread blowout & correlated equity liquidation',
              },
              {
                name: 'Tech Sector Flash De-rating',
                magnitude: '-6.2%',
                impact: '-$7,776,000',
                risk: 'HIGH',
                badgeVariant: 'warning' as const,
                desc: 'Multiples compression across mega-cap semiconductors',
              },
              {
                name: 'Rates Shock (+100 bps Parallel)',
                magnitude: '-1.8%',
                impact: '-$2,257,000',
                risk: 'MODERATE',
                badgeVariant: 'outline' as const,
                desc: 'Duration repricing across fixed income & high-multiple growth',
              },
            ].map((scenario) => (
              <div
                key={scenario.name}
                className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white font-sans text-sm">
                      {scenario.name}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                      {scenario.desc}
                    </div>
                  </div>
                  <Badge variant={scenario.badgeVariant} className="text-[10px]">
                    {scenario.risk}
                  </Badge>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">P&L Impact:</span>
                  <span className="text-rose-700 dark:text-rose-400 font-bold">
                    {scenario.impact} ({scenario.magnitude})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RiskApp;
