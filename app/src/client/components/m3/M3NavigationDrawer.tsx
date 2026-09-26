import React, { useMemo, useState, type ReactNode } from "react";
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
  Mail,
  MapPin,
  Network,
  NotebookPen,
  Search,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Upload,
  UserRoundCheck,
  UsersRound,
  X,
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
  mail: Mail,
};

export function M3NavigationDrawer({ sections, header, footer, isOpen = true, onClose, isCollapsed = false, isHidden = false, className = "" }: M3NavigationDrawerProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const isSchoolPortal = location.pathname === "/school" || location.pathname.startsWith("/school/");
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("id-ID");

  const visibleSections = useMemo(() => {
    if (!isSchoolPortal || !normalizedQuery) return sections;

    return sections
      .map((section) => {
        const sectionMatches = section.title?.toLocaleLowerCase("id-ID").includes(normalizedQuery) ?? false;
        return {
          ...section,
          items: sectionMatches
            ? section.items
            : section.items.filter((item) => item.label.toLocaleLowerCase("id-ID").includes(normalizedQuery)),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [isSchoolPortal, normalizedQuery, sections]);

  const isCurrent = (href: string) => {
    if (href === "/school" || href === "/admin") return location.pathname === href;
    return location.pathname.startsWith(href);
  };
  const isRail = isCollapsed && !isHidden;
  const desktopWidthClass = isHidden ? "w-0 opacity-0 pointer-events-none overflow-hidden" : isRail ? "w-[60px]" : "w-[240px]";

  const iconToneMap: Record<string, string> = {
    // Apple-inspired restrained system palette. Purple is intentionally not a fallback.
    home: "bg-[#007AFF] dark:bg-[#0A84FF]",
    dashboard: "bg-[#007AFF] dark:bg-[#0A84FF]",
    notifications: "bg-[#FF9500] dark:bg-[#FF9F0A]",

    // Academic master data.
    calendar_month: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    account_tree: "bg-[#5856D6] dark:bg-[#5E5CE6]",
    meeting_room: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    badge: "bg-[#30B0C7] dark:bg-[#40C8E0]",
    groups: "bg-[#34C759] dark:bg-[#30D158]",
    upload_file: "bg-[#8E8E93] dark:bg-[#98989D]",

    // Learning and attendance.
    play_circle: "bg-[#34C759] dark:bg-[#30D158]",
    menu_book: "bg-[#007AFF] dark:bg-[#0A84FF]",
    monitoring: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    fact_check: "bg-[#34C759] dark:bg-[#30D158]",
    schedule: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    self_improvement: "bg-[#30B0C7] dark:bg-[#40C8E0]",
    history: "bg-[#8E8E93] dark:bg-[#98989D]",
    tune: "bg-[#64748B] dark:bg-[#94A3B8]",

    // PKL and external activity.
    hub: "bg-[#5856D6] dark:bg-[#5E5CE6]",
    apartment: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    work: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    location_on: "bg-[#FF3B30] dark:bg-[#FF453A]",
    edit_note: "bg-[#A2845E] dark:bg-[#AC8E68]",
    monitor_heart: "bg-[#FF375F] dark:bg-[#FF375F]",
    description: "bg-[#64748B] dark:bg-[#94A3B8]",

    // Publication and administration.
    language: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    business_center: "bg-[#A2845E] dark:bg-[#AC8E68]",
    outbox: "bg-[#007AFF] dark:bg-[#0A84FF]",
    library_books: "bg-[#FF9500] dark:bg-[#FF9F0A]",

    // Governance and system.
    assignment_turned_in: "bg-[#34C759] dark:bg-[#30D158]",
    health_and_safety: "bg-[#FF3B30] dark:bg-[#FF453A]",
    school: "bg-[#007AFF] dark:bg-[#0A84FF]",
    inventory_2: "bg-[#A2845E] dark:bg-[#AC8E68]",
    verified_user: "bg-[#34C759] dark:bg-[#30D158]",
    supervisor_account: "bg-[#30B0C7] dark:bg-[#40C8E0]",
    settings: "bg-[#8E8E93] dark:bg-[#98989D]",
    corporate_fare: "bg-[#5856D6] dark:bg-[#5E5CE6]",

    // Other existing aliases.
    menu_book_legacy: "bg-[#007AFF] dark:bg-[#0A84FF]",
    warning: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    location_on_legacy: "bg-[#FF3B30] dark:bg-[#FF453A]",
    mail: "bg-[#32ADE6] dark:bg-[#64D2FF]",
    menu: "bg-[#8E8E93] dark:bg-[#98989D]",
    person: "bg-[#30B0C7] dark:bg-[#40C8E0]",
  };

  const renderDrawerIcon = (icon: M3DrawerItem["icon"], active: boolean) => {
    const iconName = typeof icon === "string" ? icon : null;
    const tileTone = iconName ? (iconToneMap[iconName] ?? "bg-[#8E8E93] dark:bg-[#98989D]") : "bg-[#8E8E93] dark:bg-[#98989D]";
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
      <span data-sidebar-icon={iconName ?? "custom"} className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,.18)] ${tileTone}`}>
        {iconContent}
      </span>
    );
  };

  const renderItem = (item: M3DrawerItem, active: boolean, rail: boolean) => {
    if (rail) {
      return (
        <Link key={item.href} to={item.href} title={item.label} onClick={onClose} aria-current={active ? "page" : undefined} className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-[9px] transition-[background-color,box-shadow] ${active ? "bg-[#007AFF]/[.10] shadow-[inset_0_0_0_1px_rgba(0,122,255,.08)] dark:bg-[#0A84FF]/[.18] dark:shadow-[inset_0_0_0_1px_rgba(10,132,255,.14)]" : "hover:bg-black/[.045] dark:hover:bg-white/[.065]"}`}>
          {renderDrawerIcon(item.icon, active)}
          {item.badge !== undefined && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-md-error" aria-label={`${item.badge}`} />}
        </Link>
      );
    }

    return (
      <Link key={item.href} to={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`mx-0.5 flex min-h-11 items-center gap-2.5 rounded-[9px] px-2 text-[14px] font-medium text-md-on-surface transition-[background-color,box-shadow] lg:min-h-9 lg:text-[13px] ${active ? "bg-[#007AFF]/[.10] shadow-[inset_0_0_0_1px_rgba(0,122,255,.07)] dark:bg-[#0A84FF]/[.18] dark:shadow-[inset_0_0_0_1px_rgba(10,132,255,.12)]" : "hover:bg-black/[.045] dark:hover:bg-white/[.065]"}`}>
        <span className="flex size-[22px] shrink-0 items-center justify-center" aria-hidden="true">{renderDrawerIcon(item.icon, active)}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && <span className={`min-w-5 rounded-[6px] px-1.5 py-0.5 text-center text-[10px] font-semibold ${active ? "bg-[#007AFF]/[.12] text-[#0066CC] dark:bg-[#0A84FF]/[.22] dark:text-[#8FC4FF]" : "bg-black/[.055] text-md-on-surface-variant dark:bg-white/[.08]"}`}>{item.badge}</span>}
      </Link>
    );
  };

  const renderContent = (rail: boolean) => (
    <div className={`${rail ? "w-[60px]" : "w-[min(86vw,300px)] lg:w-[240px]"} hig-sidebar-material flex h-full flex-col border-r border-md-outline-variant transition-all duration-200 ${className}`}>
      {header && <div className={`${rail ? "p-2.5" : "px-3 py-4"} shrink-0`}>{header}</div>}

      {isSchoolPortal && !rail && (
        <div className="shrink-0 px-2 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-md-on-surface-variant" strokeWidth={1.8} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari menu"
              aria-label="Cari menu sidebar"
              className="min-h-11 w-full rounded-[10px] border-0 bg-black/[.055] py-2 pl-9 pr-9 text-[13px] text-md-on-surface placeholder:text-md-on-surface-variant/75 focus:ring-2 focus:ring-md-primary/35 lg:min-h-9 dark:bg-white/[.08]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-md-on-surface-variant transition-colors hover:bg-black/[.06] hover:text-md-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40 dark:hover:bg-white/[.08]"
                aria-label="Hapus pencarian menu"
                title="Hapus pencarian"
              >
                <X size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`${rail ? "space-y-2 px-1.5 py-2" : "space-y-3 px-2 py-1"} flex-1 overflow-y-auto`}>
        {visibleSections.length > 0 ? visibleSections.filter((section) => section.items.length > 0).map((section, index) => (
          <section key={`${section.title ?? "section"}-${index}`} className="space-y-1">
            {section.title && !rail && <h2 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/60">{section.title}</h2>}
            {section.title && rail && index > 0 && <div className="mx-auto my-2 w-6 border-t border-md-outline-variant" />}
            <div className="space-y-0.5">{section.items.map((item) => renderItem(item, isCurrent(item.href), rail))}</div>
          </section>
        )) : !rail && isSchoolPortal && normalizedQuery ? (
          <p className="px-3 py-5 text-center text-[12px] leading-5 text-md-on-surface-variant" role="status">Menu tidak ditemukan.</p>
        ) : null}
      </div>

      {footer && !isSchoolPortal && <div className={`${rail ? "p-2" : "p-3"} shrink-0 border-t border-md-outline-variant`}>{footer}</div>}
    </div>
  );

  return <>
    <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 transition-all duration-200 lg:flex ${desktopWidthClass}`} aria-hidden={isHidden}>{!isHidden && renderContent(isRail)}</aside>
    {isOpen && <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi"><button type="button" className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Tutup menu navigasi" /><div className="relative z-10 h-full">{renderContent(false)}</div></div>}
  </>;
}
