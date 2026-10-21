import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { config } from './config';
import { httpLogger, logger } from './logger';
import {
  metricsRegistry,
  webVitalsLcpHistogram,
  webVitalsInpHistogram,
  webVitalsClsHistogram,
  frontendTimeToFirstUpdateHistogram,
  frontendGridRenderDurationHistogram,
  frontendWsReconnectsCounter,
} from './metrics';
import { MarketSimulator } from './simulator';
import { RealtimeEngine } from './realtime-engine';
import { WebSocketGateway } from './websocket';
import rateLimit from 'express-rate-limit';
import { createAuthRouter } from './routes/auth.routes';
import { createApiRouter } from './routes/api.routes';

const TelemetryMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.string().optional(),
  unit: z.string().optional(),
  correlationId: z.string().optional(),
  page: z.string().optional(),
  timestamp: z.string().optional(),
});

const TelemetryRequestSchema = z.union([
  TelemetryMetricSchema,
  z.array(TelemetryMetricSchema),
  z.object({
    events: z.array(TelemetryMetricSchema),
  }),
]);

function processTelemetryMetric(
  metric: z.infer<typeof TelemetryMetricSchema>,
  reqCorrelationId: string
): void {
  const { name, value, rating = 'unspecified' } = metric;
  const corrId = metric.correlationId || reqCorrelationId;

  logger.info(
    {
      telemetry: { name, value, rating, unit: metric.unit, page: metric.page },
      correlationId: corrId,
    },
    'Frontend telemetry metric ingested'
  );

  switch (name) {
    case 'LCP': {
      const sec = value > 20 ? value / 1000 : value;
      webVitalsLcpHistogram.observe({ rating }, sec);
      break;
    }
    case 'INP': {
      const sec = value > 20 ? value / 1000 : value;
      webVitalsInpHistogram.observe({ rating }, sec);
      break;
    }
    case 'CLS': {
      webVitalsClsHistogram.observe({ rating }, value);
      break;
    }
    case 'timeToFirstLiveUpdateMs': {
      const sec = value > 20 ? value / 1000 : value;
      frontendTimeToFirstUpdateHistogram.observe(sec);
      break;
    }
    case 'gridRenderDurationMs': {
      const sec = value > 20 ? value / 1000 : value;
      frontendGridRenderDurationHistogram.observe(sec);
      break;
    }
    case 'wsReconnectCount': {
      frontendWsReconnectsCounter.inc(value || 1);
      break;
    }
  }
}

export interface BffServerInstance {
  app: express.Application;
  server: http.Server;
  simulator: MarketSimulator;
  realtimeEngine: RealtimeEngine;
  wsGateway: WebSocketGateway;
  start: (port?: number) => Promise<http.Server>;
  stop: () => Promise<void>;
}

