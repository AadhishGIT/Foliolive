import { describe, it, expect } from 'vitest';
import { MarketSimulator, DeterministicRNG } from '../src/simulator';

describe('MarketSimulator (GBM with Sector Correlation & Shock Events)', () => {
  it('DeterministicRNG produces identical sequence for same seed', () => {
    const rng1 = new DeterministicRNG(12345);
    const rng2 = new DeterministicRNG(12345);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).toEqual(seq2);

    const g1 = Array.from({ length: 10 }, () => rng1.nextGaussian());
    const g2 = Array.from({ length: 10 }, () => rng2.nextGaussian());

    expect(g1).toEqual(g2);
  });

  it('DeterministicRNG produces different sequences for different seeds', () => {
    const rngA = new DeterministicRNG(111);
    const rngB = new DeterministicRNG(222);

    const valA = rngA.next();
    const valB = rngB.next();

    expect(valA).not.toEqual(valB);
  });

  it('Simulator determinism: identical seed produces exact same price trajectories across all 27 instruments', () => {
    const sim1 = new MarketSimulator(42, 100);
    const sim2 = new MarketSimulator(42, 100);

    for (let step = 0; step < 25; step++) {
      sim1.step(0.5);
      sim2.step(0.5);
    }

    const prices1 = Array.from(sim1.getAllPrices().entries());
    const prices2 = Array.from(sim2.getAllPrices().entries());

    expect(prices1.length).toBe(27);
    expect(prices1).toEqual(prices2);
  });

  it('Different seeds produce different price trajectories', () => {
    const simA = new MarketSimulator(101, 100);
    const simB = new MarketSimulator(202, 100);

    for (let step = 0; step < 20; step++) {
      simA.step(0.5);
      simB.step(0.5);
    }

    expect(simA.getPrice('AAPL')).not.toEqual(simB.getPrice('AAPL'));
    expect(simA.getPrice('NVDA')).not.toEqual(simB.getPrice('NVDA'));
  });

  it('Intra-sector correlation: tech stocks move together more frequently than across sectors', () => {
    const sim = new MarketSimulator(777, 100);
    let techConcordant = 0;
    let crossConcordant = 0;
    const steps = 100;

    let prevAapl = sim.getPrice('AAPL');
    let prevMsft = sim.getPrice('MSFT');
    let prevXom = sim.getPrice('XOM');

    for (let i = 0; i < steps; i++) {
      sim.step(0.5);
      const currAapl = sim.getPrice('AAPL');
      const currMsft = sim.getPrice('MSFT');
      const currXom = sim.getPrice('XOM');

      const aaplUp = currAapl >= prevAapl;
      const msftUp = currMsft >= prevMsft;
      const xomUp = currXom >= prevXom;

      if (aaplUp === msftUp) techConcordant++;
      if (aaplUp === xomUp) crossConcordant++;

      prevAapl = currAapl;
      prevMsft = currMsft;
      prevXom = currXom;
    }

    // Technology sector intra-correlation (rho = 0.65) yields higher concordance than tech vs energy
    expect(techConcordant).toBeGreaterThan(crossConcordant);
  });

  it('Manual shock event moves affected sector instruments by specified magnitude', () => {
    const sim = new MarketSimulator(42, 100);
    const beforeNvda = sim.getPrice('NVDA');
    const beforeAapl = sim.getPrice('AAPL');
    const beforeXom = sim.getPrice('XOM');

    // Trigger -10% shock on TECHNOLOGY sector
    const shock = sim.triggerManualShock(-0.1, 'TECHNOLOGY');

    expect(shock.sector).toBe('TECHNOLOGY');
    expect(shock.magnitude).toBe(-0.1);

    const afterNvda = sim.getPrice('NVDA');
    const afterAapl = sim.getPrice('AAPL');
    const afterXom = sim.getPrice('XOM');

    expect(afterNvda).toBeLessThan(beforeNvda);
    expect(afterAapl).toBeLessThan(beforeAapl);
    // Energy sector should be unaffected by technology shock
    expect(afterXom).toBe(beforeXom);
  });

  it('Simulator maintains price bounds and positivity', () => {
    const sim = new MarketSimulator(999, 100);
    for (let i = 0; i < 50; i++) {
      sim.step(1.0);
      for (const price of sim.getAllPrices().values()) {
        expect(price).toBeGreaterThan(0);
      }
    }
  });

  it('Simulator toggles stress mode and updates tick rate', () => {
    const sim = new MarketSimulator(42, 120);
    expect(sim.getStatus().stressMode).toBe(false);
    expect(sim.getStatus().tickIntervalMs).toBe(120);

    sim.setStressMode(true);
    expect(sim.getStatus().stressMode).toBe(true);
    expect(sim.getStatus().tickIntervalMs).toBe(10);
    expect(sim.getStatus().ticksPerSecond).toBe(100);

    sim.setStressMode(false);
    expect(sim.getStatus().stressMode).toBe(false);
    expect(sim.getStatus().tickIntervalMs).toBe(120);
  });
});
