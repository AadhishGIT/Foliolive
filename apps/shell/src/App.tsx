import React, { useEffect, useTransition } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Header } from './components/Header';
import { RemoteWrapper } from './components/RemoteWrapper';
import { setConnectionStatus, type RootState } from './store';
import { RealtimeClient } from '@foliolive/realtime-client';

// Remote micro-frontend components via Module Federation
// @ts-expect-error - Module Federation dynamic import
const RemotePortfolio = React.lazy(() => import('portfolio_mfe/PortfolioApp'));
// @ts-expect-error - Module Federation dynamic import
const RemoteRisk = React.lazy(() => import('risk_mfe/RiskApp'));
// @ts-expect-error - Module Federation dynamic import
const RemoteAlerts = React.lazy(() => import('alerts_mfe/AlertsApp'));

export function App() {
  const dispatch = useDispatch();
  const activePortfolioId = useSelector((state: RootState) => state.app.activePortfolioId);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_BFF_WS_URL || 'ws://localhost:4000/ws';
    const client = new RealtimeClient({ url: wsUrl });

    const unsubscribe = client.onStatusChange((status) => {
      startTransition(() => {
        dispatch(setConnectionStatus(status));
      });
    });

    client.connect();
    client.subscribePortfolio(activePortfolioId);

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [dispatch, activePortfolioId]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <Routes>
            <Route
              path="/"
              element={
                <RemoteWrapper remoteName="portfolio-mfe">
                  <RemotePortfolio portfolioId={activePortfolioId} />
                </RemoteWrapper>
              }
            />
            <Route
              path="/portfolio"
              element={
                <RemoteWrapper remoteName="portfolio-mfe">
                  <RemotePortfolio portfolioId={activePortfolioId} />
                </RemoteWrapper>
              }
            />
            <Route
              path="/risk"
              element={
                <RemoteWrapper remoteName="risk-mfe">
                  <RemoteRisk portfolioId={activePortfolioId} />
                </RemoteWrapper>
              }
            />
            <Route
              path="/alerts"
              element={
                <RemoteWrapper remoteName="alerts-mfe">
                  <RemoteAlerts portfolioId={activePortfolioId} />
                </RemoteWrapper>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
