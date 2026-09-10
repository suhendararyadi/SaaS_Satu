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
  Network,
  NotebookPen,
  Settings,
  ShieldCheck,
  TriangleAlert,
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
  account_tree: Network,
  groups: UsersRound,
  upload_file: Upload,
  menu_book: BookOpen,
  apartment: Building2,
  work: BriefcaseBusiness,
  edit_note: NotebookPen,
  monitor_heart: Activity,
  warning: TriangleAlert,
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

  const iconToneMap: Record<string, string> = {
    home: "bg-[#0A84FF]",
    corporate_fare: "bg-[#5E5CE6]",
    badge: "bg-[#30B0C7]",
    calendar_month: "bg-[#FF9F0A]",
    meeting_room: "bg-[#64D2FF]",
    account_tree: "bg-[#AF52DE] dark:bg-[#BF5AF2]",
    groups: "bg-[#34C759]",
    upload_file: "bg-[#0A84FF]",
    menu_book: "bg-[#5856D6]",
    apartment: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    work: "bg-[#FF9F0A]",
    edit_note: "bg-[#BF5AF2]",
    monitor_heart: "bg-[#FF375F]",
    warning: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    schedule: "bg-[#5E5CE6]",
    supervisor_account: "bg-[#30B0C7]",
    verified_user: "bg-[#34C759]",
    description: "bg-[#007AFF] dark:bg-[#0A84FF]",
    settings: "bg-[#AF52DE] dark:bg-[#BF5AF2]",
    location_on: "bg-[#FF453A]",
    school: "bg-[#0A84FF]",
  };

  const renderDrawerIcon = (icon: M3DrawerItem["icon"], active: boolean) => {
    const iconName = typeof icon === "string" ? icon : null;
    const tileTone = iconName ? (iconToneMap[iconName] ?? "bg-[#5E5CE6]") : "bg-[#5E5CE6]";
    const iconContent = (() => {
      if (iconName) {
        const SidebarIcon = sidebarIconMap[iconName];
        if (SidebarIcon) return <SidebarIcon size={15} strokeWidth={2} className="text-white" aria-hidden="true" />;
        return <M3Icon name={iconName} size={16} weight={300} className="text-white" />;
      }
      if (icon) return <span className="flex text-white">{icon}</span>;
      return <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />;
    })();

    return (
      <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,.18)] ${tileTone}`}>
        {iconContent}
      </span>
    );
  };

  const renderItem = (item: M3DrawerItem, active: boolean, rail: boolean) => {
    if (rail) {
      return (
        <Link key={item.href} to={item.href} title={item.label} onClick={onClose} aria-current={active ? "page" : undefined} className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors ${active ? "bg-md-primary" : "hover:bg-black/[.045] dark:hover:bg-white/[.065]"}`}>
          {renderDrawerIcon(item.icon, active)}
          {item.badge !== undefined && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-md-error" aria-label={`${item.badge}`} />}
        </Link>
      );
    }

    return (
      <Link key={item.href} to={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`mx-0.5 flex min-h-11 items-center gap-2.5 rounded-[9px] px-2 text-[14px] font-medium transition-colors lg:min-h-9 lg:text-[13px] ${active ? "bg-md-primary text-white shadow-[0_1px_2px_rgba(0,0,0,.10)]" : "text-md-on-surface hover:bg-black/[.045] dark:hover:bg-white/[.065]"}`}>
        <span className="flex size-[22px] shrink-0 items-center justify-center" aria-hidden="true">{renderDrawerIcon(item.icon, active)}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && <span className={`min-w-5 rounded-[6px] px-1.5 py-0.5 text-center text-[10px] font-semibold ${active ? "bg-white/20 text-white" : "bg-black/[.055] text-md-on-surface-variant dark:bg-white/[.08]"}`}>{item.badge}</span>}
      </Link>
    );
  };

  const renderContent = (rail: boolean) => (
    <div className={`${rail ? "w-[60px]" : "w-[min(86vw,300px)] lg:w-[240px]"} hig-sidebar-material flex h-full flex-col border-r border-md-outline-variant transition-all duration-200 ${className}`}>
      {header && <div className={`${rail ? "p-2.5" : "px-3 py-4"} shrink-0`}>{header}</div>}
      <div className={`${rail ? "space-y-2 px-1.5 py-2" : "space-y-3 px-2 py-1"} flex-1 overflow-y-auto`}>
        {sections.filter((section) => section.items.length > 0).map((section, index) => (
          <section key={`${section.title ?? "section"}-${index}`} className="space-y-1">
            {section.title && !rail && <h2 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/60">{section.title}</h2>}
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
