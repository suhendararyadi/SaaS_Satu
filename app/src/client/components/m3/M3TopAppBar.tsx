import React, { type ReactNode } from "react";

export interface M3TopAppBarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function M3TopAppBar({
  title,
  subtitle,
  leading,
  actions,
  className = "",
}: M3TopAppBarProps) {
  return (
    <header
      className={`sticky top-0 z-20 w-full h-16 px-4 sm:px-6 bg-md-surface/85 backdrop-blur-md border-b border-md-outline-variant/30 flex items-center justify-between gap-4 transition-colors ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="shrink-0 flex items-center">{leading}</div>}
        <div className="flex flex-col min-w-0">
          {typeof title === "string" ? (
            <h1 className="text-[18px] sm:text-[20px] font-medium text-md-on-surface truncate leading-tight">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-xs text-md-on-surface-variant truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
