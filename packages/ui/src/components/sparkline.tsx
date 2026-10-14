import * as React from 'react';
import { cn } from '../lib/utils';

export interface SparklineProps extends React.SVGAttributes<SVGSVGElement> {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showEndpoints?: boolean;
  showMinMax?: boolean;
  ariaLabel?: string;
}

export const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      className,
      data,
      width = 120,
      height = 32,
      strokeWidth = 1.5,
      color,
      showEndpoints = true,
      showMinMax = false,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    if (!data || data.length < 2) {
      return (
        <svg
          ref={ref}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={cn('inline-block text-muted-foreground opacity-50', className)}
          role="img"
          aria-label="Insufficient data for sparkline"
          {...props}
        >
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="currentColor"
            strokeDasharray="2 2"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;
    const innerHeight = height - padding * 2;
    const innerWidth = width - padding * 2;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * innerWidth;
      const y = height - padding - ((val - min) / range) * innerHeight;
      return { x, y, val };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }, '');

    const firstVal = data[0]!;
    const lastVal = data[data.length - 1]!;
    const isGain = lastVal >= firstVal;
    const pctChange = ((lastVal - firstVal) / (firstVal || 1)) * 100;

    const autoColor = isGain
      ? '#10b981' // emerald-500
      : '#ef4444'; // red-500

    const strokeColor = color || autoColor;

    const minPoint = points.reduce((prev, curr) => (curr.val < prev.val ? curr : prev), points[0]!);
    const maxPoint = points.reduce((prev, curr) => (curr.val > prev.val ? curr : prev), points[0]!);
    const startPoint = points[0]!;
    const endPoint = points[points.length - 1]!;

    const defaultAriaLabel =
      ariaLabel ||
      `Trend chart: ${isGain ? 'upward' : 'downward'} by ${Math.abs(pctChange).toFixed(1)}%, low ${min.toFixed(2)}, high ${max.toFixed(2)}`;

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={defaultAriaLabel}
        className={cn('inline-block overflow-visible', className)}
        {...props}
      >
        <title>{defaultAriaLabel}</title>
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showEndpoints && (
          <>
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={2}
              fill="currentColor"
              className="opacity-70 text-muted-foreground"
            />
            <circle cx={endPoint.x} cy={endPoint.y} r={2.5} fill={strokeColor} />
          </>
        )}
        {showMinMax && (
          <>
            <circle cx={minPoint.x} cy={minPoint.y} r={2} fill="#ef4444" opacity={0.8} />
            <circle cx={maxPoint.x} cy={maxPoint.y} r={2} fill="#10b981" opacity={0.8} />
          </>
        )}
      </svg>
    );
  }
);

Sparkline.displayName = 'Sparkline';
