import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/components/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../src/components/card';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj<typeof Tabs> = {
  render: () => (
    <div className="w-[500px]">
      <Tabs defaultValue="holdings">
        <TabsList aria-label="Portfolio views" className="grid grid-cols-3 w-full">
          <TabsTrigger value="holdings">Holdings Matrix</TabsTrigger>
          <TabsTrigger value="risk">Risk Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings">
          <Card>
            <CardHeader>
              <CardTitle>Holdings Matrix (TanStack Virtual)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Displaying 500+ institutional positions with live streaming P&L updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Value at Risk (VaR)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Historical, parametric, and Monte Carlo risk surfaces.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Risk Limits Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Active alerts stream and breach notifications.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
