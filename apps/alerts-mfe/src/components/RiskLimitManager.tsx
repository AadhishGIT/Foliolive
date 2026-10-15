import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Input,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@foliolive/ui';
import { Sliders, Plus, Edit2, Trash2 } from 'lucide-react';
import type { UserRole } from '@foliolive/shared-types';

export interface RiskLimitRule {
  id: string;
  name: string;
  type: 'MAX_SECTOR_EXPOSURE' | 'MAX_ASSET_CONCENTRATION' | 'VAR_95_THRESHOLD' | 'MAX_DRAWDOWN';
  target: string;
  threshold: number;
  unit: string;
  currentValue: number;
  status: 'NORMAL' | 'NEAR_THRESHOLD' | 'BREACHED';
}

const INITIAL_RULES: RiskLimitRule[] = [
  {
    id: 'lim_01',
    name: 'Tech Sector Exposure Cap',
    type: 'MAX_SECTOR_EXPOSURE',
    target: 'TECHNOLOGY',
    threshold: 40.0,
    unit: '%',
    currentValue: 34.2,
    status: 'NORMAL',
  },
  {
    id: 'lim_02',
    name: 'Single Asset Concentration Limit',
    type: 'MAX_ASSET_CONCENTRATION',
    target: 'SINGLE_ASSET',
    threshold: 15.0,
    unit: '%',
    currentValue: 11.7,
    status: 'NEAR_THRESHOLD',
  },
  {
    id: 'lim_03',
    name: 'Parametric VaR 95% Ceiling',
    type: 'VAR_95_THRESHOLD',
    target: 'PORTFOLIO_VAR',
    threshold: 2_500_000,
    unit: '$',
    currentValue: 1_840_250,
    status: 'NORMAL',
  },
  {
    id: 'lim_04',
    name: 'Max Daily Drawdown Stop',
    type: 'MAX_DRAWDOWN',
    target: 'PORTFOLIO_DRAWDOWN',
    threshold: 3.5,
    unit: '%',
    currentValue: 1.1,
    status: 'NORMAL',
  },
];

export interface RiskLimitManagerProps {
  userRole?: UserRole;
}

