import { useEffect, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useParams } from "react-router";
import { Link } from "wasp/client/router";
import {
  useQuery,
  getLmsCourseDetail,
  getCourseAttendanceSeed,
  createCourseMaterial,
  createCourseAssignment,
  submitAssignment,
  gradeSubmission,
  createCourseAgenda,
  recordCourseAttendance,
  createCourseAssessment,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3Tabs,
  M3TextField,
  M3Dialog,
  M3CircularProgress,
  M3Banner,
  M3Icon,
} from "../../client/components/m3";
import { type SubjectAttendanceStatus } from "../attendancePolicy";

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatCbtDate(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function LmsCourseDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading, refetch } = useQuery(
    getLmsCourseDetail,
    { courseId: id || "" },
    { enabled: !!id }
  );

  const [activeTab, setActiveTab] = useState<string>("MATERIALS");

  // Material Modal
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matDesc, setMatDesc] = useState("");
  const [matUrl, setMatUrl] = useState("");

  // Assignment Modal
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assTitle, setAssTitle] = useState("");
  const [assInstruction, setAssInstruction] = useState("");
  const [assDeadline, setAssDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Agenda Modal
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [agendaPeriod, setAgendaPeriod] = useState("Jam ke 1 - 3");
  const [agendaCompetency, setAgendaCompetency] = useState("");
  const [agendaSummary, setAgendaSummary] = useState("");
  const [agendaPhoto, setAgendaPhoto] = useState("");

  // Attendance Modal
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [sessionNum, setSessionNum] = useState(1);
  const [studentStatusMap, setStudentStatusMap] = useState<
    Record<string, SubjectAttendanceStatus>
  >({});
  const {
    data: attendanceSeed,
    isLoading: attendanceSeedLoading,
    error: attendanceSeedError,
  } = useQuery(
    getCourseAttendanceSeed,
    { courseId: id || "" },
    {
      enabled: !!id && attendanceModalOpen,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!attendanceModalOpen || !attendanceSeed?.students) return;
    const next: Record<string, SubjectAttendanceStatus> = {};
    for (const student of attendanceSeed.students) {
      if (student.defaultStatus) {
        next[student.id] = student.defaultStatus as SubjectAttendanceStatus;
      }
    }
    setStudentStatusMap(next);
  }, [attendanceModalOpen, attendanceSeed]);

  // CBT Gen2 launch modal. Editing/questions/exam runner live on dedicated CBT page.
  const [cbtModalOpen, setCbtModalOpen] = useState(false);
  const [cbtTitle, setCbtTitle] = useState("");
  const [cbtDuration, setCbtDuration] = useState(60);
  const [cbtStart, setCbtStart] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 10 * 60 * 1000)),
  );
  const [cbtEnd, setCbtEnd] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  );

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createCourseMaterial({
        courseId: id,
        title: matTitle.trim(),
        description: matDesc.trim() || null,
        externalUrl: matUrl.trim() || null,
      });
      setMaterialModalOpen(false);
      setMatTitle("");
      setMatDesc("");
      setMatUrl("");
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createCourseAssignment({
        courseId: id,
        title: assTitle.trim(),
        instruction: assInstruction.trim(),
        deadline: new Date(assDeadline).toISOString(),
      });
      setAssignmentModalOpen(false);
      setAssTitle("");
      setAssInstruction("");
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createCourseAgenda({
        courseId: id,
        period: agendaPeriod.trim(),
        competency: agendaCompetency.trim(),
        summary: agendaSummary.trim(),
        photoUrls: agendaPhoto.trim() ? [agendaPhoto.trim()] : undefined,
      });
      setAgendaModalOpen(false);
      setAgendaCompetency("");
      setAgendaSummary("");
      setAgendaPhoto("");
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveAttendance = async () => {
    if (!id || !course) return;
    const missingStudents = course.classRoom.students.filter((student) => !studentStatusMap[student.id]);
    if (missingStudents.length > 0) {
      alert(`Tentukan status presensi untuk ${missingStudents.length} siswa yang belum memiliki status awal.`);
      return;
    }
    try {
      const records = course.classRoom.students.map((s) => ({
        studentId: s.id,
        status: studentStatusMap[s.id] as SubjectAttendanceStatus,
      }));

      await recordCourseAttendance({
        courseId: id,
        sessionNumber: sessionNum,
        records,
      });
      setAttendanceModalOpen(false);
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCbt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const startTime = new Date(cbtStart);
    const endTime = new Date(cbtEnd);
    if (Number.isNaN(startTime.valueOf()) || Number.isNaN(endTime.valueOf()) || startTime >= endTime) {
      alert("Jadwal mulai harus lebih awal daripada waktu selesai.");
      return;
    }
    try {
      await createCourseAssessment({
        courseId: id,
        title: cbtTitle.trim(),
        durationMinutes: Number(cbtDuration),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "DRAFT",
        attemptLimit: 1,
        passingScore: 75,
        isRandomized: true,
        shuffleOptions: false,
        showScoreMode: "IMMEDIATE",
      });
      setCbtModalOpen(false);
      setCbtTitle("");
      setCbtDuration(60);
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex flex-col items-center justify-center min-h-64 gap-3">
          <M3CircularProgress indeterminate />
          <p className="text-body-medium text-md-on-surface-variant">
            Memuat detail kelas LMS...
          </p>
        </div>
      </SchoolLayout>
    );
  }

  if (!course) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data Mata Pelajaran Tidak Ditemukan"
          supportingText="Ruang mapel yang Anda cari mungkin telah dihapus atau Anda tidak memiliki akses ke kelas ini."
          actionLabel="Kembali ke Daftar Mapel"
          actionHref="/school/lms/courses"
          className="p-6"
        />
      </SchoolLayout>
    );
  }

  const canManageCourse =
    user.isAdmin ||
    user.role === "SCHOOL_ADMIN" ||
    user.role === "SUPERADMIN" ||
    (user.role === "TEACHER" && course.teacher.id === user.id);
  const isStudent = user.role === "STUDENT" && !user.isAdmin;
  const missingAttendanceCount = course.classRoom.students.filter(
    (student) => !studentStatusMap[student.id],
  ).length;

  const tabs = [
    {
      id: "MATERIALS",
      label: "Materi",
      icon: <M3Icon name="description" size={16} />,
      badge: course.materials.length,
    },
    {
      id: "ASSIGNMENTS",
      label: "Tugas",
      icon: <M3Icon name="assignment" size={16} />,
      badge: course.assignments.length,
    },
    {
      id: "AGENDAS",
      label: "Agenda KBM",
      icon: <M3Icon name="calendar_month" size={16} />,
      badge: course.agendas.length,
    },
    {
      id: "ATTENDANCE",
      label: "Presensi",
      icon: <M3Icon name="how_to_reg" size={16} />,
      badge: course.attendances.length,
    },
    {
      id: "CBT",
      label: "Ujian CBT",
      icon: <M3Icon name="quiz" size={16} />,
      badge: course.assessments.length,
    },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">

        {/* Course Info Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <M3Badge variant="primary">{course.classRoom.name}</M3Badge>
            <span className="text-label-medium font-mono text-md-on-surface-variant">
              {course.academicYear.yearName}
            </span>
          </div>
          <h1 className="text-headline-medium font-bold text-md-on-surface">
            {course.subjectName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {canManageCourse && (
              <M3Button
                variant="outlined"
                size="sm"
                icon="play_circle"
                href={"/school/lms/courses/" + course.id + "/teaching"}
              >
                Pelaksanaan KBM
              </M3Button>
            )}
            <M3Button variant="text" size="sm" href="/school/lms/teaching">
              KBM Hari Ini
            </M3Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-body-medium text-md-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <M3Icon name="person" size={15} className="shrink-0" />
              <span>
                Guru Pengampu: <strong className="font-semibold text-md-on-surface">{course.teacher.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <M3Icon name="groups" size={15} className="shrink-0" />
              <span>
                {canManageCourse
                  ? `${course.classRoom.students.length} Siswa Terdaftar`
                  : "Anda terdaftar di ruang mapel ini"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <M3Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab 1: Materials */}
        {activeTab === "MATERIALS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-title-large font-bold text-md-on-surface">Materi Pembelajaran</h2>
              {canManageCourse && (
                <M3Button
                  variant="filled"
                  size="sm"
                  icon="add"
                  onClick={() => setMaterialModalOpen(true)}
                >
                  Tambah Materi
                </M3Button>
              )}
            </div>

            {course.materials.length === 0 ? (
              <M3Card variant="outlined" className="p-12 text-center">
                <p className="text-body-large text-md-on-surface-variant">
                  Belum ada materi dibagikan dalam ruang mapel ini.
                </p>
              </M3Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.materials.map((m) => (
                  <M3Card key={m.id} variant="elevated" className="p-5">
                    <div className="space-y-2">
                      <h3 className="text-title-medium font-bold text-md-on-surface">{m.title}</h3>
                      {m.description && (
                        <p className="text-body-medium text-md-on-surface-variant">
                          {m.description}
                        </p>
                      )}
                      {m.externalUrl && (
                        <a
                          href={m.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pt-2 inline-flex items-center gap-1.5 text-label-medium font-semibold text-md-primary hover:underline"
                        >
                          Buka Tautan Materi <M3Icon name="open_in_new" size={14} />
                        </a>
                      )}
                    </div>
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Assignments */}
        {activeTab === "ASSIGNMENTS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-title-large font-bold text-md-on-surface">Daftar Tugas Siswa</h2>
              {canManageCourse && (
                <M3Button
                  variant="filled"
                  size="sm"
                  icon="add"
                  onClick={() => setAssignmentModalOpen(true)}
                >
                  Buat Tugas Baru
                </M3Button>
              )}
            </div>

            {course.assignments.length === 0 ? (
              <M3Card variant="outlined" className="p-12 text-center">
                <p className="text-body-large text-md-on-surface-variant">
                  Belum ada tugas pembelajaran yang ditugaskan.
                </p>
              </M3Card>
            ) : (
              <div className="space-y-4">
                {course.assignments.map((a) => (
                  <M3Card key={a.id} variant="elevated" className="p-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="text-title-medium font-bold text-md-on-surface">{a.title}</h3>
                        <M3Badge variant="secondary">
                          Tenggat: {new Date(a.deadline).toLocaleDateString("id-ID")}
                        </M3Badge>
                      </div>

                      <p className="text-body-medium text-md-on-surface-variant whitespace-pre-line">
                        {a.instruction}
                      </p>

                      <div className="pt-2 border-t border-md-outline/10">
                        <span className="text-label-medium text-md-on-surface-variant">
                          {canManageCourse
                            ? `${a.submissions.length} siswa telah mengumpulkan tugas.`
                            : a.submissions.length > 0
                            ? "Tugas sudah Anda kumpulkan."
                            : "Tugas belum dikumpulkan."}
                        </span>
                      </div>
                    </div>
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Agendas */}
        {activeTab === "AGENDAS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-title-large font-bold text-md-on-surface">Agenda &amp; Jurnal Mengajar KBM</h2>
              {canManageCourse && (
                <M3Button
                  variant="filled"
                  size="sm"
                  icon="add"
                  onClick={() => setAgendaModalOpen(true)}
                >
                  Isi Agenda Pertemuan KBM
                </M3Button>
              )}
            </div>

            {course.agendas.length === 0 ? (
              <M3Card variant="outlined" className="p-12 text-center">
                <p className="text-body-large text-md-on-surface-variant">
                  Belum ada catatan agenda KBM tersimpan.
                </p>
              </M3Card>
            ) : (
              <div className="space-y-4">
                {course.agendas.map((ag) => (
                  <M3Card key={ag.id} variant="elevated" className="p-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <M3Badge variant="primary">{ag.period}</M3Badge>
                        <span className="text-label-medium text-md-on-surface-variant">
                          {new Date(ag.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                        </span>
                      </div>

                      <h3 className="text-title-medium font-bold text-md-on-surface">
                        Materi / KD: {ag.competency}
                      </h3>

                      <p className="text-body-medium text-md-on-surface-variant">
                        {ag.summary}
                      </p>
                    </div>
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Attendance */}
        {activeTab === "ATTENDANCE" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-title-large font-bold text-md-on-surface">Presensi Tatap Muka Kelas</h2>
              {canManageCourse && (
                <M3Button
                  variant="filled"
                  size="sm"
                  icon="add"
                  onClick={() => {
                    setStudentStatusMap({});
                    setSessionNum(course.attendances.length + 1);
                    setAttendanceModalOpen(true);
                  }}
                >
                  Buka Sesi Presensi Baru
                </M3Button>
              )}
            </div>

            {course.attendances.length === 0 ? (
              <M3Card variant="outlined" className="p-12 text-center">
                <p className="text-body-large text-md-on-surface-variant">
                  Belum ada sesi presensi KBM yang tercatat.
                </p>
              </M3Card>
            ) : (
              <div className="space-y-4">
                {course.attendances.map((att) => (
                  <M3Card key={att.id} variant="elevated" className="p-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-title-medium font-bold text-md-on-surface">
                          Pertemuan ke-{att.sessionNumber}
                        </h3>
                        <span className="text-label-medium text-md-on-surface-variant">
                          {new Date(att.date).toLocaleDateString("id-ID")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {att.records.map((r) => (
                          <span
                            key={r.id}
                            className={`px-3 py-1 rounded-md-full text-label-small font-bold ${
                              r.status === "HADIR"
                                ? "bg-md-secondary/10 text-md-secondary"
                                : r.status === "ALPA"
                                ? "bg-md-error-container/55 text-md-error"
                                : "bg-md-tertiary-container/55 text-md-tertiary"
                            }`}
                          >
                            {r.student.name}: {r.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: CBT Gen2 */}
        {activeTab === "CBT" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-title-large font-bold text-md-on-surface">Ujian CBT Gen2</h2>
                <p className="mt-0.5 text-xs text-md-on-surface-variant">
                  Jadwal eksplisit, attempt server-side, autosave, randomisasi, bank soal, monitoring, dan koreksi esai.
                </p>
              </div>
              {canManageCourse && (
                <M3Button variant="filled" size="sm" icon="add" onClick={() => setCbtModalOpen(true)}>
                  Buat Ujian CBT
                </M3Button>
              )}
            </div>

            {course.assessments.length === 0 ? (
              <M3Card variant="outlined" className="p-10 text-center">
                <M3Icon name="quiz" size={34} className="mx-auto text-md-on-surface-variant" />
                <p className="mt-3 text-body-large font-semibold text-md-on-surface">Belum ada ujian CBT.</p>
                <p className="mt-1 text-body-small text-md-on-surface-variant">
                  Guru dapat membuat ujian dalam status Draft lalu mengatur paket soal dan publikasinya.
                </p>
              </M3Card>
            ) : (
              <div className="space-y-3">
                {course.assessments.map((cbt: any) => {
                  const now = Date.now();
                  const start = new Date(cbt.startTime).getTime();
                  const end = new Date(cbt.endTime).getTime();
                  const phase = cbt.status !== "PUBLISHED"
                    ? cbt.status
                    : now < start
                      ? "TERJADWAL"
                      : now > end
                        ? "SELESAI"
                        : "BERLANGSUNG";
                  return (
                    <M3Card key={cbt.id} variant="outlined" className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <M3Badge
                              variant={phase === "BERLANGSUNG" ? "success" : phase === "DRAFT" ? "outline" : "secondary"}
                              size="sm"
                            >
                              {phase}
                            </M3Badge>
                            <M3Badge variant="outline" size="sm">{cbt.durationMinutes} menit</M3Badge>
                            <M3Badge variant="outline" size="sm">{cbt.questions.length} soal</M3Badge>
                            {cbt.requireToken && <M3Badge variant="outline" size="sm">Token</M3Badge>}
                          </div>
                          <h3 className="mt-2 text-title-medium font-bold text-md-on-surface">{cbt.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-md-on-surface-variant">
                            {formatCbtDate(cbt.startTime)} — {formatCbtDate(cbt.endTime)}
                          </p>
                          <p className="mt-1 text-xs text-md-on-surface-variant">
                            Attempt maks {cbt.attemptLimit || 1} · KKM {cbt.passingScore ?? 75}% · {cbt.isRandomized ? "soal diacak" : "urutan tetap"}
                          </p>
                          {canManageCourse && cbt.results.length > 0 && (
                            <p className="mt-2 text-xs text-md-on-surface-variant">
                              {cbt.results.length} hasil legacy/final tersimpan. Monitoring detail tersedia di workspace CBT.
                            </p>
                          )}
                        </div>
                        <M3Button
                          variant={isStudent ? "filled" : "tonal"}
                          size="sm"
                          icon={isStudent ? "play_circle" : "tune"}
                          href={`/school/lms/courses/${course.id}/cbt/${cbt.id}`}
                        >
                          {isStudent ? "Buka Ujian" : "Kelola CBT"}
                        </M3Button>
                      </div>
                    </M3Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dialog Add Material */}
        <M3Dialog
          isOpen={canManageCourse && materialModalOpen}
          onClose={() => setMaterialModalOpen(false)}
          title="Tambah Materi Pembelajaran"
          description="Tambahkan tautan atau ringkasan materi pelajaran."
        >
          <form onSubmit={handleAddMaterial} className="space-y-4 pt-2">
            <M3TextField
              label="Judul Materi *"
              placeholder="Contoh: Pengenalan HTML & CSS Dasar"
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                Deskripsi Singkat
              </label>
              <textarea
                className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                placeholder="Deskripsi pengantar materi ajar..."
                value={matDesc}
                onChange={(e) => setMatDesc(e.target.value)}
                rows={3}
              />
            </div>

            <M3TextField
              label="Tautan Berkas / Video (Opsional)"
              placeholder="https://drive.google.com/..."
              value={matUrl}
              onChange={(e) => setMatUrl(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                type="button"
                onClick={() => setMaterialModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" type="submit">
                Simpan Materi
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Add Assignment */}
        <M3Dialog
          isOpen={canManageCourse && assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          title="Buat Tugas Baru"
          description="Petunjuk pengerjaan dan batas waktu pengumpulan tugas."
        >
          <form onSubmit={handleAddAssignment} className="space-y-4 pt-2">
            <M3TextField
              label="Judul Tugas *"
              placeholder="Contoh: Tugas Praktikum 1: Membuat Halaman Portofolio"
              value={assTitle}
              onChange={(e) => setAssTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                Instruksi Tugas *
              </label>
              <textarea
                className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                placeholder="Tuliskan petunjuk pengerjaan tugas secara rinci..."
                value={assInstruction}
                onChange={(e) => setAssInstruction(e.target.value)}
                rows={4}
                required
              />
            </div>

            <M3TextField
              label="Tenggat Pengumpulan (YYYY-MM-DD) *"
              placeholder="YYYY-MM-DD"
              value={assDeadline}
              onChange={(e) => setAssDeadline(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                type="button"
                onClick={() => setAssignmentModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" type="submit">
                Simpan Tugas
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Add Agenda */}
        <M3Dialog
          isOpen={canManageCourse && agendaModalOpen}
          onClose={() => setAgendaModalOpen(false)}
          title="Catat Agenda KBM"
          description="Catatan jam mengajar dan materi pertemuan hari ini."
        >
          <form onSubmit={handleAddAgenda} className="space-y-4 pt-2">
            <M3TextField
              label="Jam Ke / Periode *"
              placeholder="Jam ke 1 - 3"
              value={agendaPeriod}
              onChange={(e) => setAgendaPeriod(e.target.value)}
              required
            />

            <M3TextField
              label="Materi / KD *"
              placeholder="Contoh: 3.1 Memahami sintaks dasar PHP"
              value={agendaCompetency}
              onChange={(e) => setAgendaCompetency(e.target.value)}
              required
            />

            <div>
              <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                Ringkasan KBM *
              </label>
              <textarea
                className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                placeholder="Uraikan aktivitas pembelajaran dan kehadiran siswa di kelas..."
                value={agendaSummary}
                onChange={(e) => setAgendaSummary(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                type="button"
                onClick={() => setAgendaModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" type="submit">
                Simpan Agenda
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Attendance */}
        <M3Dialog
          isOpen={canManageCourse && attendanceModalOpen}
          onClose={() => {
            setAttendanceModalOpen(false);
            setStudentStatusMap({});
          }}
          title={`Presensi Pertemuan ke-${sessionNum}`}
          description="Status awal diambil dari Kehadiran Global hari ini. Koreksi pada mapel ini hanya berlaku untuk sesi pembelajaran dan tidak mengubah Kehadiran Global."
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-[10px] border border-md-outline-variant/40 bg-md-surface-container-low px-3 py-2.5 text-xs leading-5 text-md-on-surface-variant">
              Prefill menggunakan Kehadiran Global tanggal <strong className="text-md-on-surface">{attendanceSeed?.dateOnly || "hari ini"}</strong>.
              Status Global <strong>TERLAMBAT</strong> diprefill sebagai <strong>HADIR</strong> pada mapel dan tetap dapat dikoreksi guru.
            </div>
            {attendanceSeedError && (
              <M3Banner
                variant="error"
                supportingText={(attendanceSeedError as any)?.message || "Status Kehadiran Global belum dapat dimuat. Guru tetap dapat menentukan status mapel secara manual."}
              />
            )}
            {attendanceSeedLoading && (
              <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
                <M3CircularProgress size={18} />
                Memuat status awal dari Kehadiran Global...
              </div>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {course.classRoom.students.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-[10px] border border-md-outline/20 bg-md-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-body-medium text-md-on-surface">{s.name}</p>
                    <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
                      Global: {attendanceSeed?.students.find((seed) => seed.id === s.id)?.globalStatus || "Belum tercatat"}
                      {!studentStatusMap[s.id] ? " · Status mapel belum ditentukan" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DISPENSASI", "ALPA"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={attendanceSeedLoading}
                        onClick={() =>
                          setStudentStatusMap((prev) => ({
                            ...prev,
                            [s.id]: st,
                          }))
                        }
                        className={`px-3 py-1 rounded-md-full text-label-small font-bold transition-all disabled:cursor-wait disabled:opacity-50 ${
                          studentStatusMap[s.id] === st
                            ? st === "HADIR"
                              ? "bg-md-secondary text-md-on-secondary shadow-none"
                              : st === "ALPA"
                              ? "bg-md-error text-md-on-error shadow-none"
                              : "bg-md-tertiary text-md-on-tertiary shadow-none"
                            : "bg-md-surface text-md-on-surface-variant hover:bg-md-surface-container-high"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                onClick={() => {
                  setAttendanceModalOpen(false);
                  setStudentStatusMap({});
                }}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                onClick={handleSaveAttendance}
                disabled={attendanceSeedLoading || missingAttendanceCount > 0}
              >
                {missingAttendanceCount > 0
                  ? `Lengkapi ${missingAttendanceCount} Status`
                  : "Simpan Presensi"}
              </M3Button>
            </div>
          </div>
        </M3Dialog>

        {/* Dialog Create CBT Gen2 */}
        <M3Dialog
          isOpen={canManageCourse && cbtModalOpen}
          onClose={() => setCbtModalOpen(false)}
          title="Buat Ujian CBT Gen2"
          description="Ujian dibuat sebagai Draft. Atur paket soal, token, randomisasi, dan publikasi dari workspace CBT."
        >
          <form onSubmit={handleAddCbt} className="space-y-4 pt-2">
            <M3TextField
              label="Judul Ujian *"
              placeholder="Contoh: Sumatif Basis Data — DDL & DML"
              value={cbtTitle}
              onChange={(e) => setCbtTitle(e.target.value)}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <M3TextField
                label="Mulai *"
                type="datetime-local"
                value={cbtStart}
                onChange={(e) => setCbtStart(e.target.value)}
                required
              />
              <M3TextField
                label="Selesai *"
                type="datetime-local"
                value={cbtEnd}
                onChange={(e) => setCbtEnd(e.target.value)}
                required
              />
            </div>
            <M3TextField
              label="Durasi Attempt (menit) *"
              type="number"
              min="5"
              max="480"
              value={String(cbtDuration)}
              onChange={(e) => setCbtDuration(Number(e.target.value) || 60)}
              required
            />
            <div className="rounded-[10px] bg-md-surface-container-low px-3 py-2.5 text-xs leading-5 text-md-on-surface-variant">
              Batas waktu siswa dihitung server sebagai nilai paling awal antara durasi attempt dan jadwal selesai ujian.
            </div>
            <div className="flex justify-end gap-2 border-t border-md-outline/10 pt-4">
              <M3Button variant="outlined" type="button" onClick={() => setCbtModalOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" type="submit">Buat Draft Ujian</M3Button>
            </div>
          </form>
        </M3Dialog>

      </div>
    </SchoolLayout>
  );
}
