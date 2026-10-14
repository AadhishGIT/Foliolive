import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Banner } from '../src/components/banner';
import { Button } from '../src/components/button';

const meta: Meta<typeof Banner> = {
  title: 'Components/Banner',
  component: Banner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Market Simulator Connected',
    children: 'Real-time telemetry stream operating with 100ms animation-frame batching.',
    onDismiss: () => {},
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Approaching VaR Threshold',
    children: 'Portfolio Alpha is within 10% of maximum authorized 1-day 95% VaR.',
    action: (
      <Button size="sm" variant="outline">
        Review Risk Models
      </Button>
    ),
    onDismiss: () => {},
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Risk Limit Breach: Concentration',
    children: 'Technology sector exposure has exceeded 35.0% threshold (currently 38.2%).',
    action: (
      <Button size="sm" variant="destructive">
        Acknowledge Breach
      </Button>
    ),
    onDismiss: () => {},
  },
};
