import { useRef, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@foliolive/ui';
import { Activity } from 'lucide-react';

const SECTORS_SHORT = ['TECH', 'FIN', 'HC', 'CD', 'ENR', 'IND', 'UTIL'];

// Realistic correlation matrix between sectors
const CORRELATION_MATRIX = [
  [1.0, 0.58, 0.42, 0.72, 0.15, 0.65, 0.08], // TECH
  [0.58, 1.0, 0.48, 0.62, 0.45, 0.74, 0.28], // FIN
  [0.42, 0.48, 1.0, 0.38, 0.12, 0.52, 0.44], // HC
  [0.72, 0.62, 0.38, 1.0, 0.22, 0.68, 0.14], // CD
  [0.15, 0.45, 0.12, 0.22, 1.0, 0.55, 0.32], // ENR
  [0.65, 0.74, 0.52, 0.68, 0.55, 1.0, 0.35], // IND
  [0.08, 0.28, 0.44, 0.14, 0.32, 0.35, 1.0], // UTIL
];

// Helper to determine accessible cell background based on correlation
function getCorrelationColor(val: number): string {
  if (val === 1.0) return '#1e293b'; // Diagonal self-correlation
  if (val >= 0.7) return 'rgba(239, 68, 68, 0.85)'; // Strong positive - warm red
  if (val >= 0.5) return 'rgba(245, 158, 11, 0.75)'; // Moderate positive - amber
  if (val >= 0.3) return 'rgba(59, 130, 246, 0.6)'; // Weak positive - blue
  if (val >= 0.0) return 'rgba(100, 116, 139, 0.4)'; // Neutral - slate
  return 'rgba(16, 185, 129, 0.7)'; // Negative - emerald hedge
}

export function CorrelationHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 380, height: 300 });
  const [focusedCell, setFocusedCell] = useState<{
    row: string;
    col: string;
    val: number;
  } | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          const w = Math.min(entry.contentRect.width, 420);
          setDimensions({ width: w, height: 300 });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const n = SECTORS_SHORT.length;
  const margin = { top: 35, right: 15, bottom: 15, left: 45 };
  const matrixSize = Math.min(
    dimensions.width - margin.left - margin.right,
    dimensions.height - margin.top - margin.bottom
  );
  const cellSize = matrixSize / n;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Cross-Sector Correlation Heatmap (D3 Matrix)
          </CardTitle>
          <span className="text-[11px] text-slate-400 font-mono">
            {focusedCell
              ? `${focusedCell.row} x ${focusedCell.col}: ${focusedCell.val > 0 ? '+' : ''}${focusedCell.val.toFixed(2)}`
              : 'Hover / Focus cell'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2 flex flex-col items-center justify-center">
        <div ref={containerRef} className="w-full flex justify-center relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            role="grid"
            aria-label="Cross-sector correlation matrix"
            className="overflow-visible select-none"
          >
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Column Headers at top */}
              {SECTORS_SHORT.map((col, cIdx) => (
                <text
                  key={col}
                  x={cIdx * cellSize + cellSize / 2}
                  y={-8}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-slate-400"
                >
                  {col}
                </text>
              ))}

              {/* Matrix Grid */}
              {SECTORS_SHORT.map((rowName, rIdx) => (
                <g key={rowName}>
                  {/* Row Header at left */}
                  <text
                    x={-8}
                    y={rIdx * cellSize + cellSize / 2}
                    dy="0.32em"
                    textAnchor="end"
                    className="text-[10px] font-mono font-bold fill-slate-400"
                  >
                    {rowName}
                  </text>

                  {/* Row Cells */}
                  {SECTORS_SHORT.map((colName, cIdx) => {
                    const val = CORRELATION_MATRIX[rIdx]?.[cIdx] ?? 0;
                    const isDiagonal = rIdx === cIdx;
                    const isFocused = focusedCell?.row === rowName && focusedCell?.col === colName;

                    return (
                      <g
                        key={colName}
                        transform={`translate(${cIdx * cellSize}, ${rIdx * cellSize})`}
                      >
                        <rect
                          width={cellSize - 2}
                          height={cellSize - 2}
                          fill={getCorrelationColor(val)}
                          rx={3}
                          tabIndex={0}
                          role="gridcell"
                          aria-label={`Correlation between ${rowName} and ${colName} is ${val.toFixed(2)}`}
                          className={`cursor-pointer transition-all duration-150 focus:outline-none ${
                            isFocused ? 'ring-2 ring-white' : ''
                          }`}
                          stroke={isFocused ? '#ffffff' : '#0f172a'}
                          strokeWidth={isFocused ? 1.5 : 1}
                          onMouseEnter={() => setFocusedCell({ row: rowName, col: colName, val })}
                          onMouseLeave={() => setFocusedCell(null)}
                          onFocus={() => setFocusedCell({ row: rowName, col: colName, val })}
                          onBlur={() => setFocusedCell(null)}
                        />
                        <text
                          x={(cellSize - 2) / 2}
                          y={(cellSize - 2) / 2}
                          dy="0.32em"
                          textAnchor="middle"
                          pointerEvents="none"
                          className={`text-[9px] font-mono font-semibold ${
                            isDiagonal ? 'fill-slate-500' : 'fill-white'
                          }`}
                        >
                          {val.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-slate-400 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>&lt;0 (Hedge)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span>0.3-0.5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>0.5-0.7</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>&gt;0.7 (High)</span>
          </div>
        </div>

        {/* Accessible screen-reader table */}
        <table className="sr-only">
          <caption>Sector Cross-Correlation Matrix</caption>
          <thead>
            <tr>
              <th scope="col">Sector</th>
              {SECTORS_SHORT.map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTORS_SHORT.map((row, rIdx) => (
              <tr key={row}>
                <th scope="row">{row}</th>
                {SECTORS_SHORT.map((_col, cIdx) => (
                  <td key={cIdx}>{(CORRELATION_MATRIX[rIdx]?.[cIdx] ?? 0).toFixed(2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
