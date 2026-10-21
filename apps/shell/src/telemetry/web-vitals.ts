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
const TELEMETRY_FLUSH_INTERVAL_MS = 5000;
let telemetryQueue: TelemetryPayload[] = [];
let telemetryFlushTimer: ReturnType<typeof setTimeout> | undefined;

function flushTelemetryQueue(useBeacon = false): void {
  if (telemetryFlushTimer !== undefined) {
    clearTimeout(telemetryFlushTimer);
    telemetryFlushTimer = undefined;
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
    fetch(telemetryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': generateRequestId(),
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Best-effort telemetry: do not retry failed batches.
    });
  }
}

/**
 * Sends a telemetry payload to the BFF /telemetry endpoint.
 * Queues metrics to avoid sending a request for every render/update.
 */
export function sendTelemetryMetric(payload: TelemetryPayload): void {
  const enriched: TelemetryPayload = {
    ...payload,
    correlationId: payload.correlationId || getSessionCorrelationId(),
    page: payload.page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  telemetryQueue.push(enriched);
  if (telemetryFlushTimer === undefined) {
    telemetryFlushTimer = setTimeout(() => flushTelemetryQueue(), TELEMETRY_FLUSH_INTERVAL_MS);
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

  window.addEventListener('pagehide', () => flushTelemetryQueue(true));

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
    if (e.detail?.durationMs) {
      recordCustomMetric('gridRenderDurationMs', Math.round(e.detail.durationMs * 100) / 100, 'ms');
    }
  }) as EventListener);
}
