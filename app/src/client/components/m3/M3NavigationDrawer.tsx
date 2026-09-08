import React, { type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { M3Icon } from "./M3Icon";

export interface M3DrawerItem {
  label: string;
  href: string;
  icon?: ReactNode | string;
  badge?: string | number;
}
export interface M3DrawerSection { title?: string; items: M3DrawerItem[] }
export interface M3NavigationDrawerProps {
  sections: M3DrawerSection[];
  header?: ReactNode;
  footer?: ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  isHidden?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function M3NavigationDrawer({ sections, header, footer, isOpen = true, onClose, isCollapsed = false, isHidden = false, className = "" }: M3NavigationDrawerProps) {
  const location = useLocation();
  const isCurrent = (href: string) => href === "/school" ? location.pathname === "/school" : location.pathname.startsWith(href);
  const isRail = isCollapsed && !isHidden;
  const desktopWidthClass = isHidden ? "w-0 opacity-0 pointer-events-none overflow-hidden" : isRail ? "w-20" : "w-[260px]";

  const renderItem = (item: M3DrawerItem, active: boolean, rail: boolean) => {
    const icon = typeof item.icon === "string" ? <M3Icon name={item.icon} size={21} filled={active} /> : item.icon;
    if (rail) {
      return (
        <Link key={item.href} to={item.href} title={item.label} onClick={onClose} aria-current={active ? "page" : undefined} className={`relative mx-auto flex min-h-12 w-14 items-center justify-center rounded-[14px] transition-colors ${active ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-surface-container-high hover:text-md-on-surface"}`}>
          {icon}
          {item.badge !== undefined && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-md-tertiary" aria-label={`${item.badge}`} />}
        </Link>
      );
    }
    return (
      <Link key={item.href} to={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[13px] font-semibold transition-colors ${active ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-surface-container-high hover:text-md-on-surface"}`}>
        <span className="flex size-8 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && <span className={`min-w-6 rounded-[7px] px-1.5 py-0.5 text-center text-[10px] font-bold ${active ? "bg-md-primary text-md-on-primary" : "bg-md-surface-container-highest text-md-on-surface-variant"}`}>{item.badge}</span>}
      </Link>
    );
  };

  const renderContent = (rail: boolean) => (
    <div className={`${rail ? "w-20" : "w-[min(86vw,300px)] lg:w-[260px]"} flex h-full flex-col border-r border-md-outline-variant/60 bg-md-surface-container-low transition-all duration-200 ${className}`}>
      {header && <div className={`${rail ? "p-3" : "p-4 pb-2"} shrink-0`}>{header}</div>}
      <div className={`${rail ? "space-y-3 px-2 py-3" : "space-y-5 px-3 py-3"} flex-1 overflow-y-auto`}>
        {sections.filter((section) => section.items.length > 0).map((section, index) => (
          <section key={`${section.title ?? "section"}-${index}`} className="space-y-1">
            {section.title && !rail && <h2 className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-[0.08em] text-md-on-surface-variant">{section.title}</h2>}
            {section.title && rail && index > 0 && <div className="mx-auto my-2 w-8 border-t border-md-outline-variant/60" />}
            <div className="space-y-1">{section.items.map((item) => renderItem(item, isCurrent(item.href), rail))}</div>
          </section>
        ))}
      </div>
      {footer && <div className={`${rail ? "p-2" : "p-3"} shrink-0 border-t border-md-outline-variant/60`}>{footer}</div>}
    </div>
  );

  return (
    <>
      <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 transition-all duration-200 lg:flex ${desktopWidthClass}`} aria-hidden={isHidden}>{!isHidden && renderContent(isRail)}</aside>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <button type="button" className="fixed inset-0 bg-slate-950/48" onClick={onClose} aria-label="Tutup menu navigasi" />
          <div className="relative z-10 h-full">{renderContent(false)}</div>
        </div>
      )}
    </>
  );
}
