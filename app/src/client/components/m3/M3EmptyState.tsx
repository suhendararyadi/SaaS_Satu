import React, { type ReactNode } from "react";
import { M3Icon } from "./M3Icon";
import { M3Button } from "./M3Button";

export interface M3EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondary?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function M3EmptyState({ icon, title, description, actionLabel, actionHref, onAction, secondary, compact = false, className = "" }: M3EmptyStateProps) {
  const action = actionLabel ? (
    actionHref ? <M3Button variant="text" size="sm" href={actionHref}>{actionLabel}</M3Button> : <M3Button variant="text" size="sm" onClick={onAction}>{actionLabel}</M3Button>
  ) : null;

  return (
    <div className={`flex w-full flex-col gap-3 ${compact ? "py-2.5" : "py-4"} sm:flex-row sm:items-center ${className}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-md-primary" aria-hidden="true">
          <M3Icon name={icon} size={18} weight={400} />
        </span>
        <div className="min-w-0">
          <h3 className={`${compact ? "text-[12.5px]" : "text-[13.5px]"} font-semibold text-md-on-surface`}>{title}</h3>
          <p className="mt-0.5 max-w-2xl text-[12px] leading-[1.55] text-md-on-surface-variant">{description}</p>
        </div>
      </div>
      {(action || secondary) && <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-9 sm:pl-0">{action}{secondary}</div>}
    </div>
  );
}
