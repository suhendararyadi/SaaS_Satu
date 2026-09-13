import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getSchoolStudents,
  getClassRooms,
  deleteStudent,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3Icon,
  M3Select,
  M3Table,
  M3TableBody,
  M3TableCell,
  M3TableHead,
  M3TableHeader,
  M3TableRow,
  M3TextField,
} from "../../client/components/m3";

export function StudentsPage({ user }: { user: AuthUser }) {
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("spotlight") ?? ""
      : "",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const pageSize = 10;

  const canManage =
    !!user.isAdmin ||
    user.role === "SUPERADMIN" ||
    user.role === "SCHOOL_ADMIN";

  const { data: students, isLoading, refetch } = useQuery(getSchoolStudents, {
    classRoomId: selectedClass === "ALL" ? undefined : selectedClass,
  });
  const { data: classes } = useQuery(getClassRooms);

  const filteredStudents = students?.filter((student) => {
    const term = searchTerm.trim().toLocaleLowerCase("id-ID");
    if (!term) return true;
    return [
      student.name,
      student.studentProfile?.nis,
      student.studentProfile?.nisn,
      student.studentProfile?.nik,
    ].some((value) => value?.toLocaleLowerCase("id-ID").includes(term));
  });

  const totalItems = filteredStudents?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedStudents = (filteredStudents || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const classFilterOptions = [
    { value: "ALL", label: "Semua Rombel Kelas" },
    ...(classes?.map((room) => ({
      value: room.id,
      label:
        room.name +
        (room.department ? " (" + room.department.code + ")" : ""),
    })) || []),
  ];

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMsg("");

    try {
      await deleteStudent({ id: studentToDelete.id });
      setSuccessMsg(
        'Siswa "' +
          (studentToDelete.name || studentToDelete.username) +
          '" berhasil dihapus.',
      );
      setStudentToDelete(null);
      await refetch();
    } catch (error: any) {
      setDeleteErrorMsg(error?.message || "Gagal menghapus data siswa.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
              Database Sekolah
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
              Data Siswa
            </h1>
            <p className="mt-1 text-xs text-md-on-surface-variant sm:text-sm">
              Database peserta didik berbasis struktur Dapodik, rombel, dan
              riwayat akademik sekolah.
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
                Import Dapodik
              </M3Button>
              <M3Button
                variant="filled"
                size="md"
                href="/school/students/new"
                icon="add"
              >
                Tambah Siswa
              </M3Button>
            </div>
          )}
        </div>

        {successMsg && (
          <M3Banner
            variant="success"
            supportingText={successMsg}
            dismissible
            onDismiss={() => setSuccessMsg("")}
          />
        )}

        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <div className="w-full flex-1">
              <M3TextField
                placeholder="Cari nama, NIPD/NIS, NISN, atau NIK..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <div className="w-full sm:w-64">
              <M3Select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
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

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <M3CircularProgress size={40} />
          </div>
        ) : totalItems === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum Ada Data Siswa"
            supportingText="Tambahkan peserta didik secara manual atau impor file Excel Daftar Peserta Didik dari Dapodik."
            actionLabel={canManage ? "Tambah Siswa" : undefined}
            onAction={
              canManage
                ? () => {
                    window.location.href = "/school/students/new";
                  }
                : undefined
            }
            icon="group"
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Peserta Didik</M3TableHead>
                  <M3TableHead>L/P</M3TableHead>
                  <M3TableHead>Rombel</M3TableHead>
                  <M3TableHead>Status PKL</M3TableHead>
                  <M3TableHead>Status</M3TableHead>
                  {canManage && (
                    <M3TableHead className="text-right">Aksi</M3TableHead>
                  )}
                </M3TableRow>
              </M3TableHeader>

              <M3TableBody>
                {paginatedStudents.map((student) => {
                  const activePlacement = student.studentPlacements?.[0];
                  const profile = student.studentProfile;
                  return (
                    <M3TableRow key={student.id}>
                      <M3TableCell>
                        <div className="flex min-w-[230px] flex-col">
                          <Link
                            to={"/school/students/" + student.id}
                            className="font-semibold text-md-on-surface hover:text-md-primary hover:underline"
                          >
                            {student.name || student.username}
                          </Link>
                          <span className="mt-0.5 font-mono text-[11px] text-md-on-surface-variant">
                            NIPD/NIS {profile?.nis || "—"} · NISN{" "}
                            {profile?.nisn || "—"}
                          </span>
                          {profile?.nik && (
                            <span className="font-mono text-[10.5px] text-md-on-surface-variant">
                              NIK {profile.nik}
                            </span>
                          )}
                        </div>
                      </M3TableCell>

                      <M3TableCell>
                        <M3Badge
                          variant={profile?.gender === "P" ? "tertiary" : "primary"}
                          size="sm"
                        >
                          {profile?.gender || "—"}
                        </M3Badge>
                      </M3TableCell>

                      <M3TableCell>
                        {student.classRoom ? (
                          <M3Badge variant="secondary" size="sm">
                            {student.classRoom.name}
                          </M3Badge>
                        ) : (
                          <span className="text-xs italic text-md-on-surface-variant">
                            Belum ada kelas
                          </span>
                        )}
                      </M3TableCell>

                      <M3TableCell>
                        {activePlacement ? (
                          <M3Badge variant="success" size="sm">
                            {activePlacement.company?.name || "Mitra DUDI"}
                          </M3Badge>
                        ) : (
                          <M3Badge variant="outline" size="sm">
                            Belum Plotting
                          </M3Badge>
                        )}
                      </M3TableCell>

                      <M3TableCell>
                        <M3Badge
                          variant={
                            profile?.status === "ACTIVE" ? "success" : "outline"
                          }
                          size="sm"
                        >
                          {profile?.status === "GRADUATED"
                            ? "Lulus"
                            : profile?.status === "SUSPENDED"
                              ? "Nonaktif"
                              : "Aktif"}
                        </M3Badge>
                      </M3TableCell>

                      {canManage && (
                        <M3TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <M3Button
                              variant="tonal"
                              size="sm"
                              icon="visibility"
                              href={"/school/students/" + student.id}
                            >
                              Detail
                            </M3Button>
                            <M3Button
                              variant="icon"
                              size="icon-sm"
                              icon="edit"
                              aria-label={
                                "Edit " + (student.name || student.username)
                              }
                              href={"/school/students/" + student.id + "/edit"}
                            />
                            <M3Button
                              variant="icon"
                              size="icon-sm"
                              icon="delete"
                              aria-label={
                                "Hapus " + (student.name || student.username)
                              }
                              className="!text-md-error"
                              onClick={() => {
                                setStudentToDelete(student);
                                setDeleteErrorMsg("");
                              }}
                            />
                          </div>
                        </M3TableCell>
                      )}
                    </M3TableRow>
                  );
                })}
              </M3TableBody>
            </M3Table>

            {totalPages > 1 && (
              <div className="flex flex-col gap-2 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1}–{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} siswa
                </p>
                <div className="flex items-center gap-1.5">
                  <M3Button
                    variant="tonal"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    icon="chevron_left"
                  >
                    Sebelumnya
                  </M3Button>
                  <span className="px-2 text-xs font-medium text-md-on-surface">
                    {currentPage} / {totalPages}
                  </span>
                  <M3Button
                    variant="tonal"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1),
                      )
                    }
                    trailingIcon="chevron_right"
                  >
                    Selanjutnya
                  </M3Button>
                </div>
              </div>
            )}
          </div>
        )}

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
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
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
              Hapus data{" "}
              <strong>{studentToDelete?.name || studentToDelete?.username}</strong>?
            </p>
            <p className="text-xs leading-5 text-md-on-surface-variant">
              Akun siswa dan profilnya akan dihapus. Siswa dengan penempatan PKL
              aktif tetap dilindungi dan tidak dapat dihapus.
            </p>
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
