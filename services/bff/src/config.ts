import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.BFF_PORT || process.env.PORT || '4000', 10),
  host: process.env.BFF_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Core API URL
  coreApiUrl: process.env.CORE_API_URL || 'http://localhost:8080',

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'foliolive-development-hmac-sha256-secret-must-be-at-least-32-bytes!',
    accessExpirationSeconds: parseInt(process.env.JWT_ACCESS_EXP_SECONDS || '900', 10), // 15 minutes
    refreshExpirationSeconds: parseInt(process.env.JWT_REFRESH_EXP_SECONDS || '604800', 10), // 7 days
    cookieName: 'foliolive_refresh_token',
  },

  // CORS
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3003',
      ],

  // Market Simulator
  simulator: {
    defaultSeed: parseInt(process.env.SIMULATOR_SEED || '42', 10),
    defaultTickIntervalMs: parseInt(process.env.SIMULATOR_TICK_INTERVAL_MS || '120', 10), // ~8 ticks/sec
    stressTickIntervalMs: parseInt(process.env.SIMULATOR_STRESS_INTERVAL_MS || '10', 10), // 100 updates/sec
    batchIntervalMs: parseInt(process.env.WEBSOCKET_BATCH_INTERVAL_MS || '100', 10), // 100ms coalescing window
    shockProbabilityPerStep: 0.002, // 0.2% probability per tick
  },

  // WebSocket Server
  websocket: {
    heartbeatIntervalMs: 30000,
    maxBackpressureBytes: 1024 * 1024, // 1 MB
  },
};
