import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@foliolive/shared-types';
import type { ConnectionStatus } from '@foliolive/realtime-client';
import { getGlobalMfeBus } from '@foliolive/shared-types';

const STORAGE_KEY_AUTH = 'foliolive_auth_session';
const STORAGE_KEY_PORTFOLIO = 'foliolive_active_portfolio';

interface AppState {
  activePortfolioId: string;
  connectionStatus: ConnectionStatus;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  messagesReceived: number;
}

function loadInitialState(): AppState {
  let savedAuth: { user: User; token: string } | null = null;
  let savedPortfolio = 'port_global_alpha_01';

  if (typeof window !== 'undefined') {
    try {
      const rawAuth = localStorage.getItem(STORAGE_KEY_AUTH);
      if (rawAuth) {
        savedAuth = JSON.parse(rawAuth);
      }
      const rawPort = localStorage.getItem(STORAGE_KEY_PORTFOLIO);
      if (rawPort) {
        savedPortfolio = rawPort;
      }
    } catch {
      // Fallback if storage access is restricted
    }
  }

  // Default to PM demo if not stored, so the app is immediately usable
  const defaultUser: User = {
    id: 'usr_pm_01',
    username: 'pm_demo',
    email: 'pm_demo@foliolive.internal',
    fullName: 'Lead Portfolio Manager',
    role: 'ROLE_PM',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const user = savedAuth?.user ?? defaultUser;
  const token = savedAuth?.token ?? 'dev_token_pm';

  return {
    activePortfolioId: savedPortfolio,
    connectionStatus: 'DISCONNECTED',
    user,
    token,
    isAuthenticated: Boolean(token),
    messagesReceived: 0,
  };
}

const initialState: AppState = loadInitialState();

// Initialize global bus with initial state
if (typeof window !== 'undefined') {
  const bus = getGlobalMfeBus();
  bus.setState({
    token: initialState.token,
    user: initialState.user
      ? {
          userId: initialState.user.id,
          username: initialState.user.username,
          role: initialState.user.role as 'ROLE_PM' | 'ROLE_VIEWER',
        }
      : null,
    activePortfolioId: initialState.activePortfolioId,
    connectionStatus: initialState.connectionStatus,
  });
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPortfolioId(state, action: PayloadAction<string>) {
      state.activePortfolioId = action.payload;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_PORTFOLIO, action.payload);
        } catch {
          // ignore
        }
        getGlobalMfeBus().setState({ activePortfolioId: action.payload });
      }
    },
    setConnectionStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.connectionStatus = action.payload;
      if (typeof window !== 'undefined') {
        getGlobalMfeBus().setState({ connectionStatus: action.payload });
      }
    },
    setUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(action.payload));
        } catch {
          // ignore
        }
        getGlobalMfeBus().setState({
          token: action.payload.token,
          user: {
            userId: action.payload.user.id,
            username: action.payload.user.username,
            role: action.payload.user.role as 'ROLE_PM' | 'ROLE_VIEWER',
          },
        });
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        } catch {
          // ignore
        }
        getGlobalMfeBus().setState({
          token: null,
          user: null,
        });
      }
    },
    incrementMessageCount(state) {
      state.messagesReceived += 1;
    },
  },
});

export const { setPortfolioId, setConnectionStatus, setUser, logout, incrementMessageCount } =
  appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
