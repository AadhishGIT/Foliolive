import { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardContent } from '@foliolive/ui';
import { ShieldAlert } from 'lucide-react';

interface DailyVaRPoint {
  date: Date;
  dateStr: string;
  dailyReturnPercent: number;
  var95Percent: number;
  var99Percent: number;
  isBreach95: boolean;
  isBreach99: boolean;
}

// Deterministic generator of 100 trading days with known VaR bounds
function generateVaRHistory(): DailyVaRPoint[] {
  const points: DailyVaRPoint[] = [];
  const now = new Date();
  let seed = 98765;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 100; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // Daily return centered near 0 with ~1.1% volatility
    const ret = (rnd() - 0.49) * 2.8;
    const var95 = -1.65; // -1.65% 95% 1-day threshold
    const var99 = -2.33; // -2.33% 99% 1-day threshold

    const isBreach95 = ret < var95;
    const isBreach99 = ret < var99;

    points.push({
      date: d,
      dateStr: d.toISOString().split('T')[0] ?? '',
      dailyReturnPercent: +ret.toFixed(2),
      var95Percent: var95,
      var99Percent: var99,
      isBreach95,
      isBreach99,
    });
  }
  return points;
}

export function VaRHistoryChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 260 });
  const [hoveredPoint, setHoveredPoint] = useState<DailyVaRPoint | null>(null);

  const data = useMemo(() => generateVaRHistory(), []);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          setDimensions({
            width: entry.contentRect.width,
            height: 260,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const margin = { top: 20, right: 25, bottom: 35, left: 55 };
  const chartWidth = Math.max(dimensions.width - margin.left - margin.right, 200);
  const chartHeight = Math.max(dimensions.height - margin.top - margin.bottom, 120);

  const xScale = useMemo(() => {
    const dates = data.map((d) => d.date);
    return d3
      .scaleTime()
      .domain([dates[0] || new Date(), dates[dates.length - 1] || new Date()])
      .range([0, chartWidth]);
  }, [data, chartWidth]);

  const yScale = useMemo(() => {
    return d3.scaleLinear().domain([-3.5, 2.5]).range([chartHeight, 0]);
  }, [chartHeight]);

  const breachCount95 = data.filter((d) => d.isBreach95).length;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            VaR Backtesting & Exceedance History (Kupiec Standard)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">95% Breaches:</span>
            <strong className="text-amber-400">
              {breachCount95} / {data.length} ({((breachCount95 / data.length) * 100).toFixed(1)}%)
            </strong>
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
            aria-label="VaR backtesting chart with breach markers"
            className="overflow-visible select-none"
          >
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Zero Return Line */}
              <line
                x1={0}
                y1={yScale(0)}
                x2={chartWidth}
                y2={yScale(0)}
                stroke="#475569"
                strokeWidth={1}
              />

              {/* 95% VaR Threshold Line */}
              <line
                x1={0}
                y1={yScale(-1.65)}
                x2={chartWidth}
                y2={yScale(-1.65)}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={chartWidth - 4}
                y={yScale(-1.65) - 4}
                textAnchor="end"
                className="text-[9px] font-mono fill-amber-400 font-bold"
              >
                95% VaR (-1.65%)
              </text>

              {/* 99% VaR Threshold Line */}
              <line
                x1={0}
                y1={yScale(-2.33)}
                x2={chartWidth}
                y2={yScale(-2.33)}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={chartWidth - 4}
                y={yScale(-2.33) - 4}
                textAnchor="end"
                className="text-[9px] font-mono fill-rose-400 font-bold"
              >
                99% VaR (-2.33%)
              </text>

              {/* Y Axis Grid & Labels */}
              {[-3, -2, -1, 0, 1, 2].map((tick) => (
                <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                  <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#1e293b" strokeWidth={1} />
                  <text
                    x={-8}
                    dy="0.32em"
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {tick > 0 ? `+${tick}` : tick}%
                  </text>
                </g>
              ))}

              {/* X Axis Date Labels */}
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

              {/* Daily Return Bars */}
              {data.map((pt) => {
                const x = xScale(pt.date);
                const y0 = yScale(0);
                const y1 = yScale(pt.dailyReturnPercent);
                const y = Math.min(y0, y1);
                const h = Math.abs(y1 - y0);

                return (
                  <rect
                    key={pt.dateStr}
                    x={x - 2}
                    y={y}
                    width={4}
                    height={Math.max(h, 2)}
                    fill={pt.dailyReturnPercent >= 0 ? '#3b82f6' : '#64748b'}
                    opacity={0.6}
                    rx={1}
                  />
                );
              })}

              {/* Exceedance Breach Markers (Kupiec failures) */}
              {data
                .filter((d) => d.isBreach95)
                .map((pt) => {
                  const cx = xScale(pt.date);
                  const cy = yScale(pt.dailyReturnPercent);
                  const isSevere = pt.isBreach99;

                  return (
                    <circle
                      key={`breach_${pt.dateStr}`}
                      cx={cx}
                      cy={cy}
                      r={isSevere ? 5 : 4}
                      fill={isSevere ? '#ef4444' : '#f59e0b'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`Breach on ${pt.dateStr}: return ${pt.dailyReturnPercent}%`}
                      className="cursor-pointer focus:outline-none"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() => setHoveredPoint(pt)}
                      onBlur={() => setHoveredPoint(null)}
                    />
                  );
                })}
            </g>
          </svg>

          {/* Floating Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 left-16 bg-slate-900 border border-slate-700 rounded-md p-2 shadow-lg text-xs font-mono pointer-events-none z-20">
              <div className="text-white font-bold">{hoveredPoint.dateStr}</div>
              <div
                className={hoveredPoint.isBreach95 ? 'text-rose-400 font-bold' : 'text-blue-400'}
              >
                Daily Return: {hoveredPoint.dailyReturnPercent}%
              </div>
              <div className="text-amber-400 text-[11px]">
                {hoveredPoint.isBreach99
                  ? 'CRITICAL: Breached 99% VaR (-2.33%)'
                  : hoveredPoint.isBreach95
                    ? 'WARNING: Breached 95% VaR (-1.65%)'
                    : 'Within VaR limits'}
              </div>
            </div>
          )}
        </div>

        {/* Screen reader table alternative */}
        <table className="sr-only">
          <caption>VaR Exceedance Backtesting Log</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Daily Return (%)</th>
              <th scope="col">VaR 95% Limit (%)</th>
              <th scope="col">Breach Status</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-10).map((d) => (
              <tr key={d.dateStr}>
                <td>{d.dateStr}</td>
                <td>{d.dailyReturnPercent}%</td>
                <td>{d.var95Percent}%</td>
                <td>{d.isBreach99 ? '99% Breach' : d.isBreach95 ? '95% Breach' : 'Normal'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
