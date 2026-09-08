import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getSchoolStudents,
  getClassRooms,
  createStudent,
  updateStudent,
  deleteStudent,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
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

export function StudentsPage({ user }: { user: AuthUser }) {
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const canManage = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";

  const { data: students, isLoading, refetch } = useQuery(getSchoolStudents, {
    classRoomId: selectedClass === "ALL" ? undefined : selectedClass,
  });
  const { data: classes } = useQuery(getClassRooms);

  // CRUD Modal States
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nis, setNip] = useState("");
  const [nisn, setNisn] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [classRoomId, setClassRoomId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED" | "GRADUATED">("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Modal States
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");

  const handleOpenAddModal = () => {
    setModalMode("create");
    setSelectedStudentId(null);
    setName("");
    setNip("");
    setNisn("");
    setGender("L");
    setClassRoomId(selectedClass !== "ALL" ? selectedClass : "");
    setEmail("");
    setStatus("ACTIVE");
    setErrorMsg("");
  };

  const handleOpenEditModal = (s: any) => {
    setModalMode("edit");
    setSelectedStudentId(s.id);
    setName(s.name || s.username || "");
    setNip(s.studentProfile?.nis || "");
    setNisn(s.studentProfile?.nisn || "");
    setGender(s.studentProfile?.gender === "P" ? "P" : "L");
    setClassRoomId(s.classRoom?.id || "");
    setEmail(s.email || "");
    setStatus(
      (s.studentProfile?.status as "ACTIVE" | "SUSPENDED" | "GRADUATED") || "ACTIVE"
    );
    setErrorMsg("");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedStudentId(null);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama lengkap siswa wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createStudent({
          name: name.trim(),
          nis: nis.trim() || undefined,
          nisn: nisn.trim() || undefined,
          gender,
          classRoomId: classRoomId || undefined,
          email: email.trim() || undefined,
        });
        setSuccessMsg(`Siswa "${name.trim()}" berhasil ditambahkan.`);
      } else if (modalMode === "edit" && selectedStudentId) {
        await updateStudent({
          id: selectedStudentId,
          name: name.trim(),
          nis: nis.trim() || undefined,
          nisn: nisn.trim() || undefined,
          gender,
          classRoomId: classRoomId || undefined,
          email: email.trim() || undefined,
          status,
        });
        setSuccessMsg(`Data siswa "${name.trim()}" berhasil diperbarui.`);
      }
      handleCloseModal();
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data siswa.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMsg("");

    try {
      await deleteStudent({ id: studentToDelete.id });
      setSuccessMsg(
        `Siswa "${studentToDelete.name || studentToDelete.username}" berhasil dihapus.`
      );
      setStudentToDelete(null);
      await refetch();
    } catch (err: any) {
      setDeleteErrorMsg(err.message || "Gagal menghapus data siswa.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students?.filter((s) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(term);
    const nisMatch = s.studentProfile?.nis?.toLowerCase().includes(term);
    const nisnMatch = s.studentProfile?.nisn?.toLowerCase().includes(term);
    return nameMatch || nisMatch || nisnMatch;
  });

  const totalItems = filteredStudents?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedStudents = (filteredStudents || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const classFilterOptions = [
    { value: "ALL", label: "Semua Rombel Kelas" },
    ...(classes?.map((c) => ({
      value: c.id,
      label: `${c.name}${c.department ? ` (${c.department.code})` : ""}`,
    })) || []),
  ];

  const modalClassOptions = [
    { value: "", label: "Tanpa Kelas / Belum Ditentukan" },
    ...(classes?.map((c) => ({
      value: c.id,
      label: `${c.name}${c.department ? ` (${c.department.code})` : ""}`,
    })) || []),
  ];

  const genderOptions = [
    { value: "L", label: "Laki-laki (L)" },
    { value: "P", label: "Perempuan (P)" },
  ];

  const statusOptions = [
    { value: "ACTIVE", label: "Aktif (ACTIVE)" },
    { value: "SUSPENDED", label: "Diskors (SUSPENDED)" },
    { value: "GRADUATED", label: "Lulus (GRADUATED)" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Data Siswa
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Daftar siswa aktif, rombel kelas, dan status penempatan PKL.
            </p>
          </div>
          {canManage && (
          <div className="flex items-center gap-2">
            <M3Button
              variant="tonal"
              size="md"
              href="/school/import"
              icon="upload_file"
            >
              Import CSV
            </M3Button>
            <M3Button
              variant="filled"
              size="md"
              onClick={handleOpenAddModal}
              icon="add"
            >
              Tambah Siswa
            </M3Button>
          </div>
          )}
        </div>

        {/* Success Feedback Banner */}
        {successMsg && (
          <M3Banner
            variant="standard"
            supportingText={successMsg}
            dismissible
            onDismiss={() => setSuccessMsg("")}
          />
        )}

        {/* Search & Filter Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <M3TextField
                placeholder="Cari berdasarkan nama siswa, NIS, atau NISN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>

            <div className="w-full sm:w-60">
              <M3Select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                options={classFilterOptions}
                size="sm"
              />
            </div>

            <M3Badge variant="secondary" size="md">
              {totalItems} Siswa
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredStudents?.length === 0 ? (
          <div className="space-y-4">
            <M3Banner
              variant="standard"
              headline="Belum Ada Data Siswa"
              supportingText="Tambahkan data peserta didik secara manual atau upload file CSV dari Dapodik untuk memulai pendataan."
              actionLabel={canManage ? "Tambah Siswa Baru" : undefined}
              onAction={canManage ? handleOpenAddModal : undefined}
              icon="group"
              className="p-6"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Nama Siswa &amp; NIS/NISN</M3TableHead>
                  <M3TableHead>L/P</M3TableHead>
                  <M3TableHead>Rombel Kelas</M3TableHead>
                  <M3TableHead>Status Penempatan PKL</M3TableHead>
                  {canManage && <M3TableHead className="text-right">Aksi</M3TableHead>}
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {paginatedStudents.map((s) => {
                  const activePlacement = s.studentPlacements?.[0];
                  return (
                    <M3TableRow key={s.id}>
                      <M3TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-md-on-surface">
                            {s.name || s.username}
                          </span>
                          <span className="text-xs text-md-on-surface-variant font-mono">
                            NIS: {s.studentProfile?.nis || "-"} • NISN:{" "}
                            {s.studentProfile?.nisn || "-"}
                          </span>
                        </div>
                      </M3TableCell>

                      <M3TableCell>
                        <M3Badge
                          variant={
                            s.studentProfile?.gender === "P"
                              ? "tertiary"
                              : "primary"
                          }
                          size="sm"
                        >
                          {s.studentProfile?.gender || "L"}
                        </M3Badge>
                      </M3TableCell>

                      <M3TableCell>
                        {s.classRoom ? (
                          <M3Badge
                            variant="secondary"
                            size="sm"
                            icon={<M3Icon name="meeting_room" size={12} className="mr-1" />}
                          >
                            {s.classRoom.name}
                          </M3Badge>
                        ) : (
                          <span className="text-xs text-md-on-surface-variant italic">
                            Belum ada kelas
                          </span>
                        )}
                      </M3TableCell>

                      <M3TableCell>
                        {activePlacement ? (
                          <M3Badge
                            variant="success"
                            size="sm"
                            icon={<M3Icon name="apartment" size={12} className="mr-1" />}
                          >
                            {activePlacement.company?.name || "Mitra DUDI"}
                          </M3Badge>
                        ) : (
                          <M3Badge variant="outline" size="sm">
                            Belum Plotting
                          </M3Badge>
                        )}
                      </M3TableCell>

                      {canManage && (
                      <M3TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <M3Button
                            variant="tonal"
                            size="sm"
                            icon="edit"
                            onClick={() => handleOpenEditModal(s)}
                          >
                            Edit
                          </M3Button>
                          <M3Button
                            variant="text"
                            size="sm"
                            icon="delete"
                            className="!text-md-error hover:!bg-md-error-container/20"
                            onClick={() => {
                              setStudentToDelete(s);
                              setDeleteErrorMsg("");
                            }}
                          >
                            Hapus
                          </M3Button>
                        </div>
                      </M3TableCell>
                        )}
                    </M3TableRow>
                  );
                })}
              </M3TableBody>
            </M3Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} siswa
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

        {/* Dialog Modal Tambah / Edit Siswa */}
        <M3Dialog
          isOpen={modalMode !== null}
          onClose={handleCloseModal}
          title={modalMode === "create" ? "Tambah Siswa Baru" : "Edit Data Siswa"}
          subtitle={
            modalMode === "create"
              ? "Lengkapi biodata siswa dan penempatan rombel kelas."
              : "Perbarui identitas siswa, kelas, dan status keaktifan."
          }
          icon={<M3Icon name="school" size={24} className="text-md-primary" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                {modalMode === "create" ? "Simpan Siswa" : "Simpan Perubahan"}
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
              label="Nama Lengkap Siswa *"
              placeholder="Contoh: Rian Hidayat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3TextField
                label="NIS (Nomor Induk Siswa)"
                placeholder="Contoh: 23241005"
                value={nis}
                onChange={(e) => setNip(e.target.value)}
              />
              <M3TextField
                label="NISN (Nomor Induk Siswa Nasional)"
                placeholder="Contoh: 0081234567"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3Select
                label="Jenis Kelamin *"
                options={genderOptions}
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              />
              <M3Select
                label="Rombel Kelas"
                options={modalClassOptions}
                value={classRoomId}
                onChange={(e) => setClassRoomId(e.target.value)}
              />
            </div>

            <M3TextField
              label="Email Siswa (Opsional)"
              type="email"
              placeholder="Contoh: siswa@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {modalMode === "edit" && (
              <M3Select
                label="Status Siswa *"
                options={statusOptions}
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              />
            )}
          </form>
        </M3Dialog>

        {/* Dialog Modal Konfirmasi Hapus Siswa */}
        <M3Dialog
          isOpen={studentToDelete !== null}
          onClose={() => {
            if (!isDeleting) {
              setStudentToDelete(null);
              setDeleteErrorMsg("");
            }
          }}
          title="Hapus Data Siswa"
          subtitle="Konfirmasi penghapusan data peserta didik."
          icon={<M3Icon name="warning" size={24} className="text-md-error" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => {
                  setStudentToDelete(null);
                  setDeleteErrorMsg("");
                }}
                disabled={isDeleting}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
                className="!bg-md-error !text-md-on-error"
              >
                Hapus Siswa
              </M3Button>
            </>
          }
        >
          <div className="space-y-3">
            {deleteErrorMsg && (
              <M3Banner
                variant="error"
                supportingText={deleteErrorMsg}
                dismissible
                onDismiss={() => setDeleteErrorMsg("")}
              />
            )}
            <p className="text-sm text-md-on-surface">
              Apakah Anda yakin ingin menghapus siswa{" "}
              <strong>{studentToDelete?.name || studentToDelete?.username}</strong>?
            </p>
            <p className="text-xs text-md-on-surface-variant">
              Tindakan ini akan menghapus akun siswa dan seluruh profilnya. Siswa yang sedang dalam penempatan PKL aktif tidak dapat dihapus.
            </p>
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
