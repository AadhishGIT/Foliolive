import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskGauge } from '../src';

describe('RiskGauge Financial Component', () => {
  it('renders with accessible meter role and ARIA attributes', () => {
    render(<RiskGauge value={1500000} threshold={2000000} min={0} max={2500000} label="VaR 95%" />);

    const meter = screen.getByRole('meter');
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('aria-valuenow', '1500000');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '2500000');
    expect(meter).toHaveAttribute('aria-valuetext', expect.stringContaining('Within Limit'));
  });

  it('indicates approaching limit warning when ratio exceeded', () => {
    render(
      <RiskGauge
        value={1800000}
        threshold={2000000}
        warningThresholdRatio={0.85} // 1.7M is warning threshold
        label="VaR 95%"
      />
    );

    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuetext', expect.stringContaining('Approaching Limit'));
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
  });

  it('indicates breached limit when value exceeds threshold', () => {
    render(<RiskGauge value={2300000} threshold={2000000} label="VaR 95%" />);

    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuetext', expect.stringContaining('Limit Breached'));
    expect(screen.getByText('Limit Breached')).toBeInTheDocument();
  });
});
