import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RiskGauge } from '../src/components/risk-gauge';

const meta: Meta<typeof RiskGauge> = {
  title: 'Financial/RiskGauge',
  component: RiskGauge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RiskGauge>;

export const WithinLimitSafe: Story = {
  args: {
    value: 1200000,
    threshold: 2000000,
    min: 0,
    max: 2500000,
    label: '95% VaR (1-Day)',
    unit: 'USD',
  },
};

export const ApproachingLimitWarning: Story = {
  args: {
    value: 1850000,
    threshold: 2000000,
    warningThresholdRatio: 0.85,
    min: 0,
    max: 2500000,
    label: '95% VaR (1-Day)',
    unit: 'USD',
  },
};

export const LimitBreached: Story = {
  args: {
    value: 2350000,
    threshold: 2000000,
    min: 0,
    max: 2500000,
    label: '95% VaR (1-Day)',
    unit: 'USD',
  },
};

export const DashboardComparison: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4 bg-card border border-border rounded-xl">
      <RiskGauge value={1200000} threshold={2000000} label="Parametric VaR" size={130} />
      <RiskGauge value={1820000} threshold={2000000} label="Historical VaR" size={130} />
      <RiskGauge value={2150000} threshold={2000000} label="Gross Exposure" size={130} />
    </div>
  ),
};
