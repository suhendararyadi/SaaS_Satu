import React, { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { Link } from "react-router";
import { M3Icon } from "./M3Icon";

export type M3ButtonVariant = "filled" | "tonal" | "elevated" | "outlined" | "text" | "danger" | "fab" | "icon";
export type M3ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface M3ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: M3ButtonVariant;
  size?: M3ButtonSize;
  icon?: ReactNode | string;
  trailingIcon?: ReactNode | string;
  isLoading?: boolean;
  loading?: boolean;
  href?: string;
  target?: string;
  fullWidth?: boolean;
}

export const M3Button = forwardRef<HTMLButtonElement, M3ButtonProps>(
  ({ variant = "filled", size = "md", icon, trailingIcon, isLoading = false, loading, href, target, fullWidth = false, disabled = false, children, className = "", type = "button", ...props }, ref) => {
    const isIconVariant = variant === "icon";
    const isSpinning = isLoading || !!loading;
    const variantStyles: Record<M3ButtonVariant, string> = {
      filled: "bg-md-primary text-md-on-primary hover:bg-[#006ee6] active:bg-[#005fc7] shadow-[0_1px_2px_rgba(0,0,0,.08)]",
      tonal: "bg-md-primary-container text-md-primary hover:bg-md-primary/16 active:bg-md-primary/22",
      elevated: "bg-md-surface text-md-primary border border-md-outline-variant shadow-[0_1px_2px_rgba(0,0,0,.06)] hover:bg-md-surface-container-low",
      outlined: "border border-md-outline bg-md-surface text-md-primary hover:bg-md-surface-container-low active:bg-md-surface-container",
      text: "text-md-primary hover:bg-md-primary/8 active:bg-md-primary/14",
      danger: "bg-md-error text-md-on-error hover:bg-[#e4332b] active:bg-[#c92c25]",
      fab: "bg-md-primary text-md-on-primary shadow-[0_3px_12px_rgba(0,0,0,.16)] hover:bg-[#006ee6]",
      icon: "text-md-on-surface-variant hover:bg-black/[.055] hover:text-md-on-surface active:bg-black/[.09] dark:hover:bg-white/[.08]",
    };
    const sizeStyles: Record<M3ButtonSize, string> = {
      sm: isIconVariant ? "size-11 lg:size-8" : "min-h-11 px-3.5 text-[13px] gap-1.5 lg:min-h-8 lg:px-3",
      md: isIconVariant ? "size-11 lg:size-8" : "min-h-11 px-4 text-[14px] gap-1.5 lg:min-h-[34px] lg:text-[13px]",
      lg: isIconVariant ? "size-12 lg:size-9" : "min-h-12 px-5 text-[15px] gap-2 lg:min-h-9 lg:text-[14px]",
      "icon-sm": "size-11 lg:size-8",
      "icon-md": "size-11 lg:size-9",
    };
    const radius = variant === "fab" ? "rounded-[12px]" : isIconVariant ? "rounded-[8px]" : "rounded-[9px]";
    const baseClass = `inline-flex items-center justify-center select-none touch-manipulation font-semibold transition-[background-color,color,box-shadow] duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-45 ${radius} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`;
    const iconElement = typeof icon === "string" ? <M3Icon name={icon} size={size === "lg" ? 19 : 17} /> : icon;
    const trailingIconElement = typeof trailingIcon === "string" ? <M3Icon name={trailingIcon} size={size === "lg" ? 19 : 17} /> : trailingIcon;
    const content = <>{isSpinning ? <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : iconElement}{children && <span>{children}</span>}{trailingIconElement}</>;
    if (href && !disabled) {
      const isExternal = href.startsWith("http://") || href.startsWith("https://") || target === "_blank";
      if (isExternal) return <a href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={baseClass}>{content}</a>;
      return <Link to={href} className={baseClass}>{content}</Link>;
    }
    return <button ref={ref} type={type} disabled={disabled || isSpinning} aria-busy={isSpinning || undefined} className={baseClass} {...props}>{content}</button>;
  }
);
M3Button.displayName = "M3Button";
