import type { BatchUpdatePayload, LivePortfolioUpdate } from './websocket';
import type { PortfolioRiskSummary } from './risk';
import type { AlertNotification } from './alerts';

export interface UserSession {
  username: string;
  role: 'ROLE_PM' | 'ROLE_VIEWER';
  userId: string;
}

export interface MfeGlobalState {
  token: string | null;
  user: UserSession | null;
  activePortfolioId: string;
  connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';
  theme: 'light' | 'dark';
}

export type MfeEventType =
  | 'AUTH_STATE_CHANGED'
  | 'PORTFOLIO_CHANGED'
  | 'CONNECTION_STATUS_CHANGED'
  | 'REALTIME_BATCH'
  | 'PORTFOLIO_LIVE_UPDATE'
  | 'RISK_LIVE_UPDATE'
  | 'ALERT_FIRED'
  | 'ALERT_CLEARED'
  | 'THEME_CHANGED'
  | 'NAVIGATE';

export interface MfeEventPayloadMap {
  AUTH_STATE_CHANGED: {
    token: string | null;
    user: UserSession | null;
    isAuthenticated: boolean;
  };
  PORTFOLIO_CHANGED: {
    portfolioId: string;
  };
  CONNECTION_STATUS_CHANGED: {
    status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';
  };
  REALTIME_BATCH: BatchUpdatePayload;
  PORTFOLIO_LIVE_UPDATE: LivePortfolioUpdate;
  RISK_LIVE_UPDATE: PortfolioRiskSummary;
  ALERT_FIRED: AlertNotification;
  ALERT_CLEARED: {
    alertId: string;
    portfolioId: string;
    clearedAt: string;
    currentValue: number;
    thresholdValue: number;
  };
  THEME_CHANGED: {
    theme: 'light' | 'dark';
  };
  NAVIGATE: {
    path: string;
  };
}

export interface MfeEventBus {
  publish<T extends MfeEventType>(type: T, payload: MfeEventPayloadMap[T]): void;
  subscribe<T extends MfeEventType>(
    type: T,
    handler: (payload: MfeEventPayloadMap[T]) => void
  ): () => void;
  getState(): MfeGlobalState;
  setState(partial: Partial<MfeGlobalState>): void;
}

export function createMfeEventBus(initialState?: Partial<MfeGlobalState>): MfeEventBus {
  let state: MfeGlobalState = {
    token: null,
    user: null,
    activePortfolioId: 'port_global_alpha_01',
    connectionStatus: 'DISCONNECTED',
    theme: 'dark',
    ...initialState,
  };

  type GenericHandler = (payload: unknown) => void;
  const listeners = new Map<MfeEventType, Set<GenericHandler>>();

  return {
    publish<T extends MfeEventType>(type: T, payload: MfeEventPayloadMap[T]): void {
      const typeListeners = listeners.get(type);
      if (typeListeners) {
        for (const handler of typeListeners) {
          try {
            handler(payload);
          } catch (err) {
            console.error(`[MfeEventBus] Error in listener for ${type}:`, err);
          }
        }
      }
    },

    subscribe<T extends MfeEventType>(
      type: T,
      handler: (payload: MfeEventPayloadMap[T]) => void
    ): () => void {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      const set = listeners.get(type)!;
      set.add(handler as GenericHandler);

      // Replay current state immediately for stateful subscriptions
      if (type === 'PORTFOLIO_CHANGED') {
        (handler as (p: MfeEventPayloadMap['PORTFOLIO_CHANGED']) => void)({
          portfolioId: state.activePortfolioId,
        });
      } else if (type === 'AUTH_STATE_CHANGED') {
        (handler as (p: MfeEventPayloadMap['AUTH_STATE_CHANGED']) => void)({
          token: state.token,
          user: state.user,
          isAuthenticated: Boolean(state.token),
        });
      } else if (type === 'CONNECTION_STATUS_CHANGED') {
        (handler as (p: MfeEventPayloadMap['CONNECTION_STATUS_CHANGED']) => void)({
          status: state.connectionStatus,
        });
      } else if (type === 'THEME_CHANGED') {
        (handler as (p: MfeEventPayloadMap['THEME_CHANGED']) => void)({
          theme: state.theme,
        });
      }

      return () => {
        set.delete(handler as GenericHandler);
        if (set.size === 0) {
          listeners.delete(type);
        }
      };
    },

    getState(): MfeGlobalState {
      return { ...state };
    },

    setState(partial: Partial<MfeGlobalState>): void {
      const oldState = { ...state };
      state = { ...state, ...partial };

      if (partial.token !== undefined || partial.user !== undefined) {
        this.publish('AUTH_STATE_CHANGED', {
          token: state.token,
          user: state.user,
          isAuthenticated: Boolean(state.token),
        });
      }
      if (partial.activePortfolioId && partial.activePortfolioId !== oldState.activePortfolioId) {
        this.publish('PORTFOLIO_CHANGED', { portfolioId: state.activePortfolioId });
      }
      if (partial.connectionStatus && partial.connectionStatus !== oldState.connectionStatus) {
        this.publish('CONNECTION_STATUS_CHANGED', { status: state.connectionStatus });
      }
      if (partial.theme && partial.theme !== oldState.theme) {
        this.publish('THEME_CHANGED', { theme: state.theme });
      }
    },
  };
}

declare global {
  interface Window {
    __FOLIOLIVE_BUS__?: MfeEventBus;
  }
}

/**
 * Accesses or initializes the singleton cross-micro-frontend event bus.
 */
export function getGlobalMfeBus(): MfeEventBus {
  if (typeof window === 'undefined') {
    return createMfeEventBus();
  }
  if (!window.__FOLIOLIVE_BUS__) {
    // If running in standalone remote mode without shell, default to demo PM user
    window.__FOLIOLIVE_BUS__ = createMfeEventBus({
      activePortfolioId: 'port_global_alpha_01',
      token: 'standalone_dev_token',
      user: {
        username: 'pm_demo',
        role: 'ROLE_PM',
        userId: 'usr_pm_01',
      },
    });
  }
  return window.__FOLIOLIVE_BUS__;
}
