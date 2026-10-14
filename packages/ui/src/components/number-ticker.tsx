import * as React from 'react';
import { cn } from '../lib/utils';

export interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  format?: (val: number) => string;
  decimals?: number;
  currency?: string;
  flashDurationMs?: number;
}

export const NumberTicker = React.forwardRef<HTMLSpanElement, NumberTickerProps>(
  ({ className, value, format, decimals = 2, currency, flashDurationMs = 700, ...props }, ref) => {
    const prevValueRef = React.useRef<number>(value);
    const [flashState, setFlashState] = React.useState<'up' | 'down' | null>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    React.useEffect(() => {
      if (prefersReducedMotion) {
        prevValueRef.current = value;
        return;
      }

      if (value > prevValueRef.current) {
        setFlashState('up');
      } else if (value < prevValueRef.current) {
        setFlashState('down');
      }

      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setFlashState(null);
      }, flashDurationMs);

      return () => clearTimeout(timer);
    }, [value, flashDurationMs, prefersReducedMotion]);

    const formatted = format
      ? format(value)
      : currency
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(value)
        : value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });

    const flashClasses =
      !prefersReducedMotion && flashState === 'up'
        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
        : !prefersReducedMotion && flashState === 'down'
          ? 'bg-destructive/20 text-destructive border border-destructive/30'
          : 'text-foreground border border-transparent';

    return (
      <span
        ref={ref}
        aria-live="polite"
        className={cn(
          'inline-flex items-center font-mono tabular-nums px-1.5 py-0.5 rounded transition-all ease-out duration-300 motion-reduce:transition-none motion-reduce:bg-transparent',
          flashClasses,
          className
        )}
        {...props}
      >
        {formatted}
      </span>
    );
  }
);

NumberTicker.displayName = 'NumberTicker';
