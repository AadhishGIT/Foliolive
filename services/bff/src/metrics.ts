import client from 'prom-client';

// Collect default NodeJS runtime & process metrics
client.collectDefaultMetrics({ prefix: 'foliolive_bff_' });

export const wsConnectionsGauge = new client.Gauge({
  name: 'foliolive_bff_active_websocket_connections',
  help: 'Number of active authenticated WebSocket connections',
});

export const wsMessagesSentCounter = new client.Counter({
  name: 'foliolive_bff_ws_messages_sent_total',
  help: 'Total number of WebSocket messages sent by message type',
  labelNames: ['type'],
});

export const wsMessagesReceivedCounter = new client.Counter({
  name: 'foliolive_bff_ws_messages_received_total',
  help: 'Total number of WebSocket messages received by message type',
  labelNames: ['type'],
});

export const simulatorTicksCounter = new client.Counter({
  name: 'foliolive_bff_simulator_ticks_total',
  help: 'Total number of market simulator price ticks generated',
});

export const tickDurationHistogram = new client.Histogram({
  name: 'foliolive_bff_tick_duration_seconds',
  help: 'Duration of simulator tick computation and broadcast in seconds',
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
});

export const backpressureDropsCounter = new client.Counter({
  name: 'foliolive_bff_backpressure_drops_total',
  help: 'Total number of message frames dropped due to client backpressure buffer limits',
});

export const authAttemptsCounter = new client.Counter({
  name: 'foliolive_bff_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
});

// --- Core Web Vitals & Frontend Performance (RUM) ---
export const webVitalsLcpHistogram = new client.Histogram({
  name: 'foliolive_web_vitals_lcp_seconds',
  help: 'Core Web Vitals - Largest Contentful Paint (LCP) in seconds',
  labelNames: ['rating'],
  buckets: [0.5, 1.0, 2.0, 2.5, 4.0, 6.0],
});

export const webVitalsInpHistogram = new client.Histogram({
  name: 'foliolive_web_vitals_inp_seconds',
  help: 'Core Web Vitals - Interaction to Next Paint (INP) in seconds',
  labelNames: ['rating'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1.0],
});

export const webVitalsClsHistogram = new client.Histogram({
  name: 'foliolive_web_vitals_cls',
  help: 'Core Web Vitals - Cumulative Layout Shift (CLS) score',
  labelNames: ['rating'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5],
});

export const frontendTimeToFirstUpdateHistogram = new client.Histogram({
  name: 'foliolive_frontend_time_to_first_live_update_seconds',
  help: 'Latency from application initialization to first live market tick update in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
});

export const frontendGridRenderDurationHistogram = new client.Histogram({
  name: 'foliolive_frontend_grid_render_duration_seconds',
  help: 'TanStack Virtual Holdings Grid initial render and high-frequency update duration in seconds',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
});

export const frontendWsReconnectsCounter = new client.Counter({
  name: 'foliolive_frontend_ws_reconnects_total',
  help: 'Total number of client WebSocket reconnection cycles observed by frontend telemetry',
});

// --- Risk Limit Surveillance & Alert Breaches ---
export const activeAlertsGauge = new client.Gauge({
  name: 'foliolive_active_alerts_total',
  help: 'Current active risk breach alerts count',
  labelNames: ['severity'],
});

export const alertsBreachCounter = new client.Counter({
  name: 'foliolive_alerts_breach_total',
  help: 'Total cumulative number of risk limit breaches triggered',
  labelNames: ['severity', 'type'],
});

export const metricsRegistry = client.register;
