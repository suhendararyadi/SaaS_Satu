import React, { type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { M3Icon } from "./M3Icon";
import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  DoorOpen,
  FileText,
  GraduationCap,
  Home,
  MapPin,
  NotebookPen,
  Settings,
  ShieldCheck,
  Upload,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface M3DrawerItem { label: string; href: string; icon?: ReactNode | string; badge?: string | number; }
export interface M3DrawerSection { title?: string; items: M3DrawerItem[] }
export interface M3NavigationDrawerProps { sections: M3DrawerSection[]; header?: ReactNode; footer?: ReactNode; isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean; isHidden?: boolean; onToggleCollapse?: () => void; className?: string; }

const sidebarIconMap: Record<string, LucideIcon> = {
  home: Home,
  corporate_fare: Building2,
  badge: UserRoundCheck,
  calendar_month: CalendarDays,
  meeting_room: DoorOpen,
  groups: UsersRound,
  upload_file: Upload,
  menu_book: BookOpen,
  apartment: Building2,
  work: BriefcaseBusiness,
  edit_note: NotebookPen,
  monitor_heart: Activity,
  schedule: Clock3,
  supervisor_account: UserRoundCheck,
  verified_user: ShieldCheck,
  description: FileText,
  settings: Settings,
  location_on: MapPin,
  school: GraduationCap,
};

export function M3NavigationDrawer({ sections, header, footer, isOpen = true, onClose, isCollapsed = false, isHidden = false, className = "" }: M3NavigationDrawerProps) {
  const location = useLocation();
  const isCurrent = (href: string) => href === "/school" ? location.pathname === "/school" : location.pathname.startsWith(href);
  const isRail = isCollapsed && !isHidden;
  const desktopWidthClass = isHidden ? "w-0 opacity-0 pointer-events-none overflow-hidden" : isRail ? "w-[60px]" : "w-[240px]";

  const renderDrawerIcon = (icon: M3DrawerItem["icon"], active: boolean) => {
    const colorClass = active ? "text-md-primary" : "text-md-on-surface-variant/80";
    if (typeof icon === "string") {
      const SidebarIcon = sidebarIconMap[icon];
      if (SidebarIcon) return <SidebarIcon size={16} strokeWidth={1.8} className={colorClass} aria-hidden="true" />;
      return <M3Icon name={icon} size={17} weight={300} className={colorClass} />;
    }
    if (icon) return <span className={colorClass}>{icon}</span>;
    return <span className="size-1.5 rounded-full bg-md-on-surface-variant/35" aria-hidden="true" />;
  };

  const renderItem = (item: M3DrawerItem, active: boolean, rail: boolean) => {
    if (rail) {
      return (
        <Link key={item.href} to={item.href} title={item.label} onClick={onClose} aria-current={active ? "page" : undefined} className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors ${active ? "bg-md-primary-container/70" : "hover:bg-black/[.04] dark:hover:bg-white/[.055]"}`}>
          {renderDrawerIcon(item.icon, active)}
          {item.badge !== undefined && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-md-error" aria-label={`${item.badge}`} />}
        </Link>
      );
    }

    return (
      <Link key={item.href} to={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`mx-0.5 flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] font-medium transition-colors lg:min-h-8 lg:text-[13px] ${active ? "bg-md-primary-container/65 text-md-on-surface" : "text-md-on-surface hover:bg-black/[.04] dark:hover:bg-white/[.055]"}`}>
        <span className="flex size-[18px] shrink-0 items-center justify-center" aria-hidden="true">{renderDrawerIcon(item.icon, active)}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && <span className="min-w-5 rounded-[6px] bg-black/[.055] px-1.5 py-0.5 text-center text-[10px] font-semibold text-md-on-surface-variant dark:bg-white/[.08]">{item.badge}</span>}
      </Link>
    );
  };

  const renderContent = (rail: boolean) => (
    <div className={`${rail ? "w-[60px]" : "w-[min(86vw,300px)] lg:w-[240px]"} hig-sidebar-material flex h-full flex-col border-r border-md-outline-variant transition-all duration-200 ${className}`}>
      {header && <div className={`${rail ? "p-2.5" : "px-3 py-4"} shrink-0`}>{header}</div>}
      <div className={`${rail ? "space-y-2 px-1.5 py-2" : "space-y-4 px-2 py-1"} flex-1 overflow-y-auto`}>
        {sections.filter((section) => section.items.length > 0).map((section, index) => (
          <section key={`${section.title ?? "section"}-${index}`} className="space-y-1">
            {section.title && !rail && <h2 className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/65">{section.title}</h2>}
            {section.title && rail && index > 0 && <div className="mx-auto my-2 w-6 border-t border-md-outline-variant" />}
            <div className="space-y-0.5">{section.items.map((item) => renderItem(item, isCurrent(item.href), rail))}</div>
          </section>
        ))}
      </div>
      {footer && <div className={`${rail ? "p-2" : "p-3"} shrink-0 border-t border-md-outline-variant`}>{footer}</div>}
    </div>
  );

  return <>
    <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 transition-all duration-200 lg:flex ${desktopWidthClass}`} aria-hidden={isHidden}>{!isHidden && renderContent(isRail)}</aside>
    {isOpen && <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi"><button type="button" className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Tutup menu navigasi" /><div className="relative z-10 h-full">{renderContent(false)}</div></div>}
  </>;
}
