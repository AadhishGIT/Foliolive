import { WebSocket } from 'ws';
import type { MarketSimulator } from './simulator';
import { logger } from './logger';

export interface LiveMarketServiceOptions {
  enabled?: boolean;
  provider?: 'yahoo' | 'finnhub' | 'auto';
  finnhubApiKey?: string;
  pollIntervalMs?: number;
  symbols?: string[];
}

export interface LiveQuote {
  symbol: string;
  price: number;
  previousClose: number;
  high?: number;
  low?: number;
  volume?: number;
  timestamp: string;
}

export class LiveMarketService {
  private simulator: MarketSimulator;
  private options: Required<LiveMarketServiceOptions>;
  private pollTimer: NodeJS.Timeout | null = null;
  private finnhubWs: WebSocket | null = null;
  private finnhubReconnectTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncTime: string | null = null;
  private successfulSyncs = 0;
  private failedSyncs = 0;
  private lastError: string | null = null;
  private lastFetchError: string | null = null;

  constructor(simulator: MarketSimulator, options: LiveMarketServiceOptions = {}) {
    this.simulator = simulator;
    const defaultSymbols = this.simulator.getInstrumentConfigs().map((c) => c.symbol);

    this.options = {
      enabled: options.enabled ?? true,
      provider: options.provider ?? (options.finnhubApiKey ? 'finnhub' : 'yahoo'),
      finnhubApiKey: options.finnhubApiKey ?? process.env.FINNHUB_API_KEY ?? '',
      pollIntervalMs: options.pollIntervalMs ?? 15000,
      symbols: options.symbols && options.symbols.length > 0 ? options.symbols : defaultSymbols,
    };
  }

  public async start(): Promise<void> {
    if (!this.options.enabled || this.isRunning) {
      return;
    }
    this.isRunning = true;

    logger.info(
      {
        provider: this.options.provider,
        pollIntervalMs: this.options.pollIntervalMs,
        symbolCount: this.options.symbols.length,
      },
      'Starting Live Financial Market Data Service'
    );

    // Initial immediate fetch to calibrate simulator to real-world market prices
    await this.syncQuotes();

    if (this.options.provider === 'finnhub' && this.options.finnhubApiKey) {
      this.startFinnhubWebSocket();
    }

    // Start periodic background polling to track real market price changes
    this.pollTimer = setInterval(() => {
      void this.syncQuotes();
    }, this.options.pollIntervalMs);
  }

  public stop(): void {
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.finnhubReconnectTimer) {
      clearTimeout(this.finnhubReconnectTimer);
      this.finnhubReconnectTimer = null;
    }

    if (this.finnhubWs) {
      this.finnhubWs.close();
      this.finnhubWs = null;
    }

