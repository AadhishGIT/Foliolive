import React, { useState, useRef, useMemo, useDeferredValue, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { HoldingPosition } from '../data/holdings-generator';
import { DeltaValue, Button, Badge } from '@foliolive/ui';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  SlidersHorizontal,
  DollarSign,
  Check,
} from 'lucide-react';

export type SortField =
  | 'symbol'
  | 'name'
  | 'sector'
  | 'quantity'
  | 'entryPrice'
  | 'markPrice'
  | 'marketValue'
  | 'unrealizedPnL'
  | 'dailyChangePercent'
  | 'weightPercent';

export type SortDirection = 'asc' | 'desc' | 'none';

export interface ColumnDefinition {
  id: string;
  label: string;
  sortField?: SortField;
  align?: 'left' | 'right' | 'center';
  defaultVisible: boolean;
  minWidth?: number;
}

const ALL_COLUMNS: ColumnDefinition[] = [
  {
    id: 'symbol',
    label: 'Symbol',
    sortField: 'symbol',
    align: 'left',
    defaultVisible: true,
    minWidth: 100,
  },
  {
    id: 'name',
    label: 'Asset Name',
    sortField: 'name',
    align: 'left',
    defaultVisible: true,
    minWidth: 160,
  },
  {
    id: 'sector',
    label: 'Sector',
    sortField: 'sector',
    align: 'left',
    defaultVisible: true,
    minWidth: 130,
  },
  { id: 'assetClass', label: 'Class', align: 'left', defaultVisible: false, minWidth: 90 },
  {
    id: 'quantity',
    label: 'Quantity',
    sortField: 'quantity',
    align: 'right',
    defaultVisible: true,
    minWidth: 100,
  },
  {
    id: 'entryPrice',
    label: 'Entry Price',
    sortField: 'entryPrice',
    align: 'right',
    defaultVisible: false,
    minWidth: 100,
  },
  {
    id: 'markPrice',
    label: 'Mark Price',
    sortField: 'markPrice',
    align: 'right',
    defaultVisible: true,
    minWidth: 110,
  },
  {
    id: 'marketValue',
    label: 'Market Value',
    sortField: 'marketValue',
    align: 'right',
    defaultVisible: true,
    minWidth: 130,
  },
  {
    id: 'unrealizedPnL',
    label: 'Unrealized P&L',
    sortField: 'unrealizedPnL',
    align: 'right',
    defaultVisible: true,
    minWidth: 140,
  },
  {
    id: 'dailyChangePercent',
    label: '24h Change',
    sortField: 'dailyChangePercent',
    align: 'right',
    defaultVisible: true,
    minWidth: 110,
  },
  {
    id: 'weightPercent',
    label: 'Weight',
    sortField: 'weightPercent',
    align: 'right',
    defaultVisible: true,
    minWidth: 90,
  },
];

export interface VirtualizedGridProps {
  holdings: HoldingPosition[];
  updatedTickSymbols?: Set<string>;
  onSelectPosition?: (pos: HoldingPosition) => void;
  isStressMode?: boolean;
}

