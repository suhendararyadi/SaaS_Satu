import React, {
  type HTMLAttributes,
  forwardRef,
  type ReactNode,
} from "react";

export type M3CardVariant = "elevated" | "filled" | "outlined" | "tonal";

export interface M3CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: M3CardVariant;
  interactive?: boolean;
}

export const M3Card = forwardRef<HTMLDivElement, M3CardProps>(
  (
    {
      variant = "outlined",
      interactive = false,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<M3CardVariant, string> = {
      elevated:
        "bg-md-surface-container-low text-md-on-surface shadow-elevation-1",
      filled:
        "bg-md-surface-container-highest text-md-on-surface",
      outlined:
        "bg-md-surface text-md-on-surface border border-md-outline-variant",
      tonal:
        "bg-md-surface-container-high text-md-on-surface",
    };

    const interactiveStyles = interactive
      ? "cursor-pointer hover:shadow-elevation-2 hover:border-md-outline active:shadow-elevation-1 transition-all duration-200"
      : "";

    return (
      <div
        ref={ref}
        className={`rounded-[16px] overflow-hidden transition-shadow duration-200 ${variantStyles[variant]} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

M3Card.displayName = "M3Card";

export interface M3CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
}

export const M3CardHeader = forwardRef<HTMLDivElement, M3CardHeaderProps>(
  ({ action, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-5 pb-2 flex items-start justify-between gap-4 ${className}`}
        {...props}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-0">{children}</div>
        {action && <div className="shrink-0 flex items-center">{action}</div>}
      </div>
    );
  }
);

M3CardHeader.displayName = "M3CardHeader";

export const M3CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={`text-[18px] sm:text-[20px] font-medium leading-6 text-md-on-surface truncate ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
});

M3CardTitle.displayName = "M3CardTitle";

export const M3CardSubtitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={`text-xs sm:text-sm text-md-on-surface-variant ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});

M3CardSubtitle.displayName = "M3CardSubtitle";

export const M3CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-5 pt-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

M3CardContent.displayName = "M3CardContent";

export const M3CardActions = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className = "", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-4 pt-1 flex items-center justify-end gap-2 border-t border-md-outline-variant/30 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

M3CardActions.displayName = "M3CardActions";
