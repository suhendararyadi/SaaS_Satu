import React, { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeft, Search } from "lucide-react";
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
import { SchoolSpotlight } from "./SchoolSpotlight";
import { NotificationBell } from "./NotificationBell";
import { getSchoolCapabilities } from "../schoolCapabilities";
import { WAKASEK_ROLE_META, type WakasekRoleCode } from "../wakasek";
import { STAFF_ASSIGNMENT_META, type StaffAssignmentRoleCode } from "../staffAssignments";

interface SchoolLayoutProps { user: AuthUser; children: ReactNode }

const pageTitles: Array<[string, string]> = [
  ["/account", "Akun Siswa"],
  ["/school/admin/schools", "Organisasi Sekolah"],
  ["/school/website/preview", "Pratinjau Website"],
  ["/school/website", "Website Sekolah"],
  ["/school/academic-years", "Tahun Ajaran"],
  ["/school/departments", "Jurusan & Konsentrasi"],
  ["/school/classes", "Kelas & Rombel"],
  ["/school/teachers", "Guru & Tendik"],
  ["/school/notifications", "Notifikasi"],
  ["/school/student-affairs", "Kesiswaan Terpadu"],
  ["/school/students", "Data Siswa"],
  ["/school/attendance/command", "Command Center Kehadiran"],
  ["/school/attendance/settings", "Pengaturan Kehadiran"],
  ["/school/attendance/habituation", "Pembiasaan"],
  ["/school/attendance/audit", "Audit Kehadiran"],
  ["/school/my-attendance", "Kehadiran Saya"],
  ["/school/attendance", "Presensi Harian"],
  ["/school/import", "Import Data"],
  ["/school/lms/courses", "Pembelajaran"],
  ["/school/pkl/foundation", "Fondasi PKL"],
  ["/school/pkl/companies", "Mitra DUDI"],
  ["/school/pkl/placements", "Penempatan PKL"],
  ["/school/pkl/attendance", "Presensi PKL"],
  ["/school/pkl/journals", "Jurnal PKL"],
  ["/school/pkl/monitoring", "Monitoring PKL"],
  ["/school/ews", "EWS Terpadu"],
  ["/school/sarpras", "Sarpras & Inventaris"],
  ["/school/follow-up", "Tindak Lanjut"],
  ["/school/governance/organization", "Struktur & Penugasan"],
  ["/school/governance/piket", "Guru Piket"],
  ["/school/governance/walikelas", "Wali Kelas"],
  ["/school/governance/wakasek", "Panel Wakasek"],
  ["/school/governance/waka", "Panel Wakasek"],
  ["/school/reports", "Laporan"],
  ["/school/settings", "Pengaturan Sekolah"],
  ["/school", "Beranda"],
];

