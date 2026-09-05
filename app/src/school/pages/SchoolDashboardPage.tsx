import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getSchoolInfo } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  Users,
  GraduationCap,
  Building2,
  MapPin,
  Briefcase,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function SchoolDashboardPage({ user }: { user: AuthUser }) {
  const { data: school, isLoading, error } = useQuery(getSchoolInfo);

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </SchoolLayout>
    );
  }

  const studentCount = school?.studentCount || 0;
  const studentQuota = school?.studentQuota || 100;
  const quotaPercentage = Math.min(100, Math.round((studentCount / studentQuota) * 100));

  return (
    <SchoolLayout user={user}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              SaaS Multi-Tenant Aktif
            </span>
            <h1 className="text-2xl md:text-3xl font-bold mt-2">
              {school?.name}
            </h1>
            <p className="text-indigo-100 text-sm mt-1">
              Pusat Kendali Terpadu Manajemen E-PKL, LMS Sekolah, dan Supervisi Akademik.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/school/import"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl text-sm shadow hover:bg-indigo-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Data Massal
            </Link>
          </div>
        </div>
      </div>

      {/* Quota & Subscription Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kapasitas Kuota Siswa
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {studentCount} / {studentQuota} Siswa ({quotaPercentage}% Terpakai)
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            Paket: {school?.tier || "FREE_TRIAL"}
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              quotaPercentage > 90 ? "bg-red-500" : "bg-indigo-600"
            }`}
            style={{ width: `${quotaPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Siswa</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {school?.studentCount || 0}
          </h3>
          <Link
            to="/school/students"
            className="text-xs text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1 mt-3 hover:underline"
          >
            Kelola Siswa <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Guru & Tendik</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {school?.teacherCount || 0}
          </h3>
          <Link
            to="/school/teachers"
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-1 mt-3 hover:underline"
          >
            Kelola Guru <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rombel Kelas</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {school?._count?.classRooms || 0}
          </h3>
          <Link
            to="/school/classes"
            className="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 mt-3 hover:underline"
          >
            Kelola Kelas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mitra DUDI</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {school?._count?.companies || 0}
          </h3>
          <Link
            to="/school/pkl/companies"
            className="text-xs text-purple-600 dark:text-purple-400 font-medium inline-flex items-center gap-1 mt-3 hover:underline"
          >
            Kelola DUDI <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Setup Checklist */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Langkah Memulai Sekolah
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/school/departments"
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">1. Tambah Jurusan</h3>
              <p className="text-xs text-slate-500 mt-1">
                Definisikan konsentrasi keahlian seperti RPL, TKJ, dll.
              </p>
            </div>
          </Link>

          <Link
            to="/school/classes"
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">2. Buat Rombel Kelas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Atur kelas tingkat 10, 11, 12 dan tetapkan wali kelas.
              </p>
            </div>
          </Link>

          <Link
            to="/school/import"
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">3. Import Data Massal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload CSV siswa & guru langsung dari format Dapodik/Excel.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </SchoolLayout>
  );
}
