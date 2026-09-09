import React, { type ReactNode } from "react";

export type M3IconVariant = "rounded" | "outlined" | "sharp";

export interface M3IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Google Material Symbol name (e.g. 'school', 'check_circle', 'warning', 'info') */
  name?: string;
  /** Custom fallback ReactNode icon (e.g. Lucide icon) */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Standard M3 dimensions (default 24px) */
  size?: 18 | 20 | 24 | 40 | 48 | number | string;
  /** Optical size axis (opsz: 20, 24, 40, 48). If omitted, automatically derived from size. */
  opsz?: 20 | 24 | 40 | 48 | number;
  /** Weight axis (wght: 100-700). Default is 400. */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Fill axis (FILL: 0 or 1). Default is 0. */
  fill?: boolean | 0 | 1;
  /** Alias for fill */
  filled?: boolean;
  /** Grade axis (GRAD: -25 to 200). Default is 0. */
  grade?: -25 | 0 | 200 | number;
  /** Web symbol style. Outlined is the default for the Apple HIG-inspired interface. */
  variant?: M3IconVariant;
  /** Accessible label */
  ariaLabel?: string;
  /** Hide from screen readers if decorative (default: true if no ariaLabel) */
  ariaHidden?: boolean;
}

/**
 * Derives the closest standard Material Symbols optical size (opsz) based on pixel dimension.
 */
function resolveOpsz(sizeVal: number | string): number {
  const numericSize =
    typeof sizeVal === "number" ? sizeVal : parseInt(String(sizeVal), 10) || 24;
  if (numericSize <= 20) return 20;
  if (numericSize <= 30) return 24;
  if (numericSize <= 44) return 40;
  return 48;
}

/**
 * Web symbol compatibility component. The Apple HIG-inspired UI uses a restrained
 * outlined default while retaining Material Symbols as a cross-platform web fallback.
 * Supports variable font axes:
 * - 'FILL': 0 (outline) or 1 (solid)
 * - 'wght': 100 to 700
 * - 'GRAD': -25 to 200
 * - 'opsz': 20, 24, 40, 48
 */
export function M3Icon({
  name,
  icon,
  className = "",
  size = 24,
  opsz,
  weight = 400,
  fill,
  filled,
  grade = 0,
  variant = "outlined",
  ariaLabel,
  ariaHidden,
  style,
  ...rest
}: M3IconProps) {
  // Custom ReactNode icons remain supported for feature-specific symbols.
  if (icon) {
    const numericSize =
      typeof size === "number" ? `${size}px` : size;
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 leading-none ${className}`}
        style={{ width: numericSize, height: numericSize, ...style }}
        aria-hidden={ariaHidden ?? (ariaLabel ? false : true)}
        aria-label={ariaLabel}
        {...rest}
      >
        {icon}
      </span>
    );
  }

  if (name) {
    const isFilled = fill === 1 || fill === true || filled === true;
    const finalOpsz = opsz ?? resolveOpsz(size);
    const pixelSize = typeof size === "number" ? `${size}px` : size;
    const symbolClass =
      variant === "outlined"
        ? "material-symbols-outlined"
        : "material-symbols-rounded";

    const fontVariation = `'FILL' ${isFilled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${finalOpsz}`;

    return (
      <span
        className={`${symbolClass} shrink-0 select-none inline-flex items-center justify-center text-center leading-none overflow-hidden ${className}`}
        style={{
          fontSize: pixelSize,
          width: pixelSize,
          height: pixelSize,
          lineHeight: 1,
          fontVariationSettings: fontVariation,
          ...style,
        }}
        aria-hidden={ariaHidden ?? (ariaLabel ? false : true)}
        aria-label={ariaLabel}
        role={ariaLabel ? "img" : undefined}
        {...rest}
      >
        {name}
      </span>
    );
  }

  return null;
}
