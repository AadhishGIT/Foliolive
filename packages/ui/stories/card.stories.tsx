import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../src/components/card';
import { Button } from '../src/components/button';
import { DeltaValue } from '../src/components/delta-value';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj<typeof Card> = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Daily P&L Performance</CardTitle>
        <CardDescription>Unrealized portfolio gain/loss</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold font-mono">$1,428,950.00</span>
          <DeltaValue value={42500} percentage={3.07} />
        </div>
      </CardContent>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span>Updated 12ms ago</span>
        <Button variant="ghost" size="sm">
          Details
        </Button>
      </CardFooter>
    </Card>
  ),
};
