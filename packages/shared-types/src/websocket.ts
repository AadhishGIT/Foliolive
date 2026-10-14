import type { MarketTick } from './market';
import type { Holding, PortfolioSummary } from './portfolio';
import type { PortfolioRiskSummary } from './risk';
import type { AlertNotification } from './alerts';

export type WebSocketClientMessageType =
  | 'SUBSCRIBE_PORTFOLIO'
  | 'UNSUBSCRIBE_PORTFOLIO'
  | 'SUBSCRIBE_MARKET'
  | 'UNSUBSCRIBE_MARKET'
  | 'PING';

export interface WebSocketClientMessage {
  type: WebSocketClientMessageType;
  payload?: {
    portfolioId?: string;
    symbols?: string[];
  };
  clientTimestamp?: number;
}

export type WebSocketServerMessageType =
  'CONNECTED' | 'TICK' | 'PORTFOLIO_UPDATE' | 'RISK_UPDATE' | 'ALERT_FIRED' | 'PONG' | 'ERROR';

export interface ConnectedServerMessage {
  type: 'CONNECTED';
  payload: {
    connectionId: string;
    serverTime: string;
  };
}

export interface TickServerMessage {
  type: 'TICK';
  payload: MarketTick;
}

export interface PortfolioUpdateServerMessage {
  type: 'PORTFOLIO_UPDATE';
  payload: {
    summary: PortfolioSummary;
    holdings: Holding[];
  };
}

export interface RiskUpdateServerMessage {
  type: 'RISK_UPDATE';
  payload: PortfolioRiskSummary;
}

export interface AlertFiredServerMessage {
  type: 'ALERT_FIRED';
  payload: AlertNotification;
}

export interface PongServerMessage {
  type: 'PONG';
  payload: {
    timestamp: number;
  };
}

export interface ErrorServerMessage {
  type: 'ERROR';
  payload: {
    code: string;
    message: string;
  };
}

export type WebSocketServerMessage =
  | ConnectedServerMessage
  | TickServerMessage
  | PortfolioUpdateServerMessage
  | RiskUpdateServerMessage
  | AlertFiredServerMessage
  | PongServerMessage
  | ErrorServerMessage;
