import { Card, CardHeader, CardTitle, CardContent, StatMetric, Badge } from '@foliolive/ui';
import { Briefcase, TrendingUp, DollarSign } from 'lucide-react';

export interface PortfolioAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

export function PortfolioApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: PortfolioAppProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Portfolio Analytics & Holdings
          </h2>
          <p className="text-xs text-slate-400">
            Portfolio ID: <span className="font-mono text-slate-300">{portfolioId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStandalone && <Badge variant="outline">Standalone Mode</Badge>}
          <Badge variant="success">Simulated Feed Active</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatMetric label="Total AUM" value="$125,430,800" delta={482150.8} deltaPercent={0.38} />
        <StatMetric label="Unrealized P&L" value="+$14,210,350" deltaPercent={12.8} trend="up" />
        <StatMetric label="Realized P&L" value="+$3,820,400" deltaPercent={3.1} trend="up" />
        <StatMetric label="Cash Available" value="$8,420,000" unit="(6.7%)" trend="neutral" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Institutional Holdings Matrix (TanStack Virtual Grid Ready)
            </CardTitle>
            <span className="text-xs text-slate-400">10 Core Allocations</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase">
                <tr>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Asset</th>
                  <th className="p-3 text-right">Shares</th>
                  <th className="p-3 text-right">Entry Price</th>
                  <th className="p-3 text-right">Mark Price</th>
                  <th className="p-3 text-right">Market Value</th>
                  <th className="p-3 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  {
                    sym: 'AAPL',
                    name: 'Apple Inc.',
                    qty: '50,000',
                    entry: '$172.50',
                    mark: '$185.50',
                    mv: '$9,275,000',
                    pnl: '+$650,000 (+7.5%)',
                  },
                  {
                    sym: 'MSFT',
                    name: 'Microsoft Corp.',
                    qty: '35,000',
                    entry: '$395.20',
                    mark: '$420.20',
                    mv: '$14,707,000',
                    pnl: '+$875,000 (+6.3%)',
                  },
                  {
                    sym: 'NVDA',
                    name: 'NVIDIA Corp.',
                    qty: '80,000',
                    entry: '$110.40',
                    mark: '$125.00',
                    mv: '$10,000,000',
                    pnl: '+$1,168,000 (+13.2%)',
                  },
                  {
                    sym: 'GOOGL',
                    name: 'Alphabet Inc.',
                    qty: '40,000',
                    entry: '$162.80',
                    mark: '$175.80',
                    mv: '$7,032,000',
                    pnl: '+$520,000 (+8.0%)',
                  },
                  {
                    sym: 'AMZN',
                    name: 'Amazon.com Inc.',
                    qty: '45,000',
                    entry: '$170.20',
                    mark: '$182.40',
                    mv: '$8,208,000',
                    pnl: '+$549,000 (+7.2%)',
                  },
                ].map((row) => (
                  <tr key={row.sym} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                      {row.sym}
                    </td>
                    <td className="p-3 text-slate-300 font-sans">{row.name}</td>
                    <td className="p-3 text-right">{row.qty}</td>
                    <td className="p-3 text-right text-slate-400">{row.entry}</td>
                    <td className="p-3 text-right text-white font-bold">{row.mark}</td>
                    <td className="p-3 text-right text-slate-200">{row.mv}</td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">{row.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioApp;
