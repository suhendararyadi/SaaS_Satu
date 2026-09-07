import React, { type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { M3Icon } from "./M3Icon";

export interface M3DrawerItem {
  label: string;
  href: string;
  icon?: ReactNode | string;
  badge?: string | number;
}

export interface M3DrawerSection {
  title?: string;
  items: M3DrawerItem[];
}

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

export function M3NavigationDrawer({
  sections,
  header,
  footer,
  isOpen = true,
  onClose,
  isCollapsed = false,
  isHidden = false,
  onToggleCollapse,
  className = "",
}: M3NavigationDrawerProps) {
  const location = useLocation();

  const isCurrent = (href: string) => {
    if (href === "/school") {
      return location.pathname === "/school";
    }
    return location.pathname.startsWith(href);
  };

  const isRail = isCollapsed && !isHidden;
  const desktopWidthClass = isHidden
    ? "w-0 border-r-0 opacity-0 pointer-events-none overflow-hidden"
    : isRail
    ? "w-20"
    : "w-72";

  const renderItem = (item: M3DrawerItem, active: boolean, isRailMode: boolean) => {
    if (isRailMode) {
      return (
        <Link
          key={item.href}
          to={item.href}
          title={item.label}
          onClick={() => {
            if (onClose) onClose();
          }}
          className={`group relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-150 mx-auto ${
            active
              ? "text-md-on-secondary-container"
              : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-on-surface/8"
          }`}
        >
          <div
            className={`w-12 h-8 rounded-full flex items-center justify-center transition-all ${
              active
                ? "bg-md-secondary-container text-md-on-secondary-container shadow-xs"
                : "group-hover:bg-md-on-surface/8"
            }`}
          >
            {typeof item.icon === "string" ? (
              <M3Icon
                name={item.icon}
                size={20}
                filled={active}
                className={
                  active
                    ? "text-md-on-secondary-container"
                    : "text-md-on-surface-variant group-hover:text-md-on-surface"
                }
              />
            ) : (
              item.icon
            )}
          </div>
          {item.badge !== undefined && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-md-primary ring-2 ring-md-surface-container-low" />
          )}
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => {
          if (onClose) onClose();
        }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-150 group ${
          active
            ? "bg-md-secondary-container text-md-on-secondary-container font-semibold shadow-xs"
            : "text-md-on-surface-variant hover:bg-md-on-surface/8 hover:text-md-on-surface"
        }`}
      >
        {typeof item.icon === "string" ? (
          <M3Icon
            name={item.icon}
            size={20}
            filled={active}
            className={
              active
                ? "text-md-on-secondary-container"
                : "text-md-on-surface-variant group-hover:text-md-on-surface"
            }
          />
        ) : (
          item.icon
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              active
                ? "bg-md-primary text-md-on-primary"
                : "bg-md-surface-container-highest text-md-on-surface-variant"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderContent = (isRailMode: boolean) => (
    <div
      className={`${
        isRailMode ? "w-20" : "w-72"
      } bg-md-surface-container-low flex flex-col h-full border-r border-md-outline-variant/30 select-none transition-all duration-300 ease-in-out overflow-x-hidden ${className}`}
    >
      {header && (
        <div
          className={`shrink-0 transition-all duration-200 ${
            isRailMode ? "p-3 flex flex-col items-center" : "p-4 pb-2"
          }`}
        >
          {header}
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto no-scrollbar transition-all duration-200 ${
          isRailMode ? "px-2 py-3 space-y-4" : "px-3 py-2 space-y-6"
        }`}
      >
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {section.title && !isRailMode && (
              <h4 className="px-4 py-1.5 text-[11px] font-semibold tracking-wider text-md-outline uppercase">
                {section.title}
              </h4>
            )}
            {section.title && isRailMode && sIdx > 0 && (
              <div className="w-8 mx-auto my-2 border-t border-md-outline-variant/30" />
            )}
            <div className={isRailMode ? "space-y-1.5" : "space-y-0.5"}>
              {section.items.map((item) =>
                renderItem(item, isCurrent(item.href), isRailMode)
              )}
            </div>
          </div>
        ))}
      </div>

      {footer && (
        <div
          className={`border-t border-md-outline-variant/30 shrink-0 transition-all duration-200 ${
            isRailMode ? "p-2 flex justify-center" : "p-3"
          }`}
        >
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent / Collapsible Drawer */}
      <aside
        className={`hidden lg:flex shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${desktopWidthClass}`}
        aria-hidden={isHidden}
      >
        {!isHidden && renderContent(isRail)}
      </aside>

      {/* Mobile Modal Drawer with Scrim */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          <div className="relative z-10 flex h-full animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
