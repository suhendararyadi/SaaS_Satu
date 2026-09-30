import React from "react";
import { Link, useLocation } from "react-router";
import { M3Icon } from "./M3Icon";

export interface M3BottomNavigationItem { label: string; icon: string; href?: string; onClick?: () => void; }

export function M3BottomNavigation({ items, floating = false }: { items: M3BottomNavigationItem[]; floating?: boolean }) {
  const location = useLocation();
  if (!items.length) return null;
  const navClass = floating
    ? "fixed inset-x-3 bottom-2 z-40 rounded-[16px] border border-md-outline-variant bg-md-surface/92 shadow-[0_2px_10px_rgba(0,0,0,.10)] backdrop-blur-[22px] backdrop-saturate-[180%] lg:hidden"
    : "fixed inset-x-0 bottom-0 z-40 border-t border-md-outline-variant bg-md-surface/88 backdrop-blur-[22px] backdrop-saturate-[180%] lg:hidden";
  return <nav aria-label="Navigasi utama mobile" className={navClass} style={{ paddingBottom: floating ? "max(env(safe-area-inset-bottom), 4px)" : "env(safe-area-inset-bottom)" }}><div className={`mx-auto grid max-w-xl ${floating ? "gap-1 p-1.5" : ""}`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((item) => {
    const active = item.href ? (() => {
      const [itemPath, itemHash] = item.href.split("#");
      if (itemHash) return location.pathname === itemPath && location.hash === `#${itemHash}`;
      if (item.href === "/school") return location.pathname === item.href;
      if (item.href === "/school/my-attendance") return location.pathname === item.href && !location.hash;
      return location.pathname.startsWith(itemPath);
    })() : false;
    const content = <><span className={`flex h-8 min-w-11 items-center justify-center rounded-[10px] px-2.5 transition-colors ${active ? "bg-md-primary-container/75 text-md-primary shadow-[inset_0_0_0_1px_rgba(0,122,255,.08)]" : "text-md-on-surface-variant"}`}><M3Icon name={item.icon} size={23} filled={active} /></span><span className="max-w-full truncate leading-4">{item.label}</span></>;
    const className = `flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-[11.5px] font-semibold transition-colors active:scale-[.98] ${active ? "text-md-primary" : "text-md-on-surface-variant"}`;
    if (item.href) return <Link key={`${item.label}-${item.href}`} to={item.href} className={className} aria-current={active ? "page" : undefined}>{content}</Link>;
    return <button key={item.label} type="button" onClick={item.onClick} className={className}>{content}</button>;
  })}</div></nav>;
}
