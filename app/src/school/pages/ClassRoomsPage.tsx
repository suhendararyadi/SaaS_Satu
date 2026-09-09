import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getSchoolInfo,
  getClassRooms,
  getDepartments,
  getAcademicYears,
  getSchoolTeachers,
  createClassRoom,
  deleteClassRoom,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3TextField,
  M3Select,
  M3Dialog,
  M3Badge,
  M3CircularProgress,
  M3Banner,
  M3EmptyState,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function ClassRoomsPage({ user }: { user: AuthUser }) {
  const { data: school } = useQuery(getSchoolInfo);
  const { data: classes, isLoading, refetch } = useQuery(getClassRooms);
  const { data: departments } = useQuery(getDepartments);
  const { data: academicYears } = useQuery(getAcademicYears);
  const { data: teachers } = useQuery(getSchoolTeachers);

  const schoolLevel = school?.level || "SMA_SMK";
  const isVocationalOrHighSchool = schoolLevel === "SMA_SMK";
  const isElementary = schoolLevel === "SD_MI";
  const isJuniorHigh = schoolLevel === "SMP_MTS";

  const defaultGrade = isElementary ? "1" : isJuniorHigh ? "7" : "10";
  const canManage = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(defaultGrade);
  const [departmentId, setDepartmentId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    setGradeLevel(defaultGrade);
  }, [schoolLevel]);

  // Filters & Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const openAddModal = () => {
    setName("");
    setGradeLevel(defaultGrade);
    setDepartmentId(isVocationalOrHighSchool ? (departments?.[0]?.id || "") : "");
    const activeYear = academicYears?.find((y) => y.isActive);
    setAcademicYearId(activeYear?.id || academicYears?.[0]?.id || "");
    setHomeroomTeacherId("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama rombel kelas wajib diisi.");
      return;
    }
    if (!academicYearId) {
      setErrorMsg("Tahun Ajaran wajib dipilih.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await createClassRoom({
        name: name.trim(),
        gradeLevel: Number(gradeLevel),
        departmentId: isVocationalOrHighSchool && departmentId ? departmentId : undefined,
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

  const handleDelete = async (id: string, className: string) => {
    if (!window.confirm(`Hapus rombel kelas "${className}"?`)) return;
    try {
      await deleteClassRoom({ id });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kelas.");
    }
  };

  const filteredClasses = classes?.filter((c) => {
    if (selectedGrade !== "ALL" && String(c.gradeLevel) !== selectedGrade)
      return false;
    if (isVocationalOrHighSchool && selectedDept !== "ALL" && c.departmentId !== selectedDept)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDept =
        c.department?.name?.toLowerCase().includes(q) ||
        c.department?.code?.toLowerCase().includes(q);
      return matchName || matchDept;
    }
    return true;
  });

  const totalItems = filteredClasses?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedClasses = (filteredClasses || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const departmentOptions = [
    { value: "ALL", label: "Semua Jurusan" },
    ...(departments?.map((d) => ({
      value: d.id,
      label: `${d.code} - ${d.name}`,
    })) || []),
  ];

  const modalDepartmentOptions = [
    { value: "", label: "Tanpa Jurusan / Umum (Fase E)" },
    ...(departments?.map((d) => ({
      value: d.id,
      label: `${d.code} - ${d.name}`,
    })) || []),
  ];

  const gradeOptions = isElementary
    ? [
        { value: "ALL", label: "Semua Tingkat" },
        { value: "1", label: "Kelas 1" },
        { value: "2", label: "Kelas 2" },
        { value: "3", label: "Kelas 3" },
        { value: "4", label: "Kelas 4" },
        { value: "5", label: "Kelas 5" },
        { value: "6", label: "Kelas 6" },
      ]
    : isJuniorHigh
    ? [
        { value: "ALL", label: "Semua Tingkat" },
        { value: "7", label: "Kelas 7" },
        { value: "8", label: "Kelas 8" },
        { value: "9", label: "Kelas 9" },
      ]
    : [
        { value: "ALL", label: "Semua Tingkat" },
        { value: "10", label: "Kelas 10" },
        { value: "11", label: "Kelas 11" },
        { value: "12", label: "Kelas 12" },
        { value: "13", label: "Kelas 13 (SMK 4 Tahun)" },
      ];

  const modalGradeOptions = isElementary
    ? [
        { value: "1", label: "Kelas 1" },
        { value: "2", label: "Kelas 2" },
        { value: "3", label: "Kelas 3" },
        { value: "4", label: "Kelas 4" },
        { value: "5", label: "Kelas 5" },
        { value: "6", label: "Kelas 6" },
      ]
    : isJuniorHigh
    ? [
        { value: "7", label: "Kelas 7" },
        { value: "8", label: "Kelas 8" },
        { value: "9", label: "Kelas 9" },
      ]
    : [
        { value: "10", label: "Kelas 10" },
        { value: "11", label: "Kelas 11" },
        { value: "12", label: "Kelas 12" },
        { value: "13", label: "Kelas 13 (SMK 4 Tahun)" },
      ];

  const academicYearOptions = [
    ...(academicYears?.map((y) => ({
      value: y.id,
      label: `${y.yearName} (${y.semester})${y.isActive ? " • AKTIF" : ""}`,
    })) || []),
  ];

  const teacherOptions = [
    { value: "", label: "Belum Ditentukan" },
    ...(teachers?.map((t) => ({
      value: t.id,
      label: `${t.name || t.email} ${
        t.teacherProfile?.title ? `(${t.teacherProfile.title})` : ""
      }`,
    })) || []),
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Kelas &amp; Rombel
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Daftar kelas rombel dan penugasan wali kelas.
            </p>
          </div>
          {canManage && (
          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={openAddModal}
          >
            Tambah Rombel
          </M3Button>
          )}
        </div>

        {/* Filter Controls Card */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <M3TextField
                placeholder="Cari nama kelas atau jurusan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon={<M3Icon name="search" size={18} />}
                size="sm"
              />
            </div>

            <div className="w-full sm:w-44">
              <M3Select
                options={gradeOptions}
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
              />
            </div>

            {isVocationalOrHighSchool && (
              <div className="w-full sm:w-56">
                <M3Select
                  options={departmentOptions}
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="sm"
                />
              </div>
            )}

            <M3Badge variant="secondary" size="md">
              {totalItems} Kelas
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredClasses?.length === 0 ? (
          <section className="hig-grouped-surface px-4 sm:px-5">
            <M3EmptyState
              icon="meeting_room"
              title="Belum ada rombel kelas"
              description="Tambahkan rombel pertama untuk mulai mengorganisasikan siswa, pembelajaran, dan presensi."
              actionLabel={canManage ? "Tambah Kelas" : undefined}
              onAction={canManage ? openAddModal : undefined}
            />
          </section>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedClasses?.map((c) => (
                <M3Card
                  key={c.id}
                  variant="outlined"
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <M3Badge variant="primary" size="sm">
                          Tingkat {c.gradeLevel}
                          {c.department ? ` • ${c.department.code}` : ""}
                        </M3Badge>
                        <h3 className="text-lg font-semibold text-md-on-surface">
                          {c.name}
                        </h3>
                      </div>
                      {canManage && (
                      <M3Button
                        variant="icon"
                        size="icon-sm"
                        onClick={() => handleDelete(c.id, c.name)}
                        title="Hapus Rombel"
                      >
                        <M3Icon name="delete" size={18} className="text-md-on-surface-variant hover:text-md-error" />
                      </M3Button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-md-outline-variant/30 space-y-1.5 text-xs text-md-on-surface-variant">
                      <div className="flex items-center justify-between">
                        <span>Wali Kelas:</span>
                        <span className="font-semibold text-md-on-surface">
                          {c.homeroomTeacher?.name || "Belum ditentukan"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Jumlah Siswa:</span>
                        <M3Badge variant="secondary" size="sm">
                          {c._count?.students || 0} Siswa
                        </M3Badge>
                      </div>
                    </div>
                  </div>
                </M3Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} rombel
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

        {/* Dialog Add Class */}
        <M3Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Tambah Rombel Kelas"
          subtitle="Tentukan nama rombel, tingkat, jurusan, dan wali kelas."
          icon={<M3Icon name="meeting_room" size={24} className="text-md-primary" />}
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
                Simpan Kelas
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
              label="Nama Rombel Kelas *"
              placeholder={
                isElementary
                  ? "Contoh: 1-A / 2-B"
                  : isJuniorHigh
                  ? "Contoh: 7-A / 8-B"
                  : "Contoh: X RPL 1 / X-1 (Fase E)"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <M3Select
              label="Tingkat / Grade *"
              options={modalGradeOptions}
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            />

            {isVocationalOrHighSchool && (
              <M3Select
                label="Konsentrasi Keahlian / Jurusan (Opsional)"
                options={modalDepartmentOptions}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              />
            )}

            <M3Select
              label="Tahun Ajaran *"
              options={academicYearOptions}
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            />

            <M3Select
              label="Wali Kelas (Opsional)"
              options={teacherOptions}
              value={homeroomTeacherId}
              onChange={(e) => setHomeroomTeacherId(e.target.value)}
            />
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