export function VirtualizedGrid({
  holdings,
  updatedTickSymbols = new Set(),
  onSelectPosition,
  isStressMode = false,
}: VirtualizedGridProps) {
  const [filterText, setFilterText] = useState('');
  const deferredFilter = useDeferredValue(filterText);
  const [sortField, setSortField] = useState<SortField>('marketValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleColIds, setVisibleColIds] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [selectedColIndex, setSelectedColIndex] = useState<number>(0);

  const parentRef = useRef<HTMLDivElement>(null);

  // Filter positions with deferred value to prevent UI freezing during typing
  const filteredHoldings = useMemo(() => {
    if (!deferredFilter.trim()) {
      return holdings;
    }
    const query = deferredFilter.toLowerCase().trim();
    return holdings.filter(
      (h) =>
        h.symbol.toLowerCase().includes(query) ||
        h.name.toLowerCase().includes(query) ||
        h.sector.toLowerCase().includes(query)
    );
  }, [holdings, deferredFilter]);

  // Sort filtered positions
  const sortedHoldings = useMemo(() => {
    if (sortDirection === 'none' || !sortField) {
      return filteredHoldings;
    }
    return [...filteredHoldings].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [filteredHoldings, sortField, sortDirection]);

  // Active visible columns
  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColIds.has(c.id)),
    [visibleColIds]
  );

  // TanStack Virtualizer: Renders ONLY visible window + small overscan
  const rowVirtualizer = useVirtualizer({
    count: sortedHoldings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const handleSort = (field?: SortField) => {
    if (!field) return;
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') setSortDirection('none');
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleColumnVisibility = (colId: string) => {
    setVisibleColIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        if (next.size > 2) next.delete(colId); // keep at least 2 columns visible
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  // Keyboard navigation for ARIA Grid pattern
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxRows = sortedHoldings.length - 1;
      const maxCols = activeColumns.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedRowIndex((prev) => Math.min(prev + 1, maxRows));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedRowIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedColIndex((prev) => Math.min(prev + 1, maxCols));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedColIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setSelectedColIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedColIndex(maxCols);
          break;
        case 'Enter':
          e.preventDefault();
          if (sortedHoldings[selectedRowIndex] && onSelectPosition) {
            onSelectPosition(sortedHoldings[selectedRowIndex]);
          }
          break;
      }
    },
    [sortedHoldings, activeColumns, selectedRowIndex, onSelectPosition]
  );

  // Scroll virtualizer to selected row when keyboard navigating
  useEffect(() => {
    if (selectedRowIndex >= 0 && selectedRowIndex < sortedHoldings.length) {
      rowVirtualizer.scrollToIndex(selectedRowIndex, { align: 'auto' });
    }
  }, [selectedRowIndex, sortedHoldings.length, rowVirtualizer]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="space-y-3 font-sans">
      {/* Grid Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by symbol, company, or sector..."
            aria-label="Filter holdings grid"
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Virtual Performance Telemetry */}
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800">
            <span>
              Rows:{' '}
              <strong className="text-slate-900 dark:text-white">
                {sortedHoldings.length.toLocaleString()}
              </strong>
            </span>
            <span>•</span>
            <span>
              Rendered DOM:{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {virtualItems.length}
              </strong>
            </span>
            {isStressMode && (
              <Badge variant="warning" className="text-[9px] px-1 py-0">
                10k Stress Active
              </Badge>
            )}
          </div>

          {/* Column Picker Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColPicker((prev) => !prev)}
              aria-label="Toggle visible columns"
              className="text-xs flex items-center gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Columns ({activeColumns.length})
            </Button>

            {showColPicker && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-2 z-50 text-xs space-y-1 text-slate-900 dark:text-slate-200"
                role="dialog"
                aria-label="Column Selection"
              >
                <div className="text-[10px] uppercase font-mono font-bold text-slate-600 dark:text-slate-400 px-2 py-1 border-b border-slate-200 dark:border-slate-800">
                  Visible Columns
                </div>
                {ALL_COLUMNS.map((col) => {
                  const isChecked = visibleColIds.has(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleColumnVisibility(col.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-slate-200 text-left transition-colors"
                    >
                      <span>{col.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Virtual Table Container */}
      <div
        ref={parentRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="grid"
        aria-label="Institutional Holdings Matrix"
        aria-rowcount={sortedHoldings.length}
        aria-colcount={activeColumns.length}
        className="h-[520px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 relative shadow-inner"
      >
        {/* Sticky Header Row */}
        <div
          role="rowgroup"
          className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div
            role="row"
            className="flex items-center text-xs font-mono font-semibold uppercase text-slate-700 dark:text-slate-400"
          >
            {activeColumns.map((col, cIdx) => (
              <div
                key={col.id}
                role="columnheader"
                aria-sort={
                  sortField === col.sortField
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                    : 'none'
                }
                style={{
                  width: col.minWidth ? `${col.minWidth}px` : '120px',
                  flex: col.id === 'name' ? 2 : 1,
                  textAlign: col.align || 'left',
                }}
                onClick={() => handleSort(col.sortField)}
                className={`p-3 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 ${
                  col.align === 'right' ? 'justify-end' : 'justify-start'
                } ${selectedColIndex === cIdx ? 'bg-slate-200/60 dark:bg-slate-800/40 text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
              >
                <span>{col.label}</span>
                {col.sortField && (
                  <span className="text-slate-600 dark:text-slate-400">
                    {sortField === col.sortField && sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    ) : sortField === col.sortField && sortDirection === 'desc' ? (
                      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Virtualized Body */}
        <div
          role="rowgroup"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No holdings match current search filter &quot;{deferredFilter}&quot;.
            </div>
          ) : (
            virtualItems.map((virtualRow) => {
              const row = sortedHoldings[virtualRow.index];
              if (!row) return null;

              const isUpdated = updatedTickSymbols.has(row.symbol);
              const isSelected = selectedRowIndex === virtualRow.index;

              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={virtualRow.index + 1}
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedRowIndex(virtualRow.index);
                    onSelectPosition?.(row);
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`flex items-center text-xs font-mono border-b border-slate-200 dark:border-slate-800 transition-colors ${
                    isSelected
                      ? 'bg-blue-100/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/50'
                      : virtualRow.index % 2 === 0
                        ? 'bg-white dark:bg-slate-950/30 hover:bg-slate-100/70 dark:hover:bg-slate-900/60'
                        : 'bg-slate-50/70 dark:bg-slate-900/20 hover:bg-slate-100/70 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {activeColumns.map((col, cIdx) => {
                    const isCellFocused = isSelected && selectedColIndex === cIdx;
                    return (
                      <div
                        key={col.id}
                        role="gridcell"
                        tabIndex={-1}
                        style={{
                          width: col.minWidth ? `${col.minWidth}px` : '120px',
                          flex: col.id === 'name' ? 2 : 1,
                          textAlign: col.align || 'left',
                        }}
                        className={`p-3 truncate ${
                          isCellFocused ? 'ring-1 ring-blue-500 rounded-sm' : ''
                        }`}
                      >
                        <CellContent columnId={col.id} row={row} isUpdated={isUpdated} />
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized cell renderer for high-frequency updates
const CellContent = React.memo(function CellContent({
  columnId,
  row,
  isUpdated,
}: {
  columnId: string;
  row: HoldingPosition;
  isUpdated: boolean;
}) {
  switch (columnId) {
    case 'symbol':
      return (
        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          {row.symbol}
        </span>
      );

    case 'name':
      return (
        <span className="font-sans text-slate-700 dark:text-slate-300 truncate">{row.name}</span>
      );

    case 'sector':
      return (
        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans truncate">
          {row.sector.replace('_', ' ')}
        </span>
      );

    case 'assetClass':
      return (
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          {row.assetClass}
        </Badge>
      );

    case 'quantity':
      return (
        <span className="text-slate-700 dark:text-slate-300">{row.quantity.toLocaleString()}</span>
      );

    case 'entryPrice':
      return (
        <span className="text-slate-600 dark:text-slate-400">${row.entryPrice.toFixed(2)}</span>
      );

    case 'markPrice':
      return (
        <span
          className={`font-bold transition-colors duration-700 ${
            isUpdated
              ? row.dailyChange >= 0
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1 rounded'
                : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 px-1 rounded'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          ${row.markPrice.toFixed(2)}
        </span>
      );

    case 'marketValue':
      return (
        <span className="text-slate-900 dark:text-slate-200 font-semibold">
          ${Math.round(row.marketValue).toLocaleString()}
        </span>
      );

    case 'unrealizedPnL':
      return (
        <DeltaValue
          value={row.unrealizedPnL}
          percentage={row.unrealizedPnLPercent}
          formatAs="currency"
        />
      );

    case 'dailyChangePercent':
      return <DeltaValue value={row.dailyChangePercent} formatAs="percent" />;

    case 'weightPercent':
      return (
        <span className="text-slate-600 dark:text-slate-400">{row.weightPercent.toFixed(2)}%</span>
      );

    default:
      return null;
  }
});
