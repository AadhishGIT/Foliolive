import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@foliolive/ui';
import { Briefcase, Zap, Layers, RefreshCw } from 'lucide-react';
import { generateHoldings, type HoldingPosition } from './data/holdings-generator';
import { VirtualizedGrid } from './components/VirtualizedGrid';
import { SectorAllocationChart } from './components/SectorAllocationChart';
import { PnLTimeSeriesChart } from './components/PnLTimeSeriesChart';
import { SummaryCards } from './components/SummaryCards';
import {
  getGlobalMfeBus,
  type BatchUpdatePayload,
  type LivePortfolioUpdate,
} from '@foliolive/shared-types';

export interface PortfolioAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

export function PortfolioApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: PortfolioAppProps) {
  const [currentPortfolioId, setCurrentPortfolioId] = useState(portfolioId);
  const [isStressMode, setIsStressMode] = useState(false);
  const [holdings, setHoldings] = useState<HoldingPosition[]>(() => generateHoldings(500, 42));
  const [updatedTickSymbols, setUpdatedTickSymbols] = useState<Set<string>>(new Set());
  const [selectedPosition, setSelectedPosition] = useState<HoldingPosition | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'grid' | 'charts'>('all');

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<Map<string, { price: number; change: number }>>(new Map());

  // Handle switching between Normal (500 rows) and Stress (10,000 rows)
  const toggleStressMode = () => {
    setIsStressMode((prev) => {
      const next = !prev;
      setHoldings(generateHoldings(next ? 10000 : 500, next ? 9999 : 42));
      return next;
    });
  };

  // Re-generate if portfolioId changes
  useEffect(() => {
    setCurrentPortfolioId(portfolioId);
    const seed = portfolioId.includes('02') ? 84 : portfolioId.includes('03') ? 42 : 125;
    setHoldings(generateHoldings(isStressMode ? 10000 : 500, seed));
  }, [portfolioId, isStressMode]);

  // Flush batched price updates on requestAnimationFrame to maintain 60 FPS
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    const updates = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current.clear();

    const symbolsToFlash = new Set<string>();

    setHoldings((prevHoldings) => {
      let hasChanges = false;
      const updated = prevHoldings.map((h) => {
        const tick = updates.get(h.symbol);
        if (tick) {
          hasChanges = true;
          symbolsToFlash.add(h.symbol);
          const newMarkPrice = tick.price;
          const marketValue = +(h.quantity * newMarkPrice).toFixed(2);
          const costBasis = +(h.quantity * h.entryPrice).toFixed(2);
          const unrealizedPnL = +(marketValue - costBasis).toFixed(2);
          const unrealizedPnLPercent = +((unrealizedPnL / costBasis) * 100).toFixed(2);
          const dailyChange = +(newMarkPrice - h.prevClose).toFixed(2);
          const dailyChangePercent = +((dailyChange / h.prevClose) * 100).toFixed(2);

          return {
            ...h,
            markPrice: newMarkPrice,
            marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            dailyChange,
            dailyChangePercent,
            lastUpdated: new Date().toISOString(),
          };
        }
        return h;
      });

      return hasChanges ? updated : prevHoldings;
    });

    setUpdatedTickSymbols(symbolsToFlash);

    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = setTimeout(() => {
      setUpdatedTickSymbols(new Set());
    }, 700);
  }, []);

  // Subscribe to Cross-MFE Event Bus for real-time market batches
  useEffect(() => {
    const bus = getGlobalMfeBus();

    const unsubPortfolio = bus.subscribe('PORTFOLIO_CHANGED', (payload) => {
      setCurrentPortfolioId(payload.portfolioId);
    });

    const unsubBatch = bus.subscribe('REALTIME_BATCH', (batch: BatchUpdatePayload) => {
      if (batch.ticks && batch.ticks.length > 0) {
        for (const t of batch.ticks) {
          pendingUpdatesRef.current.set(t.symbol, { price: t.price, change: t.change });
        }
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => {
            animationFrameRef.current = null;
            flushUpdates();
          });
        }
      }
    });

    const unsubLive = bus.subscribe('PORTFOLIO_LIVE_UPDATE', (_update: LivePortfolioUpdate) => {
      // Portfolio live update received
    });

    // Standalone fallback: If not connected to a live BFF stream, simulate gentle market ticks
    let mockTickInterval: ReturnType<typeof setInterval> | null = null;
    if (isStandalone || bus.getState().connectionStatus !== 'CONNECTED') {
      const coreSymbols = [
        'AAPL',
        'MSFT',
        'NVDA',
        'GOOGL',
        'AMZN',
        'JPM',
        'LLY',
        'XOM',
        'UNH',
        'V',
      ];
      mockTickInterval = setInterval(() => {
        const sym = coreSymbols[Math.floor(Math.random() * coreSymbols.length)];
        if (!sym) return;
        const currentHold = holdings.find((h) => h.symbol === sym);
        if (currentHold) {
          const delta = (Math.random() - 0.49) * 0.8;
          const nextPrice = +(currentHold.markPrice + delta).toFixed(2);
          pendingUpdatesRef.current.set(sym, { price: nextPrice, change: delta });
          if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => {
              animationFrameRef.current = null;
              flushUpdates();
            });
          }
        }
      }, 500);
    }

    return () => {
      unsubPortfolio();
      unsubBatch();
      unsubLive();
      if (mockTickInterval) clearInterval(mockTickInterval);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [holdings, isStandalone, flushUpdates]);

  const totalAUM = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.marketValue, 0) + 8_420_000;
  }, [holdings]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Institutional Portfolio & Holdings Matrix
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Portfolio ID:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              {currentPortfolioId}
            </span>
            <span>•</span>
            <span>
              Positions:{' '}
              <strong className="text-slate-900 dark:text-white">
                {holdings.length.toLocaleString()}
              </strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStandalone && (
            <Badge variant="outline" className="text-xs">
              Standalone Mode
            </Badge>
          )}

          {/* 10,000 Row Stress Test Toggle */}
          <Button
            variant={isStressMode ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleStressMode}
            className="flex items-center gap-1.5 text-xs border-slate-700 font-mono"
            aria-label="Toggle 10,000 rows virtualization stress test"
          >
            <Zap
              className={`w-3.5 h-3.5 ${isStressMode ? 'text-amber-300 animate-bounce' : 'text-slate-400'}`}
            />
            {isStressMode ? '10k Stress Active' : 'Test 10k Rows'}
          </Button>

          {/* View Tab Filter */}
          <div className="hidden md:flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Views
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Grid Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'charts'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Charts Only
            </button>
          </div>
        </div>
      </div>

      {/* Summary P&L Cards */}
      <SummaryCards holdings={holdings} />

      {/* D3 Charts Section */}
      {(activeTab === 'all' || activeTab === 'charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SectorAllocationChart holdings={holdings} />
          </div>
          <div className="lg:col-span-8">
            <PnLTimeSeriesChart initialAUM={totalAUM} />
          </div>
        </div>
      )}

      {/* Virtualized Holdings Grid Section */}
      {(activeTab === 'all' || activeTab === 'grid') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
                Live Holdings Matrix (TanStack Virtualized Grid)
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-mono hidden sm:inline">
                  Interactive ARIA Grid Pattern
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHoldings(generateHoldings(isStressMode ? 10000 : 500, Date.now()))
                  }
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
                  aria-label="Refresh seed data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VirtualizedGrid
              holdings={holdings}
              updatedTickSymbols={updatedTickSymbols}
              onSelectPosition={(pos) => setSelectedPosition(pos)}
              isStressMode={isStressMode}
            />
          </CardContent>
        </Card>
      )}

      {/* Selected Position Detail Callout */}
      {selectedPosition && (
        <div
          role="region"
          aria-label="Position Details"
          className="p-4 rounded-lg bg-card text-card-foreground border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono"
        >
          <div>
            <div className="text-slate-600 dark:text-slate-400 font-sans">Active Inspection:</div>
            <div className="text-slate-900 dark:text-white font-bold text-sm">
              {selectedPosition.symbol} • {selectedPosition.name}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Sector: {selectedPosition.sector} | Class: {selectedPosition.assetClass}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-slate-600 dark:text-slate-400">Position Size</div>
              <div className="text-slate-900 dark:text-white font-semibold">
                {selectedPosition.quantity.toLocaleString()} shares
              </div>
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400">Market Value</div>
              <div className="text-slate-900 dark:text-white font-semibold">
                ${Math.round(selectedPosition.marketValue).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400">Unrealized P&L</div>
              <div
                className={
                  selectedPosition.unrealizedPnL >= 0
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-rose-700 dark:text-rose-400 font-bold'
                }
              >
                {selectedPosition.unrealizedPnL >= 0 ? '+' : ''}$
                {Math.round(selectedPosition.unrealizedPnL).toLocaleString()} (
                {selectedPosition.unrealizedPnLPercent.toFixed(2)}%)
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPosition(null)}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortfolioApp;