    logger.info('Live Financial Market Data Service stopped');
  }

  /**
   * Fetches real-time quotes and updates the simulator state.
   */
  public async syncQuotes(): Promise<number> {
    try {
      this.lastFetchError = null;
      const quotes = await this.fetchQuotesFromProvider();
      if (quotes.length === 0 && this.options.symbols.length > 0) {
        throw new Error(this.lastFetchError || 'No quotes returned from live market provider');
      }

      let updatedCount = 0;

      for (const q of quotes) {
        const tick = this.simulator.updateLivePrice(
          q.symbol,
          q.price,
          q.previousClose,
          q.high,
          q.low,
          q.volume
        );
        if (tick) {
          updatedCount++;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.successfulSyncs++;
      this.lastError = null;

      logger.debug(
        {
          updatedCount,
          totalSymbols: this.options.symbols.length,
          provider: this.options.provider,
        },
        'Live market quotes synced successfully'
      );

      return updatedCount;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.failedSyncs++;
      this.lastError = msg;
      logger.warn(
        { err: msg, provider: this.options.provider },
        'Failed to sync live market quotes; relying on in-memory simulator'
      );
      return 0;
    }
  }

  private async fetchQuotesFromProvider(): Promise<LiveQuote[]> {
    if (this.options.provider === 'finnhub' && this.options.finnhubApiKey) {
      return this.fetchFromFinnhubRest();
    }
    return this.fetchFromYahooFinance();
  }

  /**
   * Fetches live market quotes from Yahoo Finance API.
   * Free, zero-API-key, sub-second latency for US equities and ETFs.
   */
  private async fetchFromYahooFinance(): Promise<LiveQuote[]> {
    const quotes: LiveQuote[] = [];
    const symbols = this.options.symbols;

    // Fetch symbols concurrently with batch size of 6 to avoid hammering external endpoints
    const batchSize = 6;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (sym) => {
        try {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FolioliveMarketData/1.0)',
              Accept: 'application/json',
            },
            signal: controller ? controller.signal : undefined,
          });

          if (timeoutId) clearTimeout(timeoutId);

          if (!res.ok) {
            return null;
          }

          const data = (await res.json()) as {
            chart?: {
              result?: Array<{
                meta?: {
                  regularMarketPrice?: number;
                  chartPreviousClose?: number;
                  previousClose?: number;
                  regularMarketDayHigh?: number;
                  regularMarketDayLow?: number;
                  regularMarketVolume?: number;
                };
              }>;
            };
          };

          const meta = data.chart?.result?.[0]?.meta;
          if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
            const prevClose =
              meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
            return {
              symbol: sym,
              price: Number(meta.regularMarketPrice.toFixed(2)),
              previousClose: Number(prevClose.toFixed(2)),
              high: meta.regularMarketDayHigh,
              low: meta.regularMarketDayLow,
              volume: meta.regularMarketVolume,
              timestamp: new Date().toISOString(),
            } as LiveQuote;
          }
          return null;
        } catch (err: unknown) {
          this.lastFetchError = err instanceof Error ? err.message : String(err);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) {
        if (res) {
          quotes.push(res);
        }
      }
    }

    return quotes;
  }

  /**
   * Fetches quotes from Finnhub REST endpoint if API key is provided.
   */
  private async fetchFromFinnhubRest(): Promise<LiveQuote[]> {
    const quotes: LiveQuote[] = [];
    const apiKey = this.options.finnhubApiKey;
    if (!apiKey) return quotes;

    // Finnhub free tier: max 60 calls/min. We query core equities.
    const coreSymbols = this.options.symbols.slice(0, 15);
    for (const sym of coreSymbols) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          signal: controller ? controller.signal : undefined,
        });

        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) continue;

        const data = (await res.json()) as {
          c?: number; // current price
          pc?: number; // previous close
          h?: number; // high
          l?: number; // low
          d?: number; // change
          dp?: number; // percent change
        };

        if (data.c && data.c > 0) {
          quotes.push({
            symbol: sym,
            price: Number(data.c.toFixed(2)),
            previousClose: Number((data.pc || data.c).toFixed(2)),
            high: data.h,
            low: data.l,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Continue to next symbol
      }
    }

    return quotes;
  }

  /**
   * Finnhub real-time trade WebSocket streaming
   */
  private startFinnhubWebSocket(): void {
    const apiKey = this.options.finnhubApiKey;
    if (!apiKey) return;

    try {
      this.finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`);

      this.finnhubWs.on('open', () => {
        logger.info('Connected to Finnhub Real-time Market WebSocket');
        // Subscribe to top institutional equities
        const topSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM'];
        for (const sym of topSymbols) {
          this.finnhubWs?.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
        }
      });

      this.finnhubWs.on('message', (rawData: string | Buffer) => {
        try {
          const parsed = JSON.parse(rawData.toString()) as {
            type?: string;
            data?: Array<{
              s: string; // symbol
              p: number; // price
              t: number; // timestamp
              v: number; // volume
            }>;
          };

          if (parsed.type === 'trade' && Array.isArray(parsed.data)) {
            for (const trade of parsed.data) {
              if (trade.s && trade.p > 0) {
                this.simulator.updateLivePrice(
                  trade.s,
                  Number(trade.p.toFixed(2)),
                  undefined,
                  undefined,
                  undefined,
                  trade.v
                );
              }
            }
          }
        } catch {
          // ignore malformed frame
        }
      });

      this.finnhubWs.on('close', () => {
        if (this.isRunning) {
          this.finnhubReconnectTimer = setTimeout(() => {
            this.startFinnhubWebSocket();
          }, 10000);
        }
      });

      this.finnhubWs.on('error', (err) => {
        logger.warn({ err: err.message }, 'Finnhub WebSocket encountered an error');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ err: msg }, 'Failed to initialize Finnhub WebSocket');
    }
  }

  public getStatus() {
    return {
      enabled: this.options.enabled,
      isRunning: this.isRunning,
      provider: this.options.provider,
      lastSyncTime: this.lastSyncTime,
      successfulSyncs: this.successfulSyncs,
      failedSyncs: this.failedSyncs,
      lastError: this.lastError,
      symbolCount: this.options.symbols.length,
      pollIntervalMs: this.options.pollIntervalMs,
    };
  }
}
