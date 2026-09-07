import React, { type HTMLAttributes, type ReactNode } from "react";
import { M3Icon } from "./M3Icon";

export type M3ChipVariant = "assist" | "filter" | "input" | "suggestion";

export interface M3ChipProps extends HTMLAttributes<HTMLDivElement> {
  variant?: M3ChipVariant;
  selected?: boolean;
  icon?: ReactNode | string;
  onRemove?: () => void;
  clickable?: boolean;
}

export function M3Chip({
  variant = "assist",
  selected = false,
  icon,
  onRemove,
  clickable = true,
  children,
  className = "",
  onClick,
  ...props
}: M3ChipProps) {
  const isSelectedFilter = variant === "filter" && selected;

  const baseStyles =
    "h-8 px-3 rounded-[8px] text-xs font-medium inline-flex items-center gap-1.5 transition-all select-none shrink-0";

  const stateStyles = isSelectedFilter
    ? "bg-md-secondary-container text-md-on-secondary-container border border-transparent font-semibold shadow-xs"
    : "border border-md-outline-variant text-md-on-surface-variant bg-md-surface hover:bg-md-on-surface/8";

  const cursorStyles = clickable || onClick ? "cursor-pointer" : "cursor-default";

  return (
    <div
      className={`${baseStyles} ${stateStyles} ${cursorStyles} ${className}`}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {isSelectedFilter ? (
        <M3Icon name="check" size={14} className="text-md-on-secondary-container" />
      ) : typeof icon === "string" ? (
        <M3Icon name={icon} size={16} />
      ) : (
        icon
      )}

      <span>{children}</span>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-md-on-surface/12 rounded-full p-0.5 ml-1 transition-colors"
        >
          <M3Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
