import React, {
  type TableHTMLAttributes,
  type HTMLAttributes,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
  forwardRef,
} from "react";

export const M3Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <div className="w-full overflow-x-auto rounded-[16px] border border-md-outline-variant/40 bg-md-surface shadow-xs">
      <table
        ref={ref}
        className={`w-full text-left text-sm text-md-on-surface border-collapse ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

M3Table.displayName = "M3Table";

export const M3TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={`bg-md-surface-container-low border-b border-md-outline-variant/40 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
});

M3TableHeader.displayName = "M3TableHeader";

export const M3TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <tbody
      ref={ref}
      className={`divide-y divide-md-outline-variant/30 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
});

M3TableBody.displayName = "M3TableBody";

export const M3TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={`hover:bg-md-on-surface/4 transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
});

M3TableRow.displayName = "M3TableRow";

export const M3TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={`px-4 py-3 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider select-none ${className}`}
      {...props}
    >
      {children}
    </th>
  );
});

M3TableHead.displayName = "M3TableHead";

export const M3TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={`px-4 py-3.5 text-sm text-md-on-surface align-middle ${className}`}
      {...props}
    >
      {children}
    </td>
  );
});

M3TableCell.displayName = "M3TableCell";
