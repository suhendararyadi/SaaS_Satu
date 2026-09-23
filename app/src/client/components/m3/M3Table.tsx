import React, { type TableHTMLAttributes, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes, forwardRef } from "react";

export const M3Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(({ children, className = "", ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-[16px] border border-md-outline-variant bg-md-surface shadow-[0_1px_2px_rgba(0,0,0,.04)]">
    <table ref={ref} className={`w-full border-collapse text-left text-[13px] text-md-on-surface ${className}`} {...props}>{children}</table>
  </div>
));
M3Table.displayName = "M3Table";
export const M3TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ children, className = "", ...props }, ref) => <thead ref={ref} className={`border-b border-md-outline-variant bg-md-surface-container-low ${className}`} {...props}>{children}</thead>);
M3TableHeader.displayName = "M3TableHeader";
export const M3TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ children, className = "", ...props }, ref) => <tbody ref={ref} className={`divide-y divide-md-outline-variant ${className}`} {...props}>{children}</tbody>);
M3TableBody.displayName = "M3TableBody";
export const M3TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(({ children, className = "", ...props }, ref) => <tr ref={ref} className={`transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.035] ${className}`} {...props}>{children}</tr>);
M3TableRow.displayName = "M3TableRow";
export const M3TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(({ children, className = "", ...props }, ref) => <th ref={ref} className={`px-3.5 py-2.5 text-[11.5px] font-semibold text-md-on-surface-variant select-none ${className}`} {...props}>{children}</th>);
M3TableHead.displayName = "M3TableHead";
export const M3TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(({ children, className = "", ...props }, ref) => <td ref={ref} className={`px-3.5 py-2.5 align-middle text-[13px] text-md-on-surface ${className}`} {...props}>{children}</td>);
M3TableCell.displayName = "M3TableCell";
