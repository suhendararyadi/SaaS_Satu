import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
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

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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

  const handleStatusChange = async (
    id: string,
    newStatus: "ACTIVE" | "COMPLETED" | "CANCELED"
  ) => {
    try {
      await updatePlacement({ id, status: newStatus });
      await refetch();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui status penempatan.");
    }
  };

  const studentOptions = [
    { value: "", label: "Pilih Siswa yang Belum Plotting" },
    ...(unplacedStudents?.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.classRoom?.name || "Tanpa Kelas"}) - NIS: ${
        s.studentProfile?.nis || "-"
      }`,
    })) || []),
  ];

  const companyOptions = [
    { value: "", label: "Pilih Perusahaan Mitra" },
    ...(companies?.map((c) => ({
      value: c.id,
      label: `${c.name} (Sisa Kuota: ${
        c.maxQuota - (c.placements?.length || 0)
      } siswa)`,
    })) || []),
  ];

  const teacherOptions = [
    { value: "", label: "Tanpa Pembimbing (Pilih Nanti)" },
    ...(teachers?.map((t) => ({
      value: t.id,
      label: `${t.name || t.email}${
        t.teacherProfile?.title ? ` (${t.teacherProfile.title})` : ""
      }`,
    })) || []),
  ];

  const filteredPlacements = placements?.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStudent =
        p.student?.name?.toLowerCase().includes(q) ||
        p.student?.studentProfile?.nis?.toLowerCase().includes(q);
      const matchCompany = p.company?.name?.toLowerCase().includes(q);
      const matchTeacher = p.teacherSupervisor?.name
        ?.toLowerCase()
        .includes(q);
      return matchStudent || matchCompany || matchTeacher;
    }
    return true;
  });

  const totalItems = filteredPlacements?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedPlacements = (filteredPlacements || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const statusOptions = [
    { value: "ALL", label: "Semua Status" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "COMPLETED", label: "Selesai" },
    { value: "CANCELED", label: "Batal" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary">
            Portal Sekolah
          </Link>
          <span>/</span>
          <span>E-PKL</span>
          <span>/</span>
          <span className="text-md-on-surface font-medium">
            Plotting &amp; Penempatan
          </span>
        </div>

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-md-on-surface">
              Penempatan Siswa PKL
            </h2>
            <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
              Penugasan siswa ke perusahaan mitra dan guru pembimbing.
            </p>
          </div>
          <M3Button
            variant="filled"
            size="md"
            icon="add"
            onClick={openAddModal}
          >
            Plotting Siswa Baru
          </M3Button>
        </div>

        {/* Search & Status Filter Toolbar */}
        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <M3TextField
                placeholder="Cari nama siswa, NIS, mitra, atau pembimbing..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon={<M3Icon name="search" size={18} />}
                size="sm"
              />
            </div>

            <div className="w-full sm:w-48">
              <M3Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
              />
            </div>

            <M3Badge variant="secondary" size="md">
              {totalItems} Penempatan
            </M3Badge>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <M3CircularProgress size={40} />
          </div>
        ) : filteredPlacements?.length === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum Ada Data Penempatan Siswa"
            supportingText="Lakukan penempatan siswa ke perusahaan mitra untuk memulai pemantauan presensi dan jurnal."
            actionLabel="Plotting Siswa Pertama"
            onAction={openAddModal}
            icon="work"
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Siswa &amp; Kelas</M3TableHead>
                  <M3TableHead>Mitra DUDI</M3TableHead>
                  <M3TableHead>Guru Pembimbing</M3TableHead>
                  <M3TableHead>Periode PKL</M3TableHead>
                  <M3TableHead>Status</M3TableHead>
                  <M3TableHead className="text-right">Aksi</M3TableHead>
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {paginatedPlacements.map((p) => {
                  const sDate = new Date(p.startDate).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  );
                  const eDate = new Date(p.endDate).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  );

                  return (
                    <M3TableRow key={p.id}>
                      <M3TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-md-on-surface">
                            {p.student?.name}
                          </span>
                          <span className="text-xs text-md-on-surface-variant font-mono">
                            {p.student?.classRoom?.name || "Kelas -"} • NIS:{" "}
                            {p.student?.studentProfile?.nis || "-"}
                          </span>
                        </div>
                      </M3TableCell>

                      <M3TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <M3Icon name="apartment" size={14} className="text-md-primary shrink-0" />
                            <span className="font-semibold text-md-primary">
                              {p.company?.name}
                            </span>
                          </div>
                          <span className="text-xs text-md-on-surface-variant line-clamp-1 max-w-[200px]">
                            {p.company?.address}
                          </span>
                        </div>
                      </M3TableCell>

                      <M3TableCell>
                        {p.teacherSupervisor?.name ? (
                          <div className="flex items-center gap-1 text-sm text-md-on-surface">
                            <M3Icon name="person" size={14} className="opacity-70 shrink-0" />
                            <span>{p.teacherSupervisor.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-md-on-surface-variant italic">
                            Belum Ditugaskan
                          </span>
                        )}
                      </M3TableCell>

                      <M3TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-md-on-surface-variant font-mono">
                          <M3Icon name="calendar_today" size={14} className="opacity-70 shrink-0" />
                          <span>
                            {sDate} s.d. {eDate}
                          </span>
                        </div>
                      </M3TableCell>

                      <M3TableCell>
                        {p.status === "ACTIVE" && (
                          <M3Badge variant="success" size="sm">
                            Aktif
                          </M3Badge>
                        )}
                        {p.status === "COMPLETED" && (
                          <M3Badge variant="primary" size="sm">
                            Selesai
                          </M3Badge>
                        )}
                        {p.status === "CANCELED" && (
                          <M3Badge variant="error" size="sm">
                            Batal
                          </M3Badge>
                        )}
                      </M3TableCell>

                      <M3TableCell className="text-right">
                        {p.status === "ACTIVE" && (
                          <div className="flex items-center justify-end gap-1">
                            <M3Button
                              variant="tonal"
                              size="sm"
                              icon="check_circle"
                              onClick={() =>
                                handleStatusChange(p.id, "COMPLETED")
                              }
                            >
                              Selesai
                            </M3Button>
                            <M3Button
                              variant="outlined"
                              size="sm"
                              icon="cancel"
                              onClick={() =>
                                handleStatusChange(p.id, "CANCELED")
                              }
                            >
                              Batal
                            </M3Button>
                          </div>
                        )}
                      </M3TableCell>
                    </M3TableRow>
                  );
                })}
              </M3TableBody>
            </M3Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs text-md-on-surface-variant">
                  Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} penempatan
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

        {/* Dialog Add Placement */}
        <M3Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Plotting Penempatan PKL Siswa"
          subtitle="Pilih siswa, tempat DUDI mitra, dan periode tanggal pelaksanaan PKL."
          icon={<M3Icon name="work" size={24} className="text-md-primary" />}
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
                Simpan Penempatan
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

            <M3Select
              label="Pilih Siswa *"
              options={studentOptions}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />

            <M3Select
              label="Pilih Mitra DUDI / Tempat PKL *"
              options={companyOptions}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            />

            <M3Select
              label="Guru Pembimbing Sekolah (Opsional)"
              options={teacherOptions}
              value={teacherSupervisorId}
              onChange={(e) => setTeacherSupervisorId(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <M3TextField
                label="Tanggal Mulai *"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <M3TextField
                label="Tanggal Selesai *"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
