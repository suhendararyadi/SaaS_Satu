import React, { type ReactNode } from "react";

export interface M3TopAppBarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function M3TopAppBar({ title, subtitle, leading, actions, className = "" }: M3TopAppBarProps) {
  return (
    <header className={`sticky top-0 z-20 flex min-h-[68px] w-full items-center justify-between gap-3 border-b border-md-outline-variant/60 bg-md-surface/96 px-3 sm:px-5 lg:px-7 ${className}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        {leading && <div className="flex shrink-0 items-center">{leading}</div>}
        <div className="flex min-w-0 flex-col">
          {typeof title === "string" ? <h1 className="truncate text-[17px] font-bold leading-6 text-md-on-surface sm:text-[19px]">{title}</h1> : title}
          {subtitle && <p className="truncate text-xs text-md-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{actions}</div>}
    </header>
  );
}
