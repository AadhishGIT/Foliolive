import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Badge } from '../src/components/badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Active Session',
    variant: 'default',
  },
};

export const WithDot: Story = {
  args: {
    children: 'WebSocket Streaming',
    variant: 'success',
    dot: true,
  },
};

export const AllStatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default" dot>
        Default
      </Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success" dot>
        Connected
      </Badge>
      <Badge variant="warning" dot>
        Reconnecting
      </Badge>
      <Badge variant="destructive" dot>
        Breach Fired
      </Badge>
      <Badge variant="info">INFO</Badge>
      <Badge variant="neutral">Draft</Badge>
    </div>
  ),
};