export function createBffServer(options?: {
  seed?: number;
  defaultIntervalMs?: number;
}): BffServerInstance {
  const app = express();
  const server = http.createServer(app);

  // Distributed Correlation ID tracing middleware
  app.use((req: Request, res: Response, next) => {
    const rawId = req.headers['x-correlation-id'];
    const correlationId =
      typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : crypto.randomUUID();
    (req as Request & { correlationId?: string }).correlationId = correlationId;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS allowlist configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In dev, allow localhost on any port
        if (config.isDev && /^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
      exposedHeaders: ['X-Correlation-ID'],
    })
  );

  // Cookie parser for httpOnly refresh tokens
  app.use(cookieParser());

  // JSON request body parser (supports text/plain fallback for sendBeacon)
  app.use(express.json());
  app.use(express.text({ type: ['text/plain', 'application/json'] }));

  // HTTP structured logging with correlationId
  app.use(httpLogger);

  // Prometheus /metrics endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'foliolive-bff',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Frontend Core Web Vitals & Real-User Monitoring (RUM) Telemetry Ingestion
  const handleTelemetry = (req: Request, res: Response) => {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch {
          // not json string
        }
      }

      const parseResult = TelemetryRequestSchema.safeParse(bodyData);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TELEMETRY_PAYLOAD',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
        return;
      }

      const reqCorrId =
        (req as Request & { correlationId?: string }).correlationId ||
        (req.headers['x-correlation-id'] as string) ||
        'none';
      const payload = parseResult.data;

      let ingestedCount = 0;
      if (Array.isArray(payload)) {
        for (const item of payload) {
          processTelemetryMetric(item, reqCorrId);
          ingestedCount++;
        }
      } else if ('events' in payload && Array.isArray(payload.events)) {
        for (const item of payload.events) {
          processTelemetryMetric(item, reqCorrId);
          ingestedCount++;
        }
      } else {
        processTelemetryMetric(payload as z.infer<typeof TelemetryMetricSchema>, reqCorrId);
        ingestedCount++;
      }

      res.status(200).json({
        success: true,
        ingested: ingestedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, 'Failed to process telemetry payload');
      res.status(500).json({ success: false, error: { message } });
    }
  };

  // Rate limiting for public demo protection against DoS / resource exhaustion
  const telemetryLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Telemetry rate limit exceeded.' },
    },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please slow down to preserve demo system capacity.',
      },
      timestamp: new Date().toISOString(),
    },
  });

  app.post('/telemetry', telemetryLimiter, handleTelemetry);
  app.post('/api/telemetry', telemetryLimiter, handleTelemetry);

  // Instantiate Simulator and Realtime Engine
  const simulator = new MarketSimulator(
    options?.seed ?? config.simulator.defaultSeed,
    options?.defaultIntervalMs ?? config.simulator.defaultTickIntervalMs
  );
  const realtimeEngine = new RealtimeEngine(simulator);

  // Instantiate WebSocket Gateway
  const wsGateway = new WebSocketGateway(server, simulator, realtimeEngine);

  // Mount Auth routes: /auth/login, /auth/refresh, /auth/logout, /auth/me, /auth/demo-users
  app.use('/auth', createAuthRouter());

  // Mount Aggregation & Simulator API routes: /api/portfolio-overview, /api/market-overview, etc.
  app.use('/api', apiLimiter, createApiRouter(simulator, realtimeEngine));

  // =========================================================================
  // Unified Production Gateway: Single-Link Static Serving & SPA Routing
  // Serves Shell Host + all Micro-Frontends under the exact same origin link
  // =========================================================================
  const candidateShellPaths = [
    path.resolve(process.cwd(), 'apps/shell/dist'),
    path.resolve(__dirname, '../../apps/shell/dist'),
    path.resolve(__dirname, '../../../apps/shell/dist'),
  ];
  const shellDist = candidateShellPaths.find((p) => fs.existsSync(p));

  if (shellDist) {
    const rootApps = path.resolve(shellDist, '..', '..');
    const portfolioDist = path.join(rootApps, 'portfolio-mfe', 'dist');
    const riskDist = path.join(rootApps, 'risk-mfe', 'dist');
    const alertsDist = path.join(rootApps, 'alerts-mfe', 'dist');

    // 1. Mount Micro-Frontends at dedicated subpaths
    if (fs.existsSync(portfolioDist)) {
      app.use('/portfolio-mfe', express.static(portfolioDist, { maxAge: '1h' }));
    }
    if (fs.existsSync(riskDist)) {
      app.use('/risk-mfe', express.static(riskDist, { maxAge: '1h' }));
    }
    if (fs.existsSync(alertsDist)) {
      app.use('/alerts-mfe', express.static(alertsDist, { maxAge: '1h' }));
    }

    // 2. Mount Shell static assets (JS, CSS, SVGs, favicon, etc.)
    app.use(express.static(shellDist, { maxAge: '1h' }));

    // 3. SPA Client-Side Routing Fallback (serves index.html for non-API GETs)
    app.get('*', (req: Request, res: Response, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/telemetry') ||
        req.path.startsWith('/metrics') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/ws') ||
        req.path.startsWith('/actuator')
      ) {
        return next();
      }
      res.sendFile(path.join(shellDist, 'index.html'));
    });

    logger.info(
      { shellDist, portfolioDist, riskDist, alertsDist },
      'Production unified single-link gateway active: Shell and MFEs mounted'
    );
  }

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    logger.error({ err: err.message, stack: err.stack }, 'Unhandled error in BFF');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.isDev ? err.message : 'Internal Server Error',
      },
      timestamp: new Date().toISOString(),
    });
  });

  const start = (port = config.port): Promise<http.Server> => {
    return new Promise((resolve) => {
      server.listen(port, config.host, () => {
        logger.info(
          { port, host: config.host },
          `Foliolive BFF & WebSocket Server listening on http://${config.host}:${port}`
        );
        simulator.start();
        resolve(server);
      });
    });
  };

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      simulator.stop();
      wsGateway.close();
      server.close(() => {
        logger.info('Foliolive BFF server stopped');
        resolve();
      });
    });
  };

  return {
    app,
    server,
    simulator,
    realtimeEngine,
    wsGateway,
    start,
    stop,
  };
}
