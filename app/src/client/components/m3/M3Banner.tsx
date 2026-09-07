import React, { type ReactNode } from "react";
import { M3Icon } from "./M3Icon";
import { M3Text } from "./M3Text";
import { M3Button } from "./M3Button";
import { M3Divider } from "./M3Divider";

export type M3BannerVariant =
  | "standard"
  | "tonal"
  | "info"
  | "warning"
  | "error"
  | "success"
  | "hero";

export interface M3BannerProps {
  /** Visual variant according to M3 semantic color roles */
  variant?: M3BannerVariant;
  /** Primary headline or title */
  headline?: ReactNode;
  /** Alias for headline */
  title?: ReactNode;
  /** Supporting text or description */
  supportingText?: ReactNode;
  /** Alias for supportingText */
  text?: ReactNode;
  /** Arbitrary body or children */
  children?: ReactNode;
  /**
   * Leading icon:
   * - string: Google Material Symbol name (e.g. 'info', 'warning', 'error', 'school')
   * - ReactNode: custom icon element (e.g. Lucide icon)
   * - null / false: hide icon
   */
  icon?: string | ReactNode | null | false;
  /** Whether leading Material Symbol is filled (default: false, or true for error/warning/success) */
  iconFilled?: boolean;
  /** Optional custom action node */
  actions?: ReactNode;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Primary action router link or URL */
  actionHref?: string;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Secondary action router link or URL */
  secondaryActionHref?: string;
  /** Allow dismissing the banner */
  dismissible?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Render bottom divider line */
  showDivider?: boolean;
  /** Additional CSS class */
  className?: string;
  /** ARIA role override */
  role?: string;
}

const defaultIcons: Record<M3BannerVariant, string> = {
  standard: "info",
  tonal: "info",
  info: "info",
  warning: "warning",
  error: "error",
  success: "check_circle",
  hero: "school",
};

const variantContainerStyles: Record<M3BannerVariant, string> = {
  standard:
    "bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/40 shadow-xs",
  tonal:
    "bg-md-surface-container text-md-on-surface border border-md-outline-variant/30",
  info: "bg-md-primary-container/85 text-md-on-primary-container border border-md-primary/25 shadow-xs",
  warning:
    "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs",
  error:
    "bg-md-error-container/85 text-md-on-error-container border border-md-error/30 shadow-xs",
  success:
    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-xs",
  hero: "bg-md-primary text-md-on-primary border border-transparent shadow-elevation-1",
};

const iconColorClasses: Record<M3BannerVariant, string> = {
  standard: "text-md-primary",
  tonal: "text-md-on-surface-variant",
  info: "text-md-primary",
  warning: "text-amber-700 dark:text-amber-400",
  error: "text-md-error",
  success: "text-emerald-700 dark:text-emerald-400",
  hero: "text-md-on-primary",
};

