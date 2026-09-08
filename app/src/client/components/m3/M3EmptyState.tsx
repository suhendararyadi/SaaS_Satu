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
  return (
    <div className={`flex flex-col items-start ${compact ? "gap-3 p-4" : "gap-4 p-6 sm:p-8"} ${className}`}>
      <div className="flex size-12 items-center justify-center rounded-[16px] bg-md-primary-container text-md-on-primary-container" aria-hidden="true">
        <M3Icon name={icon} size={24} />
      </div>
      <div className="max-w-xl">
        <h3 className="text-base font-bold text-md-on-surface sm:text-lg">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-md-on-surface-variant">{description}</p>
      </div>
      {(actionLabel || secondary) && (
        <div className="flex flex-wrap items-center gap-2">
          {actionLabel && (actionHref ? <M3Button variant="tonal" href={actionHref}>{actionLabel}</M3Button> : <M3Button variant="tonal" onClick={onAction}>{actionLabel}</M3Button>)}
          {secondary}
        </div>
      )}
    </div>
  );
}
