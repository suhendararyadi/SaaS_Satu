import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Clock,
  AlertTriangle,
  Plus,
  Users,
  CheckCircle2,
  FileText,
  Building2,
  ShieldCheck,
  Send,
} from "lucide-react";

export function GuruPiketPage({ user }: { user: AuthUser }) {
  const { data: dutyReports, isLoading, refetch } = useQuery(getDutyTeacherReports);
  const { data: homeroomClass } = useQuery(getHomeroomDashboardData);

  const [lateCount, setLateCount] = useState(0);
  const [dispensationCount, setDispensationCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmitDutyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    try {
      await createDutyTeacherReport({
        lateStudentsCount: Number(lateCount),
        dispensationsCount: Number(dispensationCount),
        notes: notes.trim() || null,
      });
      setSuccessMsg("Laporan piket harian berhasil dikirim!");
      setLateCount(0);
      setDispensationCount(0);
      setNotes("");
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim laporan piket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" /> Portal Piket & Tata Kelola
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Guru Piket & Wali Kelas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pencatatan kedisiplinan siswa terlambat, izin dispensasi, dan pemantauan rombel kelas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Guru Piket */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Input Laporan Piket Hari Ini
          </h3>

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitDutyReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Siswa Terlambat
              </label>
              <input
                type="number"
                min={0}
                required
                value={lateCount}
                onChange={(e) => setLateCount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Surat Dispensasi
              </label>
              <input
                type="number"
                min={0}
                required
                value={dispensationCount}
                onChange={(e) => setDispensationCount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Catatan Kejadian / Dispensasi (Opsional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catat nama siswa atau kejadian khusus hari ini..."
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Menyimpan..." : "Kirim Laporan Piket"}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Riwayat Catatan Guru Piket
          </h3>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : dutyReports?.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Belum ada riwayat laporan piket.
            </p>
          ) : (
            <div className="space-y-3">
              {dutyReports?.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 dark:text-white">
                      Piket: {r.dutyTeacher.name || r.dutyTeacher.email}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(r.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <span className="text-red-600 font-bold">
                      Terlambat: {r.lateStudentsCount} siswa
                    </span>
                    <span className="text-amber-600 font-bold">
                      Dispensasi: {r.dispensationsCount} surat
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-slate-600 dark:text-slate-400 pt-1 italic">
                      "{r.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Homeroom Overview Section (Wali Kelas) */}
      {homeroomClass && (
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Kelas Asuhan Saya
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Rombel: {homeroomClass.name} ({homeroomClass.department.name})
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total {homeroomClass.students.length} Siswa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {homeroomClass.students.map((s) => {
              const activePlacement = s.studentPlacements?.[0];
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                >
                  <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-slate-400">NIS: {s.studentProfile?.nis || "-"}</p>
                  <div className="pt-1">
                    {activePlacement ? (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        PKL: {activePlacement.company?.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum PKL</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
