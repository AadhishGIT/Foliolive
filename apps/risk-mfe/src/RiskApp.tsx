import { Card, CardHeader, CardTitle, CardContent, StatMetric, Badge } from '@foliolive/ui';
import { ShieldAlert, Activity, PieChart, Zap } from 'lucide-react';

export interface RiskAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

export function RiskApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: RiskAppProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Institutional Risk Engine
          </h2>
          <p className="text-xs text-slate-400">
            Portfolio ID: <span className="font-mono text-slate-300">{portfolioId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStandalone && <Badge variant="outline">Standalone Mode</Badge>}
          <Badge variant="warning">VaR 95% Within Limit</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatMetric
          label="Parametric VaR (95%)"
          value="$1,840,250"
          unit="(1.47%)"
          invertTrendColor={true}
          deltaPercent={-0.12}
          trend="down"
        />
        <StatMetric
          label="Historical VaR (99%)"
          value="$2,610,000"
          unit="(2.08%)"
          invertTrendColor={true}
          deltaPercent={0.05}
          trend="up"
        />
        <StatMetric
          label="Monte Carlo VaR (95%)"
          value="$1,910,400"
          unit="(1.52%)"
          invertTrendColor={true}
          deltaPercent={-0.08}
          trend="down"
        />
        <StatMetric
          label="Expected Shortfall (CVaR)"
          value="$2,420,000"
          unit="(1.93%)"
          invertTrendColor={true}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              Exposure & Concentration (HHI Index)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400">Herfindahl-Hirschman Index (HHI)</span>
              <span className="font-mono text-white font-bold">1,420 (Moderate Concentration)</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400">Top 5 Asset Concentration</span>
              <span className="font-mono text-white font-bold">48.2%</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400">Gross / Net Leverage</span>
              <span className="font-mono text-white font-bold">1.00x / 1.00x</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Portfolio Beta (vs S&P 500)</span>
              <span className="font-mono text-emerald-400 font-bold">1.08</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Stress Testing Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                name: '2008 Financial Crisis Repeat',
                impact: '-$14,200,000 (-11.3%)',
                risk: 'HIGH',
              },
              { name: 'Tech Sell-off (-15%)', impact: '-$7,420,000 (-5.9%)', risk: 'MEDIUM' },
              { name: 'Rates +100bps Shock', impact: '-$2,150,000 (-1.7%)', risk: 'LOW' },
            ].map((sc) => (
              <div
                key={sc.name}
                className="flex justify-between items-center p-2.5 rounded bg-slate-950/40 text-xs"
              >
                <div>
                  <div className="text-white font-medium">{sc.name}</div>
                  <div className="text-rose-400 font-mono mt-0.5">{sc.impact}</div>
                </div>
                <Badge
                  variant={
                    sc.risk === 'HIGH'
                      ? 'destructive'
                      : sc.risk === 'MEDIUM'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {sc.risk}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            VaR Distribution Surface (D3 Custom Canvas Ready)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs font-mono">
            [D3 Risk Surface & Historical VaR Percentile Histogram Canvas - Prepared for Phase 4]
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RiskApp;
