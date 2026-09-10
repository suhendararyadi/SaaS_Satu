import React, { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import { useLocation, useNavigate } from "react-router";
import {
  useQuery,
  registerSchool,
  getSchoolInfo,
  getAllSchools,
  switchActiveSchool,
  getStudentDashboardData,
  getTeacherDashboardData,
} from "wasp/client/operations";
import {
  M3AccountMenu,
  M3Badge,
  M3BottomNavigation,
  M3Button,
  M3Card,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3NavigationDrawer,
  M3Select,
  M3TextField,
  M3TopAppBar,
  type M3BottomNavigationItem,
  type M3DrawerSection,
} from "../../client/components/m3";

interface SchoolLayoutProps { user: AuthUser; children: ReactNode }

const pageTitles: Array<[string, string]> = [
  ["/school/admin/schools", "Organisasi Sekolah"],
  ["/school/academic-years", "Tahun Ajaran"],
  ["/school/departments", "Jurusan & Konsentrasi"],
  ["/school/classes", "Kelas & Rombel"],
  ["/school/teachers", "Guru & Tendik"],
  ["/school/students", "Data Siswa"],
  ["/school/import", "Import Data"],
  ["/school/lms/courses", "Pembelajaran"],
  ["/school/pkl/companies", "Mitra DUDI"],
  ["/school/pkl/placements", "Penempatan PKL"],
  ["/school/pkl/attendance", "Presensi PKL"],
  ["/school/pkl/journals", "Jurnal PKL"],
  ["/school/pkl/monitoring", "Monitoring PKL"],
  ["/school/ews", "Early Warning System"],
  ["/school/governance/piket", "Guru Piket"],
  ["/school/governance/walikelas", "Wali Kelas"],
  ["/school/governance/waka", "Waka Kurikulum"],
  ["/school/reports", "Laporan"],
  ["/school/settings", "Pengaturan Sekolah"],
  ["/school", "Beranda"],
];

function getPageTitle(pathname: string) {
  return pageTitles.find(([path]) => path === "/school" ? pathname === path : pathname.startsWith(path))?.[1] ?? "Portal Sekolah";
}

function roleLabel(user: AuthUser) {
  if (user.isAdmin || user.role === "SUPERADMIN") return "Super Admin";
  if (user.role === "SCHOOL_ADMIN") return "Admin Sekolah";
  if (user.role === "TEACHER") return "Guru";
  if (user.role === "STUDENT") return "Siswa";
  if (user.role === "DUDI_MENTOR") return "Pembimbing DUDI";
  return "Pengguna";
}

function SchoolShellLoading() {
  return (
    <div className="min-h-screen bg-md-background p-4 sm:p-6" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-14 w-full animate-pulse rounded-[16px] bg-md-surface-container" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-[20px] bg-md-surface-container-low" />
          <div className="h-28 animate-pulse rounded-[20px] bg-md-surface-container-low" />
          <div className="h-28 animate-pulse rounded-[20px] bg-md-surface-container-low" />
        </div>
        <p className="text-sm text-md-on-surface-variant">Menyiapkan portal sekolah...</p>
      </div>
    </div>
  );
}

export function SchoolLayout({ user, children }: SchoolLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: school, isLoading, error, refetch } = useQuery(getSchoolInfo, undefined, { enabled: !!user.schoolId });
  const isPlatformAdmin = !!user.isAdmin || user.role === "SUPERADMIN";
  const isSchoolAdmin = isPlatformAdmin || user.role === "SCHOOL_ADMIN";
  const isTeacher = user.role === "TEACHER";
  const isStudent = user.role === "STUDENT";
  const isDudiMentor = user.role === "DUDI_MENTOR";

  const { data: teacherDashboard } = useQuery(getTeacherDashboardData, undefined, { enabled: isTeacher && !!user.schoolId });
  const { data: studentDashboard } = useQuery(getStudentDashboardData, undefined, { enabled: isStudent && !!user.schoolId });
  const { data: allSchools } = useQuery(getAllSchools, undefined, { enabled: isPlatformAdmin });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("v2_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<"SD_MI" | "SMP_MTS" | "SMA_SMK">("SMA_SMK");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [regError, setRegError] = useState("");

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("v2_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  };

  const handleRegisterSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolName.trim()) { setRegError("Nama sekolah wajib diisi."); return; }
    setRegError("");
    setIsRegistering(true);
    try {
      await registerSchool({ name: schoolName.trim(), level: schoolLevel, npsn: npsn.trim() || undefined, city: city.trim() || undefined });
      window.location.reload();
    } catch (err: any) {
      setRegError(err.message || "Sekolah belum berhasil didaftarkan. Periksa data lalu coba lagi.");
    } finally { setIsRegistering(false); }
  };

  const handleSwitchSchool = async (targetSchoolId: string) => {
    if (targetSchoolId === school?.id) { setSwitcherOpen(false); return; }
    setIsSwitching(true);
    try {
      await switchActiveSchool({ schoolId: targetSchoolId });
      setSwitcherOpen(false);
      window.location.assign("/school");
    } catch (err: any) {
      setRegError(err.message || "Unit sekolah belum berhasil dipilih.");
    } finally { setIsSwitching(false); }
  };

  if (!user.schoolId) {
    if (isPlatformAdmin) {
      return (
        <div className="min-h-screen bg-md-background p-4 sm:p-8">
          <M3Card variant="elevated" className="mx-auto mt-[12vh] max-w-xl">
            <M3EmptyState icon="corporate_fare" title="Pilih unit sekolah untuk mulai" description="Super Admin perlu memilih sekolah aktif sebelum membuka data tenant. Pengelolaan organisasi tetap tersedia dari panel Super Admin." actionLabel="Buka Organisasi Sekolah" actionHref="/school/admin/schools" />
          </M3Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-md-background p-4 sm:p-8">
        <M3Card variant="elevated" className="mx-auto mt-6 max-w-xl p-5 sm:mt-[7vh] sm:p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-[16px] bg-md-primary-container text-md-on-primary-container"><M3Icon name="school" size={25} /></div>
            <div><p className="v2-eyebrow">PENGATURAN AWAL</p><h1 className="mt-1 text-2xl font-extrabold text-md-on-surface">Hubungkan akun dengan sekolah</h1><p className="mt-2 text-sm leading-6 text-md-on-surface-variant">Isi identitas dasar sekolah. Tahun ajaran awal akan dibuat otomatis dan dapat disesuaikan setelah masuk.</p></div>
          </div>
          {regError && <div className="mb-4 rounded-[12px] bg-md-error-container p-3 text-sm font-medium text-md-on-error-container" role="alert">{regError}</div>}
          <form onSubmit={handleRegisterSchool} className="space-y-4">
            <M3TextField label="Nama sekolah" placeholder="Contoh: SMK Negeri 1 ..." value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required />
            <M3Select label="Jenjang sekolah" value={schoolLevel} onChange={(event) => setSchoolLevel(event.target.value as typeof schoolLevel)} options={[{ label: "SD / MI", value: "SD_MI" }, { label: "SMP / MTs", value: "SMP_MTS" }, { label: "SMA / SMK / MA", value: "SMA_SMK" }]} required />
            <div className="grid gap-4 sm:grid-cols-2"><M3TextField label="NPSN (opsional)" value={npsn} onChange={(event) => setNpsn(event.target.value)} /><M3TextField label="Kota / kabupaten (opsional)" value={city} onChange={(event) => setCity(event.target.value)} /></div>
            <M3Button type="submit" fullWidth isLoading={isRegistering} icon="school">Daftarkan sekolah</M3Button>
          </form>
        </M3Card>
      </div>
    );
  }

  if (isLoading) return <SchoolShellLoading />;
  if (error || !school) {
    return (
      <div className="min-h-screen bg-md-background p-4 sm:p-8">
        <M3Card variant="elevated" className="mx-auto mt-[10vh] max-w-xl">
          <M3EmptyState icon="cloud_off" title="Data sekolah belum dapat dimuat" description="Koneksi ke data sekolah mengalami kendala. Data tidak diubah. Coba muat ulang atau kembali beberapa saat lagi." actionLabel="Coba lagi" onAction={() => refetch()} secondary={<M3Button variant="text" href="/">Kembali ke beranda</M3Button>} />
        </M3Card>
      </div>
    );
  }

  const isVocationalOrHighSchool = !school.level || school.level === "SMA_SMK";
  const teacherHasPkl = !!teacherDashboard?.pkl;
  const studentHasPkl = !!studentDashboard?.pkl;

  const drawerSections: M3DrawerSection[] = (() => {
    const sections: M3DrawerSection[] = [{ title: "UTAMA", items: [{ label: "Beranda", href: "/school", icon: "home" }] }];
    if (isSchoolAdmin) {
      sections.push({ title: "AKADEMIK", items: [
        { label: "Tahun Ajaran", href: "/school/academic-years", icon: "calendar_month" },
        ...(isVocationalOrHighSchool ? [{ label: "Jurusan & Konsentrasi", href: "/school/departments", icon: "account_tree" }] : []),
        { label: "Kelas & Rombel", href: "/school/classes", icon: "meeting_room" },
        { label: "Guru & Tendik", href: "/school/teachers", icon: "badge" },
        { label: "Data Siswa", href: "/school/students", icon: "groups" },
        { label: "Import Data", href: "/school/import", icon: "upload_file" },
      ] });
      sections.push({ title: "PEMBELAJARAN", items: [{ label: "LMS & CBT", href: "/school/lms/courses", icon: "menu_book" }] });
      if (isVocationalOrHighSchool) sections.push({ title: "PKL", items: [
        { label: "Mitra DUDI", href: "/school/pkl/companies", icon: "apartment" },
        { label: "Penempatan", href: "/school/pkl/placements", icon: "work" },
        { label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" },
        { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" },
        { label: "Early Warning", href: "/school/ews", icon: "warning" },
      ] });
      sections.push({ title: "TATA KELOLA", items: [
        { label: "Guru Piket", href: "/school/governance/piket", icon: "schedule" },
        { label: "Wali Kelas", href: "/school/governance/walikelas", icon: "supervisor_account" },
        { label: "Waka Kurikulum", href: "/school/governance/waka", icon: "verified_user" },
        { label: "Laporan", href: "/school/reports", icon: "description" },
      ] });
      sections.push({ title: "SISTEM", items: [{ label: "Pengaturan Sekolah", href: "/school/settings", icon: "settings" }] });
    } else if (isTeacher) {
      sections.push({ title: "MENGAJAR", items: [
        { label: "Kelas & Mapel", href: "/school/lms/courses", icon: "menu_book" },
        { label: "Kelas & Rombel", href: "/school/classes", icon: "meeting_room" },
        { label: "Data Siswa", href: "/school/students", icon: "groups" },
      ] });
      if (teacherHasPkl) sections.push({ title: "PKL BIMBINGAN", items: [{ label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" }, { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" }, { label: "Early Warning", href: "/school/ews", icon: "warning" }] });
      const responsibilities = [
        ...(teacherDashboard?.assignments?.homeroomClass ? [{ label: `Wali ${teacherDashboard.assignments.homeroomClass.name}`, href: "/school/governance/walikelas", icon: "supervisor_account" }] : []),
        ...(teacherDashboard?.assignments?.isWaka ? [{ label: "Waka Kurikulum", href: "/school/governance/waka", icon: "verified_user" }] : []),
      ];
      if (responsibilities.length) sections.push({ title: "TANGGUNG JAWAB", items: responsibilities });
      sections.push({ title: "LAPORAN", items: [{ label: "Laporan Saya", href: "/school/reports", icon: "description" }] });
    } else if (isStudent) {
      sections.push({ title: "BELAJAR", items: [{ label: "Kelas & Mapel", href: "/school/lms/courses", icon: "menu_book" }] });
      if (studentHasPkl) sections.push({ title: "PKL SAYA", items: [{ label: "Presensi PKL", href: "/school/pkl/attendance", icon: "location_on" }, { label: "Jurnal Kegiatan", href: "/school/pkl/journals", icon: "edit_note" }] });
    } else if (isDudiMentor) {
      sections.push({ title: "PKL BIMBINGAN", items: [{ label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" }, { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" }, { label: "Early Warning", href: "/school/ews", icon: "warning" }] });
    }
    if (isPlatformAdmin) sections.push({ title: "SUPER ADMIN", items: [
      ...(user.isAdmin ? [{ label: "Dashboard Super Admin", href: "/admin", icon: "verified_user" }] : []),
      { label: "Organisasi Sekolah", href: "/school/admin/schools", icon: "corporate_fare" },
    ] });
    return sections;
  })();

  const bottomItems: M3BottomNavigationItem[] = (() => {
    if (isStudent) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "Kelas", href: "/school/lms/courses", icon: "menu_book" },
      ...(studentHasPkl ? [{ label: "PKL", href: "/school/pkl/journals", icon: "work" }] : []),
      { label: "Saya", href: "/account", icon: "person" },
    ];
    if (isTeacher) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "LMS", href: "/school/lms/courses", icon: "menu_book" },
      ...(teacherHasPkl ? [{ label: "PKL", href: "/school/pkl/journals", icon: "work" }] : []),
      { label: "Menu", icon: "menu", onClick: () => setMobileDrawerOpen(true) },
    ];
    if (isSchoolAdmin) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "Siswa", href: "/school/students", icon: "groups" },
      { label: "LMS", href: "/school/lms/courses", icon: "menu_book" },
      ...(isVocationalOrHighSchool ? [{ label: "PKL", href: "/school/pkl/placements", icon: "work" }] : []),
      { label: "Menu", icon: "menu", onClick: () => setMobileDrawerOpen(true) },
    ];
    return [{ label: "Beranda", href: "/school", icon: "home" }, { label: "Jurnal", href: "/school/pkl/journals", icon: "edit_note" }, { label: "Saya", href: "/account", icon: "person" }];
  })();

  const sidebarToggleLabel = isSidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar";
  const sidebarToggleButton = (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={sidebarToggleLabel}
      title={`${sidebarToggleLabel} (Ctrl+B)`}
      className="hidden size-8 shrink-0 items-center justify-center rounded-[9px] text-[#7D7D82] transition-colors hover:bg-black/[.055] hover:text-md-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40 dark:text-[#A9A9AF] dark:hover:bg-white/[.075] lg:inline-flex"
    >
      <PanelLeft size={21} strokeWidth={1.7} aria-hidden="true" />
    </button>
  );

  const drawerHeader = isSidebarCollapsed ? (
    <div className="flex flex-col items-center gap-2">
      <span
        className="flex size-10 items-center justify-center rounded-full bg-[#DDF3F5] text-[#287C83] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#173C40] dark:text-[#6CD6DE]"
        aria-label={school.name}
        title={school.name}
      >
        <M3Icon name="school" size={21} weight={300} />
      </span>
      {sidebarToggleButton}
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DDF3F5] text-[#287C83] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#173C40] dark:text-[#6CD6DE]"
        aria-hidden="true"
      >
        <M3Icon name="school" size={23} weight={300} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold leading-5 tracking-[-0.01em] text-md-on-surface" title={school.name}>{school.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] leading-4 text-md-on-surface-variant">
          {school.city ? `Unit sekolah aktif · ${school.city}` : "Unit sekolah aktif"}
        </p>
      </div>
      {sidebarToggleButton}
    </div>
  );

  const drawerFooter = (
    <div className={`${isSidebarCollapsed ? "flex justify-center" : "flex items-center gap-3"}`}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-md-surface-container-high text-[10.5px] font-semibold text-md-on-surface-variant">{(user.name || user.email || "U").charAt(0).toUpperCase()}</div>
      {!isSidebarCollapsed && <div className="min-w-0"><p className="truncate text-[12px] font-semibold text-md-on-surface">{user.name || user.username || user.email}</p><p className="text-[10.5px] text-md-on-surface-variant">{roleLabel(user)}</p></div>}
    </div>
  );

  const activeAcademicYear = school.activeAcademicYear;
  const topBarContext = [
    school.name,
    activeAcademicYear ? `${activeAcademicYear.yearName} · ${activeAcademicYear.semester === "GANJIL" ? "Semester Ganjil" : "Semester Genap"}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-md-background text-md-on-background">
      <div className="flex min-h-screen">
        <M3NavigationDrawer sections={drawerSections} header={drawerHeader} footer={drawerFooter} isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} isCollapsed={isSidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <M3TopAppBar
            leading={<M3Button variant="icon" size="icon-md" onClick={() => setMobileDrawerOpen(true)} aria-label="Buka navigasi" title="Buka navigasi" icon={<Menu size={18} strokeWidth={1.8} aria-hidden="true" />} className="text-md-on-surface-variant hover:text-md-on-surface lg:hidden" />}
            title={getPageTitle(location.pathname)}
            subtitle={topBarContext}
            actions={<>
              {isPlatformAdmin && <M3Button variant="text" size="sm" icon="swap_horiz" onClick={() => setSwitcherOpen(true)} className="hidden md:inline-flex text-md-on-surface-variant hover:text-md-on-surface">Ganti Sekolah</M3Button>}
              <M3Button variant="icon" size="icon-md" onClick={toggleDarkMode} aria-label={isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"} icon={isDarkMode ? "light_mode" : "dark_mode"} />
              <M3AccountMenu user={user} />
            </>}
          />
          <main className="v2-mobile-safe-bottom mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5 lg:px-7 lg:py-6" id="main-content">{children}</main>
        </div>
      </div>
      <M3BottomNavigation items={bottomItems.slice(0, 5)} />

      {isPlatformAdmin && (
        <M3Dialog isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Ganti unit sekolah" subtitle="Pilih sekolah aktif. Semua operasi berikutnya tetap mengikuti konteks tenant yang dipilih." icon="corporate_fare" maxWidth="md" actions={<M3Button variant="text" onClick={() => setSwitcherOpen(false)}>Tutup</M3Button>}>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {regError && <div className="rounded-[10px] bg-md-error-container p-3 text-[13px] text-md-on-error-container" role="alert">{regError}</div>}
            {allSchools?.map((item: any) => {
              const active = item.id === school.id;
              return <button key={item.id} type="button" disabled={active || isSwitching} onClick={() => handleSwitchSchool(item.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border p-2.5 text-left transition-colors ${active ? "border-md-primary/40 bg-md-primary-container/45" : "border-md-outline-variant hover:bg-md-surface-container-low"}`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-md-primary-container text-[11px] font-semibold text-md-primary">{item.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-md-on-surface">{item.name}</span><span className="block truncate text-[11px] text-md-on-surface-variant">{item.city || "Indonesia"}</span></span>
                {active && <M3Badge variant="primary" size="sm">Aktif</M3Badge>}
              </button>;
            })}
          </div>
        </M3Dialog>
      )}
    </div>
  );
}
