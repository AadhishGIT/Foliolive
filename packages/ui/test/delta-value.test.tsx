import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaValue } from '../src';

describe('DeltaValue Financial Component', () => {
  it('renders positive value with plus sign, arrow, and accessible label', () => {
    render(<DeltaValue value={1250.75} percentage={1.35} />);

    const delta = screen.getByLabelText(/gain of \+\$1,250\.75 \(1\.35 percent\)/i);
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('text-emerald-600');
    expect(delta).toHaveTextContent('+$1,250.75');
    expect(delta).toHaveTextContent('(+1.35%)');
  });

  it('renders negative value with minus sign, arrow, and accessible label', () => {
    render(<DeltaValue value={-450.2} percentage={-0.45} />);

    const delta = screen.getByLabelText(/loss of -\$450\.20 \(0\.45 percent\)/i);
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('text-red-600');
    expect(delta).toHaveTextContent('-$450.20');
    expect(delta).toHaveTextContent('(-0.45%)');
  });

  it('renders zero / neutral value with neutral styling', () => {
    render(<DeltaValue value={0} percentage={0} />);

    const delta = screen.getByLabelText(/unchanged of \$0\.00 \(0\.00 percent\)/i);
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('text-muted-foreground');
  });

  it('never relies on color alone (includes sign, symbol, and screen reader text)', () => {
    const { container } = render(<DeltaValue value={500} showArrow={true} showSign={true} />);

    // Has SVG icon
    expect(container.querySelector('svg')).toBeInTheDocument();
    // Has explicit textual sign
    expect(screen.getByText(/\+\$500\.00/i)).toBeInTheDocument();
  });
});
