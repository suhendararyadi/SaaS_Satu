import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getLmsCourses,
  getClassRooms,
  getSchoolTeachers,
  getAcademicYears,
  createLmsCourse,
  bulkCreateLmsCourses,
  getSchoolInfo,
} from "wasp/client/operations";
import { routes, Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3TextField,
  M3Select,
  M3Dialog,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";

import {
  KURIKULUM_MERDEKA_PRESETS,
  type CurriculumSubjectPreset,
} from "../lmsCurriculumPresets";

export function LmsCoursesPage({ user }: { user: AuthUser }) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("spotlight") ?? "" : "");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const canManage = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";

  const { data: courses, isLoading, refetch } = useQuery(getLmsCourses, {
    classRoomId: selectedClass || undefined,
  });
  const { data: classes } = useQuery(getClassRooms, undefined, { enabled: canManage });
  const { data: teachers } = useQuery(getSchoolTeachers, undefined, { enabled: canManage });
  const { data: academicYears } = useQuery(getAcademicYears, undefined, { enabled: canManage });
  const { data: schoolInfo } = useQuery(getSchoolInfo, undefined, { enabled: canManage });

  // Single Course Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Kurikulum Merdeka Bulk Generator State
  const [merdekaModalOpen, setMerdekaModalOpen] = useState(false);
  const [merdekaClassRoomId, setMerdekaClassRoomId] = useState("");
  const [merdekaDefaultTeacherId, setMerdekaDefaultTeacherId] = useState("");
  const [merdekaSubjects, setMerdekaSubjects] = useState<
    Array<{
      name: string;
      category: string;
      description: string;
      checked: boolean;
      teacherId: string;
    }>
  >([]);
  const [merdekaSubmitting, setMerdekaSubmitting] = useState(false);
  const [merdekaError, setMerdekaError] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    variant: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const openAddModal = () => {
    setSubjectName("");
    setClassRoomId(classes?.[0]?.id || "");
    setTeacherId(teachers?.[0]?.id || "");
    setDescription("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openMerdekaModal = () => {
    const targetClassId = selectedClass || classes?.[0]?.id || "";
    const defaultTeacher = teachers?.[0]?.id || "";
    const schoolLevel = (schoolInfo?.level as "SD_MI" | "SMP_MTS" | "SMA_SMK") || "SMP_MTS";
    const presets = KURIKULUM_MERDEKA_PRESETS[schoolLevel] || KURIKULUM_MERDEKA_PRESETS.SMP_MTS;

    setMerdekaClassRoomId(targetClassId);
    setMerdekaDefaultTeacherId(defaultTeacher);
    setMerdekaSubjects(
      presets.map((p) => ({
        name: p.name,
        category: p.category,
        description: p.description,
        checked: true,
        teacherId: defaultTeacher,
      }))
    );
    setMerdekaError("");
    setMerdekaModalOpen(true);
  };

  const handleMerdekaDefaultTeacherChange = (newTeacherId: string) => {
    setMerdekaDefaultTeacherId(newTeacherId);
    setMerdekaSubjects((prev) =>
      prev.map((s) => ({
        ...s,
        teacherId: newTeacherId,
      }))
    );
  };

  const handleMerdekaSubjectToggle = (index: number) => {
    setMerdekaSubjects((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, checked: !s.checked } : s))
    );
  };

  const handleMerdekaSubjectTeacherChange = (index: number, teacherId: string) => {
    setMerdekaSubjects((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, teacherId } : s))
    );
  };

  const handleMerdekaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merdekaClassRoomId) {
      setMerdekaError("Pilih rombel kelas sasaran.");
      return;
    }

    const activeYear = academicYears?.find((y) => y.isActive) || academicYears?.[0];
    if (!activeYear) {
      setMerdekaError("Tahun ajaran aktif belum ditentukan.");
      return;
    }

    const checkedSubjects = merdekaSubjects.filter((s) => s.checked);
    if (checkedSubjects.length === 0) {
      setMerdekaError("Pilih minimal 1 mata pelajaran untuk diterapkan.");
      return;
    }

    const missingTeacher = checkedSubjects.find((s) => !s.teacherId);
    if (missingTeacher) {
      setMerdekaError(`Mata pelajaran '${missingTeacher.name}' belum memiliki guru pengampu.`);
      return;
    }

    setMerdekaError("");
    setMerdekaSubmitting(true);
    try {
      const res = await bulkCreateLmsCourses({
        classRoomId: merdekaClassRoomId,
        academicYearId: activeYear.id,
        courses: checkedSubjects.map((s) => ({
          subjectName: s.name,
          teacherId: s.teacherId,
          description: s.description,
        })),
      });

      setMerdekaModalOpen(false);
      setFeedbackBanner({
        variant: res.createdCount > 0 ? "success" : "info",
        message: res.message,
      });
      await refetch();
    } catch (err: any) {
      setMerdekaError(err.message || "Gagal menerapkan paket mata pelajaran Kurikulum Merdeka.");
    } finally {
      setMerdekaSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setErrorMsg("Nama mata pelajaran wajib diisi.");
      return;
    }
    if (!classRoomId) {
      setErrorMsg("Pilih rombel kelas.");
      return;
    }
    if (!teacherId) {
      setErrorMsg("Pilih guru pengampu.");
      return;
    }

    const activeYear = academicYears?.find((y) => y.isActive) || academicYears?.[0];
    if (!activeYear) {
      setErrorMsg("Tahun ajaran aktif belum ditentukan.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);
    try {
      await createLmsCourse({
        subjectName: subjectName.trim(),
        classRoomId,
        teacherId,
        academicYearId: activeYear.id,
        description: description.trim() || null,
      });
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat ruang mapel.");
    } finally {
      setSubmitting(false);
    }
  };

  const classFilterOptions = [
    { value: "", label: "Semua Rombel Kelas" },
    ...(classes?.map((c) => ({
      value: c.id,
      label: `${c.name}${c.department ? ` (${c.department.code})` : ""}`,
    })) || []),
  ];

  const classFormOptions = [
    { value: "", label: "Pilih Rombel Kelas" },
    ...(classes?.map((c) => ({
      value: c.id,
      label: `${c.name}${c.department ? ` (${c.department.code})` : ""}`,
    })) || []),
  ];

  const teacherFormOptions = [
    { value: "", label: "Pilih Guru Pengampu" },
    ...(teachers?.map((t) => ({
      value: t.id,
      label: `${t.name || t.email}${t.teacherProfile?.title ? ` (${t.teacherProfile.title})` : ""}`,
    })) || []),
  ];

  const filteredCourses = courses?.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = c.subjectName.toLowerCase().includes(q);
      const matchTeacher = c.teacher.name?.toLowerCase().includes(q);
      const matchClass = c.classRoom.name?.toLowerCase().includes(q);
      return matchSubject || matchTeacher || matchClass;
    }
    return true;
  });

  const paginatedCourses = (filteredCourses || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil((filteredCourses?.length || 0) / pageSize);

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-headline-medium font-bold text-md-on-surface">
              Ruang Mata Pelajaran (LMS)
            </h1>
            <p className="text-body-large text-md-on-surface-variant mt-1">
              Kelola materi pembelajaran, tugas, agenda KBM, dan ujian CBT.
            </p>
          </div>
          {canManage && (
          <div className="flex items-center gap-3 flex-wrap">
            <M3Button
              variant="tonal"
              icon="library_add"
              onClick={openMerdekaModal}
            >
              Paket Mapel Kurikulum Merdeka
            </M3Button>
            <M3Button
              variant="filled"
              icon="add"
              onClick={openAddModal}
            >
              Buka Ruang Mapel Baru
            </M3Button>
          </div>
          )}
        </div>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <M3Banner
            variant={feedbackBanner.variant}
            supportingText={feedbackBanner.message}
            dismissible
            onDismiss={() => setFeedbackBanner(null)}
          />
        )}

        {/* Search & Filter Toolbar */}
        <M3Card variant="outlined" className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <M3TextField
                placeholder="Cari nama mata pelajaran atau guru..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon={<M3Icon name="search" size={18} />}
              />
            </div>

            {canManage && (
            <div className="w-full sm:w-64">
              <M3Select
                options={classFilterOptions}
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            )}

            <div className="flex items-center">
              <M3Badge variant="outline">
                {filteredCourses?.length || 0} Mapel
              </M3Badge>
            </div>
          </div>
        </M3Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-64 gap-3">
            <M3CircularProgress indeterminate />
            <p className="text-body-medium text-md-on-surface-variant">
              Memuat ruang kelas LMS...
            </p>
          </div>
        ) : filteredCourses?.length === 0 ? (
          <M3Banner
            variant="standard"
            headline="Belum Ada Ruang Mata Pelajaran"
            supportingText="Buka ruang mapel pertama untuk memulai pembelajaran daring dan pencatatan agenda KBM."
            actionLabel={canManage ? "Buat Mapel Baru" : undefined}
            onAction={canManage ? openAddModal : undefined}
            icon="book"
            className="p-6"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCourses.map((c) => (
              <Link
                key={c.id}
                to={routes.LmsCourseDetailRoute.to}
                params={{ id: c.id }}
                className="block group h-full"
              >
                <M3Card
                  variant="outlined"
                  className="p-5 h-full flex flex-col justify-between group-hover:border-md-primary/35 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <M3Badge variant="primary">
                        {c.classRoom.name}
                      </M3Badge>
                      <span className="text-label-small font-mono text-md-on-surface-variant">
                        {c.academicYear.yearName}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-title-large font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                        {c.subjectName}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-1 text-body-small text-md-on-surface-variant">
                        <M3Icon name="person" size={16} className="shrink-0" />
                        <span>
                          Pengampu: <strong className="font-semibold text-md-on-surface">{c.teacher.name}</strong>
                        </span>
                      </div>
                    </div>

                    {c.description && (
                      <p className="text-body-small text-md-on-surface-variant line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Course Mini Badges */}
                  <div className="pt-4 mt-4 border-t border-md-outline/10 grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-md-md bg-md-surface-container">
                      <span className="font-bold text-label-large block text-md-on-surface">
                        {c._count?.agendas || 0}
                      </span>
                      <span className="text-[10px] text-md-on-surface-variant">Agenda</span>
                    </div>
                    <div className="p-2 rounded-md-md bg-md-surface-container">
                      <span className="font-bold text-label-large block text-md-on-surface">
                        {c._count?.materials || 0}
                      </span>
                      <span className="text-[10px] text-md-on-surface-variant">Materi</span>
                    </div>
                    <div className="p-2 rounded-md-md bg-md-surface-container">
                      <span className="font-bold text-label-large block text-md-on-surface">
                        {c._count?.assignments || 0}
                      </span>
                      <span className="text-[10px] text-md-on-surface-variant">Tugas</span>
                    </div>
                    <div className="p-2 rounded-md-md bg-md-surface-container">
                      <span className="font-bold text-label-large block text-md-on-surface">
                        {c._count?.assessments || 0}
                      </span>
                      <span className="text-[10px] text-md-on-surface-variant">CBT</span>
                    </div>
                  </div>
                </M3Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <M3Button
              variant="outlined"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </M3Button>
            <span className="text-body-medium text-md-on-surface-variant px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <M3Button
              variant="outlined"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
            </M3Button>
          </div>
        )}

        {/* Dialog Add Course */}
        <M3Dialog
          isOpen={canManage && modalOpen}
          onClose={() => setModalOpen(false)}
          title="Buka Ruang Mata Pelajaran Baru"
          description="Atur mapel, kelas tujuan, dan guru pengampu pembelajaran daring."
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <M3Banner
                variant="error"
                supportingText={errorMsg}
                dismissible
                onDismiss={() => setErrorMsg("")}
              />
            )}

            <M3TextField
              label="Nama Mata Pelajaran *"
              placeholder="Contoh: Pemrograman Web & Perangkat Bergerak"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />

            <M3Select
              label="Rombel Kelas *"
              options={classFormOptions}
              value={classRoomId}
              onChange={(e) => setClassRoomId(e.target.value)}
            />

            <M3Select
              label="Guru Pengampu *"
              options={teacherFormOptions}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            />

            <div>
              <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                Deskripsi / Info Mapel (Opsional)
              </label>
              <textarea
                className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                placeholder="Deskripsi silabus mapel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                loading={submitting}
                type="submit"
              >
                Buka Kelas
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Modal Terapkan Paket Mapel Kurikulum Merdeka */}
        <M3Dialog
          isOpen={canManage && merdekaModalOpen}
          onClose={() => setMerdekaModalOpen(false)}
          title="Paket Mapel Kurikulum Merdeka"
          maxWidth="xl"
        >
          <form onSubmit={handleMerdekaSubmit} className="space-y-4 pt-2">
            <M3Banner
              variant="info"
              headline={`Kurikulum Merdeka (${
                schoolInfo?.level === "SD_MI"
                  ? "Fase A/B/C"
                  : schoolInfo?.level === "SMP_MTS"
                  ? "Fase D"
                  : "Fase E/F"
              })`}
              supportingText="Pilih rombel sasaran. Mata pelajaran yang sudah terdaftar tidak akan diduplikasi."
              icon="menu_book"
            />

            {merdekaError && (
              <M3Banner
                variant="error"
                supportingText={merdekaError}
                dismissible
                onDismiss={() => setMerdekaError("")}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <M3Select
                label="Target Rombel Kelas *"
                options={classFormOptions}
                value={merdekaClassRoomId}
                onChange={(e) => setMerdekaClassRoomId(e.target.value)}
              />

              <M3Select
                label="Guru Pengampu Default *"
                options={teacherFormOptions}
                value={merdekaDefaultTeacherId}
                onChange={(e) => handleMerdekaDefaultTeacherChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-label-large font-bold text-md-on-surface">
                  Daftar Mata Pelajaran ({merdekaSubjects.filter((s) => s.checked).length} dari{" "}
                  {merdekaSubjects.length} Dipilih)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMerdekaSubjects((prev) => prev.map((s) => ({ ...s, checked: true })))
                    }
                    className="text-xs text-md-primary hover:underline font-medium cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-xs text-md-outline">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMerdekaSubjects((prev) => prev.map((s) => ({ ...s, checked: false })))
                    }
                    className="text-xs text-md-outline hover:underline font-medium cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-md-outline-variant/60 rounded-md-lg divide-y divide-md-outline-variant/40 bg-md-surface-container-low">
                {merdekaSubjects.map((subject, idx) => (
                  <div
                    key={subject.name}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      subject.checked ? "bg-md-surface" : "opacity-60 bg-md-surface-container-low"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={subject.checked}
                        onChange={() => handleMerdekaSubjectToggle(idx)}
                        className="mt-1 w-4 h-4 rounded text-md-primary focus:ring-md-primary accent-md-primary cursor-pointer"
                        id={`subject-chk-${idx}`}
                      />
                      <label htmlFor={`subject-chk-${idx}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-body-medium font-semibold text-md-on-surface">
                            {subject.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              subject.category === "KEJURUAN"
                                ? "bg-md-tertiary-container/55 text-md-on-tertiary-container"
                                : subject.category === "MUATAN_LOKAL"
                                ? "bg-md-primary-container/55 text-md-on-primary-container"
                                : subject.category === "PILIHAN"
                                ? "bg-md-primary-container/55 text-md-on-primary-container"
                                : "bg-md-secondary-container/55 text-md-on-secondary-container"
                            }`}
                          >
                            {subject.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-body-small text-md-on-surface-variant line-clamp-1">
                          {subject.description}
                        </p>
                      </label>
                    </div>

                    {subject.checked && (
                      <div className="w-full sm:w-48 shrink-0">
                        <select
                          value={subject.teacherId}
                          onChange={(e) =>
                            handleMerdekaSubjectTeacherChange(idx, e.target.value)
                          }
                          className="w-full text-xs rounded-md-md border border-md-outline bg-md-surface px-2 py-1.5 text-md-on-surface focus:outline-none focus:ring-1 focus:ring-md-primary"
                        >
                          <option value="">-- Guru Pengampu --</option>
                          {teachers?.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                onClick={() => setMerdekaModalOpen(false)}
                type="button"
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                icon={<M3Icon name="auto_awesome" size={18} />}
                loading={merdekaSubmitting}
                type="submit"
              >
                Terapkan Paket ({merdekaSubjects.filter((s) => s.checked).length} Mapel)
              </M3Button>
            </div>
          </form>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
