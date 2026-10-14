import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RiskGauge } from '../src/components/risk-gauge';

describe('Risk Analytics & Gauge Accessibility', () => {
  it('renders accessible meter element with WCAG compliant attributes', () => {
    render(
      <RiskGauge
        value={1.85}
        min={0}
        max={4.0}
        threshold={2.5}
        label="Parametric VaR 95%"
        unit="%"
        size={160}
      />
    );

    const meter = screen.getByRole('meter', { name: /Parametric VaR 95%/i });
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('aria-valuenow', '1.85');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '4');
    expect(meter).toHaveAttribute('aria-label', expect.stringContaining('Parametric VaR 95%'));
  });

  it('renders critical threshold needle when threshold is specified', () => {
    const { container } = render(
      <RiskGauge
        value={2.85}
        min={0}
        max={4.0}
        threshold={2.5}
        label="Historical VaR 99%"
        unit="%"
        size={160}
      />
    );

    // Limit line marker exists in SVG
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });
});
