import React, { type HTMLAttributes, type ReactNode } from "react";

export type M3BadgeVariant = "primary" | "secondary" | "tertiary" | "error" | "error-container" | "success" | "warning" | "outline";
export interface M3BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: M3BadgeVariant;
  icon?: ReactNode;
  size?: "sm" | "md";
}

export function M3Badge({ variant = "secondary", icon, size = "md", children, className = "", ...props }: M3BadgeProps) {
  const variantStyles: Record<M3BadgeVariant, string> = {
    primary: "bg-md-primary-container text-md-on-primary-container",
    secondary: "bg-md-secondary-container text-md-on-secondary-container",
    tertiary: "bg-md-tertiary-container text-md-on-tertiary-container",
    error: "bg-md-error text-md-on-error",
    "error-container": "bg-md-error-container text-md-on-error-container",
    success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300/70 dark:border-emerald-800",
    warning: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200 border border-amber-300/70 dark:border-amber-800",
    outline: "border border-md-outline-variant text-md-on-surface-variant bg-md-surface",
  };
  const sizeStyles = { sm: "min-h-6 px-2 text-[11px] gap-1", md: "min-h-7 px-2.5 text-xs gap-1.5" };
  return <span className={`inline-flex items-center rounded-[8px] font-semibold shrink-0 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>{icon && <span className="shrink-0">{icon}</span>}{children}</span>;
}
