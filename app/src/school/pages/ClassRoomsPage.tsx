import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getClassRooms,
  getDepartments,
  getAcademicYears,
  getSchoolTeachers,
  createClassRoom,
  deleteClassRoom,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { Building2, Plus, Trash2, Edit3, X, Users, Filter } from "lucide-react";

export function ClassRoomsPage({ user }: { user: AuthUser }) {
  const { data: classes, isLoading, refetch } = useQuery(getClassRooms);
  const { data: departments } = useQuery(getDepartments);
  const { data: academicYears } = useQuery(getAcademicYears);
  const { data: teachers } = useQuery(getSchoolTeachers);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(10);
  const [departmentId, setDepartmentId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<number | "ALL">("ALL");
  const [selectedDept, setSelectedDept] = useState<string | "ALL">("ALL");

  const openAddModal = () => {
    setName("");
    setGradeLevel(10);
    setDepartmentId(departments?.[0]?.id || "");
    const activeYear = academicYears?.find((y) => y.isActive);
    setAcademicYearId(activeYear?.id || academicYears?.[0]?.id || "");
    setHomeroomTeacherId("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !academicYearId) {
      setErrorMsg("Jurusan dan Tahun Ajaran wajib dipilih.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await createClassRoom({
        name,
        gradeLevel: Number(gradeLevel),
        departmentId,
        academicYearId,
        homeroomTeacherId: homeroomTeacherId || null,
      });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat kelas.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus rombel kelas "${name}"?`)) return;
    try {
      await deleteClassRoom({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kelas.");
    }
  };

  const filteredClasses = classes?.filter((c) => {
    if (selectedGrade !== "ALL" && c.gradeLevel !== selectedGrade) return false;
    if (selectedDept !== "ALL" && c.departmentId !== selectedDept) return false;
    return true;
  });

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Rombongan Belajar (Kelas)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar kelas aktif beserta wali kelas dan jumlah siswa terdaftar.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kelas
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Filter className="w-4 h-4" />
          Filter:
        </div>

        <select
          value={selectedGrade}
          onChange={(e) =>
            setSelectedGrade(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
          }
          className="px-3 py-1.5 border rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        >
          <option value="ALL">Semua Tingkat</option>
          <option value="10">Kelas 10</option>
          <option value="11">Kelas 11</option>
          <option value="12">Kelas 12</option>
        </select>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        >
          <option value="ALL">Semua Jurusan</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredClasses?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Data Kelas
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Tambahkan rombel kelas pertama Anda untuk menampung data siswa.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            Tambah Kelas Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses?.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-2">
                    Tingkat {c.gradeLevel} • {c.department.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {c.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Wali Kelas:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                    {c.homeroomTeacher?.name || "Belum ditentukan"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Jumlah Siswa:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {c._count?.students || 0} Siswa
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Class */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Tambah Rombel Kelas
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
                  Nama Rombel Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: XII RPL 1"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat / Grade *
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value={10}>Kelas 10</option>
                  <option value={11}>Kelas 11</option>
                  <option value={12}>Kelas 12</option>
                  <option value={13}>Kelas 13 (SMK 4 Tahun)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Jurusan *
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                >
                  <option value="">-- Pilih Jurusan --</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Ajaran *
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {academicYears?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.yearName} ({y.semester}) {y.isActive ? "• AKTIF" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Wali Kelas (Opsional)
                </label>
                <select
                  value={homeroomTeacherId}
                  onChange={(e) => setHomeroomTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.email} {t.teacherProfile?.title ? `(${t.teacherProfile.title})` : ""}
                    </option>
                  ))}
                </select>
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
