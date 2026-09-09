import React, { type HTMLAttributes, forwardRef, type ReactNode } from "react";

export type M3CardVariant = "elevated" | "filled" | "outlined" | "tonal";
export interface M3CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: M3CardVariant;
  interactive?: boolean;
}

export const M3Card = forwardRef<HTMLDivElement, M3CardProps>(
  ({ variant = "outlined", interactive = false, children, className = "", ...props }, ref) => {
    const variantStyles: Record<M3CardVariant, string> = {
      elevated: "bg-md-surface text-md-on-surface border border-md-outline-variant shadow-[0_1px_2px_rgba(0,0,0,.05)]",
      filled: "bg-md-surface-container-low text-md-on-surface",
      outlined: "bg-md-surface text-md-on-surface border border-md-outline-variant",
      tonal: "bg-md-primary-container text-md-on-surface border border-md-primary/10",
    };
    const interactiveStyles = interactive
      ? "cursor-pointer hover:bg-md-surface-container-low hover:shadow-[0_2px_10px_rgba(0,0,0,.08)] active:bg-md-surface-container transition-[background-color,box-shadow] duration-150"
      : "";
    return <div ref={ref} className={`overflow-hidden rounded-[16px] ${variantStyles[variant]} ${interactiveStyles} ${className}`} {...props}>{children}</div>;
  }
);
M3Card.displayName = "M3Card";

export interface M3CardHeaderProps extends HTMLAttributes<HTMLDivElement> { action?: ReactNode }
export const M3CardHeader = forwardRef<HTMLDivElement, M3CardHeaderProps>(({ action, children, className = "", ...props }, ref) => (
  <div ref={ref} className={`flex items-start justify-between gap-4 p-4 pb-2 sm:p-[18px] sm:pb-2 ${className}`} {...props}>
    <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    {action && <div className="flex shrink-0 items-center">{action}</div>}
  </div>
));
M3CardHeader.displayName = "M3CardHeader";

export const M3CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ children, className = "", ...props }, ref) => (
  <h3 ref={ref} className={`text-[17px] font-semibold leading-6 tracking-[-0.01em] text-md-on-surface lg:text-[15px] ${className}`} {...props}>{children}</h3>
));
M3CardTitle.displayName = "M3CardTitle";

export const M3CardSubtitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ children, className = "", ...props }, ref) => (
  <p ref={ref} className={`text-[13px] leading-5 text-md-on-surface-variant ${className}`}>{children}</p>
));
M3CardSubtitle.displayName = "M3CardSubtitle";

export const M3CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ children, className = "", ...props }, ref) => (
  <div ref={ref} className={`p-4 pt-3 sm:p-[18px] sm:pt-3 ${className}`} {...props}>{children}</div>
));
M3CardContent.displayName = "M3CardContent";

export const M3CardActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ children, className = "", ...props }, ref) => (
  <div ref={ref} className={`flex items-center justify-end gap-2 border-t border-md-outline-variant p-3.5 ${className}`} {...props}>{children}</div>
));
M3CardActions.displayName = "M3CardActions";
