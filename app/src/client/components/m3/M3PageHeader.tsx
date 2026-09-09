import React, { type ReactNode } from "react";

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

export function M3PageHeader({ title, description, eyebrow, actions, meta, className = "" }: M3PageHeaderProps) {
  return (
    <section className={`flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between ${className}`} aria-labelledby="page-title">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/70">{eyebrow}</p>}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 id="page-title" className="text-[20px] font-semibold leading-[1.25] tracking-[-0.018em] text-md-on-surface sm:text-[21px]">{title}</h1>
          {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
        {description && <p className="mt-1 max-w-3xl text-[13px] leading-5 text-md-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </section>
  );
}
