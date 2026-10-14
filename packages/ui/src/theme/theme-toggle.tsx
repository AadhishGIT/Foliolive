import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '../lib/utils';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, ...props }, ref) => {
    const { resolvedTheme, toggleTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
      <button
        ref={ref}
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={cn(
          'relative inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card text-foreground',
          'transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        {isDark ? (
          <Sun
            className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45"
            aria-hidden="true"
          />
        ) : (
          <Moon
            className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12"
            aria-hidden="true"
          />
        )}
        <span className="sr-only">
          Current theme: {resolvedTheme}. Click to switch to {isDark ? 'light' : 'dark'} theme.
        </span>
      </button>
    );
  }
);

ThemeToggle.displayName = 'ThemeToggle';
