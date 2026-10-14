import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src';

describe('Tabs Component', () => {
  it('renders tabs with accessible tablist and triggers', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Portfolio sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="risk">Risk Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview Content</TabsContent>
        <TabsContent value="holdings">Holdings Content</TabsContent>
        <TabsContent value="risk">Risk Content</TabsContent>
      </Tabs>
    );

    const tablist = screen.getByRole('tablist', { name: /portfolio sections/i });
    expect(tablist).toBeInTheDocument();

    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    const holdingsTab = screen.getByRole('tab', { name: /holdings/i });

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview Content')).toBeInTheDocument();

    await user.click(holdingsTab);

    expect(holdingsTab).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Holdings Content')).toBeInTheDocument();
  });
});
