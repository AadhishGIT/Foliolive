import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from './config';

export const logger = pino({
  level: process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'foliolive-bff',
  },
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    correlationId:
      (req as unknown as { correlationId?: string }).correlationId ||
      req.headers['x-correlation-id'] ||
      'none',
  }),
  autoLogging: {
    ignore: (req) => {
      // Don't log spammy health and metrics polls
      return req.url === '/health' || req.url === '/metrics';
    },
  },
});
