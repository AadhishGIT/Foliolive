import { describe, it, expect, beforeEach } from 'vitest';
import type { AlertNotification } from '@foliolive/shared-types';
import { MarketSimulator } from '../src/simulator';
import { RealtimeEngine } from '../src/realtime-engine';

interface ClearedAlertEvent {
  alertId: string;
  portfolioId: string;
  clearedAt: string;
  currentValue: number;
  thresholdValue: number;
}

describe('RealtimeEngine Valuation & Alert Generation', () => {
  let sim: MarketSimulator;
  let engine: RealtimeEngine;

  beforeEach(() => {
    sim = new MarketSimulator(42, 100);
    engine = new RealtimeEngine(sim);
  });

  it('computes live portfolio market value, cash, and P&L correctly', () => {
    const evaluation = engine.evaluateAll();

    expect(evaluation.liveUpdates.length).toBe(3);
    const port1 = evaluation.liveUpdates.find((p) => p.portfolioId === 'port_global_alpha_01');
    expect(port1).toBeDefined();
    expect(port1?.totalValue).toBeGreaterThan(90000000);
    expect(port1?.cashBalance).toBe(8420000.0);
    expect(port1?.holdingsCount).toBe(10);
  });

  it('computes live risk metrics including parametric VaR and exposure', () => {
    const evaluation = engine.evaluateAll();
    const risk1 = evaluation.riskUpdates.find((r) => r.portfolioId === 'port_global_alpha_01');

    expect(risk1).toBeDefined();
    expect(risk1?.var.parametric.confidence95).toBeGreaterThan(0);
    expect(risk1?.var.parametric.confidence99).toBeGreaterThan(risk1!.var.parametric.confidence95);
    expect(risk1?.exposure.grossExposure).toBeGreaterThan(0);
    expect(risk1?.concentration.top5ConcentrationPercent).toBeGreaterThan(0);
  });

  it('emits ALERT_FIRED when risk limits are breached', () => {
    const firedAlerts: AlertNotification[] = [];
    engine.onAlertFired((alert) => {
      firedAlerts.push(alert);
    });

    // Artificially lower limit threshold to trigger immediate breach
    const port1 = engine.getPortfolio('port_global_alpha_01')!;
    const limit = port1.riskLimits.find((l) => l.type === 'VAR_95')!;
    limit.threshold = 100000; // very low threshold

    engine.evaluateAll();

    const varAlert = firedAlerts.find((a) => a.type === 'VAR_95_BREACH');
    expect(varAlert).toBeDefined();
    expect(varAlert?.portfolioId).toBe('port_global_alpha_01');
    expect(varAlert?.currentValue).toBeGreaterThan(100000);
  });

  it('emits ALERT_CLEARED when breached limit returns below threshold', () => {
    let clearedData: ClearedAlertEvent | null = null;
    engine.onAlertCleared((data) => {
      clearedData = data;
    });

    const port1 = engine.getPortfolio('port_global_alpha_01')!;
    const limit = port1.riskLimits.find((l) => l.type === 'VAR_95')!;

    // 1. Trigger breach
    limit.threshold = 100000;
    engine.evaluateAll();

    // 2. Raise threshold back up to normalize
    limit.threshold = 100000000;
    engine.evaluateAll();

    expect(clearedData).not.toBeNull();
    expect(clearedData.portfolioId).toBe('port_global_alpha_01');
    expect(clearedData.thresholdValue).toBe(100000000);
  });
});
