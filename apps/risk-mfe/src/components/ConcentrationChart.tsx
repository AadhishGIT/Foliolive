import { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardContent } from '@foliolive/ui';
import { PieChart } from 'lucide-react';

interface AssetWeight {
  symbol: string;
  name: string;
  weight: number;
}

const TOP_HOLDINGS: AssetWeight[] = [
  { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 11.7 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 8.0 },
  { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.4 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 6.5 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 5.6 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 4.7 },
  { symbol: 'LLY', name: 'Eli Lilly and Co.', weight: 4.2 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', weight: 3.8 },
  { symbol: 'V', name: 'Visa Inc.', weight: 3.5 },
  { symbol: 'UNH', name: 'UnitedHealth Group', weight: 3.2 },
];

export function ConcentrationChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 440, height: 260 });
  const [hoveredAsset, setHoveredAsset] = useState<AssetWeight | null>(null);

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

  const margin = { top: 15, right: 30, bottom: 20, left: 60 };
  const chartWidth = Math.max(dimensions.width - margin.left - margin.right, 180);
  const chartHeight = Math.max(dimensions.height - margin.top - margin.bottom, 150);

  const top5Total = useMemo(() => TOP_HOLDINGS.slice(0, 5).reduce((s, a) => s + a.weight, 0), []);

  // Scales
  const yScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(TOP_HOLDINGS.map((d) => d.symbol))
      .range([0, chartHeight])
      .padding(0.25);
  }, [chartHeight]);

  const xScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([0, 15]) // 15% single asset policy cap
      .range([0, chartWidth]);
  }, [chartWidth]);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-400" />
            Top 10 Concentration & Single-Asset Cap
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">
            Top 5: <strong className="text-white">{top5Total.toFixed(1)}%</strong>
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2">
        <div ref={containerRef} className="w-full relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            role="graphics-document"
            aria-label="Top 10 assets concentration bar chart"
            className="overflow-visible select-none"
          >
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Single Asset Cap Limit Line (15%) */}
              <line
                x1={xScale(15)}
                y1={0}
                x2={xScale(15)}
                y2={chartHeight}
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <text
                x={xScale(15) - 4}
                y={-4}
                textAnchor="end"
                className="text-[9px] font-mono fill-rose-400 font-bold"
              >
                15% Policy Cap
              </text>

              {/* Horizontal Bars */}
              {TOP_HOLDINGS.map((asset) => {
                const y = yScale(asset.symbol) || 0;
                const barH = yScale.bandwidth();
                const barW = xScale(asset.weight);
                const isHovered = hoveredAsset?.symbol === asset.symbol;

                return (
                  <g key={asset.symbol}>
                    {/* Y label */}
                    <text
                      x={-8}
                      y={y + barH / 2}
                      dy="0.32em"
                      textAnchor="end"
                      className="text-[11px] font-mono font-bold fill-slate-300"
                    >
                      {asset.symbol}
                    </text>

                    {/* Bar */}
                    <rect
                      x={0}
                      y={y}
                      width={barW}
                      height={barH}
                      fill={isHovered ? '#818cf8' : '#6366f1'}
                      rx={2}
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${asset.symbol} (${asset.name}): ${asset.weight}%`}
                      className="cursor-pointer transition-colors focus:outline-none"
                      onMouseEnter={() => setHoveredAsset(asset)}
                      onMouseLeave={() => setHoveredAsset(null)}
                      onFocus={() => setHoveredAsset(asset)}
                      onBlur={() => setHoveredAsset(null)}
                    />

                    {/* Value text inside/beside bar */}
                    <text
                      x={barW + 6}
                      y={y + barH / 2}
                      dy="0.32em"
                      className="text-[10px] font-mono fill-slate-400 font-semibold"
                    >
                      {asset.weight.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Tooltip */}
          {hoveredAsset && (
            <div className="absolute top-2 right-2 bg-slate-900 border border-slate-700 rounded-md p-2 shadow-lg text-xs font-mono pointer-events-none z-20">
              <div className="text-white font-bold">{hoveredAsset.symbol}</div>
              <div className="text-slate-400 text-[11px]">{hoveredAsset.name}</div>
              <div className="text-purple-400 font-semibold mt-0.5">
                Allocation: {hoveredAsset.weight}%
              </div>
            </div>
          )}
        </div>

        {/* Screen reader table alternative */}
        <table className="sr-only">
          <caption>Top 10 Institutional Asset Weights</caption>
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Company Name</th>
              <th scope="col">Portfolio Weight (%)</th>
            </tr>
          </thead>
          <tbody>
            {TOP_HOLDINGS.map((a) => (
              <tr key={a.symbol}>
                <td>{a.symbol}</td>
                <td>{a.name}</td>
                <td>{a.weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
