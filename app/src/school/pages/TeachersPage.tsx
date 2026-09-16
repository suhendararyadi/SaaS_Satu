import React, { useEffect, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getSchoolTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { WAKASEK_ROLES, WAKASEK_ROLE_META, type WakasekRoleCode } from "../wakasek";
import { STAFF_ASSIGNMENT_META, staffAssignmentDisplayTitle, type StaffAssignmentRoleCode } from "../staffAssignments";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Switch,
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

export function TeachersPage({ user }: { user: AuthUser }) {
  const { data: teachers, isLoading, refetch } = useQuery(getSchoolTeachers);
  const [searchTerm, setSearchTerm] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("spotlight") ?? "" : "");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const canManage = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";

  // CRUD Modal States
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"TEACHER" | "SCHOOL_ADMIN">("TEACHER");
  const [wakasekRoles, setWakasekRoles] = useState<WakasekRoleCode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Modal States
  const [teacherToDelete, setTeacherToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");

  const handleOpenAddModal = () => {
    setModalMode("create");
    setSelectedTeacherId(null);
    setName("");
    setNip("");
    setTitle("");
    setEmail("");
    setPhone("");
    setRole("TEACHER");
    setWakasekRoles([]);
    setErrorMsg("");
  };

  const handleOpenEditModal = (t: any) => {
    setModalMode("edit");
    setSelectedTeacherId(t.id);
    setName(t.name || "");
    setNip(t.teacherProfile?.nip || "");
    setTitle(t.teacherProfile?.title || "");
    setEmail(t.email || "");
    setPhone(t.teacherProfile?.phone || "");
    setRole(t.role === "SCHOOL_ADMIN" ? "SCHOOL_ADMIN" : "TEACHER");
    const assignedRoles = (t.wakasekAssignments || []).map((assignment: any) => assignment.role) as WakasekRoleCode[];
    setWakasekRoles(assignedRoles.length ? assignedRoles : t.teacherProfile?.isWaka ? ["KURIKULUM"] : []);
    setErrorMsg("");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedTeacherId(null);
    setErrorMsg("");
  };

  useEffect(() => {
    if (!canManage || !teachers?.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) return;
    const target = teachers.find((teacher) => teacher.id === editId);
    if (!target) return;
    handleOpenEditModal(target);
    params.delete("edit");
    const next = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (next ? "?" + next : ""),
    );
  }, [canManage, teachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama lengkap guru wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createTeacher({
          name: name.trim(),
          nip: nip.trim() || undefined,
          title: title.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          wakasekRoles,
        });
        setSuccessMsg(`Guru "${name.trim()}" berhasil ditambahkan.`);
      } else if (modalMode === "edit" && selectedTeacherId) {
        await updateTeacher({
          id: selectedTeacherId,
          name: name.trim(),
          nip: nip.trim() || undefined,
          title: title.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          wakasekRoles,
        });
        setSuccessMsg(`Data guru "${name.trim()}" berhasil diperbarui.`);
      }
      handleCloseModal();
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data guru.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMsg("");

    try {
      await deleteTeacher({ id: teacherToDelete.id });
      setSuccessMsg(`Guru "${teacherToDelete.name || teacherToDelete.email}" berhasil dihapus.`);
      setTeacherToDelete(null);
      await refetch();
    } catch (err: any) {
      setDeleteErrorMsg(err.message || "Gagal menghapus data guru.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTeachers = teachers?.filter((t) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(term);
    const emailMatch = t.email?.toLowerCase().includes(term);
    const nipMatch = t.teacherProfile?.nip?.toLowerCase().includes(term);
    return nameMatch || emailMatch || nipMatch;
  });

  const totalItems = filteredTeachers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedTeachers = (filteredTeachers || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const roleOptions = [
    { value: "TEACHER", label: "Guru Pengajar (TEACHER)" },
    { value: "SCHOOL_ADMIN", label: "Admin Sekolah (SCHOOL_ADMIN)" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Guru &amp; Tenaga Kependidikan
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Daftar guru pengajar dan staf kependidikan sekolah.
            </p>
          </div>
          {canManage && (
          <div className="flex items-center gap-2">
            <M3Button
              variant="tonal"
              size="md"
              href="/school/governance/organization"
              icon="account_tree"
            >
              Struktur & Penugasan
            </M3Button>
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
              Tambah Guru
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

        {/* Search Bar Card */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <M3TextField
                placeholder="Cari berdasarkan nama guru, email, atau NIP..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <M3Badge variant="secondary" size="md">
              {totalItems} PTK
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredTeachers?.length === 0 ? (
          <div className="space-y-4">
            <M3Banner
              variant="standard"
              headline="Belum Ada Data Guru & Tendik"
              supportingText="Tambahkan data guru secara manual atau upload file CSV dari Dapodik untuk memulai pengelolaan KBM."
              actionLabel={canManage ? "Tambah Guru Baru" : undefined}
              onAction={canManage ? handleOpenAddModal : undefined}
              icon="school"
              className="p-6"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Nama Lengkap &amp; NIP</M3TableHead>
                  <M3TableHead>Kontak</M3TableHead>
                  <M3TableHead>Penugasan Khusus</M3TableHead>
                  <M3TableHead>Peran Akun</M3TableHead>
                  {canManage && <M3TableHead className="text-right">Aksi</M3TableHead>}
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {paginatedTeachers.map((t) => (
                  <M3TableRow key={t.id}>
                    <M3TableCell>
                      <div className="flex flex-col">
                        <Link
                          to={"/school/teachers/" + t.id}
                          className="font-semibold text-md-on-surface hover:text-md-primary hover:underline"
                        >
                          {t.name || t.email}{" "}
                          {t.teacherProfile?.title && (
                            <span className="font-normal text-md-on-surface-variant">
                              {t.teacherProfile.title}
                            </span>
                          )}
                        </Link>
                        <span className="text-xs text-md-on-surface-variant font-mono">
                          NIP: {t.teacherProfile?.nip || "-"}
                        </span>
                      </div>
                    </M3TableCell>

                    <M3TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-md-on-surface-variant">
                        <div className="flex items-center gap-1.5">
                          <M3Icon name="mail" size={14} className="opacity-70" />
                          <span>{t.email || "-"}</span>
                        </div>
                        {t.teacherProfile?.phone && (
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="call" size={14} className="opacity-70" />
                            <span>{t.teacherProfile.phone}</span>
                          </div>
                        )}
                      </div>
                    </M3TableCell>

                    <M3TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {((t.wakasekAssignments?.length
                          ? t.wakasekAssignments.map((assignment: any) => assignment.role)
                          : t.teacherProfile?.isWaka
                            ? ["KURIKULUM"]
                            : []) as WakasekRoleCode[]).map((wakaRole) => (
                          <M3Badge
                            key={wakaRole}
                            variant="tertiary"
                            size="sm"
                            icon={<M3Icon name={WAKASEK_ROLE_META[wakaRole].icon} size={12} className="mr-1" />}
                          >
                            {WAKASEK_ROLE_META[wakaRole].shortLabel}
                          </M3Badge>
                        ))}
                        {t.homeroomClasses?.map((hc) => (
                          <M3Badge key={hc.id} variant="primary" size="sm">
                            Wali {hc.name}
                          </M3Badge>
                        ))}
                        {((t.staffAssignments || []) as Array<any>).map((assignment) => {
                          const role = assignment.role as StaffAssignmentRoleCode;
                          return (
                            <M3Badge
                              key={assignment.id}
                              variant="secondary"
                              size="sm"
                              icon={<M3Icon name={STAFF_ASSIGNMENT_META[role].icon} size={12} className="mr-1" />}
                            >
                              {staffAssignmentDisplayTitle({
                                role,
                                unitName: assignment.unitName,
                                customTitle: assignment.customTitle,
                                department: assignment.department,
                              })}
                            </M3Badge>
                          );
                        })}
                        {!(t.wakasekAssignments?.length || t.teacherProfile?.isWaka) &&
                          !(t.staffAssignments?.length) &&
                          (!t.homeroomClasses || t.homeroomClasses.length === 0) && (
                            <M3Badge variant="outline" size="sm">
                              Guru Mapel
                            </M3Badge>
                          )}
                      </div>
                    </M3TableCell>

                    <M3TableCell>
                      <M3Badge variant="secondary" size="sm">
                        {t.role}
                      </M3Badge>
                    </M3TableCell>

                    {canManage && (
                    <M3TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <M3Button
                          variant="tonal"
                          size="sm"
                          icon="visibility"
                          href={"/school/teachers/" + t.id}
                        >
                          Detail
                        </M3Button>
                        <M3Button
                          variant="icon"
                          size="icon-sm"
                          icon="edit"
                          aria-label={"Edit " + (t.name || t.email)}
                          onClick={() => handleOpenEditModal(t)}
                        />
                        <M3Button
                          variant="text"
                          size="sm"
                          icon="delete"
                          className="!text-md-error hover:!bg-md-error-container/20"
                          onClick={() => {
                            setTeacherToDelete(t);
                            setDeleteErrorMsg("");
                          }}
                        >
                          Hapus
                        </M3Button>
                      </div>
                    </M3TableCell>
                    )}
                  </M3TableRow>
                ))}
              </M3TableBody>
            </M3Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} guru
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

        {/* Dialog Modal Tambah / Edit Guru */}
        <M3Dialog
          isOpen={modalMode !== null}
          onClose={handleCloseModal}
          title={modalMode === "create" ? "Tambah Guru Baru" : "Edit Data Guru"}
          subtitle={
            modalMode === "create"
              ? "Lengkapi identitas guru, peran akun, dan penugasan."
              : "Perbarui data profil dan hak akses guru di sekolah."
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
                {modalMode === "create" ? "Simpan Guru" : "Simpan Perubahan"}
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
              label="Nama Lengkap *"
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3TextField
                label="Gelar Akademik"
                placeholder="Contoh: S.Pd., M.Kom."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <M3TextField
                label="NIP (Nomor Induk Pegawai)"
                placeholder="Contoh: 198501152010011002"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3TextField
                label="Email"
                type="email"
                placeholder="Contoh: guru@sekolah.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <M3TextField
                label="Nomor Telepon / WhatsApp"
                placeholder="Contoh: 081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <M3Select
              label="Peran Akun *"
              options={roleOptions}
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            />

            <div className="space-y-3 border-t border-md-outline-variant/40 pt-3">
              <div>
                <p className="text-sm font-semibold text-md-on-surface">Penugasan Wakasek</p>
                <p className="mt-0.5 text-xs leading-5 text-md-on-surface-variant">
                  Satu guru dapat memegang lebih dari satu bidang. Panel dan menu akan muncul otomatis sesuai penugasan.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {WAKASEK_ROLES.map((wakaRole) => {
                  const meta = WAKASEK_ROLE_META[wakaRole];
                  const checked = wakasekRoles.includes(wakaRole);
                  return (
                    <div key={wakaRole} className="rounded-[14px] border border-md-outline-variant/40 bg-md-surface-container-low/35 p-3">
                      <M3Switch
                        checked={checked}
                        onChange={(nextChecked) =>
                          setWakasekRoles((current) =>
                            nextChecked
                              ? current.includes(wakaRole)
                                ? current
                                : [...current, wakaRole]
                              : current.filter((roleCode) => roleCode !== wakaRole)
                          )
                        }
                        label={meta.label}
                      />
                      <p className="mt-1 pl-11 text-[11.5px] leading-5 text-md-on-surface-variant">
                        {meta.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Modal Konfirmasi Hapus Guru */}
        <M3Dialog
          isOpen={teacherToDelete !== null}
          onClose={() => {
            if (!isDeleting) {
              setTeacherToDelete(null);
              setDeleteErrorMsg("");
            }
          }}
          title="Hapus Data Guru"
          subtitle="Konfirmasi penghapusan data tenaga pendidik."
          icon={<M3Icon name="warning" size={24} className="text-md-error" />}
          actions={
            <>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => {
                  setTeacherToDelete(null);
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
                Hapus Guru
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
              Apakah Anda yakin ingin menghapus guru{" "}
              <strong>{teacherToDelete?.name || teacherToDelete?.email}</strong>?
            </p>
            <p className="text-xs text-md-on-surface-variant">
              Tindakan ini tidak dapat dibatalkan. Guru yang masih aktif mengampu mata pelajaran di LMS harus dialihkan terlebih dahulu.
            </p>
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
