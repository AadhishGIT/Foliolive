import * as React from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional accessible loading announcement for screen readers
   */
  label?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, label = 'Loading content...', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={label}
        className={cn('animate-pulse rounded-md bg-secondary/80 select-none', className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';
