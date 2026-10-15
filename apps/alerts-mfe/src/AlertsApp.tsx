import { useState, useEffect } from 'react';
import type { UserRole } from '@foliolive/shared-types';
import { Badge } from '@foliolive/ui';
import { BellRing, ShieldCheck, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { LiveAlertFeed, type AlertFeedItem } from './components/LiveAlertFeed';
import { RiskLimitManager } from './components/RiskLimitManager';
import { AlertAuditHistory } from './components/AlertAuditHistory';
import { getGlobalMfeBus } from '@foliolive/shared-types';

export interface AlertsAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

const INITIAL_ALERTS: AlertFeedItem[] = [
  {
    id: 'alt_01',
    title: 'VaR 95% Ceiling Warning',
    message: 'Parametric VaR reached $1,840,250 (73.6% of $2,500,000 threshold limit)',
    severity: 'WARNING',
    portfolioId: 'port_global_alpha_01',
    currentValue: 1840250,
    thresholdValue: 2500000,
    unit: '$',
    triggeredAt: '4 mins ago',
    acknowledged: false,
  },
  {
    id: 'alt_02',
    title: 'Single Asset Concentration Near Cap',
    message: 'NVDA allocation reached 11.7%, approaching 15.0% single asset mandate cap',
    severity: 'INFO',
    portfolioId: 'port_global_alpha_01',
    currentValue: 11.7,
    thresholdValue: 15.0,
    unit: '%',
    triggeredAt: '18 mins ago',
    acknowledged: false,
  },
  {
    id: 'alt_03',
    title: 'Tech Sector Exposure Warning',
    message: 'Sector allocation elevated at 34.2% (approaching 40.0% policy cap)',
    severity: 'INFO',
    portfolioId: 'port_global_alpha_01',
    currentValue: 34.2,
    thresholdValue: 40.0,
    unit: '%',
    triggeredAt: '1 hour ago',
    acknowledged: true,
    acknowledgedBy: 'Lead PM',
  },
];

export function AlertsApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: AlertsAppProps) {
  const [currentPortfolioId, setCurrentPortfolioId] = useState(portfolioId);
  const [userRole, setUserRole] = useState<UserRole>('ROLE_PM');
  const [alerts, setAlerts] = useState<AlertFeedItem[]>(INITIAL_ALERTS);

  // Cross-MFE Event Bus connection
  useEffect(() => {
    setCurrentPortfolioId(portfolioId);
    const bus = getGlobalMfeBus();

    // Replay initial user role
    const globalUser = bus.getState().user;
    if (globalUser?.role) {
      setUserRole(globalUser.role as UserRole);
    }

    const unsubPortfolio = bus.subscribe('PORTFOLIO_CHANGED', (payload) => {
      setCurrentPortfolioId(payload.portfolioId);
    });

    const unsubAuth = bus.subscribe('AUTH_STATE_CHANGED', (payload) => {
      if (payload.user?.role) {
        setUserRole(payload.user.role as UserRole);
      }
    });

    const unsubAlert = bus.subscribe('ALERT_FIRED', (notification) => {
      setAlerts((prev) => [
        {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          portfolioId: notification.portfolioId,
          currentValue: notification.currentValue,
          thresholdValue: notification.thresholdValue,
          unit: notification.unit || '%',
          triggeredAt: 'Just now',
          acknowledged: false,
        },
        ...prev,
      ]);
    });

    const unsubCleared = bus.subscribe('ALERT_CLEARED', (cleared) => {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === cleared.alertId
            ? { ...a, acknowledged: true, acknowledgedBy: 'System Clear' }
            : a
        )
      );
    });

    return () => {
      unsubPortfolio();
      unsubAuth();
      unsubAlert();
      unsubCleared();
    };
  }, [portfolioId]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              acknowledged: true,
              acknowledgedBy: userRole === 'ROLE_PM' ? 'Lead PM' : 'Viewer',
              acknowledgedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) =>
      prev.map((a) => ({
        ...a,
        acknowledged: true,
        acknowledgedBy: userRole === 'ROLE_PM' ? 'Lead PM' : 'Viewer',
        acknowledgedAt: new Date().toISOString(),
      }))
    );
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-rose-500 dark:text-rose-400" />
            Mandate Limits & Real-Time Alert Surveillance
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Portfolio ID:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              {currentPortfolioId}
            </span>
            <span>•</span>
            <span>
              Access Role:{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{userRole}</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStandalone && (
            <Badge variant="outline" className="text-xs">
              Standalone Mode
            </Badge>
          )}
          <Badge variant={unacknowledgedCount === 0 ? 'success' : 'warning'}>
            {unacknowledgedCount === 0
              ? 'Zero Critical Breaches'
              : `${unacknowledgedCount} Active Alerts`}
          </Badge>
        </div>
      </div>

      {/* Surveillance Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card text-card-foreground border border-border shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium font-mono">
              ACTIVE MANDATES
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              4 Rules Enforced
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card text-card-foreground border border-border shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium font-mono">
              UNACKNOWLEDGED ALERTS
            </div>
            <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
              {unacknowledgedCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card text-card-foreground border border-border shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium font-mono">
              SURVEILLANCE ENGINE
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              Real-Time WebSocket
            </div>
          </div>
        </div>
      </div>

      {/* Live Alert Feed with Accessible polite region */}
      <LiveAlertFeed
        alerts={alerts}
        onAcknowledge={handleAcknowledge}
        onAcknowledgeAll={handleAcknowledgeAll}
      />

      {/* Risk Limit Management (PM Role Restricted) */}
      <RiskLimitManager userRole={userRole} />

      {/* Historical Breach Audit Trail */}
      <AlertAuditHistory />
    </div>
  );
}

export default AlertsApp;
