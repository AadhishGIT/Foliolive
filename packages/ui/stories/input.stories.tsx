import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Input } from '../src/components/input';
import { Search, DollarSign } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Portfolio Identifier',
    placeholder: 'e.g. port_global_alpha_01',
    helperText: 'Unique internal identifier for the institutional portfolio',
  },
};

export const WithError: Story = {
  args: {
    label: 'VaR 95% Limit',
    defaultValue: '-50000',
    error: 'VaR limit must be a positive dollar threshold',
  },
};

export const WithStartIcon: Story = {
  args: {
    label: 'Search Ticker',
    placeholder: 'Filter by symbol or company name...',
    startIcon: <Search className="h-4 w-4" />,
  },
};

export const CurrencyInput: Story = {
  args: {
    label: 'Order Value',
    placeholder: '0.00',
    startIcon: <DollarSign className="h-4 w-4" />,
    helperText: 'Denominated in USD',
  },
};
