import * as React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'success'
    | 'destructive'
    | 'danger'
    | 'warning'
    | 'info'
    | 'neutral';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', dot = false, children, ...props }, ref) => {
    const variantStyles: Record<string, string> = {
      default: 'bg-primary/10 text-primary border-primary/20',
      secondary: 'bg-secondary text-secondary-foreground border-border',
      outline: 'border-border text-foreground bg-transparent',
      success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      destructive: 'bg-destructive/10 text-destructive border-destructive/30',
      danger: 'bg-destructive/10 text-destructive border-destructive/30',
      warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
      neutral: 'bg-muted text-muted-foreground border-border',
    };

    const dotColors: Record<string, string> = {
      default: 'bg-primary',
      secondary: 'bg-foreground',
      outline: 'bg-foreground',
      success: 'bg-emerald-500',
      destructive: 'bg-destructive',
      danger: 'bg-destructive',
      warning: 'bg-amber-500',
      info: 'bg-blue-500',
      neutral: 'bg-muted-foreground',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
          variantStyles[variant] || variantStyles.default,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full shrink-0',
              dotColors[variant] || dotColors.default
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
