import React, { type ElementType, type ReactNode } from "react";

export type M3TypographyVariant =
  | "display-large"
  | "display-medium"
  | "display-small"
  | "headline-large"
  | "headline-medium"
  | "headline-small"
  | "title-large"
  | "title-medium"
  | "title-small"
  | "body-large"
  | "body-medium"
  | "body-small"
  | "label-large"
  | "label-medium"
  | "label-small";

export type M3TextColor =
  | "on-surface"
  | "on-surface-variant"
  | "primary"
  | "on-primary"
  | "primary-container"
  | "on-primary-container"
  | "secondary"
  | "on-secondary"
  | "secondary-container"
  | "on-secondary-container"
  | "tertiary"
  | "on-tertiary"
  | "tertiary-container"
  | "on-tertiary-container"
  | "error"
  | "on-error"
  | "error-container"
  | "on-error-container"
  | "outline"
  | "outline-variant"
  | "background"
  | "on-background"
  | "surface"
  | "surface-variant"
  | "inverse-surface"
  | "inverse-on-surface"
  | "inverse-primary"
  | "inherit"
  | string;

export interface M3TextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Official Google Material 3 Type Scale Variant:
   * - Display: display-large (57px), display-medium (45px), display-small (36px)
   * - Headline: headline-large (32px), headline-medium (28px), headline-small (24px)
   * - Title: title-large (22px), title-medium (16px), title-small (14px)
   * - Body: body-large (16px), body-medium (14px), body-small (12px)
   * - Label: label-large (14px), label-medium (12px), label-small (11px)
   */
  variant?: M3TypographyVariant;
  /** Semantic M3 color role */
  color?: M3TextColor;
  /** Semantic HTML tag (defaults to sensible tag per variant: h1-h6, p, or span) */
  as?: ElementType;
  /** Font weight override */
  weight?: "regular" | "medium" | "semibold" | "bold";
  /** Text alignment */
  align?: "left" | "center" | "right" | "justify";
  /** Single line truncation with ellipsis */
  truncate?: boolean;
  /** For label element */
  htmlFor?: string;
  className?: string;
  children?: ReactNode;
}

const defaultElementMap: Record<M3TypographyVariant, ElementType> = {
  "display-large": "h1",
  "display-medium": "h1",
  "display-small": "h1",
  "headline-large": "h2",
  "headline-medium": "h2",
  "headline-small": "h3",
  "title-large": "h4",
  "title-medium": "h5",
  "title-small": "h6",
  "body-large": "p",
  "body-medium": "p",
  "body-small": "p",
  "label-large": "span",
  "label-medium": "span",
  "label-small": "span",
};

const typographyVariantClasses: Record<M3TypographyVariant, string> = {
  "display-large": "m3-display-large font-normal tracking-[-0.25px]",
  "display-medium": "m3-display-medium font-normal tracking-[0px]",
  "display-small": "m3-display-small font-normal tracking-[0px]",
  "headline-large": "m3-headline-large font-normal tracking-[0px]",
  "headline-medium": "m3-headline-medium font-normal tracking-[0px]",
  "headline-small": "m3-headline-small font-normal tracking-[0px]",
  "title-large": "m3-title-large font-medium tracking-[0px]",
  "title-medium": "m3-title-medium font-medium tracking-[0.15px]",
  "title-small": "m3-title-small font-medium tracking-[0.1px]",
  "body-large": "m3-body-large font-normal tracking-[0.5px]",
  "body-medium": "m3-body-medium font-normal tracking-[0.25px]",
  "body-small": "m3-body-small font-normal tracking-[0.4px]",
  "label-large": "m3-label-large font-medium tracking-[0.1px]",
  "label-medium": "m3-label-medium font-medium tracking-[0.5px]",
  "label-small": "m3-label-small font-medium tracking-[0.5px]",
};

const textColorMap: Record<string, string> = {
  "on-surface": "text-md-on-surface",
  "on-surface-variant": "text-md-on-surface-variant",
  primary: "text-md-primary",
  "on-primary": "text-md-on-primary",
  "primary-container": "text-md-primary-container",
  "on-primary-container": "text-md-on-primary-container",
  secondary: "text-md-secondary",
  "on-secondary": "text-md-on-secondary",
  "secondary-container": "text-md-secondary-container",
  "on-secondary-container": "text-md-on-secondary-container",
  tertiary: "text-md-tertiary",
  "on-tertiary": "text-md-on-tertiary",
  "tertiary-container": "text-md-tertiary-container",
  "on-tertiary-container": "text-md-on-tertiary-container",
  error: "text-md-error",
  "on-error": "text-md-on-error",
  "error-container": "text-md-error-container",
  "on-error-container": "text-md-on-error-container",
  outline: "text-md-outline",
  "outline-variant": "text-md-outline-variant",
  background: "text-md-background",
  "on-background": "text-md-on-background",
  surface: "text-md-surface",
  "surface-variant": "text-md-surface-variant",
  "inverse-surface": "text-md-inverse-surface",
  "inverse-on-surface": "text-md-inverse-on-surface",
  "inverse-primary": "text-md-inverse-primary",
  inherit: "text-inherit",
};

/**
 * Resolves an M3 color role or custom class to a Tailwind class.
 */
function resolveColorClass(color?: M3TextColor): string {
  if (!color) return "text-md-on-surface";
  if (textColorMap[color]) return textColorMap[color];
  if (color.startsWith("text-")) return color;
  const stripped = color.replace(/^md-/, "");
  if (textColorMap[stripped]) return textColorMap[stripped];
  return `text-${color}`;
}

const weightMap: Record<string, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const alignMap: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

/**
 * Returns Tailwind/CSS classes for a given M3 typography configuration.
 */
export function getM3TypographyClasses(
  variant: M3TypographyVariant = "body-medium",
  color: M3TextColor = "on-surface",
  weight?: "regular" | "medium" | "semibold" | "bold"
): string {
  const vClass = typographyVariantClasses[variant] || typographyVariantClasses["body-medium"];
  const cClass = resolveColorClass(color);
  const wClass = weight ? weightMap[weight] : "";
  return `${vClass} ${cClass} ${wClass}`.trim();
}

/**
 * Official Google Material Design 3 Typography Component.
 * Implements the official M3 type scale with font sizes, line heights, letter spacings, and text color tokens.
 */
export function M3Text({
  variant = "body-medium",
  color,
  as,
  weight,
  align,
  truncate = false,
  htmlFor,
  className = "",
  children,
  ...rest
}: M3TextProps) {
  const Component = as || defaultElementMap[variant] || "span";
  const variantClass = typographyVariantClasses[variant] || typographyVariantClasses["body-medium"];

  let colorClass = "";
  if (color) {
    colorClass = resolveColorClass(color);
  } else {
    // If className already contains a text color class (e.g. text-white, text-md-on-primary, text-amber-900), don't inject text-md-on-surface
    const hasExplicitTextColor = /\btext-(?!left|right|center|justify|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\S+/.test(className);
    if (!hasExplicitTextColor) {
      colorClass = "text-md-on-surface";
    }
  }

  const weightClass = weight ? weightMap[weight] : "";
  const alignClass = align ? alignMap[align] : "";
  const truncateClass = truncate ? "truncate block" : "";

  return (
    <Component
      htmlFor={htmlFor}
      className={`${variantClass} ${colorClass} ${weightClass} ${alignClass} ${truncateClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
