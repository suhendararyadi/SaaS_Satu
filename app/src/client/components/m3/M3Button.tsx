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
  (
    {
      variant = "filled",
      size = "md",
      icon,
      trailingIcon,
      isLoading = false,
      loading,
      href,
      target,
      fullWidth = false,
      disabled = false,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const isIconVariant = variant === "icon";
    const isSpinning = isLoading || !!loading;

    const variantStyles: Record<M3ButtonVariant, string> = {
      filled:
        "bg-md-primary text-md-on-primary shadow-[0_1px_2px_rgba(15,23,42,.12)] hover:bg-md-primary/92 active:bg-md-primary/84 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      tonal:
        "bg-md-primary-container text-md-on-primary-container hover:bg-md-primary-container/80 active:bg-md-primary-container/68 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      elevated:
        "bg-md-surface text-md-primary border border-md-outline-variant/60 shadow-[0_2px_8px_rgba(15,23,42,.08)] hover:bg-md-surface-container-low focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      outlined:
        "border border-md-outline-variant bg-md-surface text-md-primary hover:bg-md-primary-container/35 active:bg-md-primary-container/55 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      text:
        "text-md-primary hover:bg-md-primary-container/40 active:bg-md-primary-container/60 focus-visible:ring-2 focus-visible:ring-md-primary",
      danger:
        "bg-md-error text-md-on-error hover:bg-md-error/90 active:bg-md-error/80 focus-visible:ring-2 focus-visible:ring-md-error focus-visible:ring-offset-2",
      fab:
        "bg-md-primary-container text-md-on-primary-container shadow-[0_4px_12px_rgba(15,23,42,.12)] hover:shadow-[0_6px_16px_rgba(15,23,42,.16)] focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      icon:
        "text-md-on-surface-variant hover:bg-md-surface-container-high hover:text-md-on-surface active:bg-md-surface-container-highest focus-visible:ring-2 focus-visible:ring-md-primary",
    };

    const sizeStyles: Record<M3ButtonSize, string> = {
      sm: isIconVariant ? "size-11 p-2.5" : "min-h-11 px-4 text-[13px] gap-2",
      md: isIconVariant ? "size-11 p-2.5" : "min-h-11 px-5 text-sm gap-2",
      lg: isIconVariant ? "size-12 p-3" : "min-h-12 px-6 text-[15px] gap-2.5",
      "icon-sm": "size-11 p-2.5",
      "icon-md": "size-11 p-2.5",
    };

    const radius = variant === "fab" ? "rounded-[16px]" : isIconVariant ? "rounded-[14px]" : "rounded-[12px]";
    const baseClass = `inline-flex items-center justify-center font-semibold select-none touch-manipulation transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${radius} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`;

    const iconElement = typeof icon === "string" ? <M3Icon name={icon} size={size === "lg" ? 20 : 18} /> : icon;
    const trailingIconElement = typeof trailingIcon === "string" ? <M3Icon name={trailingIcon} size={size === "lg" ? 20 : 18} /> : trailingIcon;
    const content = (
      <>
        {isSpinning ? <span className="size-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" /> : iconElement}
        {children && <span>{children}</span>}
        {trailingIconElement}
      </>
    );

    if (href && !disabled) {
      const isExternal = href.startsWith("http://") || href.startsWith("https://") || target === "_blank";
      if (isExternal) {
        return <a href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={baseClass}>{content}</a>;
      }
      return <Link to={href} className={baseClass}>{content}</Link>;
    }

    return <button ref={ref} type={type} disabled={disabled || isSpinning} aria-busy={isSpinning || undefined} className={baseClass} {...props}>{content}</button>;
  }
);

M3Button.displayName = "M3Button";
