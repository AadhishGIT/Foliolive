import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '../src/components/select';

const meta: Meta = {
  title: 'Components/Select',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="w-64 space-y-1.5">
      <label className="text-xs font-medium text-foreground uppercase tracking-wide">
        Select Portfolio
      </label>
      <Select defaultValue="port_global_alpha_01">
        <SelectTrigger>
          <SelectValue placeholder="Choose a portfolio" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Active Funds</SelectLabel>
            <SelectItem value="port_global_alpha_01">Global Multi-Asset Alpha</SelectItem>
            <SelectItem value="port_tech_opps_02">US Technology Opportunities</SelectItem>
            <SelectItem value="port_fixed_income_03">Conservative Treasury & IG</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};
