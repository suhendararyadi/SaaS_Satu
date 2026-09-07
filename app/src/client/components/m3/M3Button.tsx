import React, {
  type ButtonHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";
import { Link } from "react-router";
import { M3Icon } from "./M3Icon";

export type M3ButtonVariant =
  | "filled"
  | "tonal"
  | "elevated"
  | "outlined"
  | "text"
  | "danger"
  | "fab"
  | "icon";

export type M3ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface M3ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
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

    // M3 Variant styles
    const variantStyles: Record<M3ButtonVariant, string> = {
      filled:
        "bg-md-primary text-md-on-primary hover:bg-md-primary/90 hover:shadow-elevation-1 active:bg-md-primary/80 active:shadow-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      tonal:
        "bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 hover:shadow-elevation-1 active:bg-md-secondary-container/80 active:shadow-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      elevated:
        "bg-md-surface-container-low text-md-primary shadow-elevation-1 hover:shadow-elevation-2 hover:bg-md-surface-container active:shadow-elevation-1 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      outlined:
        "border border-md-outline text-md-primary hover:bg-md-primary/8 active:bg-md-primary/12 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      text:
        "text-md-primary hover:bg-md-primary/8 active:bg-md-primary/12 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      danger:
        "bg-md-error text-md-on-error hover:bg-md-error/90 hover:shadow-elevation-1 active:bg-md-error/80 focus-visible:ring-2 focus-visible:ring-md-error focus-visible:ring-offset-2",
      fab:
        "bg-md-primary-container text-md-on-primary-container shadow-elevation-3 hover:shadow-elevation-4 active:shadow-elevation-3 rounded-[16px] focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
      icon:
        "text-md-on-surface-variant hover:bg-md-on-surface/8 active:bg-md-on-surface/12 rounded-full focus-visible:ring-2 focus-visible:ring-md-primary",
    };

    // M3 Size styles with mobile-friendly tap targets
    const sizeStyles: Record<M3ButtonSize, string> = {
      sm: isIconVariant ? "w-9 h-9 p-2 min-h-[36px] min-w-[36px]" : "h-9 px-3.5 text-xs gap-1.5 min-h-[36px]",
      md: isIconVariant ? "w-10 h-10 p-2 min-h-[40px] min-w-[40px]" : "h-10 px-5 text-sm gap-2 min-h-[40px]",
      lg: isIconVariant ? "w-12 h-12 p-3 min-h-[48px] min-w-[48px]" : "h-12 px-6 text-base gap-2.5 min-h-[48px]",
      "icon-sm": "w-9 h-9 p-2 min-h-[36px] min-w-[36px]",
      "icon-md": "w-10 h-10 p-2.5 min-h-[40px] min-w-[40px]",
    };

    const radius =
      variant === "fab"
        ? "rounded-[16px]"
        : isIconVariant
        ? "rounded-full"
        : "rounded-full";

    const baseClass = `inline-flex items-center justify-center font-medium select-none touch-manipulation transition-all duration-200 cursor-pointer disabled:opacity-38 disabled:pointer-events-none disabled:shadow-none ${radius} ${
      sizeStyles[size]
    } ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`;

    const iconElement =
      typeof icon === "string" ? (
        <M3Icon name={icon} size={size === "sm" ? 16 : 18} />
      ) : (
        icon
      );

    const trailingIconElement =
      typeof trailingIcon === "string" ? (
        <M3Icon name={trailingIcon} size={size === "sm" ? 16 : 18} />
      ) : (
        trailingIcon
      );

    const content = (
      <>
        {isSpinning ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 mr-1.5" />
        ) : (
          iconElement
        )}
        {children && <span>{children}</span>}
        {trailingIconElement}
      </>
    );

    if (href && !disabled) {
      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        target === "_blank";

      if (isExternal) {
        return (
          <a
            href={href}
            target={target}
            rel={target === "_blank" ? "noopener noreferrer" : undefined}
            className={baseClass}
          >
            {content}
          </a>
        );
      }

      return (
        <Link to={href} className={baseClass}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isSpinning}
        className={baseClass}
        {...props}
      >
        {content}
      </button>
    );
  }
);

M3Button.displayName = "M3Button";
