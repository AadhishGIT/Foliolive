import React, { useEffect, useTransition } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Header } from './components/Header';
import { RemoteWrapper } from './components/RemoteWrapper';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { setConnectionStatus, incrementMessageCount, type RootState } from './store';
import { RealtimeClient } from '@foliolive/realtime-client';
import { getGlobalMfeBus } from '@foliolive/shared-types';
import { ThemeProvider, SkipLink } from '@foliolive/ui';
import { recordCustomMetric } from './telemetry/web-vitals';

// Remote micro-frontend components via Module Federation
// @ts-expect-error - Module Federation dynamic import
const RemotePortfolio = React.lazy(() => import('portfolio_mfe/PortfolioApp'));
// @ts-expect-error - Module Federation dynamic import
const RemoteRisk = React.lazy(() => import('risk_mfe/RiskApp'));
// @ts-expect-error - Module Federation dynamic import
const RemoteAlerts = React.lazy(() => import('alerts_mfe/AlertsApp'));

export function App() {
  const dispatch = useDispatch();
  const { activePortfolioId, token, isAuthenticated } = useSelector(
    (state: RootState) => state.app
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const connectStartTime = performance.now();
    let hasReportedFirstLiveUpdate = false;

    const reportFirstLiveUpdate = () => {
      if (!hasReportedFirstLiveUpdate) {
        hasReportedFirstLiveUpdate = true;
        const latencyMs = Math.round(performance.now() - connectStartTime);
        recordCustomMetric('timeToFirstLiveUpdateMs', latencyMs, 'ms');
      }
    };

    const wsUrl = import.meta.env.VITE_BFF_WS_URL || 'ws://localhost:4000/ws';
    const client = new RealtimeClient({
      url: wsUrl,
      token: token || undefined,
    });

    const bus = getGlobalMfeBus();

    const unsubStatus = client.onStatusChange((status) => {
      if (status === 'RECONNECTING') {
        recordCustomMetric('wsReconnectCount', 1, 'count');
      }
      startTransition(() => {
        dispatch(setConnectionStatus(status));
      });
      bus.setState({ connectionStatus: status });
    });

    const unsubBatch = client.onBatch((batch) => {
      reportFirstLiveUpdate();
      dispatch(incrementMessageCount());
      bus.publish('REALTIME_BATCH', batch);
    });

    const unsubLive = client.onLivePortfolioUpdate((update) => {
      reportFirstLiveUpdate();
      dispatch(incrementMessageCount());
      bus.publish('PORTFOLIO_LIVE_UPDATE', update);
    });

    const unsubRisk = client.onRiskUpdate((risk) => {
      dispatch(incrementMessageCount());
      bus.publish('RISK_LIVE_UPDATE', risk);
    });

    const unsubAlert = client.onAlert((alert) => {
      dispatch(incrementMessageCount());
      bus.publish('ALERT_FIRED', alert);
    });

    const unsubCleared = client.onAlertCleared((cleared) => {
      dispatch(incrementMessageCount());
      bus.publish('ALERT_CLEARED', cleared);
    });

    client.connect();
    client.subscribePortfolio(activePortfolioId);

    return () => {
      unsubStatus();
      unsubBatch();
      unsubLive();
      unsubRisk();
      unsubAlert();
      unsubCleared();
      client.disconnect();
    };
  }, [dispatch, activePortfolioId, token, isAuthenticated]);

  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
          <SkipLink targetId="main-content">Skip to main content</SkipLink>
          <Header />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 focus:outline-none"
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/portfolio" replace />} />
              <Route
                path="/portfolio"
                element={
                  <ProtectedRoute>
                    <RemoteWrapper remoteName="portfolio-mfe">
                      <RemotePortfolio portfolioId={activePortfolioId} />
                    </RemoteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk"
                element={
                  <ProtectedRoute>
                    <RemoteWrapper remoteName="risk-mfe">
                      <RemoteRisk portfolioId={activePortfolioId} />
                    </RemoteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <RemoteWrapper remoteName="alerts-mfe">
                      <RemoteAlerts portfolioId={activePortfolioId} />
                    </RemoteWrapper>
                  </ProtectedRoute>
                }
              />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/portfolio" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
