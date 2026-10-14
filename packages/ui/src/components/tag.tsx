import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  removeAriaLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, children, onRemove, removeAriaLabel, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-secondary text-secondary-foreground border-border',
      primary: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      danger: 'bg-destructive/10 text-destructive border-destructive/30',
    };

    const labelText = typeof children === 'string' ? children : 'tag';
    const computedRemoveLabel = removeAriaLabel || `Remove ${labelText}`;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium transition-colors select-none',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={computedRemoveLabel}
            className="rounded p-0.5 text-current opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{computedRemoveLabel}</span>
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = 'Tag';
