import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getAcademicYears,
  createAcademicYear,
  setActiveAcademicYear,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { CalendarDays, Plus, Check, X, Sparkles } from "lucide-react";

export function AcademicYearsPage({ user }: { user: AuthUser }) {
  const { data: years, isLoading, refetch } = useQuery(getAcademicYears);
  const [modalOpen, setModalOpen] = useState(false);
  const [yearName, setYearName] = useState("2026/2027");
  const [semester, setSemester] = useState<"GANJIL" | "GENAP">("GANJIL");
  const [isActive, setIsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await createAcademicYear({ yearName, semester, isActive });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat tahun ajaran.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (id: string, name: string) => {
    try {
      await setActiveAcademicYear({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal mengaktifkan tahun ajaran.");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tahun Ajaran & Semester
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Periode kalender akademik aktif untuk presensi dan LMS sekolah.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg("");
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Tahun Ajaran
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Tahun Ajaran</th>
                <th className="px-6 py-4">Semester</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Rombel Kelas</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {years?.map((y) => (
                <tr key={y.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {y.yearName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {y.semester}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {y.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <Check className="w-3.5 h-3.5" />
                        Aktif Sekarang
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Arsip
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {y._count?.classes || 0} Kelas
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!y.isActive && (
                      <button
                        onClick={() => handleSetActive(y.id, y.yearName)}
                        className="px-3 py-1.5 border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Jadikan Aktif
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add Year */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Tambah Tahun Ajaran
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Format Tahun (YYYY/YYYY) *
                </label>
                <input
                  type="text"
                  required
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Semester *
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as "GANJIL" | "GENAP")}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="GANJIL">GANJIL</option>
                  <option value="GENAP">GENAP</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <label htmlFor="isActiveCheck" className="text-sm text-slate-700 dark:text-slate-300">
                  Langsung aktifkan periode ini
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
