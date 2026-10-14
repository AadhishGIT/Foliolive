import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../src';

describe('DataTable Shell Components', () => {
  it('renders table with semantic elements and caption', () => {
    render(
      <Table>
        <TableCaption>Institutional Portfolio Holdings</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>AAPL</TableCell>
            <TableCell alignRight mono>
              $182.50
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Institutional Portfolio Holdings')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /symbol/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
  });

  it('handles sortable columns and sets aria-sort', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();

    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="ascending" onSort={handleSort}>
              Market Value
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const head = screen.getByRole('columnheader', { name: /market value/i });
    expect(head).toHaveAttribute('aria-sort', 'ascending');

    await user.click(head);
    expect(handleSort).toHaveBeenCalledTimes(1);

    rerender(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="descending" onSort={handleSort}>
              Market Value
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    expect(head).toHaveAttribute('aria-sort', 'descending');
  });
});
