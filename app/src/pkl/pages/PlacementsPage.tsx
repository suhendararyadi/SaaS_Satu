import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getPlacements,
  getCompanies,
  getSchoolTeachers,
  getSchoolStudents,
  createPlacement,
  updatePlacement,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Briefcase,
  Plus,
  Users,
  MapPin,
  Calendar,
  UserCheck,
  CheckCircle,
  XCircle,
  X,
  Filter,
} from "lucide-react";

export function PlacementsPage({ user }: { user: AuthUser }) {
  const { data: placements, isLoading, refetch } = useQuery(getPlacements);
  const { data: companies } = useQuery(getCompanies);
  const { data: teachers } = useQuery(getSchoolTeachers);
  const { data: students } = useQuery(getSchoolStudents);

  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [teacherSupervisorId, setTeacherSupervisorId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter students who don't have active placement yet
  const unplacedStudents = students?.filter(
    (s) => !s.studentPlacements || s.studentPlacements.length === 0
  );

  const openAddModal = () => {
    setStudentId(unplacedStudents?.[0]?.id || "");
    setCompanyId(companies?.[0]?.id || "");
    setTeacherSupervisorId(teachers?.[0]?.id || "");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !companyId) {
      setErrorMsg("Siswa dan Perusahaan DUDI wajib dipilih.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await createPlacement({
        studentId,
        companyId,
        teacherSupervisorId: teacherSupervisorId || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal melakukan plotting penempatan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "ACTIVE" | "COMPLETED" | "CANCELED") => {
    try {
      await updatePlacement({ id, status: newStatus });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui status penempatan.");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Plotting & Penempatan PKL Siswa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Penugasan siswa ke perusahaan mitra DUDI dan guru pembimbing sekolah.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Plotting Siswa Baru
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : placements?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Data Penempatan Siswa
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Lakukan penempatan siswa ke perusahaan mitra untuk memulai pemantauan presensi dan jurnal.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            Plotting Siswa Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Siswa & Kelas</th>
                <th className="px-6 py-4">Mitra DUDI</th>
                <th className="px-6 py-4">Guru Pembimbing</th>
                <th className="px-6 py-4">Periode PKL</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {placements?.map((p) => {
                const sDate = new Date(p.startDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const eDate = new Date(p.endDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.student?.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {p.student?.classRoom?.name || "Kelas -"} • NIS:{" "}
                        {p.student?.studentProfile?.nis || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {p.company?.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">
                        {p.company?.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {p.teacherSupervisor?.name || (
                        <span className="text-amber-500 text-xs italic">Belum Ditugaskan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {sDate} s.d. {eDate}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : p.status === "COMPLETED"
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      {p.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(p.id, "COMPLETED")}
                            className="px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-medium"
                          >
                            Selesai
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id, "CANCELED")}
                            className="px-2.5 py-1 rounded text-xs bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 font-medium"
                          >
                            Batal
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add Placement */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Plotting Penempatan PKL Siswa
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
                  Pilih Siswa *
                </label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="">-- Pilih Siswa yang Belum Plotting --</option>
                  {unplacedStudents?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.classRoom?.name || "Tanpa Kelas"}) - NIS:{" "}
                      {s.studentProfile?.nis || "-"}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {unplacedStudents?.length || 0} siswa belum memiliki tempat penempatan aktif.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Mitra DUDI / Tempat PKL *
                </label>
                <select
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="">-- Pilih Perusahaan --</option>
                  {companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Sisa Kuota: {c.maxQuota - (c.placements?.length || 0)} siswa)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Guru Pembimbing Sekolah (Opsional)
                </label>
                <select
                  value={teacherSupervisorId}
                  onChange={(e) => setTeacherSupervisorId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                >
                  <option value="">-- Pilih Guru Pembimbing --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.email} {t.teacherProfile?.title ? `(${t.teacherProfile.title})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-mono"
                  />
                </div>
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
                  {submitting ? "Memproses..." : "Simpan Penempatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
