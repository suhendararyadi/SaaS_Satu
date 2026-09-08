import React, { type HTMLAttributes, forwardRef, type ReactNode } from "react";

export type M3CardVariant = "elevated" | "filled" | "outlined" | "tonal";
export interface M3CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: M3CardVariant;
  interactive?: boolean;
}

export const M3Card = forwardRef<HTMLDivElement, M3CardProps>(
  ({ variant = "outlined", interactive = false, children, className = "", ...props }, ref) => {
    const variantStyles: Record<M3CardVariant, string> = {
      elevated: "bg-md-surface text-md-on-surface border border-md-outline-variant/45 shadow-[0_4px_16px_rgba(15,23,42,.07)]",
      filled: "bg-md-surface-container-low text-md-on-surface",
      outlined: "bg-md-surface text-md-on-surface border border-md-outline-variant/70 shadow-[0_1px_2px_rgba(15,23,42,.04)]",
      tonal: "bg-md-primary-container/42 text-md-on-surface border border-md-primary/10",
    };
    const interactiveStyles = interactive
      ? "cursor-pointer hover:border-md-primary/35 hover:shadow-[0_6px_18px_rgba(15,23,42,.09)] active:translate-y-px transition-[border-color,box-shadow,transform] duration-150"
      : "";
    return <div ref={ref} className={`rounded-[20px] overflow-hidden ${variantStyles[variant]} ${interactiveStyles} ${className}`} {...props}>{children}</div>;
  }
);
M3Card.displayName = "M3Card";

export interface M3CardHeaderProps extends HTMLAttributes<HTMLDivElement> { action?: ReactNode }
export const M3CardHeader = forwardRef<HTMLDivElement, M3CardHeaderProps>(({ action, children, className = "", ...props }, ref) => (
  <div ref={ref} className={`p-5 sm:p-6 pb-2 flex items-start justify-between gap-4 ${className}`} {...props}>
    <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    {action && <div className="shrink-0 flex items-center">{action}</div>}
  </div>
));
M3CardHeader.displayName = "M3CardHeader";

export const M3CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ children, className = "", ...props }, ref) => (
  <h3 ref={ref} className={`text-[18px] sm:text-[20px] font-bold leading-7 text-md-on-surface ${className}`} {...props}>{children}</h3>
));
M3CardTitle.displayName = "M3CardTitle";

export const M3CardSubtitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ children, className = "", ...props }, ref) => (
  <p ref={ref} className={`text-sm leading-6 text-md-on-surface-variant ${className}`} {...props}>{children}</p>
));
M3CardSubtitle.displayName = "M3CardSubtitle";

export const M3CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ children, className = "", ...props }, ref) => (
  <div ref={ref} className={`p-5 sm:p-6 pt-3 ${className}`} {...props}>{children}</div>
));
M3CardContent.displayName = "M3CardContent";

export const M3CardActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ children, className = "", ...props }, ref) => (
  <div ref={ref} className={`flex items-center justify-end gap-2 border-t border-md-outline-variant/50 p-4 pt-3 ${className}`} {...props}>{children}</div>
));
M3CardActions.displayName = "M3CardActions";
