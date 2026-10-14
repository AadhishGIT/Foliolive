import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NumberTicker } from '../src';

describe('NumberTicker Component', () => {
  it('renders initial formatted value with aria-live="polite"', () => {
    render(<NumberTicker value={185.5} currency="USD" />);

    const ticker = screen.getByText('$185.50');
    expect(ticker).toBeInTheDocument();
    expect(ticker).toHaveAttribute('aria-live', 'polite');
  });

  it('triggers upward flash on price increase and clears after duration', () => {
    vi.useFakeTimers();

    const { rerender } = render(<NumberTicker value={100} flashDurationMs={500} />);
    expect(screen.getByText('100.00')).toBeInTheDocument();

    // Update value to trigger tick up
    rerender(<NumberTicker value={105} flashDurationMs={500} />);

    expect(screen.getByText('105.00')).toHaveClass('bg-emerald-500/20');

    // Advance timers past flashDurationMs
    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByText('105.00')).not.toHaveClass('bg-emerald-500/20');
    vi.useRealTimers();
  });

  it('triggers downward flash on price decrease', () => {
    vi.useFakeTimers();

    const { rerender } = render(<NumberTicker value={100} flashDurationMs={500} />);

    rerender(<NumberTicker value={95} flashDurationMs={500} />);
    expect(screen.getByText('95.00')).toHaveClass('bg-destructive/20');

    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByText('95.00')).not.toHaveClass('bg-destructive/20');
    vi.useRealTimers();
  });
});
