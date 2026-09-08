import React, { type ReactNode } from "react";
import { M3Icon } from "./M3Icon";

export interface M3PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: string;
  iconTone?: "primary" | "secondary" | "tertiary" | "blue" | "purple" | "orange" | "green";
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

const toneStyles = {
  primary: "bg-md-primary-container text-md-on-primary-container",
  secondary: "bg-md-secondary-container text-md-on-secondary-container",
  tertiary: "bg-md-tertiary-container text-md-on-tertiary-container",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  purple: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export function M3PageHeader({ title, description, eyebrow, icon, iconTone = "primary", actions, meta, className = "" }: M3PageHeaderProps) {
  return (
    <section className={`v2-page-header ${className}`} aria-labelledby="page-title">
      <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
        {icon && <div className={`v2-module-icon ${toneStyles[iconTone]}`} aria-hidden="true"><M3Icon name={icon} size={23} filled /></div>}
        <div className="min-w-0">
          {eyebrow && <p className="v2-eyebrow mb-1.5">{eyebrow}</p>}
          <h1 id="page-title" className="text-[26px] font-extrabold leading-[1.18] tracking-[-0.02em] text-md-on-surface sm:text-[32px]">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-md-on-surface-variant sm:text-[15px]">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </section>
  );
}
