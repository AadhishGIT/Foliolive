import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { IconButton } from '../src/components/icon-button';
import { Search, RefreshCw, Filter, Settings, Trash2 } from 'lucide-react';

const meta: Meta<typeof IconButton> = {
  title: 'Components/IconButton',
  component: IconButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: {
    'aria-label': 'Refresh market data',
    children: <RefreshCw className="h-4 w-4" />,
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    'aria-label': 'Delete risk limit',
    children: <Trash2 className="h-4 w-4" />,
  },
};

export const Group: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton aria-label="Search instruments" variant="outline">
        <Search className="h-4 w-4" />
      </IconButton>
      <IconButton aria-label="Filter positions" variant="outline">
        <Filter className="h-4 w-4" />
      </IconButton>
      <IconButton aria-label="System configuration" variant="ghost">
        <Settings className="h-4 w-4" />
      </IconButton>
    </div>
  ),
};
