import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from '../src/components/button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Execute Trade',
    variant: 'default',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'View Position',
    variant: 'secondary',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    children: 'Export CSV',
    variant: 'outline',
    size: 'md',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Liquidate Position',
    variant: 'destructive',
    size: 'md',
  },
};

export const Loading: Story = {
  args: {
    children: 'Submitting Order',
    isLoading: true,
    loadingText: 'Transmitting...',
    variant: 'default',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
      <Button isLoading loadingText="Loading">
        Loading
      </Button>
    </div>
  ),
};
