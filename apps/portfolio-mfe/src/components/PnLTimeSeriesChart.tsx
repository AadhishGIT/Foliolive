import { useRef, useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@foliolive/ui';
import { TrendingUp, ZoomIn } from 'lucide-react';

export interface PnLPoint {
  date: Date;
  dateStr: string;
  cumulativePnL: number;
  dailyPnL: number;
  totalAUM: number;
}

export interface PnLTimeSeriesChartProps {
  initialAUM?: number;
}

// Generate realistic daily historical portfolio P&L data for 250 trading days (~1 year)
function generateHistoricalPnL(initialAUM = 125_430_800): PnLPoint[] {
  const points: PnLPoint[] = [];
  const days = 250;
  let runningPnL = 0;
  const now = new Date();

  // Deterministic seed
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dailyReturn = (rnd() - 0.48) * 0.015; // slight positive drift
    const dailyPnL = initialAUM * dailyReturn;
    runningPnL += dailyPnL;

    points.push({
      date: d,
      dateStr: d.toISOString().split('T')[0] ?? '',
      cumulativePnL: Math.round(runningPnL),
      dailyPnL: Math.round(dailyPnL),
      totalAUM: Math.round(initialAUM + runningPnL),
    });
  }

  return points;
}

export function PnLTimeSeriesChart({ initialAUM = 125_430_800 }: PnLTimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 280 });
  const [hoveredPoint, setHoveredPoint] = useState<PnLPoint | null>(null);

  const fullData = useMemo(() => generateHistoricalPnL(initialAUM), [initialAUM]);
  const [windowRange, setWindowRange] = useState<[number, number]>([0, fullData.length - 1]);

  // Windowed data slice
  const visibleData = useMemo(() => {
    return fullData.slice(windowRange[0], windowRange[1] + 1);
  }, [fullData, windowRange]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100) {
          setDimensions({
            width: entry.contentRect.width,
            height: 280,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const margin = { top: 15, right: 20, bottom: 65, left: 65 };
  const chartWidth = Math.max(dimensions.width - margin.left - margin.right, 200);
  const chartHeight = Math.max(dimensions.height - margin.top - margin.bottom, 120);

  // Scales
  const xScale = useMemo(() => {
    const dates = visibleData.map((d) => d.date);
    return d3
      .scaleTime()
      .domain([dates[0] || new Date(), dates[dates.length - 1] || new Date()])
      .range([0, chartWidth]);
  }, [visibleData, chartWidth]);

  const yScale = useMemo(() => {
    const pnlVals = visibleData.map((d) => d.cumulativePnL);
    const min = Math.min(0, d3.min(pnlVals) || 0);
    const max = Math.max(0, d3.max(pnlVals) || 1000);
    const pad = (max - min) * 0.1 || 1000;
    return d3
      .scaleLinear()
      .domain([min - pad, max + pad])
      .range([chartHeight, 0]);
  }, [visibleData, chartHeight]);

  // D3 Area and Line Generators
  const lineGenerator = useMemo(
    () =>
      d3
        .line<PnLPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.cumulativePnL))
        .curve(d3.curveMonotoneX),
    [xScale, yScale]
  );

  const areaGenerator = useMemo(
    () =>
      d3
        .area<PnLPoint>()
        .x((d) => xScale(d.date))
        .y0(yScale(0))
        .y1((d) => yScale(d.cumulativePnL))
        .curve(d3.curveMonotoneX),
    [xScale, yScale]
  );

  // Time preset buttons
  const applyPreset = (days: number) => {
    if (days >= fullData.length) {
      setWindowRange([0, fullData.length - 1]);
    } else {
      setWindowRange([fullData.length - days, fullData.length - 1]);
    }
  };

  const currentPnL = visibleData[visibleData.length - 1]?.cumulativePnL || 0;
  const isPositive = currentPnL >= 0;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Cumulative P&L Over Time (D3 Brush & Zoom)
            </CardTitle>
            <div className="text-xs text-slate-400 mt-0.5">
              Current Period:{' '}
              <strong
                className={isPositive ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}
              >
                {isPositive ? '+' : ''}${Math.round(currentPnL).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Time range presets */}
          <div className="flex items-center gap-1">
            {[
              { label: '1W', days: 5 },
              { label: '1M', days: 22 },
              { label: '3M', days: 65 },
              { label: '6M', days: 130 },
              { label: 'ALL', days: 250 },
            ].map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.days)}
                className="text-[11px] px-2 py-0.5 h-6 border-slate-700 bg-slate-900"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2">
        <div ref={containerRef} className="w-full relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            role="graphics-document"
            aria-label="Portfolio Cumulative P&L time series chart"
            className="overflow-visible select-none"
          >
            <defs>
              <linearGradient id="pnlGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="pnlGradientNegative" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Zero baseline */}
              <line
                x1={0}
                y1={yScale(0)}
                x2={chartWidth}
                y2={yScale(0)}
                stroke="#475569"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              {/* Y-Axis Grid Lines & Labels */}
              {yScale.ticks(5).map((tick) => (
                <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                  <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#1e293b" strokeWidth={1} />
                  <text
                    x={-8}
                    dy="0.32em"
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    ${(tick / 1_000_000).toFixed(1)}M
                  </text>
                </g>
              ))}

              {/* X-Axis Labels */}
              {xScale.ticks(5).map((tick) => (
                <g key={tick.getTime()} transform={`translate(${xScale(tick)}, ${chartHeight})`}>
                  <line x1={0} y1={0} x2={0} y2={4} stroke="#475569" />
                  <text
                    x={0}
                    y={16}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {d3.timeFormat('%b %d')(tick)}
                  </text>
                </g>
              ))}

              {/* Area fill under curve */}
              <path
                d={areaGenerator(visibleData) || ''}
                fill={isPositive ? 'url(#pnlGradientPositive)' : 'url(#pnlGradientNegative)'}
              />

              {/* Curve Line */}
              <path
                d={lineGenerator(visibleData) || ''}
                fill="none"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2.5}
              />

              {/* Hover Crosshair & Tooltip */}
              {hoveredPoint && (
                <g>
                  <line
                    x1={xScale(hoveredPoint.date)}
                    y1={0}
                    x2={xScale(hoveredPoint.date)}
                    y2={chartHeight}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <circle
                    cx={xScale(hoveredPoint.date)}
                    cy={yScale(hoveredPoint.cumulativePnL)}
                    r={5}
                    fill={hoveredPoint.cumulativePnL >= 0 ? '#10b981' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </g>
              )}

              {/* Interactive invisible overlay for smooth hover */}
              <rect
                x={0}
                y={0}
                width={chartWidth}
                height={chartHeight}
                fill="transparent"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const hoveredDate = xScale.invert(mouseX);
                  const bisect = d3.bisector<PnLPoint, Date>((d) => d.date).center;
                  const index = bisect(visibleData, hoveredDate);
                  if (visibleData[index]) {
                    setHoveredPoint(visibleData[index]);
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />

              {/* Brush Navigation Mini-Overview Bar */}
              <g transform={`translate(0, ${chartHeight + 32})`}>
                <rect
                  x={0}
                  y={0}
                  width={chartWidth}
                  height={14}
                  fill="#0f172a"
                  stroke="#1e293b"
                  rx={3}
                />
                {/* Active window indicator slider */}
                <rect
                  x={(windowRange[0] / fullData.length) * chartWidth}
                  y={1}
                  width={((windowRange[1] - windowRange[0]) / fullData.length) * chartWidth}
                  height={12}
                  fill="#3b82f6"
                  opacity={0.6}
                  rx={2}
                />
                <text
                  x={chartWidth / 2}
                  y={24}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-500"
                >
                  <ZoomIn className="w-2.5 h-2.5 inline mr-1" />
                  Full 250-Day Trading History Window
                </text>
              </g>
            </g>
          </svg>

          {/* Floating Tooltip Callout */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none bg-slate-900 border border-slate-700 rounded-md p-2 shadow-xl text-xs font-mono z-30"
              style={{
                left: `${Math.min(
                  margin.left + xScale(hoveredPoint.date) + 12,
                  dimensions.width - 160
                )}px`,
                top: `${margin.top + 10}px`,
              }}
            >
              <div className="text-slate-400 font-sans text-[11px]">{hoveredPoint.dateStr}</div>
              <div className="text-white font-bold">
                AUM: ${(hoveredPoint.totalAUM / 1_000_000).toFixed(2)}M
              </div>
              <div
                className={hoveredPoint.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}
              >
                P&L: {hoveredPoint.cumulativePnL >= 0 ? '+' : ''}$
                {hoveredPoint.cumulativePnL.toLocaleString()}
              </div>
              <div className="text-slate-400 text-[10px]">
                Daily: {hoveredPoint.dailyPnL >= 0 ? '+' : ''}$
                {hoveredPoint.dailyPnL.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Screen-reader accessible alternative table */}
        <table className="sr-only">
          <caption>Historical Portfolio P&L Summary</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Cumulative P&L (USD)</th>
              <th scope="col">Daily P&L (USD)</th>
              <th scope="col">Total AUM (USD)</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.slice(-10).map((p) => (
              <tr key={p.dateStr}>
                <td>{p.dateStr}</td>
                <td>${p.cumulativePnL.toLocaleString()}</td>
                <td>${p.dailyPnL.toLocaleString()}</td>
                <td>${p.totalAUM.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
