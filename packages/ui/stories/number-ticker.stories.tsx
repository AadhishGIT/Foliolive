import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { NumberTicker } from '../src/components/number-ticker';
import { Button } from '../src/components/button';

const meta: Meta<typeof NumberTicker> = {
  title: 'Financial/NumberTicker',
  component: NumberTicker,
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj<typeof NumberTicker> = {
  args: {
    value: 189.45,
    currency: 'USD',
  },
};

export const LiveSimulatedTicks: StoryObj = {
  render: function RenderLiveTicker() {
    const [price, setPrice] = useState(189.45);

    useEffect(() => {
      const interval = setInterval(() => {
        const delta = (Math.random() - 0.48) * 0.75;
        setPrice((prev) => Number((prev + delta).toFixed(2)));
      }, 1200);

      return () => clearInterval(interval);
    }, []);

    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-card border border-border rounded-xl">
        <span className="text-xs uppercase font-medium text-muted-foreground tracking-wider">
          AAPL Live Telemetry
        </span>
        <div className="text-3xl font-bold font-mono">
          <NumberTicker value={price} currency="USD" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPrice((p) => p + 1.5)}>
            Tick Up (+1.50)
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPrice((p) => p - 1.5)}>
            Tick Down (-1.50)
          </Button>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Flashes green on uptick, red on downtick. Respects prefers-reduced-motion.
        </span>
      </div>
    );
  },
};
