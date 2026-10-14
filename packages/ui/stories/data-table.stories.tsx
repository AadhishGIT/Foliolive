import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../src/components/data-table';
import { DeltaValue } from '../src/components/delta-value';

const meta: Meta = {
  title: 'Components/DataTable',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  render: function RenderDataTable() {
    const [sortDir, setSortDir] = useState<'ascending' | 'descending' | 'none'>('ascending');

    const toggleSort = () => {
      setSortDir((prev) => (prev === 'ascending' ? 'descending' : 'ascending'));
    };

    return (
      <div className="w-[650px] border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableCaption>Active Portfolio Holdings Summary</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead sortDirection={sortDir} onSort={toggleSort}>
                Symbol
              </TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Daily P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold">AAPL</TableCell>
              <TableCell className="text-muted-foreground">Technology</TableCell>
              <TableCell alignRight mono>
                50,000
              </TableCell>
              <TableCell alignRight mono>
                $189.45
              </TableCell>
              <TableCell alignRight>
                <DeltaValue value={14250} percentage={1.52} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold">NVDA</TableCell>
              <TableCell className="text-muted-foreground">Technology</TableCell>
              <TableCell alignRight mono>
                30,000
              </TableCell>
              <TableCell alignRight mono>
                $124.80
              </TableCell>
              <TableCell alignRight>
                <DeltaValue value={-8200} percentage={-0.65} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold">JPM</TableCell>
              <TableCell className="text-muted-foreground">Financials</TableCell>
              <TableCell alignRight mono>
                40,000
              </TableCell>
              <TableCell alignRight mono>
                $198.15
              </TableCell>
              <TableCell alignRight>
                <DeltaValue value={5600} percentage={0.71} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  },
};
