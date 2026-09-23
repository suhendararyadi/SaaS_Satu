import React, { type ReactNode } from "react";
import { M3Card } from "./M3Card";

export interface M3StatCardProps {
  label: string;
  value: ReactNode;
  icon?: string;
  tone?: "indigo" | "teal" | "blue" | "amber" | "orange" | "purple" | "green";
  helper?: ReactNode;
  href?: string;
}

const dotTones = {
  indigo: "bg-md-primary",
  teal: "bg-md-secondary",
  blue: "bg-md-primary",
  amber: "bg-md-tertiary",
  orange: "bg-md-tertiary",
  purple: "bg-md-primary",
  green: "bg-md-secondary",
};

export function M3StatCard({ label, value, tone = "indigo", helper, href }: M3StatCardProps) {
  const card = (
    <M3Card variant="outlined" interactive={!!href} className="h-full p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 shrink-0 rounded-full ${dotTones[tone]}`} aria-hidden="true" />
        <p className="truncate text-[11.5px] font-medium text-md-on-surface-variant">{label}</p>
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] text-md-on-surface">{value}</p>
      {helper && <div className="mt-1.5 text-[11.5px] leading-4 text-md-on-surface-variant">{helper}</div>}
    </M3Card>
  );

  return href ? <a href={href} className="block h-full rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/50 focus-visible:ring-offset-2">{card}</a> : card;
}
