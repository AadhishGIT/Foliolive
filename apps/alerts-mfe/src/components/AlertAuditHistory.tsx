import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@foliolive/ui';
import { History } from 'lucide-react';

export interface AuditRecord {
  id: string;
  portfolioId: string;
  policyName: string;
  triggeredAt: string;
  resolvedAt: string;
  peakValue: string;
  limitThreshold: string;
  outcome: 'RECOVERED_NATURAL' | 'ACKNOWLEDGED_PM' | 'PORTFOLIO_REBALANCED';
}

const DEFAULT_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'aud_01',
    portfolioId: 'port_global_alpha_01',
    policyName: 'Tech Sector Exposure Cap',
    triggeredAt: '2026-10-14 09:42:15',
    resolvedAt: '2026-10-14 10:15:30',
    peakValue: '40.8%',
    limitThreshold: '40.0%',
    outcome: 'PORTFOLIO_REBALANCED',
  },
  {
    id: 'aud_02',
    portfolioId: 'port_global_alpha_01',
    policyName: 'NVDA Single Asset Cap',
    triggeredAt: '2026-10-14 11:05:00',
    resolvedAt: '2026-10-14 11:35:12',
    peakValue: '15.4%',
    limitThreshold: '15.0%',
    outcome: 'ACKNOWLEDGED_PM',
  },
  {
    id: 'aud_03',
    portfolioId: 'port_macro_hedge_02',
    policyName: 'Max Daily Drawdown Stop',
    triggeredAt: '2026-10-13 14:22:10',
    resolvedAt: '2026-10-13 15:45:00',
    peakValue: '-3.8%',
    limitThreshold: '-3.5%',
    outcome: 'RECOVERED_NATURAL',
  },
  {
    id: 'aud_04',
    portfolioId: 'port_tech_growth_03',
    policyName: 'Parametric VaR 95% Ceiling',
    triggeredAt: '2026-10-12 10:10:45',
    resolvedAt: '2026-10-12 12:00:20',
    peakValue: '$1,250,000',
    limitThreshold: '$1,200,000',
    outcome: 'ACKNOWLEDGED_PM',
  },
];

export function AlertAuditHistory() {
  const [filterPortfolio, setFilterPortfolio] = useState<string>('ALL');

  const filteredLogs = DEFAULT_AUDIT_LOGS.filter((log) => {
    if (filterPortfolio !== 'ALL' && log.portfolioId !== filterPortfolio) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <CardTitle className="text-sm font-semibold text-white">
              Historical Breach Audit Trail
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="audit-filter-select" className="text-xs text-slate-400 font-mono">
              Filter:
            </label>
            <select
              id="audit-filter-select"
              value={filterPortfolio}
              onChange={(e) => setFilterPortfolio(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 font-mono focus:outline-none"
            >
              <option value="ALL">All Portfolios</option>
              <option value="port_global_alpha_01">Global Alpha</option>
              <option value="port_macro_hedge_02">Macro Hedge</option>
              <option value="port_tech_growth_03">Tech Growth</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Trigger Time</th>
                <th className="p-3">Resolution Time</th>
                <th className="p-3">Portfolio</th>
                <th className="p-3">Breached Policy</th>
                <th className="p-3 text-right">Peak Level</th>
                <th className="p-3 text-right">Policy Limit</th>
                <th className="p-3 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 text-slate-300">{log.triggeredAt}</td>
                  <td className="p-3 text-slate-400">{log.resolvedAt}</td>
                  <td className="p-3 text-white font-semibold">{log.portfolioId}</td>
                  <td className="p-3 text-slate-300 font-sans">{log.policyName}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{log.peakValue}</td>
                  <td className="p-3 text-right text-slate-400">{log.limitThreshold}</td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={
                        log.outcome === 'PORTFOLIO_REBALANCED'
                          ? 'success'
                          : log.outcome === 'ACKNOWLEDGED_PM'
                            ? 'default'
                            : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {log.outcome.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
