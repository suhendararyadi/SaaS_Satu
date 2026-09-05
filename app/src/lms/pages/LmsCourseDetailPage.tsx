import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useParams, Link } from "react-router";
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
  BookOpen,
  FileText,
  ClipboardList,
  CalendarCheck,
  UserCheck,
  Award,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  X,
  Star,
  ExternalLink,
} from "lucide-react";

export function LmsCourseDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading, refetch } = useQuery(
    getLmsCourseDetail,
    { courseId: id || "" },
    { enabled: !!id }
  );

  const [activeTab, setActiveTab] = useState<
    "MATERIALS" | "ASSIGNMENTS" | "AGENDAS" | "ATTENDANCE" | "CBT"
  >("MATERIALS");

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
    Record<string, "HADIR" | "SAKIT" | "IZIN" | "ALPA">
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
        title: matTitle,
        description: matDesc || null,
        externalUrl: matUrl || null,
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
        title: assTitle,
        instruction: assInstruction,
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
        period: agendaPeriod,
        competency: agendaCompetency,
        summary: agendaSummary,
        photoUrls: agendaPhoto ? [agendaPhoto] : undefined,
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
        title: cbtTitle,
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
        prompt: qPrompt,
        options: [
          { id: "A", text: qOptA, isCorrect: correctOpt === "A" },
          { id: "B", text: qOptB, isCorrect: correctOpt === "B" },
          { id: "C", text: qOptC, isCorrect: correctOpt === "C" },
          { id: "D", text: qOptD, isCorrect: correctOpt === "D" },
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

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </SchoolLayout>
    );
  }

  if (!course) {
    return (
      <SchoolLayout user={user}>
        <p>Data mapel tidak ditemukan.</p>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      {/* Header */}
      <div>
        <Link
          to="/school/lms/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Mapel
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {course.classRoom.name} • {course.academicYear.yearName}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {course.subjectName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Guru Pengampu: <strong>{course.teacher.name}</strong> • {course.classRoom.students.length} Siswa Terdaftar
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("MATERIALS")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 whitespace-nowrap ${
            activeTab === "MATERIALS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500"
          }`}
        >
          <FileText className="w-4 h-4" />
          Materi ({course.materials.length})
        </button>
        <button
          onClick={() => setActiveTab("ASSIGNMENTS")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 whitespace-nowrap ${
            activeTab === "ASSIGNMENTS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Tugas ({course.assignments.length})
        </button>
        <button
          onClick={() => setActiveTab("AGENDAS")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 whitespace-nowrap ${
            activeTab === "AGENDAS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Agenda KBM ({course.agendas.length})
        </button>
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 whitespace-nowrap ${
            activeTab === "ATTENDANCE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Presensi Kelas ({course.attendances.length})
        </button>
        <button
          onClick={() => setActiveTab("CBT")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 whitespace-nowrap ${
            activeTab === "CBT"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500"
          }`}
        >
          <Award className="w-4 h-4" />
          Ujian CBT ({course.assessments.length})
        </button>
      </div>

      {/* Tab 1: Materials */}
      {activeTab === "MATERIALS" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setMaterialModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Tambah Materi
            </button>
          </div>
          {course.materials.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">Belum ada materi dibagikan.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.materials.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
                >
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{m.title}</h3>
                  {m.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{m.description}</p>}
                  {m.externalUrl && (
                    <a
                      href={m.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Buka Tautan Materi <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assignments */}
      {activeTab === "ASSIGNMENTS" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setAssignmentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Buat Tugas Baru
            </button>
          </div>
          {course.assignments.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">Belum ada tugas pembelajaran.</p>
          ) : (
            <div className="space-y-4">
              {course.assignments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{a.title}</h3>
                    <span className="text-xs font-mono text-slate-500">
                      Tenggat: {new Date(a.deadline).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{a.instruction}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    {a.submissions.length} siswa telah mengumpulkan tugas.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Agendas */}
      {activeTab === "AGENDAS" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setAgendaModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Isi Agenda Pertemuan KBM
            </button>
          </div>
          {course.agendas.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">Belum ada agenda KBM.</p>
          ) : (
            <div className="space-y-4">
              {course.agendas.map((ag) => (
                <div
                  key={ag.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-600">{ag.period}</span>
                    <span className="text-slate-400">
                      {new Date(ag.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Materi / KD: {ag.competency}
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{ag.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Attendance */}
      {activeTab === "ATTENDANCE" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                const initMap: Record<string, "HADIR" | "SAKIT" | "IZIN" | "ALPA"> = {};
                course.classRoom.students.forEach((s) => {
                  initMap[s.id] = "HADIR";
                });
                setStudentStatusMap(initMap);
                setSessionNum(course.attendances.length + 1);
                setAttendanceModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Buka Sesi Presensi Baru
            </button>
          </div>
          {course.attendances.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">Belum ada sesi presensi KBM.</p>
          ) : (
            <div className="space-y-4">
              {course.attendances.map((att) => (
                <div
                  key={att.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Pertemuan ke-{att.sessionNumber}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {new Date(att.date).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {att.records.map((r) => (
                      <span
                        key={r.id}
                        className={`px-2 py-1 rounded-md font-medium ${
                          r.status === "HADIR"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : r.status === "ALPA"
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {r.student.name}: {r.status}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: CBT */}
      {activeTab === "CBT" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setCbtModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Jadwalkan Ujian CBT
            </button>
          </div>
          {course.assessments.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">Belum ada ujian CBT dibuat.</p>
          ) : (
            <div className="space-y-4">
              {course.assessments.map((cbt) => (
                <div
                  key={cbt.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{cbt.title}</h3>
                      <p className="text-xs text-slate-500">
                        Durasi: {cbt.durationMinutes} Menit • {cbt.questions.length} Butir Soal
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssessmentId(cbt.id);
                          setQuestionModalOpen(true);
                        }}
                        className="px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        + Tambah Soal
                      </button>
                      <button
                        onClick={() => {
                          setTakingExam(cbt);
                          setExamAnswers({});
                          setExamScore(null);
                          setTakeExamModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                      >
                        Kerjakan Simulasi
                      </button>
                    </div>
                  </div>

                  {cbt.results.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      Nilai Terbaru:{" "}
                      {cbt.results.map((res) => (
                        <span key={res.id} className="font-bold text-slate-800 dark:text-slate-200 mr-2">
                          {res.student.name}: {res.score}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Material */}
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Tambah Materi Ajar</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Judul Materi"
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <textarea
                placeholder="Deskripsi singkat..."
                value={matDesc}
                onChange={(e) => setMatDesc(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <input
                type="url"
                placeholder="Tautan Berkas / Video (Opsional)"
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Attendance */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 my-8">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">
              Presensi Pertemuan ke-{sessionNum}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {course.classRoom.students.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                  <div className="flex gap-1">
                    {(["HADIR", "SAKIT", "IZIN", "ALPA"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setStudentStatusMap((prev) => ({
                            ...prev,
                            [s.id]: st,
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          (studentStatusMap[s.id] || "HADIR") === st
                            ? st === "HADIR"
                              ? "bg-emerald-600 text-white"
                              : st === "ALPA"
                              ? "bg-red-600 text-white"
                              : "bg-amber-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold"
              >
                Simpan Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CBT Taking Simulation */}
      {takeExamModalOpen && takingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">{takingExam.title}</h3>
                <p className="text-xs text-slate-500">Pengerjaan Tes CBT Siswa</p>
              </div>
              <button onClick={() => setTakeExamModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {examScore !== null ? (
              <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white">Ujian Selesai!</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Skor Nilai Otomatis Anda:</p>
                <div className="text-4xl font-extrabold text-emerald-600 mt-2">{examScore}</div>
              </div>
            ) : (
              <div className="space-y-6">
                {takingExam.questions.map((q: any, qIdx: number) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">
                      {qIdx + 1}. {q.prompt}
                    </p>
                    <div className="space-y-2">
                      {Array.isArray(q.options) &&
                        q.options.map((opt: any) => (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              examAnswers[q.id] === opt.id
                                ? "bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={examAnswers[q.id] === opt.id}
                              onChange={() =>
                                setExamAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: opt.id,
                                }))
                              }
                              className="accent-indigo-600"
                            />
                            <span>
                              <strong>{opt.id}.</strong> {opt.text}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                >
                  Kirim Jawaban Ujian
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
