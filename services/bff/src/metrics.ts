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

export const metricsRegistry = client.register;
