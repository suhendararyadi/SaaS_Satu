import React, { useState, useEffect, type ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import { useLocation, useNavigate } from "react-router";
import {
  useQuery,
  registerSchool,
  getSchoolInfo,
  getAllSchools,
  switchActiveSchool,
} from "wasp/client/operations";
import {
  M3Button,
  M3Card,
  M3Dialog,
  M3Badge,
  M3TextField,
  M3Select,
  M3NavigationDrawer,
  M3TopAppBar,
  M3Icon,
  M3Banner,
  M3Text,
  type M3DrawerSection,
} from "../../client/components/m3";

interface SchoolLayoutProps {
  user: AuthUser;
  children: ReactNode;
}

export function SchoolLayout({ user, children }: SchoolLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: school, isLoading, error, refetch } = useQuery(getSchoolInfo);

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Desktop sidebar collapse / expand & hide state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("m3_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("m3_sidebar_hidden") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    if (isSidebarHidden) {
      setIsSidebarHidden(false);
      try {
        localStorage.setItem("m3_sidebar_hidden", "false");
      } catch {}
      return;
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("m3_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleSidebarHide = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("m3_sidebar_hidden", String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse/expand
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarHidden]);

  // Onboarding state
  const [isRegistering, setIsRegistering] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<"SD_MI" | "SMP_MTS" | "SMA_SMK">("SMA_SMK");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [regError, setRegError] = useState("");

  // Super admin school switcher
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const { data: allSchools } = useQuery(getAllSchools, undefined, {
    enabled: !!user?.isAdmin,
  });

  const handleSwitchSchool = async (targetSchoolId: string) => {
    if (targetSchoolId === school?.id) {
      setSwitcherOpen(false);
      return;
    }
    setIsSwitching(true);
    try {
      await switchActiveSchool({ schoolId: targetSchoolId });
      await refetch();
      setSwitcherOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Gagal beralih unit sekolah.");
    } finally {
      setIsSwitching(false);
    }
  };

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setRegError("Nama sekolah wajib diisi.");
      return;
    }
    setRegError("");
    setIsRegistering(true);
    try {
      await registerSchool({
        name: schoolName.trim(),
        level: schoolLevel,
        npsn: npsn.trim() || undefined,
        city: city.trim() || undefined,
      });
      await refetch();
    } catch (err: any) {
      setRegError(err.message || "Gagal mendaftarkan sekolah.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Dark mode state with sync to documentElement and body
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme") || localStorage.getItem("color-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
        localStorage.setItem("color-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  // If user has no school linked yet, show Google M3 onboarding card
  if (!isLoading && (error || !school)) {
    return (
      <div className="min-h-screen bg-md-background text-md-on-background flex items-center justify-center p-4">
        <M3Card variant="elevated" className="max-w-md w-full p-6 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-md-primary text-md-on-primary flex items-center justify-center shadow-elevation-1">
              <M3Icon name="school" size={24} />
            </div>
            <div>
              <h2 className="text-[20px] font-medium text-md-on-surface">
                Setup Unit Sekolah Anda
              </h2>
              <p className="text-xs text-md-on-surface-variant">
                Sistem Informasi Sekolah
              </p>
            </div>
          </div>

          <p className="text-sm text-md-on-surface-variant">
            Selamat datang! Akun Anda belum terhubung ke unit sekolah. Daftarkan
            sekolah Anda untuk mulai mengelola akademik, kelas, dan data siswa.
          </p>

          {regError && (
            <M3Banner
              variant="error"
              supportingText={regError}
              dismissible
              onDismiss={() => setRegError("")}
            />
          )}

          <form onSubmit={handleRegisterSchool} className="space-y-4">
            <M3TextField
              label="Nama Sekolah *"
              placeholder="Contoh: SDN 1 Bandung / SMPN 1 Jakarta / SMKN 9 Garut"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
            />

            <M3Select
              label="Jenjang / Jenis Sekolah *"
              value={schoolLevel}
              onChange={(e) => setSchoolLevel(e.target.value as "SD_MI" | "SMP_MTS" | "SMA_SMK")}
              options={[
                { label: "SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)", value: "SD_MI" },
                { label: "SMP / MTs (Sekolah Menengah Pertama / MTs)", value: "SMP_MTS" },
                { label: "SMA / SMK Sederajat (Menengah Atas / Kejuruan / MA)", value: "SMA_SMK" },
              ]}
              required
            />

            <M3TextField
              label="NPSN (Opsional)"
              placeholder="Contoh: 20209123"
              value={npsn}
              onChange={(e) => setNpsn(e.target.value)}
            />

            <M3TextField
              label="Kota / Kabupaten (Opsional)"
              placeholder="Contoh: Garut"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <M3Button
              type="submit"
              variant="filled"
              fullWidth
              isLoading={isRegistering}
              icon="school"
            >
              Daftarkan Sekolah Saya
            </M3Button>
          </form>
        </M3Card>
      </div>
    );
  }

  const isVocationalOrHighSchool = !school?.level || school?.level === "SMA_SMK";

  const academicItems = [
    {
      label: "Tahun Ajaran",
      href: "/school/academic-years",
      icon: "calendar_month",
    },
    ...(isVocationalOrHighSchool
      ? [
          {
            label: "Jurusan & Konsentrasi",
            href: "/school/departments",
            icon: "domain",
          },
        ]
      : []),
    {
      label: "Kelas & Rombel",
      href: "/school/classes",
      icon: "meeting_room",
    },
    {
      label: "Guru & Tendik",
      href: "/school/teachers",
      icon: "badge",
    },
    {
      label: "Data Siswa",
      href: "/school/students",
      icon: "groups",
    },
    {
      label: "Import Massal Data",
      href: "/school/import",
      icon: "upload_file",
    },
  ];

  const drawerSections: M3DrawerSection[] = [
    {
      title: "Ringkasan",
      items: [
        {
          label: "Dashboard",
          href: "/school",
          icon: "dashboard",
        },
      ],
    },
    {
      title: "Data Akademik",
      items: academicItems,
    },
    {
      title: "Pembelajaran LMS",
      items: [
        {
          label: "Ruang Kelas & Mapel",
          href: "/school/lms/courses",
          icon: "menu_book",
        },
      ],
    },
    ...(isVocationalOrHighSchool
      ? [
          {
            title: "E-PKL",
            items: [
              {
                label: "Mitra DUDI & Industri",
                href: "/school/pkl/companies",
                icon: "apartment",
              },
              {
                label: "Plotting Penempatan",
                href: "/school/pkl/placements",
                icon: "work",
              },
              {
                label: "Presensi GPS Siswa",
                href: "/school/pkl/attendance",
                icon: "schedule",
              },
              {
                label: "Jurnal Kegiatan Siswa",
                href: "/school/pkl/journals",
                icon: "edit_note",
              },
              {
                label: "Monitoring & Deteksi EWS",
                href: "/school/pkl/monitoring",
                icon: "warning",
              },
            ],
          },
        ]
      : []),
    {
      title: "Tata Kelola",
      items: [
        {
          label: "Guru Piket",
          href: "/school/governance/piket",
          icon: "access_time",
        },
        {
          label: "Wali Kelas",
          href: "/school/governance/walikelas",
          icon: "supervisor_account",
        },
        {
          label: "Waka Kurikulum",
          href: "/school/governance/waka",
          icon: "verified_user",
        },
      ],
    },
    {
      title: "Laporan",
      items: [
        {
          label: "Rekap & Cetak Laporan",
          href: "/school/reports",
          icon: "print",
        },
      ],
    },
    {
      title: "Pengaturan",
      items: [
        {
          label: "Pengaturan Sekolah",
          href: "/school/settings",
          icon: "settings",
        },
      ],
    },
  ];

  if (user?.isAdmin) {
    drawerSections.push({
      title: "Super Admin",
      items: [
        {
          label: "Organisasi Sekolah",
          href: "/school/admin/schools",
          icon: "corporate_fare",
        },
      ],
    });
  }

  const drawerHeader = (
    <div
      className={`flex items-center w-full ${
        isSidebarCollapsed ? "flex-col justify-center p-1" : "p-2"
      }`}
    >
      <div
        className={`flex items-center gap-3 min-w-0 w-full ${
          isSidebarCollapsed ? "flex-col justify-center cursor-pointer" : ""
        }`}
        onClick={() => isSidebarCollapsed && toggleSidebar()}
        title={isSidebarCollapsed ? "Klik untuk memperluas panel samping" : undefined}
      >
        <div className="w-10 h-10 rounded-[12px] bg-md-primary text-md-on-primary flex items-center justify-center font-bold text-base shadow-xs shrink-0 transition-transform active:scale-95">
          {school?.name ? school.name.charAt(0) : "S"}
        </div>
        {!isSidebarCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-md-on-surface truncate leading-tight">
              {school?.name || "Smart School"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-md-on-surface-variant truncate">
                {school?.city || "Indonesia"}
              </span>
              {school?.level && (
                <M3Badge variant="secondary" size="sm">
                  {school.level === "SD_MI"
                    ? "SD/MI"
                    : school.level === "SMP_MTS"
                    ? "SMP/MTs"
                    : "SMA/SMK"}
                </M3Badge>
              )}
              <M3Badge variant="secondary" size="sm">
                {school?.tier || "TRIAL"}
              </M3Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const drawerFooter = (
    <div
      className={`flex items-center gap-3 w-full transition-all duration-200 ${
        isSidebarCollapsed ? "flex-col justify-center p-1" : "p-1"
      }`}
      title={
        isSidebarCollapsed
          ? `${user.name || user.username || user.email} (${
              user.isAdmin ? "Super Admin" : "Staff Sekolah"
            })`
          : undefined
      }
    >
      <div className="w-9 h-9 rounded-full bg-md-secondary-container text-md-on-secondary-container font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
        {user.email ? user.email.charAt(0).toUpperCase() : "U"}
      </div>
      {!isSidebarCollapsed && (
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-xs font-semibold text-md-on-surface truncate">
            {user.name || user.username || user.email}
          </p>
          <p className="text-[11px] text-md-on-surface-variant truncate">
            {user.isAdmin ? "Super Administrator" : "Staff Sekolah"}
          </p>
        </div>
      )}
      {!isSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebarHide}
          className="hidden lg:flex p-1 rounded-full text-md-on-surface-variant hover:bg-md-on-surface/8 hover:text-md-on-surface transition-colors"
          title="Sembunyikan penuh panel samping"
          aria-label="Sembunyikan penuh panel samping"
        >
          <M3Icon name="visibility_off" size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-md-background text-md-on-background">
      {/* Google Material 3 Navigation Drawer */}
      <M3NavigationDrawer
        sections={drawerSections}
        header={drawerHeader}
        footer={drawerFooter}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        isCollapsed={isSidebarCollapsed}
        isHidden={isSidebarHidden}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Google Material 3 Top App Bar */}
        <M3TopAppBar
          leading={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileDrawerOpen(true);
                  } else {
                    toggleSidebar();
                  }
                }}
                className="p-2 rounded-full text-md-on-surface-variant hover:bg-md-on-surface/8 flex items-center justify-center transition-colors"
                aria-label={
                  isSidebarCollapsed || isSidebarHidden
                    ? "Perluas Panel Samping"
                    : "Sembunyikan / Ciutkan Panel Samping"
                }
                title={
                  isSidebarCollapsed || isSidebarHidden
                    ? "Perluas Panel Samping (Ctrl+B)"
                    : "Sembunyikan / Ciutkan Panel Samping (Ctrl+B)"
                }
              >
                <M3Icon
                  name={
                    isSidebarCollapsed || isSidebarHidden
                      ? "menu"
                      : "menu_open"
                  }
                  size={24}
                />
              </button>
            </div>
          }
          title={
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-base sm:text-lg">
                {school?.name || "Smart School Portal"}
              </span>
              {school?.level && (
                <M3Badge variant="secondary" size="sm" className="hidden sm:inline-flex">
                  {school.level === "SD_MI"
                    ? "SD / MI"
                    : school.level === "SMP_MTS"
                    ? "SMP / MTs"
                    : "SMA / SMK"}
                </M3Badge>
              )}
            </div>
          }
          actions={
            <>
              {user?.isAdmin && (
                <M3Button
                  variant="tonal"
                  size="sm"
                  icon="swap_horiz"
                  onClick={() => setSwitcherOpen(true)}
                >
                  <span className="hidden sm:inline">Ganti Sekolah</span>
                </M3Button>
              )}

              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-9 h-9 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-on-surface/8 hover:text-md-on-surface transition-colors"
                title={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
                aria-label={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              >
                {isDarkMode ? (
                  <M3Icon name="light_mode" size={20} />
                ) : (
                  <M3Icon name="dark_mode" size={20} />
                )}
              </button>

              <div className="w-8 h-8 rounded-full bg-md-primary text-md-on-primary font-semibold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
            </>
          }
        />

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Multi-Tenant School Switcher Dialog */}
      {user.isAdmin && (
        <M3Dialog
          isOpen={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          title="Beralih Unit Sekolah"
          subtitle="Pilih salah satu organisasi sekolah untuk melihat data dan beroperasi sebagai admin di unit tersebut."
          icon="corporate_fare"
          maxWidth="md"
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => {
                  setSwitcherOpen(false);
                  navigate("/school/admin/schools");
                }}
              >
                Kelola Semua Organisasi
              </M3Button>
              <M3Button
                variant="tonal"
                size="sm"
                onClick={() => setSwitcherOpen(false)}
              >
                Tutup
              </M3Button>
            </>
          }
        >
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {allSchools?.map((s: any) => {
              const isSelectedSchool = s.id === school?.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSwitchSchool(s.id)}
                  className={`p-3 rounded-[16px] border flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                    isSelectedSchool
                      ? "border-md-primary bg-md-primary-container/40"
                      : "border-md-outline-variant/50 hover:bg-md-on-surface/4"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-md-primary text-md-on-primary font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-md-on-surface truncate">
                          {s.name}
                        </p>
                        {isSelectedSchool && (
                          <M3Badge variant="primary" size="sm">
                            Aktif
                          </M3Badge>
                        )}
                      </div>
                      <p className="text-xs text-md-on-surface-variant truncate">
                        {s.city || "Indonesia"} • {s._count?.users || 0} Akun User • {s.tier}
                      </p>
                    </div>
                  </div>

                  <M3Button
                    variant={isSelectedSchool ? "filled" : "outlined"}
                    size="sm"
                    disabled={isSelectedSchool || isSwitching}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitchSchool(s.id);
                    }}
                  >
                    {isSelectedSchool ? "Sedang Aktif" : "Pilih Unit"}
                  </M3Button>
                </div>
              );
            })}
          </div>
        </M3Dialog>
      )}
    </div>
  );
}
