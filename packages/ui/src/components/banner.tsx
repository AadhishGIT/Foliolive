import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  action?: React.ReactNode;
}

export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      className,
      variant = 'info',
      title,
      onDismiss,
      dismissAriaLabel = 'Dismiss notification',
      action,
      children,
      ...props
    },
    ref
  ) => {
    const isAlert = variant === 'error' || variant === 'warning';
    const role = isAlert ? 'alert' : 'status';

    const icons = {
      info: <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />,
      success: (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
      ),
      warning: (
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
      ),
      error: (
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
      ),
    };

    const variantStyles = {
      info: 'border-blue-500/30 bg-blue-500/10 text-foreground',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-foreground',
      warning: 'border-amber-500/30 bg-amber-500/10 text-foreground',
      error: 'border-destructive/30 bg-destructive/10 text-foreground',
    };

    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          'relative flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-all',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1 space-y-1">
          {title && <h5 className="font-semibold text-sm leading-none tracking-tight">{title}</h5>}
          <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
          {action && <div className="pt-2">{action}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissAriaLabel}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dismissAriaLabel}</span>
          </button>
        )}
      </div>
    );
  }
);

Banner.displayName = 'Banner';
