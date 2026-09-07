import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Dialog,
  M3Badge,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function DepartmentsPage({ user }: { user: AuthUser }) {
  const { data: departments, isLoading, refetch } = useQuery(getDepartments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredDepts = (departments || []).filter((d) => {
    const q = searchQuery.toLowerCase();
    return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
  });

  const totalItems = filteredDepts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedDepts = filteredDepts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    if (!code.trim() || !name.trim()) {
      setErrorMsg("Kode dan Nama Jurusan wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      if (editingId) {
        await updateDepartment({
          id: editingId,
          code: code.trim(),
          name: name.trim(),
        });
      } else {
        await createDepartment({ code: code.trim(), name: name.trim() });
      }
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan jurusan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, deptName: string) => {
    if (!window.confirm(`Hapus konsentrasi keahlian "${deptName}"?`)) return;
    try {
      await deleteDepartment({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus jurusan.");
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary">
            Portal Sekolah
          </Link>
          <span>/</span>
          <span>Data Akademik</span>
          <span>/</span>
          <span className="text-md-on-surface font-medium">
            Konsentrasi Keahlian
          </span>
        </div>

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Jurusan &amp; Keahlian
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Daftar program keahlian dan jurusan sekolah.
            </p>
          </div>
          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={openAddModal}
          >
            Tambah Jurusan
          </M3Button>
        </div>

        {/* Search Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <M3TextField
                placeholder="Cari kode atau nama konsentrasi keahlian..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <M3Badge variant="secondary" size="md">
              {totalItems} Jurusan
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredDepts.length === 0 ? (
          <M3Banner
            variant="standard"
            headline={
              searchQuery
                ? "Jurusan Tidak Ditemukan"
                : "Belum Ada Data Jurusan"
            }
            supportingText={
              searchQuery
                ? "Tidak ada konsentrasi keahlian yang cocok dengan kata kunci pencarian Anda."
                : "Tambahkan konsentrasi keahlian pertama Anda untuk mulai mengelompokkan rombel kelas dan siswa."
            }
            actionLabel={searchQuery ? "Reset Pencarian" : "Tambah Jurusan Pertama"}
            onAction={searchQuery ? () => setSearchQuery("") : openAddModal}
            icon="domain"
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Kode</M3TableHead>
                  <M3TableHead>Nama Konsentrasi Keahlian</M3TableHead>
                  <M3TableHead>Rombel Kelas</M3TableHead>
                  <M3TableHead className="text-right">Aksi</M3TableHead>
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {paginatedDepts.map((dept) => (
                  <M3TableRow key={dept.id}>
                    <M3TableCell>
                      <M3Badge variant="primary" size="sm">
                        {dept.code}
                      </M3Badge>
                    </M3TableCell>
                    <M3TableCell>
                      <span className="font-semibold text-md-on-surface">
                        {dept.name}
                      </span>
                    </M3TableCell>
                    <M3TableCell>
                      <span className="text-xs text-md-on-surface-variant">
                        {dept._count?.classes || 0} Kelas Terdaftar
                      </span>
                    </M3TableCell>
                    <M3TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <M3Button
                          variant="icon"
                          size="icon-sm"
                          onClick={() => openEditModal(dept)}
                          title="Ubah Jurusan"
                        >
                          <M3Icon name="edit" size={18} className="text-md-on-surface-variant hover:text-md-primary" />
                        </M3Button>
                        <M3Button
                          variant="icon"
                          size="icon-sm"
                          onClick={() => handleDelete(dept.id, dept.name)}
                          title="Hapus Jurusan"
                        >
                          <M3Icon name="delete" size={18} className="text-md-on-surface-variant hover:text-md-error" />
                        </M3Button>
                      </div>
                    </M3TableCell>
                  </M3TableRow>
                ))}
              </M3TableBody>
            </M3Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} jurusan
                </p>
                <div className="flex items-center gap-1.5">
                  <M3Button
                    variant="tonal"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    icon="chevron_left"
                  >
                    Sebelumnya
                  </M3Button>
                  <span className="text-xs px-2 text-md-on-surface font-medium">
                    Hal {currentPage} / {totalPages}
                  </span>
                  <M3Button
                    variant="tonal"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    trailingIcon="chevron_right"
                  >
                    Selanjutnya
                  </M3Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialog Add / Edit */}
        <M3Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? "Edit Konsentrasi Keahlian" : "Tambah Jurusan Baru"}
          subtitle="Definisikan kode unik dan nama lengkap konsentrasi keahlian."
          icon={<M3Icon name="school" size={24} className="text-md-primary" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                Simpan Jurusan
              </M3Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <M3Banner
                variant="error"
                supportingText={errorMsg}
                dismissible
                onDismiss={() => setErrorMsg("")}
              />
            )}

            <M3TextField
              label="Kode Jurusan *"
              placeholder="Contoh: RPL, TKJ, DKV"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <M3TextField
              label="Nama Lengkap Jurusan *"
              placeholder="Contoh: Rekayasa Perangkat Lunak"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
