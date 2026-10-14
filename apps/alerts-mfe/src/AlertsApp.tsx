import { useState } from 'react';
import type { AlertSeverity } from '@foliolive/shared-types';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@foliolive/ui';
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';

export interface AlertsAppProps {
  portfolioId?: string;
  isStandalone?: boolean;
}

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  time: string;
  acknowledged: boolean;
}

export function AlertsApp({
  portfolioId = 'port_global_alpha_01',
  isStandalone = false,
}: AlertsAppProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'alt_01',
      title: 'VaR 95% Threshold Warning',
      message: 'Parametric VaR reached $1,840,250 (73.6% of $2,500,000 threshold)',
      severity: 'WARNING',
      time: '2 mins ago',
      acknowledged: false,
    },
    {
      id: 'alt_02',
      title: 'Asset Concentration Alert',
      message: 'NVDA allocation reached 8.0%, approaching 15.0% single asset cap',
      severity: 'INFO' as const,
      time: '14 mins ago',
      acknowledged: false,
    },
    {
      id: 'alt_03',
      title: 'Daily Drawdown Recovery',
      message: 'Portfolio daily change recovered from -0.45% to +0.38%',
      severity: 'INFO' as const,
      time: '1 hour ago',
      acknowledged: true,
    },
  ]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-400" />
            Risk Limits & Real-Time Alert Stream
          </h2>
          <p className="text-xs text-slate-400">
            Portfolio ID: <span className="font-mono text-slate-300">{portfolioId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStandalone && <Badge variant="outline">Standalone Mode</Badge>}
          <Badge variant="success">Engine Active (0 Critical Breaches)</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">ACTIVE RULES</div>
            <div className="text-xl font-bold font-mono text-white">3 Monitored</div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">UNACKNOWLEDGED ALERTS</div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {alerts.filter((a) => !a.acknowledged).length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/60">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">POLICY STATUS</div>
            <div className="text-xl font-bold font-mono text-emerald-400">Compliant</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="w-4 h-4 text-rose-400" />
              Live Breach Audit Trail
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">Real-time WebSocket Feed</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-3.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:bg-slate-950/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.severity === 'CRITICAL' ? (
                      <Badge variant="destructive">CRITICAL</Badge>
                    ) : alert.severity === 'WARNING' ? (
                      <Badge variant="warning">WARNING</Badge>
                    ) : (
                      <Badge variant="default">INFO</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{alert.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {alert.time}
                    </span>
                  </div>
                </div>

                <div>
                  {alert.acknowledged ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Acknowledged
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AlertsApp;
