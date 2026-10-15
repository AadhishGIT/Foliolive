import { useRef, useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import type { HoldingPosition } from '../data/holdings-generator';
import { Card, CardHeader, CardTitle, CardContent } from '@foliolive/ui';
import { PieChart as PieIcon } from 'lucide-react';

export interface SectorAllocationChartProps {
  holdings: HoldingPosition[];
}

interface SectorSummary {
  sector: string;
  name: string;
  value: number;
  percent: number;
  count: number;
  color: string;
  patternId: string;
}

const SECTOR_PALETTE: { color: string; patternId: string }[] = [
  { color: '#3b82f6', patternId: 'pattern-stripes' }, // Blue - Technology
  { color: '#10b981', patternId: 'pattern-dots' }, // Emerald - Financials
  { color: '#8b5cf6', patternId: 'pattern-crosshatch' }, // Purple - Healthcare
  { color: '#f59e0b', patternId: 'pattern-diagonal' }, // Amber - Consumer Disc
  { color: '#ec4899', patternId: 'pattern-vertical' }, // Pink - Consumer Staples
  { color: '#06b6d4', patternId: 'pattern-grid' }, // Cyan - Energy
  { color: '#f97316', patternId: 'pattern-circles' }, // Orange - Industrials
  { color: '#14b8a6', patternId: 'pattern-checker' }, // Teal - Utilities
  { color: '#6366f1', patternId: 'pattern-waves' }, // Indigo - Materials
  { color: '#eab308', patternId: 'pattern-diamond' }, // Yellow - Real Estate
];

export function SectorAllocationChart({ holdings }: SectorAllocationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSector, setActiveSector] = useState<SectorSummary | null>(null);
  const [dimensions, setDimensions] = useState({ width: 340, height: 280 });

  // Group holdings by sector and calculate weights
  const sectorData: SectorSummary[] = useMemo(() => {
    const totalAUM = holdings.reduce((sum, h) => sum + h.marketValue, 0) || 1;
    const map = new Map<string, { value: number; count: number }>();

    for (const h of holdings) {
      const cur = map.get(h.sector) || { value: 0, count: 0 };
      map.set(h.sector, {
        value: cur.value + h.marketValue,
        count: cur.count + 1,
      });
    }

    const sorted = Array.from(map.entries())
      .map(([sector, data], idx) => {
        const pal = SECTOR_PALETTE[idx % SECTOR_PALETTE.length] || {
          color: '#3b82f6',
          patternId: 'pattern-stripes',
        };
        return {
          sector,
          name: sector.replace('_', ' '),
          value: data.value,
          percent: +((data.value / totalAUM) * 100).toFixed(1),
          count: data.count,
          color: pal.color,
          patternId: pal.patternId,
        };
      })
      .sort((a, b) => b.value - a.value);

    return sorted;
  }, [holdings]);

  // Responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 50) {
          setDimensions({
            width: Math.max(260, Math.min(width, 420)),
            height: 280,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const radius = Math.min(dimensions.width, dimensions.height) / 2 - 16;
  const innerRadius = radius * 0.62; // Donut cutout

  const pie = useMemo(
    () =>
      d3
        .pie<SectorSummary>()
        .value((d) => d.value)
        .sort(null)
        .padAngle(0.02),
    []
  );

  const arc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<SectorSummary>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3),
    [innerRadius, radius]
  );

  const hoverArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<SectorSummary>>()
        .innerRadius(innerRadius)
        .outerRadius(radius + 6)
        .cornerRadius(4),
    [innerRadius, radius]
  );

  const arcs = pie(sectorData);
  const currentSelection = activeSector || sectorData[0];

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Sector Diversification (D3 Donut)
          </CardTitle>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
            {sectorData.length} Sectors Monitored
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center p-2">
        <div ref={containerRef} className="w-full flex justify-center relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            role="graphics-document"
            aria-label="Sector allocation interactive donut chart"
            className="overflow-visible"
          >
            {/* Accessible SVG Pattern Definitions for Non-Color Differentiation */}
            <defs>
              <pattern
                id="pattern-stripes"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
              </pattern>
              <pattern id="pattern-dots" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1.5" fill="#ffffff" fillOpacity="0.35" />
              </pattern>
              <pattern id="pattern-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <path
                  d="M 0 0 L 8 8 M 8 0 L 0 8"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              </pattern>
              <pattern
                id="pattern-diagonal"
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
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
              </pattern>
              <pattern id="pattern-vertical" width="6" height="6" patternUnits="userSpaceOnUse">
                <line
                  x1="3"
                  y1="0"
                  x2="3"
                  y2="6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                />
              </pattern>
            </defs>

            <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2})`}>
              {arcs.map((slice) => {
                const isHovered = activeSector?.sector === slice.data.sector;
                const pathData = (isHovered ? hoverArc(slice) : arc(slice)) || '';

                return (
                  <g key={slice.data.sector}>
                    {/* Solid base color path */}
                    <path
                      d={pathData}
                      fill={slice.data.color}
                      className="transition-all duration-200 cursor-pointer focus:outline-none"
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${slice.data.name}: ${slice.data.percent}%, $${Math.round(
                        slice.data.value
                      ).toLocaleString()}`}
                      onMouseEnter={() => setActiveSector(slice.data)}
                      onMouseLeave={() => setActiveSector(null)}
                      onFocus={() => setActiveSector(slice.data)}
                      onBlur={() => setActiveSector(null)}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                    {/* Pattern texture overlay for accessibility */}
                    <path
                      d={pathData}
                      fill={`url(#${slice.data.patternId})`}
                      pointerEvents="none"
                      opacity={0.7}
                    />
                  </g>
                );
              })}

              {/* Center Callout Text */}
              {currentSelection && (
                <g className="pointer-events-none text-center">
                  <text
                    textAnchor="middle"
                    dy="-0.7em"
                    className="text-[11px] uppercase tracking-wider fill-slate-400 font-mono"
                  >
                    {currentSelection.name}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="0.6em"
                    className="text-lg font-bold fill-white font-mono"
                  >
                    {currentSelection.percent}%
                  </text>
                  <text
                    textAnchor="middle"
                    dy="2.0em"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    ${(currentSelection.value / 1_000_000).toFixed(1)}M
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 w-full text-xs font-mono max-h-24 overflow-y-auto px-2">
          {sectorData.slice(0, 6).map((s) => (
            <button
              key={s.sector}
              type="button"
              onMouseEnter={() => setActiveSector(s)}
              onMouseLeave={() => setActiveSector(null)}
              onClick={() => setActiveSector(s)}
              className="flex items-center justify-between py-1 min-h-[24px] hover:text-slate-900 dark:hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">
                  {s.name}
                </span>
              </div>
              <span className="text-slate-600 dark:text-slate-400 font-semibold">{s.percent}%</span>
            </button>
          ))}
        </div>

        {/* Accessible screen-reader table alternative */}
        <table className="sr-only">
          <caption>Portfolio Sector Allocation Breakdown</caption>
          <thead>
            <tr>
              <th scope="col">Sector</th>
              <th scope="col">Allocation (%)</th>
              <th scope="col">Market Value (USD)</th>
              <th scope="col">Holdings Count</th>
            </tr>
          </thead>
          <tbody>
            {sectorData.map((s) => (
              <tr key={s.sector}>
                <td>{s.name}</td>
                <td>{s.percent}%</td>
                <td>${s.value.toLocaleString()}</td>
                <td>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
