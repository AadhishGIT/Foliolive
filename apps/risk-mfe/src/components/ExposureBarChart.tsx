import { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@foliolive/ui';
import { BarChart3 } from 'lucide-react';

export interface ExposureItem {
  name: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  limitCap: number;
  patternId: string;
  color: string;
}

const DEFAULT_SECTOR_EXPOSURES: ExposureItem[] = [
  {
    name: 'Technology',
    portfolioWeight: 34.2,
    benchmarkWeight: 28.5,
    limitCap: 40.0,
    patternId: 'pat-stripes',
    color: '#3b82f6',
  },
  {
    name: 'Financials',
    portfolioWeight: 18.5,
    benchmarkWeight: 14.2,
    limitCap: 25.0,
    patternId: 'pat-dots',
    color: '#10b981',
  },
  {
    name: 'Healthcare',
    portfolioWeight: 15.1,
    benchmarkWeight: 12.8,
    limitCap: 20.0,
    patternId: 'pat-cross',
    color: '#8b5cf6',
  },
  {
    name: 'Cons. Disc.',
    portfolioWeight: 12.4,
    benchmarkWeight: 10.5,
    limitCap: 20.0,
    patternId: 'pat-diag',
    color: '#f59e0b',
  },
  {
    name: 'Energy',
    portfolioWeight: 7.8,
    benchmarkWeight: 6.2,
    limitCap: 15.0,
    patternId: 'pat-grid',
    color: '#06b6d4',
  },
  {
    name: 'Industrials',
    portfolioWeight: 6.5,
    benchmarkWeight: 8.8,
    limitCap: 15.0,
    patternId: 'pat-vert',
    color: '#f97316',
  },
  {
    name: 'Utilities',
    portfolioWeight: 5.5,
    benchmarkWeight: 3.5,
    limitCap: 10.0,
    patternId: 'pat-checker',
    color: '#14b8a6',
  },
];

const DEFAULT_ASSET_CLASS_EXPOSURES: ExposureItem[] = [
  {
    name: 'Equities',
    portfolioWeight: 78.5,
    benchmarkWeight: 75.0,
    limitCap: 85.0,
    patternId: 'pat-stripes',
    color: '#3b82f6',
  },
  {
    name: 'Fixed Income',
    portfolioWeight: 14.8,
    benchmarkWeight: 20.0,
    limitCap: 30.0,
    patternId: 'pat-dots',
    color: '#10b981',
  },
  {
    name: 'Commodities',
    portfolioWeight: 4.2,
    benchmarkWeight: 3.0,
    limitCap: 10.0,
    patternId: 'pat-cross',
    color: '#f59e0b',
  },
  {
    name: 'Cash / Deriv.',
    portfolioWeight: 2.5,
    benchmarkWeight: 2.0,
    limitCap: 10.0,
    patternId: 'pat-diag',
    color: '#8b5cf6',
  },
];

export function ExposureBarChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'sector' | 'assetClass'>('sector');
  const [dimensions, setDimensions] = useState({ width: 480, height: 260 });
  const [hoveredItem, setHoveredItem] = useState<ExposureItem | null>(null);

  const data = viewMode === 'sector' ? DEFAULT_SECTOR_EXPOSURES : DEFAULT_ASSET_CLASS_EXPOSURES;

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

  const margin = { top: 20, right: 20, bottom: 45, left: 45 };
  const chartWidth = Math.max(dimensions.width - margin.left - margin.right, 200);
  const chartHeight = Math.max(dimensions.height - margin.top - margin.bottom, 120);

  // Scales
  const xScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, chartWidth])
      .padding(0.3);
  }, [data, chartWidth]);

  const yScale = useMemo(() => {
    const maxVal = d3.max(data, (d) => Math.max(d.portfolioWeight, d.limitCap)) || 40;
    return d3
      .scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([chartHeight, 0]);
  }, [data, chartHeight]);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Exposure vs Policy Limit (D3 Bars)
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'sector' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('sector')}
              className="text-[11px] px-2 py-0.5 h-6"
            >
              Sectors
            </Button>
            <Button
              variant={viewMode === 'assetClass' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('assetClass')}
              className="text-[11px] px-2 py-0.5 h-6"
            >
              Asset Classes
            </Button>
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
            aria-label={`${viewMode === 'sector' ? 'Sector' : 'Asset Class'} exposure bar chart with policy limits`}
            className="overflow-visible select-none"
          >
            <defs>
              <pattern
                id="pat-stripes"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />
              </pattern>
              <pattern id="pat-dots" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.2" fill="#ffffff" fillOpacity="0.3" />
              </pattern>
              <pattern id="pat-cross" width="6" height="6" patternUnits="userSpaceOnUse">
                <path
                  d="M 0 0 L 6 6 M 6 0 L 0 6"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.25"
                />
              </pattern>
              <pattern
                id="pat-diag"
                width="6"
                height="6"
                patternTransform="rotate(-45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />
              </pattern>
              <pattern id="pat-grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect
                  x="0"
                  y="0"
                  width="6"
                  height="6"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.25"
                />
              </pattern>
              <pattern id="pat-vert" width="6" height="6" patternUnits="userSpaceOnUse">
                <line
                  x1="3"
                  y1="0"
                  x2="3"
                  y2="6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />
              </pattern>
              <pattern id="pat-checker" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="3" height="3" fill="#ffffff" fillOpacity="0.25" />
                <rect x="3" y="3" width="3" height="3" fill="#ffffff" fillOpacity="0.25" />
              </pattern>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Y Grid lines */}
              {yScale.ticks(4).map((tick) => (
                <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                  <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#1e293b" strokeWidth={1} />
                  <text
                    x={-8}
                    dy="0.32em"
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {tick}%
                  </text>
                </g>
              ))}

              {/* Bars */}
              {data.map((item) => {
                const x = xScale(item.name) || 0;
                const barW = xScale.bandwidth();
                const y = yScale(item.portfolioWeight);
                const h = chartHeight - y;
                const isHovered = hoveredItem?.name === item.name;

                return (
                  <g key={item.name}>
                    {/* Benchmark ghost background */}
                    <rect
                      x={x - 2}
                      y={yScale(item.benchmarkWeight)}
                      width={barW + 4}
                      height={chartHeight - yScale(item.benchmarkWeight)}
                      fill="#334155"
                      opacity={0.3}
                      rx={3}
                    />

                    {/* Main Exposure Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      fill={item.color}
                      rx={3}
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${item.name}: Portfolio ${item.portfolioWeight}%, Benchmark ${item.benchmarkWeight}%, Cap ${item.limitCap}%`}
                      className="cursor-pointer transition-all duration-150 focus:outline-none"
                      stroke={isHovered ? '#ffffff' : '#0f172a'}
                      strokeWidth={isHovered ? 2 : 1}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onFocus={() => setHoveredItem(item)}
                      onBlur={() => setHoveredItem(null)}
                    />

                    {/* Pattern Overlay for Accessibility */}
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      fill={`url(#${item.patternId})`}
                      pointerEvents="none"
                      rx={3}
                    />

                    {/* Policy Cap Limit Marker */}
                    <line
                      x1={x - 4}
                      y1={yScale(item.limitCap)}
                      x2={x + barW + 4}
                      y2={yScale(item.limitCap)}
                      stroke="#f43f5e"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                    />

                    {/* X-axis label */}
                    <text
                      x={x + barW / 2}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-slate-400"
                    >
                      {item.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Tooltip */}
          {hoveredItem && (
            <div className="absolute top-2 right-2 bg-slate-900 border border-slate-700 rounded-md p-2 shadow-lg text-xs font-mono pointer-events-none z-20">
              <div className="text-white font-bold">{hoveredItem.name}</div>
              <div className="text-blue-400">Portfolio: {hoveredItem.portfolioWeight}%</div>
              <div className="text-slate-400">Benchmark: {hoveredItem.benchmarkWeight}%</div>
              <div className="text-rose-400 font-semibold">Policy Cap: {hoveredItem.limitCap}%</div>
            </div>
          )}
        </div>

        {/* Accessible screen-reader table */}
        <table className="sr-only">
          <caption>{viewMode === 'sector' ? 'Sector' : 'Asset Class'} Exposure vs Limits</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Portfolio Weight (%)</th>
              <th scope="col">Benchmark (%)</th>
              <th scope="col">Policy Limit (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.portfolioWeight}%</td>
                <td>{d.benchmarkWeight}%</td>
                <td>{d.limitCap}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
