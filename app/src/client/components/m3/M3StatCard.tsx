import React, { type ReactNode } from "react";
import { M3Card } from "./M3Card";
import { M3Icon } from "./M3Icon";

export interface M3StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  tone?: "indigo" | "teal" | "blue" | "amber" | "orange" | "purple" | "green";
  helper?: ReactNode;
  href?: string;
}

const tones = {
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  orange: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  purple: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export function M3StatCard({ label, value, icon, tone = "indigo", helper, href }: M3StatCardProps) {
  const card = (
    <M3Card variant="outlined" interactive={!!href} className="h-full p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-md-on-surface-variant">{label}</p>
          <p className="mt-2 text-[28px] font-extrabold tracking-[-0.03em] text-md-on-surface">{value}</p>
          {helper && <div className="mt-2 text-xs leading-5 text-md-on-surface-variant">{helper}</div>}
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-[13px] ${tones[tone]}`} aria-hidden="true"><M3Icon name={icon} size={21} /></div>
      </div>
    </M3Card>
  );
  return href ? <a href={href} className="block h-full rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2">{card}</a> : card;
}
