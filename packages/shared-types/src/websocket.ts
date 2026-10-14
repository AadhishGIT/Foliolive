import { z } from 'zod';
import type { Holding, PortfolioSummary } from './portfolio';
import type { PortfolioRiskSummary } from './risk';
import type { AlertNotification } from './alerts';

// ==========================================
// Client Messages (Incoming to Server)
// ==========================================

export const WebSocketClientMessageTypeSchema = z.enum([
  'SUBSCRIBE',
  'UNSUBSCRIBE',
  'SUBSCRIBE_PORTFOLIO',
  'UNSUBSCRIBE_PORTFOLIO',
  'SUBSCRIBE_MARKET',
  'UNSUBSCRIBE_MARKET',
  'PING',
]);

export type WebSocketClientMessageType = z.infer<typeof WebSocketClientMessageTypeSchema>;

export const WebSocketClientMessageSchema = z.object({
  type: WebSocketClientMessageTypeSchema,
  topics: z.array(z.string()).optional(),
  payload: z
    .object({
      topic: z.string().optional(),
      portfolioId: z.string().optional(),
      symbols: z.array(z.string()).optional(),
    })
    .optional(),
  clientTimestamp: z.number().optional(),
});

export type WebSocketClientMessage = z.infer<typeof WebSocketClientMessageSchema>;

// ==========================================
// Market Tick Schema
// ==========================================

export const MarketTickSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  bid: z.number(),
  ask: z.number(),
  volume: z.number(),
  change: z.number(),
  changePercent: z.number(),
  high: z.number(),
  low: z.number(),
  open: z.number(),
  previousClose: z.number(),
  timestamp: z.string(),
});

// ==========================================
// Server Messages (Outgoing to Clients)
// ==========================================

export const ConnectedServerMessageSchema = z.object({
  type: z.literal('CONNECTED'),
  payload: z.object({
    connectionId: z.string(),
    serverTime: z.string(),
    authenticatedUser: z.string().optional(),
    role: z.string().optional(),
  }),
});

export type ConnectedServerMessage = z.infer<typeof ConnectedServerMessageSchema>;

export const TickServerMessageSchema = z.object({
  type: z.literal('TICK'),
  payload: MarketTickSchema,
});

export type TickServerMessage = z.infer<typeof TickServerMessageSchema>;

export const LivePortfolioUpdateSchema = z.object({
  portfolioId: z.string(),
  name: z.string().optional(),
  totalValue: z.number(),
  cashBalance: z.number(),
  totalUnrealizedPnL: z.number(),
  totalUnrealizedPnLPercent: z.number(),
  dailyPnL: z.number(),
  dailyPnLPercent: z.number(),
  holdingsCount: z.number(),
  updatedAt: z.string(),
});

export type LivePortfolioUpdate = z.infer<typeof LivePortfolioUpdateSchema>;

export const PortfolioUpdateServerMessageSchema = z.object({
  type: z.literal('PORTFOLIO_UPDATE'),
  payload: z.object({
    summary: z.custom<PortfolioSummary>(),
    holdings: z.array(z.custom<Holding>()).optional(),
    liveUpdate: LivePortfolioUpdateSchema.optional(),
  }),
});

export type PortfolioUpdateServerMessage = z.infer<typeof PortfolioUpdateServerMessageSchema>;

export const RiskUpdateServerMessageSchema = z.object({
  type: z.literal('RISK_UPDATE'),
  payload: z.custom<PortfolioRiskSummary>(),
});

export type RiskUpdateServerMessage = z.infer<typeof RiskUpdateServerMessageSchema>;

export const AlertFiredServerMessageSchema = z.object({
  type: z.literal('ALERT_FIRED'),
  payload: z.custom<AlertNotification>(),
});

export type AlertFiredServerMessage = z.infer<typeof AlertFiredServerMessageSchema>;

export const AlertClearedServerMessageSchema = z.object({
  type: z.literal('ALERT_CLEARED'),
  payload: z.object({
    alertId: z.string(),
    portfolioId: z.string(),
    clearedAt: z.string(),
    currentValue: z.number(),
    thresholdValue: z.number(),
  }),
});

export type AlertClearedServerMessage = z.infer<typeof AlertClearedServerMessageSchema>;

export const PongServerMessageSchema = z.object({
  type: z.literal('PONG'),
  payload: z.object({
    timestamp: z.number(),
  }),
});

export type PongServerMessage = z.infer<typeof PongServerMessageSchema>;

export const ErrorServerMessageSchema = z.object({
  type: z.literal('ERROR'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ErrorServerMessage = z.infer<typeof ErrorServerMessageSchema>;

// Animation-frame coalesced batch message
export const BatchUpdatePayloadSchema = z.object({
  batchIntervalMs: z.number(),
  ticks: z.array(MarketTickSchema),
  portfolioUpdates: z.array(LivePortfolioUpdateSchema),
  riskUpdates: z.array(z.custom<PortfolioRiskSummary>()),
  alerts: z.array(z.custom<AlertNotification>()),
  clearedAlerts: z.array(AlertClearedServerMessageSchema.shape.payload).optional(),
  timestamp: z.string(),
});

export type BatchUpdatePayload = z.infer<typeof BatchUpdatePayloadSchema>;

export const BatchServerMessageSchema = z.object({
  type: z.literal('BATCH'),
  payload: BatchUpdatePayloadSchema,
});

export type BatchServerMessage = z.infer<typeof BatchServerMessageSchema>;

export const WebSocketServerMessageSchema = z.discriminatedUnion('type', [
  ConnectedServerMessageSchema,
  TickServerMessageSchema,
  PortfolioUpdateServerMessageSchema,
  RiskUpdateServerMessageSchema,
  AlertFiredServerMessageSchema,
  AlertClearedServerMessageSchema,
  BatchServerMessageSchema,
  PongServerMessageSchema,
  ErrorServerMessageSchema,
]);

export type WebSocketServerMessage = z.infer<typeof WebSocketServerMessageSchema>;
