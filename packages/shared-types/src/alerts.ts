export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertType =
  | 'VAR_95_BREACH'
  | 'VAR_99_BREACH'
  | 'MAX_DRAWDOWN_BREACH'
  | 'CONCENTRATION_LIMIT_BREACH'
  | 'GROSS_LEVERAGE_BREACH'
  | 'ASSET_PRICE_SHOCK'
  | 'VOLATILITY_SPIKE';

export interface AlertRule {
  id: string;
  portfolioId: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  thresholdValue: number;
  unit: string; // '%', '$', 'bps'
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertNotification {
  id: string;
  portfolioId: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  acknowledged: boolean;
  timestamp: string;
}
