import { type AuthUser } from "wasp/auth";
import { useQuery, getWakaSupervisionData } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  ShieldCheck,
  CalendarCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  Building2,
  Image,
} from "lucide-react";

export function WakaKurikulumPage({ user }: { user: AuthUser }) {
  const { data: supervision, isLoading } = useQuery(getWakaSupervisionData);

  const todayFilled = supervision?.todayAgendasCount || 0;
  const totalCourses = supervision?.totalCoursesCount || 1;
  const complianceRate = Math.min(100, Math.round((todayFilled / totalCourses) * 100));

  return (
    <SchoolLayout user={user}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5" /> Portal Waka Kurikulum
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Supervisi KBM & Jurnal Mengajar Guru
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoring kepatuhan pengisian agenda mengajar dan presensi harian guru secara terpadu.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Kepatuhan KBM Hari Ini</span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {complianceRate}%
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {todayFilled} dari {totalCourses} ruang mapel terisi agenda
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Pengajar Aktif</span>
          <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {supervision?.teacherCompliance?.length || 0} Guru
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Terdaftar di sistem kurikulum</p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Mapel Terjadwal</span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalCourses} Mapel
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Lintas semua rombel kelas</p>
        </div>
      </div>

      {/* Teacher Compliance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Rekap Pengisian Agenda Mengajar Per Guru
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Nama Guru Pengampu</th>
                <th className="px-6 py-4">Jumlah Kelas Diampu</th>
                <th className="px-6 py-4">Agenda Terisi Hari Ini</th>
                <th className="px-6 py-4">Total Agenda Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {supervision?.teacherCompliance?.map((tc) => (
                <tr key={tc.teacherId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {tc.teacherName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {tc.totalCourses} Rombel
                  </td>
                  <td className="px-6 py-4">
                    {tc.todayAgendasFilled > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {tc.todayAgendasFilled} Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        Belum Terisi
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {tc.totalAgendasSemester} Agenda
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SchoolLayout>
  );
}
