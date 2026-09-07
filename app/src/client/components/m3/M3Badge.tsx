import React, { type HTMLAttributes, type ReactNode } from "react";

export type M3BadgeVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "error-container"
  | "success"
  | "warning"
  | "outline";

export interface M3BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: M3BadgeVariant;
  icon?: ReactNode;
  size?: "sm" | "md";
}

export function M3Badge({
  variant = "secondary",
  icon,
  size = "md",
  children,
  className = "",
  ...props
}: M3BadgeProps) {
  const variantStyles: Record<M3BadgeVariant, string> = {
    primary: "bg-md-primary text-md-on-primary",
    secondary: "bg-md-secondary-container text-md-on-secondary-container",
    tertiary: "bg-md-tertiary-container text-md-on-tertiary-container",
    error: "bg-md-error text-md-on-error",
    "error-container": "bg-md-error-container text-md-on-error-container",
    success:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    warning:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    outline:
      "border border-md-outline-variant text-md-on-surface-variant bg-transparent",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full shrink-0 select-none ${
        sizeStyles[size]
      } ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
