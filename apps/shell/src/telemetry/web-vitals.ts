import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { getSessionCorrelationId, generateRequestId } from './correlation';

export interface TelemetryPayload {
  name: string;
  value: number;
  rating?: string;
  unit?: string;
  correlationId?: string;
  page?: string;
  timestamp?: string;
}

const DEFAULT_BFF_URL =
  typeof window !== 'undefined' && window.location.port === '3100' ? 'http://localhost:4000' : '';

let telemetryEndpoint = `${DEFAULT_BFF_URL}/telemetry`;
const TELEMETRY_FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 4000; // 4s timeout prevents hanging on CloudFront 60s gateway timeouts

let telemetryQueue: TelemetryPayload[] = [];
let telemetryFlushTimer: ReturnType<typeof setTimeout> | undefined;
let consecutiveFailures = 0;
let circuitBreakerUntil = 0;
let isFlushing = false;

function handleFailure(): void {
  consecutiveFailures++;
  // Exponential backoff cooldown: 30s, 60s, 120s, up to 5 minutes max
  const cooldownMs = Math.min(30000 * Math.pow(2, consecutiveFailures - 1), 300000);
  circuitBreakerUntil = Date.now() + cooldownMs;
  telemetryQueue = []; // Drop accumulated queue to avoid memory leak and retry storm
}

async function flushTelemetryQueue(useBeacon = false): Promise<void> {
  if (telemetryFlushTimer !== undefined) {
    clearTimeout(telemetryFlushTimer);
    telemetryFlushTimer = undefined;
  }

  // Do not attempt network requests while circuit breaker is active or a flush is already in flight
  if (Date.now() < circuitBreakerUntil || isFlushing) {
    return;
  }

  if (telemetryQueue.length === 0) return;

  const batch = telemetryQueue;
  telemetryQueue = [];
  const body = JSON.stringify(batch);

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      if (navigator.sendBeacon(telemetryEndpoint, new Blob([body], { type: 'application/json' }))) {
        return;
      }
    } catch {
      // Fall back to fetch when the browser cannot queue the beacon.
    }
  }

  if (typeof fetch !== 'undefined') {
    isFlushing = true;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

    try {
      const res = await fetch(telemetryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': generateRequestId(),
        },
        body,
        keepalive: true,
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        // Status 504 Gateway Timeout, 502, 500, etc.
        handleFailure();
      } else {
        consecutiveFailures = 0;
        circuitBreakerUntil = 0;
      }
    } catch {
      if (timeoutId) clearTimeout(timeoutId);
      // Network error, abort timeout, or gateway failure
      handleFailure();
    } finally {
      isFlushing = false;
    }
  }
}

/**
 * Sends a telemetry payload to the BFF /telemetry endpoint.
 * Queues metrics to avoid sending a request for every render/update.
 * Silently drops metrics when circuit breaker is open to prevent network storms.
 */
export function sendTelemetryMetric(payload: TelemetryPayload): void {
  // If circuit breaker is active, drop metrics to conserve memory & prevent storming a failing backend
  if (Date.now() < circuitBreakerUntil) {
    return;
  }

  if (telemetryQueue.length >= MAX_QUEUE_SIZE) {
    telemetryQueue.shift(); // Evict oldest metric
  }

  const enriched: TelemetryPayload = {
    ...payload,
    correlationId: payload.correlationId || getSessionCorrelationId(),
    page: payload.page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  telemetryQueue.push(enriched);
  if (telemetryFlushTimer === undefined) {
    telemetryFlushTimer = setTimeout(() => {
      void flushTelemetryQueue();
    }, TELEMETRY_FLUSH_INTERVAL_MS);
  }
}

/**
 * Records custom application telemetry metrics:
 * - timeToFirstLiveUpdateMs
 * - gridRenderDurationMs
 * - wsReconnectCount
 */
export function recordCustomMetric(name: string, value: number, unit = 'ms'): void {
  sendTelemetryMetric({
    name,
    value,
    unit,
  });
}

/**
 * Initializes Core Web Vitals (LCP, INP, CLS) listeners and attaches custom event listeners.
 */
export function initWebVitals(bffBaseUrl?: string): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<string, unknown>;
  if (win.__foliolive_web_vitals_initialized) return;
  win.__foliolive_web_vitals_initialized = true;

  if (bffBaseUrl) {
    telemetryEndpoint = `${bffBaseUrl}/telemetry`;
  }

  window.addEventListener('pagehide', () => {
    void flushTelemetryQueue(true);
  });

  const handleMetric = (metric: Metric) => {
    sendTelemetryMetric({
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      unit: metric.name === 'CLS' ? 'score' : 'ms',
    });
  };

  // Register Core Web Vitals listeners
  try {
    onLCP(handleMetric);
    onINP(handleMetric);
    onCLS(handleMetric);
  } catch {
    // Unsupported browser environment
  }

  // Listen for custom grid render events dispatched by VirtualizedGrid
  window.addEventListener('foliolive:grid-render', ((e: CustomEvent<{ durationMs: number }>) => {
    if (e.detail?.durationMs && Date.now() >= circuitBreakerUntil) {
      recordCustomMetric('gridRenderDurationMs', Math.round(e.detail.durationMs * 100) / 100, 'ms');
    }
  }) as EventListener);
}
