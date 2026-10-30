import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DeltaValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  percentage?: number;
  formatAs?: 'currency' | 'percent' | 'number';
  currency?: string;
  decimals?: number;
  percentageDecimals?: number;
  showArrow?: boolean;
  showSign?: boolean;
  neutralThreshold?: number;
}

export const DeltaValue = React.forwardRef<HTMLSpanElement, DeltaValueProps>(
  (
    {
      className,
      value,
      percentage,
      formatAs = 'currency',
      currency = 'USD',
      decimals = 2,
      percentageDecimals,
      showArrow = true,
      showSign = true,
      neutralThreshold = 0.0001,
      ...props
    },
    ref
  ) => {
    const isZero = Math.abs(value) <= neutralThreshold;
    const isPositive = !isZero && value > 0;
    const isNegative = !isZero && value < 0;

    const absValue = Math.abs(value);
    const absPercentage = percentage !== undefined ? Math.abs(percentage) : undefined;

    // Formatting value
    let formattedValue = '';
    if (formatAs === 'currency') {
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(absValue);
    } else if (formatAs === 'percent') {
      formattedValue = `${absValue.toFixed(decimals)}%`;
    } else {
      formattedValue = absValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    const sign = isPositive ? '+' : isNegative ? '-' : '';

    const colorClasses = isPositive
      ? 'text-emerald-700 dark:text-emerald-400'
      : isNegative
        ? 'text-red-700 dark:text-red-400'
        : 'text-slate-600 dark:text-slate-400';

    const pctDecimals = percentageDecimals ?? (formatAs === 'currency' ? 2 : decimals);

    // Screen reader accessible explanation
    const actionWord = isPositive ? 'gain' : isNegative ? 'loss' : 'unchanged';
    const accessibleLabel = `${actionWord} of ${sign}${formattedValue}${
      absPercentage !== undefined ? ` (${absPercentage.toFixed(pctDecimals)} percent)` : ''
    }`;

    return (
      <span
        ref={ref}
        aria-label={accessibleLabel}
        className={cn(
          'inline-flex items-center gap-1 font-mono text-sm tabular-nums font-medium',
          colorClasses,
          className
        )}
        {...props}
      >
        {showArrow && (
          <span className="shrink-0" aria-hidden="true">
            {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
            {isZero && <Minus className="h-3.5 w-3.5" />}
          </span>
        )}
        <span>
          {showSign && sign}
          {formattedValue}
        </span>
        {percentage !== undefined && (
          <span className="text-xs opacity-90 ml-0.5" aria-hidden="true">
            ({sign}
            {absPercentage?.toFixed(pctDecimals)}%)
          </span>
        )}
      </span>
    );
  }
);

DeltaValue.displayName = 'DeltaValue';