export function RiskLimitManager({ userRole = 'ROLE_PM' }: RiskLimitManagerProps) {
  const [rules, setRules] = useState<RiskLimitRule[]>(INITIAL_RULES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RiskLimitRule | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<RiskLimitRule['type']>('MAX_SECTOR_EXPOSURE');
  const [formTarget, setFormTarget] = useState('');
  const [formThreshold, setFormThreshold] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isPm = userRole === 'ROLE_PM' || userRole === 'PORTFOLIO_MANAGER';

  const handleOpenCreate = () => {
    if (!isPm) return;
    setEditingRule(null);
    setFormName('');
    setFormType('MAX_SECTOR_EXPOSURE');
    setFormTarget('TECHNOLOGY');
    setFormThreshold('40.0');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: RiskLimitRule) => {
    if (!isPm) return;
    setEditingRule(rule);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormTarget(rule.target);
    setFormThreshold(String(rule.threshold));
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!isPm) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const thresholdNum = parseFloat(formThreshold);
    if (!formName.trim()) {
      setFormError('Rule name is required.');
      return;
    }
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      setFormError('Threshold must be a positive number.');
      return;
    }

    const unit = formType === 'VAR_95_THRESHOLD' ? '$' : '%';

    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                name: formName,
                type: formType,
                target: formTarget,
                threshold: thresholdNum,
                unit,
                status:
                  r.currentValue >= thresholdNum
                    ? 'BREACHED'
                    : r.currentValue >= thresholdNum * 0.8
                      ? 'NEAR_THRESHOLD'
                      : 'NORMAL',
              }
            : r
        )
      );
    } else {
      const newRule: RiskLimitRule = {
        id: `lim_${Date.now()}`,
        name: formName,
        type: formType,
        target: formTarget,
        threshold: thresholdNum,
        unit,
        currentValue: 0,
        status: 'NORMAL',
      };
      setRules((prev) => [...prev, newRule]);
    }

    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Risk Limit Policies & Mandate Rules
            </CardTitle>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Configure automated breach detection triggers across exposure and VaR thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isPm && (
              <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-400">
                Read-Only (Requires PM Role)
              </Badge>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!isPm}
                  onClick={handleOpenCreate}
                  className="text-xs flex items-center gap-1.5"
                  title={!isPm ? 'Only Portfolio Managers (ROLE_PM) can add rules' : undefined}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Rule
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-white">
                    {editingRule ? 'Edit Risk Limit Policy' : 'Create New Risk Limit Policy'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Set policy threshold. The system alerts in real time upon breach.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-3.5 text-xs font-sans mt-2">
                  {formError && (
                    <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="rule-name-input" className="block text-slate-300 font-medium">
                      Policy Name
                    </label>
                    <Input
                      id="rule-name-input"
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Energy Sector Concentration"
                      className="bg-slate-950 border-slate-700 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="rule-type-select" className="block text-slate-300 font-medium">
                      Rule Type
                    </label>
                    <select
                      id="rule-type-select"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as RiskLimitRule['type'])}
                      className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MAX_SECTOR_EXPOSURE">Maximum Sector Exposure (%)</option>
                      <option value="MAX_ASSET_CONCENTRATION">
                        Single Asset Concentration (%)
                      </option>
                      <option value="VAR_95_THRESHOLD">VaR 95% 1-Day Ceiling ($)</option>
                      <option value="MAX_DRAWDOWN">Max Daily Drawdown Limit (%)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="rule-target-input" className="block text-slate-300 font-medium">
                      Target Symbol / Sector
                    </label>
                    <Input
                      id="rule-target-input"
                      type="text"
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      placeholder="e.g. TECHNOLOGY or ALL"
                      className="bg-slate-950 border-slate-700 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="rule-threshold-input"
                      className="block text-slate-300 font-medium"
                    >
                      Threshold Value ({formType === 'VAR_95_THRESHOLD' ? 'USD $' : '%'})
                    </label>
                    <Input
                      id="rule-threshold-input"
                      type="number"
                      step="any"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      placeholder="e.g. 40.0"
                      className="bg-slate-950 border-slate-700 text-xs font-mono"
                      required
                    />
                  </div>

                  <DialogFooter className="mt-4 pt-2 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="default" size="sm">
                      {editingRule ? 'Update Rule' : 'Save Policy'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-950/70 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Policy Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Target</th>
                <th className="p-3 text-right">Current Value</th>
                <th className="p-3 text-right">Policy Threshold</th>
                <th className="p-3 text-center">Status</th>
                {isPm && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {rules.map((rule) => {
                const utilPercent = (rule.currentValue / rule.threshold) * 100;
                return (
                  <tr
                    key={rule.id}
                    className="hover:bg-slate-100/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {rule.name}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      {rule.type.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">
                      {rule.target}
                    </td>
                    <td className="p-3 text-right text-slate-900 dark:text-white font-bold">
                      {rule.unit === '$'
                        ? `$${rule.currentValue.toLocaleString()}`
                        : `${rule.currentValue.toFixed(1)}%`}
                    </td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                      {rule.unit === '$'
                        ? `$${rule.threshold.toLocaleString()}`
                        : `${rule.threshold.toFixed(1)}%`}
                    </td>
                    <td className="p-3 text-center">
                      {rule.status === 'BREACHED' ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Breached ({utilPercent.toFixed(0)}%)
                        </Badge>
                      ) : rule.status === 'NEAR_THRESHOLD' ? (
                        <Badge variant="warning" className="text-[10px]">
                          Near Cap ({utilPercent.toFixed(0)}%)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Compliant ({utilPercent.toFixed(0)}%)
                        </Badge>
                      )}
                    </td>
                    {isPm && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1 h-7 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            aria-label={`Edit ${rule.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                            className="p-1 h-7 text-slate-400 hover:text-rose-400"
                            aria-label={`Delete ${rule.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
