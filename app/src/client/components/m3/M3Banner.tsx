import React, { type ReactNode } from "react";
import { M3Icon } from "./M3Icon";
import { M3Button } from "./M3Button";

export type M3BannerVariant = "standard" | "tonal" | "info" | "warning" | "error" | "success" | "hero";

export interface M3BannerProps {
  variant?: M3BannerVariant;
  headline?: ReactNode;
  title?: ReactNode;
  supportingText?: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
  icon?: string | ReactNode | null | false;
  iconFilled?: boolean;
  actions?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionHref?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  showDivider?: boolean;
  className?: string;
  role?: string;
}

const defaultIcons: Record<M3BannerVariant, string> = {
  standard: "info",
  tonal: "info",
  info: "info",
  warning: "warning",
  error: "error",
  success: "check_circle",
  hero: "info",
};

const variantStyles: Record<M3BannerVariant, { container: string; icon: string }> = {
  standard: { container: "bg-md-surface border-md-outline-variant", icon: "text-md-on-surface-variant" },
  tonal: { container: "bg-md-surface-container-low border-md-outline-variant", icon: "text-md-on-surface-variant" },
  info: { container: "bg-md-primary/5 border-md-primary/18", icon: "text-md-primary" },
  warning: { container: "bg-md-tertiary/6 border-md-tertiary/20", icon: "text-md-tertiary" },
  error: { container: "bg-md-error/5 border-md-error/18", icon: "text-md-error" },
  success: { container: "bg-md-secondary/6 border-md-secondary/20", icon: "text-md-secondary" },
  hero: { container: "bg-md-primary/5 border-md-primary/18", icon: "text-md-primary" },
};

export function M3Banner({
  variant = "standard",
  headline,
  title,
  supportingText,
  text,
  children,
  icon,
  iconFilled,
  actions,
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionHref,
  dismissible = false,
  onDismiss,
  showDivider = false,
  className = "",
  role,
}: M3BannerProps) {
  const finalHeadline = headline || title;
  const finalSupportingText = supportingText || text;
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => setIsDismissed(false), [finalHeadline, finalSupportingText]);
  if (isDismissed) return null;

  const computedRole = role || (variant === "error" || variant === "warning" ? "alert" : "status");
  const style = variantStyles[variant];
  const iconName = typeof icon === "string" ? icon : defaultIcons[variant];
  const iconNode = icon === null || icon === false ? null : typeof icon === "string" || !icon
    ? <M3Icon name={iconName} size={18} weight={400} filled={iconFilled ?? false} className={style.icon} />
    : <M3Icon icon={icon} size={18} className={style.icon} />;

  return (
    <div className={`w-full ${className}`}>
      <div role={computedRole} className={`flex flex-col gap-3 rounded-[12px] border px-3.5 py-3 sm:flex-row sm:items-center ${style.container}`}>
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {iconNode && <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center" aria-hidden="true">{iconNode}</span>}
          <div className="min-w-0 flex-1">
            {finalHeadline && <h3 className="text-[13px] font-semibold leading-5 text-md-on-surface">{finalHeadline}</h3>}
            {finalSupportingText && <p className={`${finalHeadline ? "mt-0.5" : ""} text-[12px] leading-[1.55] text-md-on-surface-variant`}>{finalSupportingText}</p>}
            {children && <div className="mt-2 text-[12px] text-md-on-surface-variant">{children}</div>}
          </div>
        </div>

        {(actions || actionLabel || secondaryActionLabel || dismissible) && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 pl-7 sm:pl-0">
            {actions}
            {secondaryActionLabel && <M3Button variant="text" size="sm" href={secondaryActionHref} onClick={onSecondaryAction}>{secondaryActionLabel}</M3Button>}
            {actionLabel && <M3Button variant="text" size="sm" href={actionHref} onClick={onAction}>{actionLabel}</M3Button>}
            {dismissible && (
              <button
                type="button"
                onClick={() => { setIsDismissed(true); onDismiss?.(); }}
                aria-label="Tutup banner"
                className="flex size-8 items-center justify-center rounded-[7px] text-md-on-surface-variant transition-colors hover:bg-black/[.05] hover:text-md-on-surface dark:hover:bg-white/[.07]"
              >
                <M3Icon name="close" size={16} weight={400} />
              </button>
            )}
          </div>
        )}
      </div>
      {showDivider && <div className="mt-2 border-t border-md-outline-variant" />}
    </div>
  );
}
