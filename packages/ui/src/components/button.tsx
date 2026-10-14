import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      asChild = false,
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]',
      secondary:
        'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]',
      outline:
        'border border-border bg-transparent hover:bg-secondary hover:text-foreground text-foreground active:scale-[0.98]',
      ghost: 'hover:bg-secondary hover:text-foreground text-muted-foreground hover:text-foreground',
      destructive:
        'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
      link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 rounded px-3 text-xs gap-1.5',
      md: 'h-9 px-4 py-2 gap-2',
      lg: 'h-10 rounded-md px-6 text-base gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <Comp
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />}
        {isLoading && loadingText ? loadingText : children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
