import React, { type ReactNode } from "react";
import { M3Icon } from "./M3Icon";

export interface M3TabItem {
  id: string;
  label: string;
  icon?: ReactNode | string;
  badge?: string | number;
}

export interface M3TabsProps {
  tabs: M3TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function M3Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: M3TabsProps) {
  return (
    <div
      className={`flex items-center gap-1 border-b border-md-outline-variant/40 overflow-x-auto no-scrollbar ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-3 text-sm font-medium transition-all duration-150 inline-flex items-center gap-2 select-none cursor-pointer whitespace-nowrap ${
              isActive
                ? "text-md-primary font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.75 after:bg-md-primary after:rounded-t-full"
                : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-on-surface/6 rounded-t-[8px]"
            }`}
          >
            {typeof tab.icon === "string" ? (
              <M3Icon name={tab.icon} size={18} />
            ) : (
              tab.icon
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? "bg-md-primary-container text-md-on-primary-container"
                    : "bg-md-surface-container-highest text-md-on-surface-variant"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