function getPageTitle(pathname: string) {
  return pageTitles.find(([path]) => path === "/school" ? pathname === path : pathname.startsWith(path))?.[1] ?? "Portal Sekolah";
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
  const [spotlightOpen, setSpotlightOpen] = useState(false);
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSpotlightOpen((current) => !current);
        return;
      }
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

  const { usesDepartments, usesPkl } = getSchoolCapabilities(school.level);
  const teacherHasPkl = usesPkl && !!teacherDashboard?.pkl;
  const studentHasPkl = usesPkl && !!studentDashboard?.pkl;
  const teacherHasEws = isTeacher && !!teacherDashboard && (
    !!teacherDashboard.assignments?.homeroomClass ||
    teacherHasPkl ||
    (teacherDashboard.assignments?.wakasekRoles?.length ?? 0) > 0 ||
    (teacherDashboard.assignments?.staffAssignments || []).some((assignment: any) =>
      assignment.role === "PRINCIPAL" || assignment.role === "DEPARTMENT_HEAD"
    )
  );
  const teacherHasAttendance = isTeacher && !!teacherDashboard && (
    !!teacherDashboard.assignments?.homeroomClass ||
    ((teacherDashboard.assignments?.wakasekRoles || []) as WakasekRoleCode[]).some((role) => role === "KESISWAAN" || role === "KURIKULUM") ||
    (teacherDashboard.assignments?.staffAssignments || []).some((assignment: any) => assignment.role === "PRINCIPAL" || assignment.role === "DUTY_TEACHER")
  );

  const drawerSections: M3DrawerSection[] = (() => {
    const sections: M3DrawerSection[] = [{ title: "UTAMA", items: [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "Notifikasi", href: "/school/notifications", icon: "notifications" },
    ] }];
    if (isSchoolAdmin) {
      sections.push({ title: "AKADEMIK", items: [
        { label: "Tahun Ajaran", href: "/school/academic-years", icon: "calendar_month" },
        ...(usesDepartments ? [{ label: "Jurusan & Konsentrasi", href: "/school/departments", icon: "account_tree" }] : []),
        { label: "Kelas & Rombel", href: "/school/classes", icon: "meeting_room" },
        { label: "Guru & Tendik", href: "/school/teachers", icon: "badge" },
        { label: "Data Siswa", href: "/school/students", icon: "groups" },
        { label: "Import Data", href: "/school/import", icon: "upload_file" },
      ] });
      sections.push({ title: "PEMBELAJARAN", items: [{ label: "LMS & CBT", href: "/school/lms/courses", icon: "menu_book" }] });
      sections.push({ title: "KEHADIRAN", items: [
        { label: "Command Center", href: "/school/attendance/command", icon: "monitoring" },
        { label: "Presensi Harian", href: "/school/attendance", icon: "fact_check" },
        { label: "Guru Piket", href: "/school/governance/piket", icon: "schedule" },
        { label: "Pembiasaan", href: "/school/attendance/habituation", icon: "self_improvement" },
        { label: "Audit Kehadiran", href: "/school/attendance/audit", icon: "history" },
        { label: "Pengaturan Kehadiran", href: "/school/attendance/settings", icon: "tune" },
      ] });
      if (usesPkl) sections.push({ title: "PKL", items: [
        { label: "Ringkasan PKL", href: "/school/pkl", icon: "dashboard" },
        { label: "Fondasi PKL", href: "/school/pkl/foundation", icon: "hub" },
        { label: "Mitra DUDI", href: "/school/pkl/companies", icon: "apartment" },
        { label: "Penempatan", href: "/school/pkl/placements", icon: "work" },
        { label: "Presensi PKL", href: "/school/pkl/attendance", icon: "location_on" },
        { label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" },
        { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" },
        { label: "Laporan PKL", href: "/school/pkl/reports", icon: "description" },
        { label: "Import PKL", href: "/school/pkl/import", icon: "upload_file" },
      ] });
      sections.push({ title: "PUBLIKASI", items: [
        { label: "Website Sekolah", href: "/school/website", icon: "language" },
      ] });
      sections.push({ title: "TATA KELOLA", items: [
        { label: "Struktur & Penugasan", href: "/school/governance/organization", icon: "account_tree" },
        { label: "Tindak Lanjut", href: "/school/follow-up", icon: "assignment_turned_in" },
        { label: "EWS Terpadu", href: "/school/ews", icon: "health_and_safety" },
        { label: "Kesiswaan Terpadu", href: "/school/student-affairs", icon: "school" },
        { label: "Sarpras & Inventaris", href: "/school/sarpras", icon: "inventory_2" },
        { label: "Panel Wakasek", href: "/school/governance/wakasek", icon: "verified_user" },
        { label: "Laporan", href: "/school/reports", icon: "description" },
      ] });
      sections.push({ title: "SISTEM", items: [{ label: "Pengaturan Sekolah", href: "/school/settings", icon: "settings" }] });
    } else if (isTeacher) {
      sections.push({ title: "MENGAJAR", items: [
        { label: "Kelas & Mapel", href: "/school/lms/courses", icon: "menu_book" },
        { label: "Kelas & Rombel", href: "/school/classes", icon: "meeting_room" },
        { label: "Data Siswa", href: "/school/students", icon: "groups" },
      ] });
      if (teacherHasPkl) sections.push({ title: "PKL BIMBINGAN", items: [
        { label: "Ringkasan PKL", href: "/school/pkl", icon: "dashboard" },
        { label: "Presensi Siswa", href: "/school/pkl/attendance", icon: "fact_check" },
        { label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" },
        { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" },
        { label: "Laporan PKL", href: "/school/pkl/reports", icon: "description" },
      ] });
      const responsibilities = [
        ...(teacherDashboard?.assignments?.homeroomClass ? [
          { label: `Presensi ${teacherDashboard.assignments.homeroomClass.name}`, href: "/school/attendance", icon: "fact_check" },
          { label: `Wali ${teacherDashboard.assignments.homeroomClass.name}`, href: "/school/governance/walikelas", icon: "supervisor_account" },
          { label: "Kesiswaan " + teacherDashboard.assignments.homeroomClass.name, href: "/school/student-affairs", icon: "school" },
        ] : []),
        ...(((teacherDashboard?.assignments?.wakasekRoles || []) as WakasekRoleCode[]).map((wakaRole) => ({
          label: WAKASEK_ROLE_META[wakaRole].label,
          href: "/school/governance/wakasek?role=" + wakaRole,
          icon: WAKASEK_ROLE_META[wakaRole].icon,
        }))),
        ...(((teacherDashboard?.assignments?.staffAssignments || []) as Array<{ id: string; role: StaffAssignmentRoleCode; displayTitle: string }>).map((assignment) => ({
          label: assignment.displayTitle || STAFF_ASSIGNMENT_META[assignment.role].label,
          href: assignment.role === "DUTY_TEACHER" ? "/school/governance/piket" : "/school/governance/organization",
          icon: STAFF_ASSIGNMENT_META[assignment.role].icon,
        }))),
      ];
      if (responsibilities.length) sections.push({ title: "TANGGUNG JAWAB", items: responsibilities });
      if (teacherHasAttendance) sections.push({ title: "KEHADIRAN", items: [
        { label: "Command Center", href: "/school/attendance/command", icon: "monitoring" },
        ...(teacherDashboard?.assignments?.homeroomClass ? [{ label: "Rekonsiliasi Wali Kelas", href: "/school/attendance", icon: "fact_check" }] : []),
        ...((teacherDashboard?.assignments?.staffAssignments || []).some((assignment: any) => assignment.role === "DUTY_TEACHER") ? [{ label: "Gate Console Piket", href: "/school/governance/piket", icon: "schedule" }] : []),
        { label: "Pembiasaan", href: "/school/attendance/habituation", icon: "self_improvement" },
        { label: "Audit Kehadiran", href: "/school/attendance/audit", icon: "history" },
      ] });
      sections.push({ title: "LAYANAN", items: [{ label: "Sarpras & Inventaris", href: "/school/sarpras", icon: "inventory_2" }] });
      sections.push({ title: "LAPORAN", items: [
        ...(teacherHasEws ? [{ label: "EWS Terpadu", href: "/school/ews", icon: "health_and_safety" }] : []),
        { label: "Laporan Saya", href: "/school/reports", icon: "description" },
      ] });
    } else if (isStudent) {
      sections.push({ title: "KEHADIRAN", items: [{ label: "Kehadiran Saya", href: "/school/my-attendance", icon: "fact_check" }] });
      sections.push({ title: "BELAJAR", items: [{ label: "Kelas & Mapel", href: "/school/lms/courses", icon: "menu_book" }] });
      if (studentHasPkl) sections.push({ title: "PKL SAYA", items: [
        { label: "Ringkasan PKL", href: "/school/pkl", icon: "dashboard" },
        { label: "Presensi PKL", href: "/school/pkl/attendance", icon: "location_on" },
        { label: "Jurnal Kegiatan", href: "/school/pkl/journals", icon: "edit_note" },
      ] });
    } else if (isDudiMentor) {
      sections.push({ title: "PKL BIMBINGAN", items: [
        { label: "Ringkasan PKL", href: "/school/pkl", icon: "dashboard" },
        { label: "Presensi Siswa", href: "/school/pkl/attendance", icon: "fact_check" },
        { label: "Jurnal Siswa", href: "/school/pkl/journals", icon: "edit_note" },
        { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" },
        { label: "Laporan PKL", href: "/school/pkl/reports", icon: "description" },
        { label: "EWS Terpadu", href: "/school/ews", icon: "health_and_safety" },
        { label: "Tindak Lanjut", href: "/school/follow-up", icon: "assignment_turned_in" },
      ] });
    }
    if (isPlatformAdmin) sections.push({ title: "SUPER ADMIN", items: [
      ...(user.isAdmin ? [{ label: "Dashboard Super Admin", href: "/admin", icon: "verified_user" }] : []),
      { label: "Organisasi Sekolah", href: "/school/admin/schools", icon: "corporate_fare" },
    ] });
    return sections;
  })();

  const spotlightMenuItems = drawerSections.flatMap((section) =>
    section.items
      .filter((item) => !!item.href)
      .map((item) => ({
        label: item.label,
        section: section.title || "MENU",
        href: item.href as string,
        icon: typeof item.icon === "string" ? item.icon : undefined,
      })),
  );

  const isStudentAttendancePage = isStudent && location.pathname.startsWith("/school/my-attendance");
  const bottomItems: M3BottomNavigationItem[] = (() => {
    if (isStudent) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "Presensi", href: "/school/my-attendance", icon: "fact_check" },
      { label: "Kelas", href: "/school/lms/courses", icon: "menu_book" },
      ...(studentHasPkl ? [{ label: "PKL", href: "/school/pkl", icon: "work" }] : []),
      { label: "Akun", href: "/account", icon: "person" },
    ];
    if (isTeacher) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "LMS", href: "/school/lms/courses", icon: "menu_book" },
      ...(teacherHasPkl ? [{ label: "PKL", href: "/school/pkl", icon: "work" }] : []),
      { label: "Menu", icon: "menu", onClick: () => setMobileDrawerOpen(true) },
    ];
    if (isSchoolAdmin) return [
      { label: "Beranda", href: "/school", icon: "home" },
      { label: "Siswa", href: "/school/students", icon: "groups" },
      { label: "LMS", href: "/school/lms/courses", icon: "menu_book" },
      ...(usesPkl ? [{ label: "PKL", href: "/school/pkl/placements", icon: "work" }] : []),
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
      <span className="flex size-10 items-center justify-center rounded-full bg-[#DDF3F5] text-[#287C83] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#173C40] dark:text-[#6CD6DE]" aria-label={school.name} title={school.name}>
        <M3Icon name="school" size={21} weight={300} />
      </span>
      {sidebarToggleButton}
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DDF3F5] text-[#287C83] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#173C40] dark:text-[#6CD6DE]" aria-hidden="true">
        <M3Icon name="school" size={23} weight={300} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold leading-5 tracking-[-0.01em] text-md-on-surface" title={school.name}>{school.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] leading-4 text-md-on-surface-variant">{school.city ? `Unit sekolah aktif · ${school.city}` : "Unit sekolah aktif"}</p>
      </div>
      {sidebarToggleButton}
    </div>
  );

  const activeAcademicYear = school.activeAcademicYear;
  const topBarContext = [school.name, activeAcademicYear ? `${activeAcademicYear.yearName} · ${activeAcademicYear.semester === "GANJIL" ? "Semester Ganjil" : "Semester Genap"}` : null].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-md-background text-md-on-background">
      <div className="flex min-h-screen">
        <M3NavigationDrawer sections={drawerSections} header={drawerHeader} isOpen={!isStudent && mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} isCollapsed={isSidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <M3TopAppBar
            className={isStudentAttendancePage ? "hidden lg:flex" : ""}
            leading={!isStudent ? <M3Button variant="icon" size="icon-md" onClick={() => setMobileDrawerOpen(true)} aria-label="Buka navigasi" title="Buka navigasi" icon={<Menu size={18} strokeWidth={1.8} aria-hidden="true" />} className="text-md-on-surface-variant hover:text-md-on-surface lg:hidden" /> : undefined}
            title={getPageTitle(location.pathname)}
            subtitle={topBarContext}
            actions={<>{isPlatformAdmin && <M3Button variant="text" size="sm" icon="swap_horiz" onClick={() => setSwitcherOpen(true)} className="hidden md:inline-flex text-md-on-surface-variant hover:text-md-on-surface">Ganti Sekolah</M3Button>}<button type="button" onClick={() => setSpotlightOpen(true)} aria-label="Buka Spotlight Search" title="Cari di School OS (⌘K)" className="inline-flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-md-on-surface-variant transition-colors hover:bg-black/[.055] hover:text-md-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/35 dark:hover:bg-white/[.075]"><Search size={17} strokeWidth={1.8} aria-hidden="true"/><span className="hidden text-[12.5px] font-medium md:inline">Cari</span><kbd className="hidden rounded-[6px] border border-black/[.08] bg-black/[.035] px-1.5 py-0.5 text-[10px] font-semibold text-md-on-surface-variant lg:inline dark:border-white/[.09] dark:bg-white/[.06]">⌘K</kbd></button><NotificationBell /><M3Button variant="icon" size="icon-md" onClick={toggleDarkMode} aria-label={isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"} icon={isDarkMode ? "light_mode" : "dark_mode"} /><M3AccountMenu user={user} /></>}
          />
          <main className={`v2-mobile-safe-bottom mx-auto w-full max-w-[1600px] flex-1 ${isStudentAttendancePage ? "px-3 pb-4 pt-3 sm:p-5 lg:px-7 lg:py-6" : "p-4 sm:p-5 lg:px-7 lg:py-6"}`} id="main-content">{children}</main>
        </div>
      </div>
      <M3BottomNavigation items={bottomItems.slice(0, 5)} floating={isStudent} />
      <SchoolSpotlight isOpen={spotlightOpen} onClose={() => setSpotlightOpen(false)} menuItems={spotlightMenuItems} />

      {isPlatformAdmin && (
        <M3Dialog isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Ganti unit sekolah" subtitle="Pilih sekolah aktif. Semua operasi berikutnya tetap mengikuti konteks tenant yang dipilih." icon="corporate_fare" maxWidth="md" actions={<M3Button variant="text" onClick={() => setSwitcherOpen(false)}>Tutup</M3Button>}>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {regError && <div className="rounded-[10px] bg-md-error-container p-3 text-[13px] text-md-on-error-container" role="alert">{regError}</div>}
            {allSchools?.map((item: any) => {
              const active = item.id === school.id;
              return <button key={item.id} type="button" disabled={active || isSwitching} onClick={() => handleSwitchSchool(item.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border p-2.5 text-left transition-colors ${active ? "border-md-primary/40 bg-md-primary-container/45" : "border-md-outline-variant hover:bg-md-surface-container-low"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-md-primary-container text-[11px] font-semibold text-md-primary">{item.name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-md-on-surface">{item.name}</span><span className="block truncate text-[11px] text-md-on-surface-variant">{item.city || "Indonesia"}</span></span>{active && <M3Badge variant="primary" size="sm">Aktif</M3Badge>}</button>;
            })}
          </div>
        </M3Dialog>
      )}
    </div>
  );
}
