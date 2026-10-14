import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DeltaValue } from '../src/components/delta-value';

const meta: Meta<typeof DeltaValue> = {
  title: 'Financial/DeltaValue',
  component: DeltaValue,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DeltaValue>;

export const PositiveGain: Story = {
  args: {
    value: 12450.5,
    percentage: 2.35,
    formatAs: 'currency',
  },
};

export const NegativeLoss: Story = {
  args: {
    value: -4820.75,
    percentage: -1.15,
    formatAs: 'currency',
  },
};

export const NeutralZero: Story = {
  args: {
    value: 0,
    percentage: 0,
    formatAs: 'currency',
  },
};

export const PercentOnly: Story = {
  args: {
    value: 4.85,
    formatAs: 'percent',
  },
};

export const VisualComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg w-80">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">AAPL P&L</span>
        <DeltaValue value={14250} percentage={2.15} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">NVDA P&L</span>
        <DeltaValue value={-9500} percentage={-1.85} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">BND P&L</span>
        <DeltaValue value={0} percentage={0} />
      </div>
    </div>
  ),
};
