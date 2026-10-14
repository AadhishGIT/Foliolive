import { describe, it, expect, vi } from 'vitest';
import { createMfeEventBus, getGlobalMfeBus } from '../../shared-types/src';

describe('Cross-MFE Event Bus (ADR 0009 Contract)', () => {
  it('initializes with default institutional state', () => {
    const bus = createMfeEventBus();
    const state = bus.getState();

    expect(state.activePortfolioId).toBe('port_global_alpha_01');
    expect(state.connectionStatus).toBe('DISCONNECTED');
    expect(state.theme).toBe('dark');
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('publishes and subscribes to PORTFOLIO_CHANGED with state replay', () => {
    const bus = createMfeEventBus({ activePortfolioId: 'port_macro_hedge_02' });
    const listener = vi.fn();

    // When subscribing, state is immediately replayed to late-mounting remotes
    const unsubscribe = bus.subscribe('PORTFOLIO_CHANGED', listener);
    expect(listener).toHaveBeenCalledWith({ portfolioId: 'port_macro_hedge_02' });

    // When updating state, subscriber receives new event
    bus.setState({ activePortfolioId: 'port_tech_growth_03' });
    expect(listener).toHaveBeenCalledWith({ portfolioId: 'port_tech_growth_03' });

    // When unsubscribed, listener is no longer called
    unsubscribe();
    bus.setState({ activePortfolioId: 'port_global_alpha_01' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('replays AUTH_STATE_CHANGED with isAuthenticated boolean', () => {
    const bus = createMfeEventBus({
      token: 'jwt_test_token',
      user: {
        userId: 'usr_pm_01',
        username: 'pm_demo',
        role: 'ROLE_PM',
      },
    });

    const listener = vi.fn();
    bus.subscribe('AUTH_STATE_CHANGED', listener);

    expect(listener).toHaveBeenCalledWith({
      token: 'jwt_test_token',
      user: {
        userId: 'usr_pm_01',
        username: 'pm_demo',
        role: 'ROLE_PM',
      },
      isAuthenticated: true,
    });
  });

  it('publishes high-frequency REALTIME_BATCH without mutation', () => {
    const bus = createMfeEventBus();
    const listener = vi.fn();

    bus.subscribe('REALTIME_BATCH', listener);

    const mockBatch = {
      sequenceNumber: 1042,
      timestamp: new Date().toISOString(),
      ticks: [
        {
          symbol: 'AAPL',
          price: 186.25,
          bid: 186.2,
          ask: 186.3,
          change: 0.75,
          changePercent: 0.4,
          high: 187.0,
          low: 185.0,
          volume: 2450000,
          timestamp: new Date().toISOString(),
        },
      ],
      portfolioUpdates: [],
      riskUpdates: [],
      alerts: [],
      clearedAlerts: [],
    };

    bus.publish('REALTIME_BATCH', mockBatch);
    expect(listener).toHaveBeenCalledWith(mockBatch);
  });

  it('provides a singleton instance via getGlobalMfeBus() in browser window', () => {
    const bus1 = getGlobalMfeBus();
    const bus2 = getGlobalMfeBus();
    expect(bus1).toBe(bus2);
  });
});
