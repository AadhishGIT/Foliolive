import { StatMetric } from '@foliolive/ui';
import type { HoldingPosition } from '../data/holdings-generator';

export interface SummaryCardsProps {
  holdings: HoldingPosition[];
  cashBalance?: number;
}

export function SummaryCards({ holdings, cashBalance = 8_420_000 }: SummaryCardsProps) {
  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalUnrealizedPnL = holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0);
  const totalCostBasis = totalMarketValue - totalUnrealizedPnL || 1;
  const unrealizedPnLPercent = (totalUnrealizedPnL / totalCostBasis) * 100;

  const totalDailyChange = holdings.reduce((sum, h) => sum + h.dailyChange * h.quantity, 0);
  const prevMarketValue = totalMarketValue - totalDailyChange || 1;
  const dailyChangePercent = (totalDailyChange / prevMarketValue) * 100;

  const totalAUM = totalMarketValue + cashBalance;
  const cashPercent = (cashBalance / totalAUM) * 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatMetric
        label="Total Portfolio AUM"
        value={`$${(totalAUM / 1_000_000).toFixed(2)}M`}
        delta={totalDailyChange}
        deltaPercent={dailyChangePercent}
        trend={totalDailyChange >= 0 ? 'up' : 'down'}
      />

      <StatMetric
        label="Unrealized P&L"
        value={`${totalUnrealizedPnL >= 0 ? '+' : ''}$${(totalUnrealizedPnL / 1_000_000).toFixed(2)}M`}
        deltaPercent={unrealizedPnLPercent}
        trend={totalUnrealizedPnL >= 0 ? 'up' : 'down'}
      />

      <StatMetric
        label="Daily Change"
        value={`${totalDailyChange >= 0 ? '+' : ''}$${Math.round(totalDailyChange).toLocaleString()}`}
        deltaPercent={dailyChangePercent}
        trend={totalDailyChange >= 0 ? 'up' : 'down'}
      />

      <StatMetric
        label="Cash Reserve"
        value={`$${(cashBalance / 1_000_000).toFixed(2)}M`}
        unit={`(${cashPercent.toFixed(1)}%)`}
        trend="neutral"
      />
    </div>
  );
}
