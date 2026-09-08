import { type Dispatch, type SetStateAction, useState } from "react";
import { Link as ReactRouterLink } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { M3AccountMenu, M3Icon } from "../m3";
import { DarkModeSwitcher } from "../DarkModeSwitcher";

export interface NavigationItem { name: string; to: string }

export function NavBar({ navigationItems }: { navigationItems: NavigationItem[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-md-outline-variant/60 bg-md-surface/96">
      <nav className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Navigasi utama">
        <div className="flex min-w-0 items-center gap-7">
          <WaspRouterLink to={routes.LandingPageRoute.to} className="flex min-h-11 items-center gap-2.5 rounded-[12px] text-md-on-surface focus-visible:ring-2 focus-visible:ring-md-primary">
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-md-primary text-md-on-primary" aria-hidden="true"><M3Icon name="school" size={22} filled /></span>
            <span className="flex flex-col"><span className="text-sm font-extrabold leading-4">SaaS Satu</span><span className="hidden text-[10px] font-medium text-md-on-surface-variant sm:block">Smart School</span></span>
          </WaspRouterLink>
          <ul className="hidden items-center gap-1 lg:flex">{renderNavigationItems(navigationItems)}</ul>
        </div>
        <DesktopActions />
        <MobileMenu navigationItems={navigationItems} />
      </nav>
    </header>
  );
}

function DesktopActions() {
  const { data: user, isLoading } = useAuth();
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <DarkModeSwitcher />
      {!isLoading && !user && <WaspRouterLink to={routes.LoginRoute.to} className="flex min-h-11 items-center gap-2 rounded-[12px] bg-md-primary px-4 text-sm font-bold text-md-on-primary transition-colors hover:bg-md-primary/90"><M3Icon name="login" size={18} />Masuk</WaspRouterLink>}
      {!isLoading && user && <M3AccountMenu user={user} />}
    </div>
  );
}

function MobileMenu({ navigationItems }: { navigationItems: NavigationItem[] }) {
  const { data: user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><button type="button" className="flex size-11 items-center justify-center rounded-[14px] text-md-on-surface-variant hover:bg-md-surface-container-high" aria-label="Buka menu"><M3Icon name="menu" size={23} /></button></SheetTrigger>
        <SheetContent side="right" className="w-[min(88vw,340px)] border-md-outline-variant bg-md-surface p-5 text-md-on-surface">
          <SheetHeader><SheetTitle className="flex items-center gap-2.5 text-left"><span className="flex size-10 items-center justify-center rounded-[14px] bg-md-primary text-md-on-primary"><M3Icon name="school" size={22} /></span><span>SaaS Satu</span></SheetTitle></SheetHeader>
          <div className="mt-6 space-y-6">
            <ul className="space-y-1">{renderNavigationItems(navigationItems, setOpen)}</ul>
            <div className="border-t border-md-outline-variant/60 pt-4">
              {!isLoading && !user && <WaspRouterLink to={routes.LoginRoute.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-[12px] bg-md-primary px-4 text-sm font-bold text-md-on-primary"><M3Icon name="login" size={19} />Masuk ke portal</WaspRouterLink>}
              {!isLoading && user && <div className="space-y-2"><WaspRouterLink to={routes.SchoolDashboardRoute.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-[12px] bg-md-primary-container px-4 text-sm font-bold text-md-on-primary-container"><M3Icon name="dashboard" size={19} />Buka portal sekolah</WaspRouterLink><WaspRouterLink to={routes.AccountRoute.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-[12px] px-4 text-sm font-bold text-md-on-surface"><M3Icon name="person" size={19} />Akun saya</WaspRouterLink></div>}
            </div>
            <div className="border-t border-md-outline-variant/60 pt-4"><DarkModeSwitcher /></div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderNavigationItems(navigationItems: NavigationItem[], setOpen?: Dispatch<SetStateAction<boolean>>) {
  return navigationItems.map((item) => <li key={item.name}><ReactRouterLink to={item.to} onClick={setOpen ? () => setOpen(false) : undefined} className="flex min-h-11 items-center rounded-[12px] px-3 text-sm font-semibold text-md-on-surface-variant transition-colors hover:bg-md-surface-container-low hover:text-md-on-surface">{item.name}</ReactRouterLink></li>);
}
