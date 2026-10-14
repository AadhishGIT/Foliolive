import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  Button,
  IconButton,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Banner,
  Tag,
  SkipLink,
  DeltaValue,
  RiskGauge,
  NumberTicker,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../src';
import { Search } from 'lucide-react';

describe('Accessibility Automated Audits (vitest-axe)', () => {
  it('Button & IconButton have zero accessibility violations', async () => {
    const { container } = render(
      <div>
        <Button variant="default">Trade</Button>
        <Button variant="destructive" isLoading loadingText="Executing...">
          Sell
        </Button>
        <IconButton aria-label="Search instruments">
          <Search />
        </IconButton>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input with label, helper, and error has zero accessibility violations', async () => {
    const { container } = render(
      <form>
        <Input id="test-input" label="Portfolio Name" helperText="Unique portfolio identifier" />
        <Input id="error-input" label="Risk Limit" error="Value cannot exceed portfolio equity" />
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Badge, Tag, and Card have zero accessibility violations', async () => {
    const { container } = render(
      <div>
        <Badge variant="success" dot>
          Active
        </Badge>
        <Tag onRemove={() => {}} removeAriaLabel="Remove Technology tag">
          Technology
        </Tag>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Alpha</CardTitle>
            <CardDescription>Multi-asset growth strategy</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Portfolio holdings summary</p>
          </CardContent>
        </Card>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Financial components (DeltaValue, RiskGauge, NumberTicker) have zero accessibility violations', async () => {
    const { container } = render(
      <div>
        <DeltaValue value={1420.5} percentage={1.42} />
        <DeltaValue value={-850.2} percentage={-0.85} />
        <NumberTicker value={245.8} currency="USD" />
        <RiskGauge
          value={1200000}
          threshold={1500000}
          min={0}
          max={2000000}
          label="Historical VaR"
        />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Banner and SkipLink have zero accessibility violations', async () => {
    const { container } = render(
      <div>
        <SkipLink targetId="main-content" />
        <Banner variant="error" title="Risk Breach Detected" onDismiss={() => {}}>
          Gross exposure has exceeded 150% threshold.
        </Banner>
        <div id="main-content">Main content</div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('DataTable has zero accessibility violations', async () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="ascending">Symbol</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>AAPL</TableCell>
            <TableCell alignRight mono>
              $185.20
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
