import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { GraduationCap, Plus, Trash2, Edit3, X, AlertCircle } from "lucide-react";

export function DepartmentsPage({ user }: { user: AuthUser }) {
  const { data: departments, isLoading, refetch } = useQuery(getDepartments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (dept: { id: string; code: string; name: string }) => {
    setEditingId(dept.id);
    setCode(dept.code);
    setName(dept.name);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      if (editingId) {
        await updateDepartment({ id: editingId, code, name });
      } else {
        await createDepartment({ code, name });
      }
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan jurusan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus jurusan "${name}"?`)) return;
    try {
      await deleteDepartment({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus jurusan.");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Konsentrasi Keahlian / Jurusan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar kompetensi keahlian dan jurusan aktif di sekolah.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Jurusan
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : departments?.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Belum Ada Data Jurusan
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Tambahkan jurusan baru untuk mulai mengorganisasi rombel kelas dan siswa.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            Tambah Jurusan Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Jurusan</th>
                <th className="px-6 py-4">Jumlah Kelas</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {departments?.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {dept.code}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {dept._count?.classes || 0} Kelas
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingId ? "Edit Jurusan" : "Tambah Jurusan Baru"}
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
                  Kode Jurusan *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: RPL, TKJ, DKV"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Jurusan *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rekayasa Perangkat Lunak"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
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
