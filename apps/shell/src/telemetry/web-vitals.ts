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

/**
 * Sends a telemetry payload to the BFF /telemetry endpoint.
 * Uses navigator.sendBeacon when possible with fallback to fetch.
 */
export function sendTelemetryMetric(payload: TelemetryPayload): void {
  const enriched: TelemetryPayload = {
    ...payload,
    correlationId: payload.correlationId || getSessionCorrelationId(),
    page: payload.page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  const body = JSON.stringify(enriched);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    const success = navigator.sendBeacon(telemetryEndpoint, blob);
    if (success) return;
  }

  // Fallback to fetch with keepalive: true
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
      // Best-effort telemetry: silent fail on network drop
    });
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
