import React, { type ReactNode } from "react";

export interface M3TopAppBarProps { title?: ReactNode; subtitle?: ReactNode; leading?: ReactNode; actions?: ReactNode; className?: string; }

export function M3TopAppBar({ title, subtitle, leading, actions, className = "" }: M3TopAppBarProps) {
  return <header className={`hig-toolbar-material sticky top-0 z-20 flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-md-outline-variant px-3 sm:px-5 lg:px-[26px] ${className}`}>
    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">{leading && <div className="flex shrink-0 items-center">{leading}</div>}<div className="flex min-w-0 flex-col">{typeof title === "string" ? <h1 className="truncate text-[17px] font-semibold leading-5 tracking-[-0.01em] text-md-on-surface lg:text-[17px]">{title}</h1> : title}{subtitle && <p className="hidden truncate text-[12px] text-md-on-surface-variant sm:block">{subtitle}</p>}</div></div>
    {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
  </header>;
}