/**
 * Official Google Material Design 3 Banner Component.
 * Implements M3 banner guidelines:
 * - Leading icon (24px standard)
 * - One- or two-line headline with supporting body text
 * - Up to two text/tonal action buttons
 * - Semantic container color roles (surface, info, warning, error, success, hero)
 * - Optional dismiss trailing action and bottom divider line
 */
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

  // Internal dismiss state: ensures banner dismisses cleanly even if uncontrolled
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Reset dismissed state whenever headline or supporting text content updates
  React.useEffect(() => {
    setIsDismissed(false);
  }, [finalHeadline, finalSupportingText]);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Resolve leading icon
  let renderedIcon: ReactNode = null;
  if (icon !== null && icon !== false) {
    if (typeof icon === "string") {
      renderedIcon = (
        <M3Icon
          name={icon}
          size={24}
          filled={iconFilled ?? (variant === "error" || variant === "warning" || variant === "success")}
          className={iconColorClasses[variant]}
        />
      );
    } else if (icon) {
      renderedIcon = (
        <M3Icon
          icon={icon}
          size={24}
          className={iconColorClasses[variant]}
        />
      );
    } else {
      // Default icon for variant
      const defaultIconName = defaultIcons[variant];
      renderedIcon = (
        <M3Icon
          name={defaultIconName}
          size={24}
          filled={iconFilled ?? (variant === "error" || variant === "warning" || variant === "success")}
          className={iconColorClasses[variant]}
        />
      );
    }
  }

  // Accessibility role
  const computedRole =
    role || (variant === "error" || variant === "warning" ? "alert" : "status");

  // Determine button variants according to container context
  const primaryButtonVariant =
    variant === "hero" ? "elevated" : "text";

  const hasExplicitActions = Boolean(
    actions || actionLabel || secondaryActionLabel
  );

  return (
    <div className="w-full">
      <div
        role={computedRole}
        className={`rounded-2xl p-4 transition-all duration-200 ${variantContainerStyles[variant]} ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Leading Icon & Content */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            {renderedIcon && (
              <div className="shrink-0 mt-0.5 sm:mt-0 flex items-center justify-center">
                {renderedIcon}
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-1">
              {finalHeadline && (
                <M3Text
                  variant="title-medium"
                  as="h3"
                  color={
                    variant === "hero"
                      ? "on-primary"
                      : variant === "error"
                      ? "on-error-container"
                      : variant === "info"
                      ? "on-primary-container"
                      : variant === "warning" || variant === "success"
                      ? "inherit"
                      : "on-surface"
                  }
                  className={
                    variant === "hero"
                      ? "text-md-on-primary font-semibold text-base sm:text-lg"
                      : variant === "error"
                      ? "text-md-on-error-container font-semibold"
                      : variant === "warning"
                      ? "text-amber-950 dark:text-amber-100 font-semibold"
                      : variant === "success"
                      ? "text-emerald-950 dark:text-emerald-100 font-semibold"
                      : variant === "info"
                      ? "text-md-on-primary-container font-semibold"
                      : "text-md-on-surface font-semibold"
                  }
                >
                  {finalHeadline}
                </M3Text>
              )}

              {finalSupportingText && (
                <M3Text
                  variant="body-medium"
                  as="p"
                  color={
                    variant === "hero"
                      ? "on-primary"
                      : variant === "error"
                      ? "on-error-container"
                      : variant === "info"
                      ? "on-primary-container"
                      : variant === "warning" || variant === "success"
                      ? "inherit"
                      : "on-surface-variant"
                  }
                  className={`leading-relaxed ${
                    variant === "hero"
                      ? "text-md-on-primary/90"
                      : variant === "error"
                      ? "text-md-on-error-container/90"
                      : variant === "warning"
                      ? "text-amber-900/90 dark:text-amber-200/90"
                      : variant === "success"
                      ? "text-emerald-900/90 dark:text-emerald-200/90"
                      : variant === "info"
                      ? "text-md-on-primary-container/90"
                      : "text-md-on-surface-variant"
                  }`}
                >
                  {finalSupportingText}
                </M3Text>
              )}

              {children && <div className="pt-1">{children}</div>}
            </div>
          </div>

          {/* Actions & Dismiss Button */}
          {(hasExplicitActions || dismissible) && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap justify-end w-full sm:w-auto">
              {actions}

              {secondaryActionLabel && (
                <M3Button
                  variant="text"
                  size="sm"
                  href={secondaryActionHref}
                  onClick={onSecondaryAction}
                  className={
                    variant === "hero"
                      ? "text-md-on-primary/85 hover:bg-md-on-primary/10"
                      : undefined
                  }
                >
                  {secondaryActionLabel}
                </M3Button>
              )}

              {actionLabel && (
                <M3Button
                  variant={primaryButtonVariant}
                  size="sm"
                  href={actionHref}
                  onClick={onAction}
                  className={
                    variant === "hero"
                      ? "bg-md-surface-container-lowest text-md-primary hover:bg-md-surface-container font-medium shadow-elevation-1 border-0"
                      : undefined
                  }
                >
                  {actionLabel}
                </M3Button>
              )}

              {dismissible && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Tutup banner"
                  className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                    variant === "hero"
                      ? "text-md-on-primary/80 hover:bg-md-on-primary/15 hover:text-md-on-primary"
                      : "text-inherit opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <M3Icon name="close" size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showDivider && <M3Divider className="mt-2" />}
    </div>
  );
}
