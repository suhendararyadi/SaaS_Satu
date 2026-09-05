import { type AuthUser } from "wasp/auth";
import { useQuery, getPklEwsAlerts } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  UserCheck,
  Building2,
  ArrowUpRight,
} from "lucide-react";

export function MonitoringEwsPage({ user }: { user: AuthUser }) {
  const { data: alerts, isLoading } = useQuery(getPklEwsAlerts);

  const highAlerts = alerts?.filter((a) => a.severity === "HIGH") || [];
  const mediumAlerts = alerts?.filter((a) => a.severity === "MEDIUM") || [];

  return (
    <SchoolLayout user={user}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Monitoring & Early Warning System (EWS) PKL
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Deteksi otomatis masalah presensi, ketidakhadiran berturut-turut, dan jurnal tertunda.
        </p>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Peringatan</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {alerts?.length || 0}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Siswa membutuhkan perhatian</p>
        </div>

        <div className="p-5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 shadow-sm">
          <p className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">
            Prioritas Tinggi (Kritis)
          </p>
          <h3 className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">
            {highAlerts.length}
          </h3>
          <p className="text-xs text-red-500/80 mt-1">Jurnal tertunda &gt; 3 hari / tanpa presensi</p>
        </div>

        <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
            Perhatian Sedang
          </p>
          <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {mediumAlerts.length}
          </h3>
          <p className="text-xs text-amber-500/80 mt-1">Presensi di luar radius DUDI</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : alerts?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Semua Aktivitas PKL Berjalan Baik
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Tidak ada anomali atau ketertundaan presensi/jurnal yang terdeteksi saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts?.map((item, idx) => {
            const isHigh = item.severity === "HIGH";

            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isHigh
                    ? "bg-white dark:bg-slate-900 border-l-4 border-l-red-500 border-slate-200 dark:border-slate-800"
                    : "bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        isHigh
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {item.issue}
                    </span>
                    <span className="text-xs text-slate-400">• {item.className}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {item.studentName}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {item.details}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {item.companyName}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      Pembimbing: <strong>{item.teacherName}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=Halo%20${encodeURIComponent(
                      item.studentName
                    )},%20mohon%20segera%20lengkapi%20presensi/jurnal%20PKL%20Anda.`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Hubungi Siswa
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SchoolLayout>
  );
}
