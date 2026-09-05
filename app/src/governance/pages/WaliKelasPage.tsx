import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getHomeroomDashboardData } from "wasp/client/operations";
import { Link } from "react-router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Users,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export function WaliKelasPage({ user }: { user: AuthUser }) {
  const { data: homeroomClass, isLoading, error } = useQuery(getHomeroomDashboardData);

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex items-center justify-center p-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      </SchoolLayout>
    );
  }

  if (error || !homeroomClass) {
    return (
      <SchoolLayout user={user}>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Data Wali Kelas Belum Tersedia
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Anda belum ditugaskan sebagai Wali Kelas pada rombongan belajar aktif, atau belum ada data kelas yang terhubung dengan akun Anda.
          </p>
        </div>
      </SchoolLayout>
    );
  }

  const students = homeroomClass.students || [];
  const totalStudents = students.length;
  const activePklStudents = students.filter(
    (s: any) => s.studentPlacements && s.studentPlacements.length > 0
  ).length;

  return (
    <SchoolLayout user={user}>
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold tracking-wide uppercase">
                Dashboard Wali Kelas
              </span>
              <span className="px-3 py-1 bg-emerald-500/40 rounded-full text-xs font-semibold">
                {homeroomClass.academicYear?.yearName} - {homeroomClass.academicYear?.semester}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Kelas {homeroomClass.name}
            </h1>
            <p className="text-emerald-100 text-sm mt-1">
              Konsentrasi Keahlian: {homeroomClass.department?.name} ({homeroomClass.department?.code})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/school/reports"
              className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              Cetak Rekap Nilai & Presensi
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Siswa Rombel
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalStudents}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">Siswa Aktif</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Siswa Terplot PKL
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {activePklStudents}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              / {totalStudents} Siswa ({totalStudents > 0 ? Math.round((activePklStudents / totalStudents) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monitoring Presensi & Jurnal
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Sistem EWS Aktif
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Peringatan alfa & keterlambatan terpantau
            </p>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Siswa Bimbingan Rombel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Progres PKL, presensi terkini, dan aktivitas jurnal harian
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {students.length} Siswa Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama & Identitas Siswa</th>
                <th className="px-5 py-3.5">Penempatan PKL</th>
                <th className="px-5 py-3.5">Presensi Terkini</th>
                <th className="px-5 py-3.5">Jurnal Harian</th>
                <th className="px-5 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Belum ada data siswa di rombel ini.
                  </td>
                </tr>
              ) : (
                students.map((student: any) => {
                  const placement = student.studentPlacements?.[0];
                  const lastAttendance = placement?.attendances?.[0];
                  const lastJournal = placement?.journals?.[0];

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>NIS: {student.studentProfile?.nis || "-"}</span>
                          <span>•</span>
                          <span>NISN: {student.studentProfile?.nisn || "-"}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {placement ? (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                              {placement.company.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              PIC: {placement.company.picName || "-"} ({placement.company.picPhone || "-"})
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Belum Ditempatkan
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {lastAttendance ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                lastAttendance.status === "HADIR"
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {lastAttendance.status} ({lastAttendance.type})
                            </span>
                            <div className="text-xs text-slate-400">
                              {new Date(lastAttendance.timestamp).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Belum ada catatan</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {lastJournal ? (
                          <div className="max-w-xs">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                lastJournal.status === "APPROVED"
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {lastJournal.status} {lastJournal.score ? `(Nilai: ${lastJournal.score})` : ""}
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                              {lastJournal.activityDescription}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Belum ada jurnal</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to="/school/pkl/monitoring"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                        >
                          Monitoring
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </SchoolLayout>
  );
}
