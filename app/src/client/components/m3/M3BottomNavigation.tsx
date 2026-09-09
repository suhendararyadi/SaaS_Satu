import React from "react";
import { Link, useLocation } from "react-router";
import { M3Icon } from "./M3Icon";

export interface M3BottomNavigationItem { label: string; icon: string; href?: string; onClick?: () => void; }

export function M3BottomNavigation({ items }: { items: M3BottomNavigationItem[] }) {
  const location = useLocation();
  if (!items.length) return null;
  return <nav aria-label="Navigasi utama mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-md-outline-variant bg-md-surface/88 backdrop-blur-[22px] backdrop-saturate-[180%] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}><div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((item) => {
    const active = item.href ? (item.href === "/school" ? location.pathname === item.href : location.pathname.startsWith(item.href)) : false;
    const content = <><span className={`flex h-7 min-w-10 items-center justify-center px-2 transition-colors ${active ? "text-md-primary" : "text-md-on-surface-variant"}`}><M3Icon name={item.icon} size={22} filled={active} /></span><span className="max-w-full truncate">{item.label}</span></>;
    const className = `flex min-h-[62px] flex-col items-center justify-center gap-0.5 px-1 text-[10.5px] font-medium transition-colors ${active ? "text-md-primary" : "text-md-on-surface-variant"}`;
    if (item.href) return <Link key={`${item.label}-${item.href}`} to={item.href} className={className} aria-current={active ? "page" : undefined}>{content}</Link>;
    return <button key={item.label} type="button" onClick={item.onClick} className={className}>{content}</button>;
  })}</div></nav>;
}
