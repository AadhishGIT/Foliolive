import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@foliolive/shared-types';
import type { ConnectionStatus } from '@foliolive/realtime-client';

interface AppState {
  activePortfolioId: string;
  connectionStatus: ConnectionStatus;
  user: User | null;
  token: string | null;
}

const initialState: AppState = {
  activePortfolioId: 'port_global_alpha_01',
  connectionStatus: 'DISCONNECTED',
  user: {
    id: 'usr_demo_pm',
    username: 'pm_demo',
    email: 'pm_demo@foliolive.internal',
    fullName: 'Lead Portfolio Manager',
    role: 'PORTFOLIO_MANAGER',
    createdAt: new Date().toISOString(),
  },
  token: 'dev-token',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPortfolioId(state, action: PayloadAction<string>) {
      state.activePortfolioId = action.payload;
    },
    setConnectionStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.connectionStatus = action.payload;
    },
    setUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout(state) {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setPortfolioId, setConnectionStatus, setUser, logout } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
