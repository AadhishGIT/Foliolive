import * as React from 'react';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface StatMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: number;
  deltaPercent?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  invertTrendColor?: boolean; // e.g. for VaR or risk where higher is worse
}

export function StatMetric({
  label,
  value,
  delta,
  deltaPercent,
  unit,
  trend,
  invertTrendColor = false,
  className,
  ...props
}: StatMetricProps) {
  const computedTrend =
    trend ??
    (delta !== undefined ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral') : undefined);

  const isPositive = computedTrend === 'up';
  const isNegative = computedTrend === 'down';

  const trendColor = (() => {
    if (!computedTrend || computedTrend === 'neutral') return 'text-slate-400';
    if (invertTrendColor) {
      return isPositive ? 'text-rose-400' : 'text-emerald-400';
    }
    return isPositive ? 'text-emerald-400' : 'text-rose-400';
  })();

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between',
        className
      )}
      {...props}
    >
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value}
          {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
        </span>
        {deltaPercent !== undefined && (
          <span
            className={cn('text-xs font-mono font-medium flex items-center gap-0.5', trendColor)}
          >
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5" />}
            {computedTrend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            {Math.abs(deltaPercent).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
