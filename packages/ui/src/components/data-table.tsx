import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm border-collapse', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b border-border/80 sticky top-0 bg-card z-10', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }
>(({ className, selected = false, ...props }, ref) => (
  <tr
    ref={ref}
    data-state={selected ? 'selected' : undefined}
    className={cn(
      'border-b border-border/50 transition-colors hover:bg-secondary/50 data-[state=selected]:bg-secondary',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortDirection?: 'ascending' | 'descending' | 'none';
  onSort?: () => void;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortDirection, onSort, children, ...props }, ref) => {
    const isSortable = Boolean(onSort);
    const ariaSort =
      sortDirection === 'ascending'
        ? 'ascending'
        : sortDirection === 'descending'
          ? 'descending'
          : isSortable
            ? 'none'
            : undefined;

    return (
      <th
        ref={ref}
        aria-sort={ariaSort}
        className={cn(
          'h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider select-none',
          isSortable && 'cursor-pointer hover:text-foreground transition-colors',
          className
        )}
        onClick={onSort}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          <span>{children}</span>
          {isSortable && (
            <span className="shrink-0 text-muted-foreground">
              {sortDirection === 'ascending' && (
                <ArrowUp className="h-3.5 w-3.5 text-primary" aria-label="Sorted ascending" />
              )}
              {sortDirection === 'descending' && (
                <ArrowDown className="h-3.5 w-3.5 text-primary" aria-label="Sorted descending" />
              )}
              {(!sortDirection || sortDirection === 'none') && (
                <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-label="Click to sort" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  }
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { alignRight?: boolean; mono?: boolean }
>(({ className, alignRight = false, mono = false, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-3 align-middle text-foreground font-normal',
      alignRight && 'text-right justify-end',
      mono && 'font-mono tabular-nums',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-xs text-muted-foreground', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';
