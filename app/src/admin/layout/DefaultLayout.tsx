import { type ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Navigate, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  M3AccountMenu,
  M3Button,
  M3Icon,
  M3NavigationDrawer,
  M3TopAppBar,
  type M3DrawerSection,
} from "../../client/components/m3";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const adminPageTitles: Array<[string, string]> = [
  ["/admin/users", "Pengguna"],
  ["/admin/settings", "Pengaturan Platform"],
  ["/admin/calendar", "Kalender"],
  ["/admin/ui/buttons", "Komponen UI"],
  ["/admin", "Super Admin"],
];

function getAdminPageTitle(pathname: string) {
  return adminPageTitles.find(([path]) => path === "/admin" ? pathname === path : pathname.startsWith(path))?.[1] ?? "Super Admin";
}

export function DefaultLayout({ children, user }: Props) {
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const sections: M3DrawerSection[] = [
    {
      title: "PLATFORM",
      items: [
        { label: "Ringkasan", href: "/admin", icon: "home" },
        { label: "Pengguna", href: "/admin/users", icon: "groups" },
      ],
    },
    {
      title: "OPERASIONAL",
      items: [
        { label: "Kalender", href: "/admin/calendar", icon: "calendar_month" },
        { label: "Pengaturan", href: "/admin/settings", icon: "settings" },
      ],
    },
    {
      title: "SEKOLAH",
      items: [{ label: "Portal Sekolah", href: "/school", icon: "school" }],
    },
  ];

  const drawerHeader = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8E8F8] text-[#4F46A5] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#262447] dark:text-[#A7A5FF]">
        <M3Icon name="admin_panel_settings" size={21} weight={300} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold leading-5 tracking-[-0.01em] text-md-on-surface">Super Admin</p>
        <p className="mt-0.5 truncate text-[11px] leading-4 text-md-on-surface-variant">Kontrol platform SaaS Satu</p>
      </div>
    </div>
  );

  const displayName = user.name || user.username || user.email || "Admin";
  const drawerFooter = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-md-surface-container-high text-[10.5px] font-semibold text-md-on-surface-variant">
        {displayName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-md-on-surface">{displayName}</p>
        <p className="text-[10.5px] text-md-on-surface-variant">Administrator platform</p>
      </div>
    </div>
  );

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-md-background text-md-on-background">
      <div className="flex min-h-screen">
        <M3NavigationDrawer
          sections={sections}
          header={drawerHeader}
          footer={drawerFooter}
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <M3TopAppBar
            leading={
              <M3Button
                variant="icon"
                size="icon-md"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Buka navigasi"
                title="Buka navigasi"
                icon={<Menu size={18} strokeWidth={1.8} aria-hidden="true" />}
                className="text-md-on-surface-variant hover:text-md-on-surface lg:hidden"
              />
            }
            title={getAdminPageTitle(location.pathname)}
            subtitle="SaaS Satu · Kontrol platform"
            actions={
              <>
                <M3Button variant="text" size="sm" href="/school" icon="school" className="hidden sm:inline-flex">
                  Portal Sekolah
                </M3Button>
                <M3Button
                  variant="icon"
                  size="icon-md"
                  onClick={toggleDarkMode}
                  aria-label={isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}
                  title={isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}
                  icon={isDarkMode ? "light_mode" : "dark_mode"}
                />
                <M3AccountMenu user={user} />
              </>
            }
          />

          <main id="main-content" className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5 lg:px-7 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
