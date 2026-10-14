import * as React from 'react';
import { Button, type ButtonProps } from './button';
import { cn } from '../lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'aria-label'> {
  /**
   * Accessible text label is strictly required for IconButtons.
   */
  'aria-label': string;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', 'aria-label': ariaLabel, children, ...props }, ref) => {
    const sizeMap = {
      sm: 'h-8 w-8 p-1.5',
      md: 'h-9 w-9 p-2',
      lg: 'h-10 w-10 p-2.5',
    };

    return (
      <Button
        ref={ref}
        size="icon"
        aria-label={ariaLabel}
        className={cn('shrink-0 rounded-md', sizeMap[size], className)}
        {...props}
      >
        {children}
        <span className="sr-only">{ariaLabel}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
