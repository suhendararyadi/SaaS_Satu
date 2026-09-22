import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useParams } from "react-router";
import { Link } from "wasp/client/router";
import {
  useQuery,
  getLmsCourseDetail,
  createCourseMaterial,
  createCourseAssignment,
  submitAssignment,
  gradeSubmission,
  createCourseAgenda,
  recordCourseAttendance,
  createCourseAssessment,
  addAssessmentQuestion,
  submitAssessmentAnswers,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3Tabs,
  M3TextField,
  M3Select,
  M3Dialog,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";

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
    Record<string, "HADIR" | "SAKIT" | "IZIN" | "ALPA" | "TERLAMBAT" | "DISPENSASI">
  >({});

  // CBT Exam Modal
  const [cbtModalOpen, setCbtModalOpen] = useState(false);
  const [cbtTitle, setCbtTitle] = useState("");
  const [cbtDuration, setCbtDuration] = useState(60);

  // CBT Question Modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [qPrompt, setQPrompt] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [correctOpt, setCorrectOpt] = useState("A");

  // CBT Taking Modal (Student)
  const [takeExamModalOpen, setTakeExamModalOpen] = useState(false);
  const [takingExam, setTakingExam] = useState<any>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examScore, setExamScore] = useState<number | null>(null);

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
    try {
      const records = course.classRoom.students.map((s) => ({
        studentId: s.id,
        status: studentStatusMap[s.id] || "HADIR",
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
    try {
      await createCourseAssessment({
        courseId: id,
        title: cbtTitle.trim(),
        durationMinutes: Number(cbtDuration),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setCbtModalOpen(false);
      setCbtTitle("");
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAssessmentQuestion({
        assessmentId: selectedAssessmentId,
        questionType: "MULTIPLE_CHOICE",
        prompt: qPrompt.trim(),
        options: [
          { id: "A", text: qOptA.trim(), isCorrect: correctOpt === "A" },
          { id: "B", text: qOptB.trim(), isCorrect: correctOpt === "B" },
          { id: "C", text: qOptC.trim(), isCorrect: correctOpt === "C" },
          { id: "D", text: qOptD.trim(), isCorrect: correctOpt === "D" },
        ],
        points: 25,
      });
      setQuestionModalOpen(false);
      setQPrompt("");
      setQOptA("");
      setQOptB("");
      setQOptC("");
      setQOptD("");
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitExam = async () => {
    if (!takingExam) return;
    try {
      const res = await submitAssessmentAnswers({
        assessmentId: takingExam.id,
        answers: examAnswers,
      });
      setExamScore(res.score);
      await refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const correctOptOptions = [
    { value: "A", label: "Opsi A" },
    { value: "B", label: "Opsi B" },
    { value: "C", label: "Opsi C" },
    { value: "D", label: "Opsi D" },
  ];

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
                    const initMap: Record<string, "HADIR" | "SAKIT" | "IZIN" | "ALPA"> = {};
                    course.classRoom.students.forEach((s) => {
                      initMap[s.id] = "HADIR";
                    });
                    setStudentStatusMap(initMap);
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

        {/* Tab 5: CBT Exams */}
        {activeTab === "CBT" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-title-large font-bold text-md-on-surface">Ujian Daring CBT</h2>
              {canManageCourse && (
                <M3Button
                  variant="filled"
                  size="sm"
                  icon="add"
                  onClick={() => setCbtModalOpen(true)}
                >
                  Jadwalkan Ujian CBT
                </M3Button>
              )}
            </div>

            {course.assessments.length === 0 ? (
              <M3Card variant="outlined" className="p-12 text-center">
                <p className="text-body-large text-md-on-surface-variant">
                  Belum ada jadwal ujian CBT yang dibuat.
                </p>
              </M3Card>
            ) : (
              <div className="space-y-4">
                {course.assessments.map((cbt) => (
                  <M3Card key={cbt.id} variant="elevated" className="p-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <div>
                          <h3 className="text-title-medium font-bold text-md-on-surface">{cbt.title}</h3>
                          <p className="text-body-small text-md-on-surface-variant mt-0.5">
                            Durasi: {cbt.durationMinutes} Menit • {cbt.questions.length} Butir Soal
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {canManageCourse && (
                            <M3Button
                              variant="outlined"
                              size="sm"
                              icon="add"
                              onClick={() => {
                                setSelectedAssessmentId(cbt.id);
                                setQuestionModalOpen(true);
                              }}
                            >
                              Tambah Soal
                            </M3Button>
                          )}
                          {isStudent && (
                            <M3Button
                              variant="filled"
                              size="sm"
                              onClick={() => {
                                setTakingExam(cbt);
                                setExamAnswers({});
                                setExamScore(null);
                                setTakeExamModalOpen(true);
                              }}
                            >
                              Kerjakan Ujian
                            </M3Button>
                          )}
                      </div>
                      </div>

                      {cbt.results.length > 0 && (
                        <div className="pt-3 border-t border-md-outline/10 text-body-small text-md-on-surface-variant">
                          Nilai Siswa Terbaru:{" "}
                          {cbt.results.map((res) => (
                            <span key={res.id} className="font-bold text-md-on-surface mr-2">
                              {res.student.name}: {res.score}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </M3Card>
                ))}
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
          onClose={() => setAttendanceModalOpen(false)}
          title={`Presensi Pertemuan ke-${sessionNum}`}
          description="Tandai kehadiran masing-masing siswa di kelas."
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {course.classRoom.students.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-md-md border border-md-outline/20 bg-md-surface-container-low"
                >
                  <span className="font-semibold text-body-medium text-md-on-surface">
                    {s.name}
                  </span>
                  <div className="flex gap-1">
                    {(["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DISPENSASI", "ALPA"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setStudentStatusMap((prev) => ({
                            ...prev,
                            [s.id]: st,
                          }))
                        }
                        className={`px-3 py-1 rounded-md-full text-label-small font-bold transition-all ${
                          (studentStatusMap[s.id] || "HADIR") === st
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
                onClick={() => setAttendanceModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" onClick={handleSaveAttendance}>
                Simpan Presensi
              </M3Button>
            </div>
          </div>
        </M3Dialog>

        {/* Dialog Add CBT Exam */}
        <M3Dialog
          isOpen={canManageCourse && cbtModalOpen}
          onClose={() => setCbtModalOpen(false)}
          title="Jadwalkan Ujian CBT"
          description="Buat paket ujian online untuk kelas ini."
        >
          <form onSubmit={handleAddCbt} className="space-y-4 pt-2">
            <M3TextField
              label="Judul Ujian *"
              placeholder="Contoh: Penilaian Akhir Semester Ganjil"
              value={cbtTitle}
              onChange={(e) => setCbtTitle(e.target.value)}
              required
            />

            <M3TextField
              label="Durasi Pengerjaan (Menit) *"
              type="number"
              placeholder="60"
              value={String(cbtDuration)}
              onChange={(e) => setCbtDuration(Number(e.target.value) || 60)}
              required
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                type="button"
                onClick={() => setCbtModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" type="submit">
                Simpan Ujian
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Add CBT Question */}
        <M3Dialog
          isOpen={canManageCourse && questionModalOpen}
          onClose={() => setQuestionModalOpen(false)}
          title="Tambah Butir Soal CBT"
          description="Tuliskan pertanyaan pilihan ganda dan kunci jawaban."
        >
          <form onSubmit={handleAddQuestion} className="space-y-4 pt-2">
            <div>
              <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                Teks Pertanyaan *
              </label>
              <textarea
                className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                placeholder="Tuliskan butir soal..."
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                rows={3}
                required
              />
            </div>

            <M3TextField
              label="Pilihan Opsi A *"
              placeholder="Teks opsi A..."
              value={qOptA}
              onChange={(e) => setQOptA(e.target.value)}
              required
            />
            <M3TextField
              label="Pilihan Opsi B *"
              placeholder="Teks opsi B..."
              value={qOptB}
              onChange={(e) => setQOptB(e.target.value)}
              required
            />
            <M3TextField
              label="Pilihan Opsi C *"
              placeholder="Teks opsi C..."
              value={qOptC}
              onChange={(e) => setQOptC(e.target.value)}
              required
            />
            <M3TextField
              label="Pilihan Opsi D *"
              placeholder="Teks opsi D..."
              value={qOptD}
              onChange={(e) => setQOptD(e.target.value)}
              required
            />

            <M3Select
              label="Kunci Jawaban Benar *"
              options={correctOptOptions}
              value={correctOpt}
              onChange={(e) => setCorrectOpt(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
              <M3Button
                variant="outlined"
                type="button"
                onClick={() => setQuestionModalOpen(false)}
              >
                Batal
              </M3Button>
              <M3Button variant="filled" type="submit">
                Simpan Soal
              </M3Button>
            </div>
          </form>
        </M3Dialog>

        {/* Dialog Take CBT Exam Simulation */}
        <M3Dialog
          isOpen={isStudent && takeExamModalOpen && !!takingExam}
          onClose={() => setTakeExamModalOpen(false)}
          title={takingExam?.title || "Simulasi Ujian CBT"}
          description="Pengerjaan tes daring interaktif siswa."
        >
          <div className="space-y-4 pt-2">
            {examScore !== null ? (
              <div className="p-8 text-center bg-md-secondary/10 rounded-md-xl">
                <M3Icon name="check_circle" size={48} className="text-md-secondary mx-auto mb-2 block" />
                <h3 className="text-headline-small font-bold text-md-on-surface">Ujian Selesai!</h3>
                <p className="text-body-medium text-md-on-surface-variant mt-1">
                  Skor Nilai Otomatis Anda:
                </p>
                <div className="text-display-medium font-extrabold text-md-secondary mt-2">
                  {examScore}
                </div>
                <div className="mt-6">
                  <M3Button
                    variant="filled"
                    size="sm"
                    onClick={() => setTakeExamModalOpen(false)}
                  >
                    Tutup Simulasi
                  </M3Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {takingExam?.questions.map((q: any, qIdx: number) => (
                    <M3Card key={q.id} variant="outlined" className="p-4">
                      <div className="space-y-3">
                        <p className="font-semibold text-body-medium text-md-on-surface">
                          {qIdx + 1}. {q.prompt}
                        </p>
                        <div className="space-y-2">
                          {Array.isArray(q.options) &&
                            q.options.map((opt: any) => {
                              const isSelected = examAnswers[q.id] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    setExamAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: opt.id,
                                    }))
                                  }
                                  className={`w-full text-left p-3 rounded-md-md text-body-medium transition-all flex items-center gap-3 border ${
                                    isSelected
                                      ? "bg-md-primary-container text-md-on-primary-container border-md-primary font-medium"
                                      : "bg-md-surface text-md-on-surface border-md-outline/30 hover:bg-md-surface-container"
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-md-primary bg-md-primary"
                                        : "border-md-outline"
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-md-on-primary" />
                                    )}
                                  </div>
                                  <span>
                                    {opt.id}. {opt.text}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </M3Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-md-outline/10">
                  <M3Button
                    variant="outlined"
                    onClick={() => setTakeExamModalOpen(false)}
                  >
                    Batal
                  </M3Button>
                  <M3Button
                    variant="filled"
                    onClick={handleSubmitExam}
                  >
                    Kirim Jawaban Ujian
                  </M3Button>
                </div>
              </div>
            )}
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
