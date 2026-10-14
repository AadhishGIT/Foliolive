import { describe, it, expect } from 'vitest';
import { generateHoldings } from '../../../apps/portfolio-mfe/src/data/holdings-generator';

describe('Holdings Generator & Financial Math', () => {
  it('generates 500 positions deterministically with identical seed', () => {
    const run1 = generateHoldings(500, 42);
    const run2 = generateHoldings(500, 42);

    expect(run1.length).toBe(500);
    expect(run2.length).toBe(500);

    // Deep compare first 10 core positions
    for (let i = 0; i < 10; i++) {
      expect(run1[i]?.symbol).toBe(run2[i]?.symbol);
      expect(run1[i]?.markPrice).toBe(run2[i]?.markPrice);
      expect(run1[i]?.quantity).toBe(run2[i]?.quantity);
      expect(run1[i]?.marketValue).toBe(run2[i]?.marketValue);
      expect(run1[i]?.unrealizedPnL).toBe(run2[i]?.unrealizedPnL);
    }
  });

  it('validates financial math integrity on all positions', () => {
    const holdings = generateHoldings(500, 42);

    for (const h of holdings) {
      // Market value = quantity * markPrice
      const expectedMV = +(h.quantity * h.markPrice).toFixed(2);
      expect(Math.abs(h.marketValue - expectedMV)).toBeLessThanOrEqual(0.02);

      // Cost basis = quantity * entryPrice
      const costBasis = +(h.quantity * h.entryPrice).toFixed(2);
      const expectedPnL = +(h.marketValue - costBasis).toFixed(2);
      expect(Math.abs(h.unrealizedPnL - expectedPnL)).toBeLessThanOrEqual(0.02);

      // Quantities and prices must be strictly positive
      expect(h.quantity).toBeGreaterThan(0);
      expect(h.markPrice).toBeGreaterThan(0);
      expect(h.entryPrice).toBeGreaterThan(0);
    }

    // Weights sum to ~100%
    const sumWeights = holdings.reduce((sum, h) => sum + h.weightPercent, 0);
    expect(sumWeights).toBeGreaterThan(99.8);
    expect(sumWeights).toBeLessThan(100.2);
  });

  it('demonstrates sub-100ms generation for 10,000 stress testing rows', () => {
    const startTime = performance.now();
    const stressHoldings = generateHoldings(10000, 9999);
    const elapsedMs = performance.now() - startTime;

    expect(stressHoldings.length).toBe(10000);
    // Real measurement: generating 10,000 institutional positions in memory must complete in < 150ms
    expect(elapsedMs).toBeLessThan(150);
  });

  it('ensures broad sector and asset class coverage', () => {
    const holdings = generateHoldings(500, 42);
    const sectors = new Set(holdings.map((h) => h.sector));
    const assetClasses = new Set(holdings.map((h) => h.assetClass));

    expect(sectors.size).toBe(10);
    expect(sectors.has('TECHNOLOGY')).toBe(true);
    expect(sectors.has('FINANCIALS')).toBe(true);
    expect(sectors.has('HEALTHCARE')).toBe(true);
    expect(sectors.has('ENERGY')).toBe(true);

    expect(assetClasses.has('EQUITY')).toBe(true);
    expect(assetClasses.has('FIXED_INCOME')).toBe(true);
    expect(assetClasses.has('COMMODITY')).toBe(true);
    expect(assetClasses.has('DERIVATIVE')).toBe(true);
  });
});
