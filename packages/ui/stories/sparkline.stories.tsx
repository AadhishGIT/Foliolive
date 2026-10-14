import type { Meta, StoryObj } from '@storybook/react';
import { Sparkline } from '../src/components/sparkline';

const meta: Meta<typeof Sparkline> = {
  title: 'Financial/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Sparkline>;

export const UpwardTrend: Story = {
  args: {
    data: [180.2, 181.5, 180.8, 183.2, 182.9, 185.4, 187.1, 189.5],
    width: 140,
    height: 36,
    showEndpoints: true,
  },
};

export const DownwardTrend: Story = {
  args: {
    data: [195.0, 193.2, 194.1, 191.5, 188.4, 186.2, 184.0, 181.2],
    width: 140,
    height: 36,
    showEndpoints: true,
  },
};

export const WithMinMaxMarkers: Story = {
  args: {
    data: [150, 155, 148, 162, 142, 170, 158, 165],
    width: 160,
    height: 40,
    showMinMax: true,
  },
};
