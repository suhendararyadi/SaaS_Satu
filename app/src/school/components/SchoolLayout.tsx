import { useState, type ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useLocation } from "react-router";
import { useQuery, registerSchool } from "wasp/client/operations";
import { getSchoolInfo } from "wasp/client/operations";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Briefcase,
  MapPin,
  ClipboardList,
  BookOpen,
  CalendarCheck,
  Award,
  ShieldCheck,
  Clock,
  FileText,
  Menu,
  X,
  School as SchoolIcon,
  ChevronRight,
  PlusCircle,
  Sparkles,
} from "lucide-react";

interface SchoolLayoutProps {
  user: AuthUser;
  children: ReactNode;
}

export function SchoolLayout({ user, children }: SchoolLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: school, isLoading, error, refetch } = useQuery(getSchoolInfo);

  // Onboarding modal state if user has no school
  const [isRegistering, setIsRegistering] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [regError, setRegError] = useState("");

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

  const navGroups = [
    {
      title: "Ringkasan",
      items: [
        { name: "Dashboard", href: "/school", icon: LayoutDashboard },
      ],
    },
    {
      title: "Data Akademik",
      items: [
        { name: "Jurusan", href: "/school/departments", icon: GraduationCap },
        { name: "Kelas / Rombel", href: "/school/classes", icon: Building2 },
        { name: "Tahun Ajaran", href: "/school/academic-years", icon: CalendarDays },
        { name: "Guru & Tendik", href: "/school/teachers", icon: UserCheck },
        { name: "Data Siswa", href: "/school/students", icon: Users },
        { name: "Import Massal CSV", href: "/school/import", icon: FileSpreadsheet },
      ],
    },
    {
      title: "E-PKL Terpadu",
      items: [
        { name: "DUDI / Industri", href: "/school/pkl/companies", icon: MapPin },
        { name: "Plotting Penempatan", href: "/school/pkl/placements", icon: Briefcase },
        { name: "Presensi GPS Siswa", href: "/school/pkl/attendance", icon: Clock },
        { name: "Jurnal Harian", href: "/school/pkl/journals", icon: ClipboardList },
        { name: "Monitoring & EWS", href: "/school/pkl/monitoring", icon: ShieldCheck },
      ],
    },
    {
      title: "Learning Management (LMS)",
      items: [
        { name: "Ruang Mapel", href: "/school/lms/courses", icon: BookOpen },
        { name: "Agenda KBM & Foto", href: "/school/lms/agendas", icon: CalendarCheck },
        { name: "Presensi Mapel", href: "/school/lms/attendance", icon: UserCheck },
        { name: "Materi & Tugas", href: "/school/lms/assignments", icon: ClipboardList },
        { name: "Ujian CBT Online", href: "/school/lms/cbt", icon: Award },
      ],
    },
    {
      title: "Tata Kelola Khusus",
      items: [
        { name: "Waka Kurikulum", href: "/school/governance/waka", icon: ShieldCheck },
        { name: "Guru Piket", href: "/school/governance/piket", icon: Clock },
        { name: "Wali Kelas", href: "/school/governance/walikelas", icon: UserCheck },
        { name: "Laporan & Cetak", href: "/school/reports", icon: FileText },
      ],
    },
  ];

  // If user has no school linked yet, show instant onboarding card
  if (!isLoading && (error || !school)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-6 shadow-inner">
            <SchoolIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Setup Unit Sekolah Anda
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">
            Selamat datang! Akun Anda belum terhubung ke unit sekolah. Daftarkan sekolah Anda sekarang untuk memulai sistem manajemen E-PKL & LMS modern.
          </p>

          {regError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {regError}
            </div>
          )}

          <form onSubmit={handleRegisterSchool} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Nama Sekolah (SMK / SMA / MA) *
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMKN 9 Garut"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                NPSN (Opsional)
              </label>
              <input
                type="text"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                placeholder="Contoh: 20209123"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Kota / Kabupaten (Opsional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Garut"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              {isRegistering ? "Memproses..." : "Daftarkan Sekolah Saya"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
            🏫
          </div>
          <span className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[200px]">
            {school?.name || "Smart School"}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* School Brand / Tenant Badge */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {school?.name ? school.name.charAt(0) : "S"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {school?.name || "Smart School"}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {school?.tier || "TRIAL"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Footer Card */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
              {user.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user.name || user.username || user.email}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
