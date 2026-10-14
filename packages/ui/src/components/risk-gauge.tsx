import * as React from 'react';
import { cn } from '../lib/utils';

export interface RiskGaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  threshold: number;
  min?: number;
  max?: number;
  warningThresholdRatio?: number; // e.g. 0.85 = warning at 85% of threshold
  label?: string;
  unit?: string;
  formatValue?: (v: number) => string;
  size?: number;
}

export const RiskGauge = React.forwardRef<HTMLDivElement, RiskGaugeProps>(
  (
    {
      className,
      value,
      threshold,
      min = 0,
      max: customMax,
      warningThresholdRatio = 0.85,
      label = 'Risk Metric',
      unit = '',
      formatValue,
      size = 140,
      ...props
    },
    ref
  ) => {
    const max = customMax || Math.max(threshold * 1.3, value * 1.1, 100);
    const clampedValue = Math.min(Math.max(value, min), max);
    const percent = ((clampedValue - min) / (max - min)) * 100;
    const thresholdPercent = ((threshold - min) / (max - min)) * 100;

    const isBreached = value >= threshold;
    const isWarning = !isBreached && value >= threshold * warningThresholdRatio;

    const statusText = isBreached
      ? 'Limit Breached'
      : isWarning
        ? 'Approaching Limit'
        : 'Within Limit';

    const statusColor = isBreached
      ? 'text-red-500'
      : isWarning
        ? 'text-amber-500'
        : 'text-emerald-500';

    const arcStrokeColor = isBreached ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    // Semi-circle arc: from 180 deg to 0 deg
    const arcCircumference = Math.PI * radius;
    const strokeDashoffset = arcCircumference - (percent / 100) * arcCircumference;

    // Threshold indicator line coordinates
    const thresholdAngle = Math.PI - (Math.min(100, Math.max(0, thresholdPercent)) / 100) * Math.PI;
    const tickInnerR = radius - strokeWidth / 2 - 2;
    const tickOuterR = radius + strokeWidth / 2 + 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const tickX1 = centerX + tickInnerR * Math.cos(thresholdAngle);
    const tickY1 = centerY - tickInnerR * Math.sin(thresholdAngle);
    const tickX2 = centerX + tickOuterR * Math.cos(thresholdAngle);
    const tickY2 = centerY - tickOuterR * Math.sin(thresholdAngle);

    const displayVal = formatValue
      ? formatValue(value)
      : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
    const displayThreshold = formatValue
      ? formatValue(threshold)
      : `${threshold.toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;

    const valueText = `${label}: ${displayVal} of limit ${displayThreshold} (${statusText})`;

    return (
      <div
        ref={ref}
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        className={cn('flex flex-col items-center justify-center p-2 select-none', className)}
        {...props}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size * 0.65 }}
        >
          <svg
            width={size}
            height={size * 0.7}
            viewBox={`0 0 ${size} ${size * 0.7}`}
            className="overflow-visible"
            aria-hidden="true"
          >
            {/* Background Track */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke={arcStrokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={arcCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
            {/* Threshold Limit Marker */}
            <line
              x1={tickX1}
              y1={tickY1}
              x2={tickX2}
              y2={tickY2}
              stroke="#ef4444"
              strokeWidth={2}
            />
          </svg>

          {/* Central Value Readout */}
          <div className="absolute bottom-0 flex flex-col items-center">
            <span className="font-mono text-base font-bold text-foreground tabular-nums">
              {displayVal}
            </span>
            <span className={cn('text-[10px] font-semibold tracking-wider uppercase', statusColor)}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Caption with limit */}
        <div className="mt-1 flex items-center justify-between w-full px-2 text-[10px] text-muted-foreground">
          <span>Limit: {displayThreshold}</span>
          <span className="font-mono">{((value / threshold) * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  }
);

RiskGauge.displayName = 'RiskGauge';
