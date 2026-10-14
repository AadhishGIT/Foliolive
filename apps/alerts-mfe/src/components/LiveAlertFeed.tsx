import { useState, useEffect, useRef } from 'react';
import type { AlertSeverity } from '@foliolive/shared-types';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@foliolive/ui';
import { BellRing, CheckCircle2, ShieldCheck, CheckCheck } from 'lucide-react';

export interface AlertFeedItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  portfolioId: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface LiveAlertFeedProps {
  alerts: AlertFeedItem[];
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
}

export function LiveAlertFeed({ alerts, onAcknowledge, onAcknowledgeAll }: LiveAlertFeedProps) {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED'>('ALL');
  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('');

  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced announcement for screen readers on new alerts
  useEffect(() => {
    const unackCritical = alerts.find((a) => !a.acknowledged && a.severity === 'CRITICAL');
    const unackWarning = alerts.find((a) => !a.acknowledged && a.severity === 'WARNING');
    const active = unackCritical || unackWarning;

    if (active) {
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
      }
      announcementTimerRef.current = setTimeout(() => {
        setPoliteAnnouncement(
          `Risk Alert: ${active.severity} - ${active.title}. ${active.message}`
        );
      }, 1000); // 1 second debounce to prevent screen-reader spam
    }

    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    };
  }, [alerts]);

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter === 'ACTIVE' && a.acknowledged) return false;
    if (statusFilter === 'ACKNOWLEDGED' && !a.acknowledged) return false;
    return true;
  });

  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Card>
      {/* Debounced WCAG 2.2 AA polite announcement container for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {politeAnnouncement}
      </div>

      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Live Breach Stream & Alert Feed
              </CardTitle>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {activeCount > 0 ? (
                  <span className="text-amber-400 font-bold">
                    {activeCount} Unacknowledged Active Breaches
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> All Risk Mandates Normal
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | AlertSeverity)}
              aria-label="Filter alerts by severity"
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="INFO">Info Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'ACKNOWLEDGED')}
              aria-label="Filter alerts by status"
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ACKNOWLEDGED">Acknowledged Only</option>
            </select>

            {/* Acknowledge All */}
            {activeCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAcknowledgeAll}
                className="text-xs flex items-center gap-1.5 border-slate-700"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                Acknowledge All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
            No alerts match the selected criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  alert.acknowledged
                    ? 'border-slate-800/50 bg-slate-950/30 opacity-75'
                    : alert.severity === 'CRITICAL'
                      ? 'border-rose-800/80 bg-rose-950/20'
                      : alert.severity === 'WARNING'
                        ? 'border-amber-800/80 bg-amber-950/20'
                        : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{alert.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {alert.portfolioId}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 font-sans">{alert.message}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1.5">
                        <span>Triggered: {alert.triggeredAt}</span>
                        <span>•</span>
                        <span>
                          Level:{' '}
                          <strong className="text-white">
                            {alert.currentValue}
                            {alert.unit}
                          </strong>{' '}
                          (Limit: {alert.thresholdValue}
                          {alert.unit})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {alert.acknowledged ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ack: {alert.acknowledgedBy || 'Lead PM'}</span>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcknowledge(alert.id)}
                        className="text-xs border-slate-700 bg-slate-900 hover:bg-slate-800"
                        aria-label={`Acknowledge alert: ${alert.title}`}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
