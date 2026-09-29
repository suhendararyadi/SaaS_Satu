import { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useParams } from "react-router";
import {
  useQuery,
  getCbtTeacherWorkspace,
  getCbtStudentWorkspace,
  getCbtQuestionBank,
  updateCbtAssessmentSettings,
  regenerateCbtToken,
  addCbtQuestion,
  updateCbtQuestion,
  deleteCbtQuestion,
  addCbtQuestionFromBank,
  deleteCbtQuestionBankItem,
  importCbtQuestions,
  startCbtAttempt,
  saveCbtAnswers,
  submitCbtAttempt,
  gradeCbtEssayAnswer,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3Icon,
  M3Select,
  M3Tabs,
  M3TextField,
} from "../../client/components/m3";

type QuestionDraft = {
  questionType: "MULTIPLE_CHOICE" | "ESSAY";
  prompt: string;
  points: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  saveToBank: boolean;
};

const emptyQuestion = (): QuestionDraft => ({
  questionType: "MULTIPLE_CHOICE",
  prompt: "",
  points: 10,
  difficulty: "MEDIUM",
  explanation: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correct: "A",
  saveToBank: true,
});

function toLocalInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 10) / 10}%`;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (quoted) throw new Error("CSV tidak valid: tanda kutip belum ditutup.");
  return rows;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    NOT_STARTED: { label: "Belum mulai", variant: "outline" },
    IN_PROGRESS: { label: "Mengerjakan", variant: "warning" },
    SUBMITTED: { label: "Terkirim", variant: "secondary" },
    AUTO_SUBMITTED: { label: "Otomatis terkirim", variant: "secondary" },
    GRADED: { label: "Dinilai", variant: "success" },
    LEGACY_RESULT: { label: "Selesai", variant: "success" },
  };
  return map[status] || { label: status, variant: "outline" };
}

function TeacherWorkspace({ user, assessmentId }: { user: AuthUser; assessmentId: string }) {
  const workspace = useQuery(getCbtTeacherWorkspace, { assessmentId });
  const bank = useQuery(
    getCbtQuestionBank,
    { courseId: workspace.data?.course?.id || "00000000-0000-0000-0000-000000000000" },
    { enabled: !!workspace.data?.course?.id },
  );
  const [tab, setTab] = useState("SETTINGS");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [questionOpen, setQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [question, setQuestion] = useState<QuestionDraft>(emptyQuestion());
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradingAnswer, setGradingAnswer] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [attemptDetailOpen, setAttemptDetailOpen] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<any>(null);

  const [settings, setSettings] = useState({
    title: "",
    instructions: "",
    durationMinutes: 60,
    startTime: "",
    endTime: "",
    status: "PUBLISHED",
    attemptLimit: 1,
    passingScore: 75,
    isRandomized: true,
    shuffleOptions: false,
    requireToken: false,
    showScoreMode: "IMMEDIATE",
    version: 1,
  });

  useEffect(() => {
    const value: any = workspace.data?.assessment;
    if (!value) return;
    setSettings({
      title: value.title || "",
      instructions: value.instructions || "",
      durationMinutes: value.durationMinutes || 60,
      startTime: toLocalInput(value.startTime),
      endTime: toLocalInput(value.endTime),
      status: value.status || "PUBLISHED",
      attemptLimit: value.attemptLimit || 1,
      passingScore: value.passingScore ?? 75,
      isRandomized: !!value.isRandomized,
      shuffleOptions: !!value.shuffleOptions,
      requireToken: !!value.requireToken,
      showScoreMode: value.showScoreMode || "IMMEDIATE",
      version: value.version || 1,
    });
  }, [workspace.data?.assessment?.id, workspace.data?.assessment?.version]);

  const run = async (task: () => Promise<any>, message: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(message);
      await Promise.all([workspace.refetch(), bank.refetch()]);
    } catch (err: any) {
      setError(err?.message || "Operasi CBT belum dapat diproses.");
    } finally {
      setBusy(false);
    }
  };

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestion(emptyQuestion());
    setQuestionOpen(true);
  };

  const openEditQuestion = (item: any) => {
    const options = Array.isArray(item.options) ? item.options : [];
    const byId = new Map<string, any>(options.map((option: any) => [option.id, option]));
    const correct = options.find((option: any) => option.isCorrect)?.id || "A";
    setEditingQuestion(item);
    setQuestion({
      questionType: item.questionType,
      prompt: item.prompt || "",
      points: item.points || 10,
      difficulty: "MEDIUM",
      explanation: item.explanation || "",
      optionA: byId.get("A")?.text || "",
      optionB: byId.get("B")?.text || "",
      optionC: byId.get("C")?.text || "",
      optionD: byId.get("D")?.text || "",
      correct,
      saveToBank: false,
    });
    setQuestionOpen(true);
  };

  const questionPayload = () => ({
    questionType: question.questionType,
    prompt: question.prompt,
    points: Number(question.points),
    difficulty: question.difficulty,
    explanation: question.explanation || undefined,
    tags: [],
    options:
      question.questionType === "MULTIPLE_CHOICE"
        ? [
            { id: "A", text: question.optionA, isCorrect: question.correct === "A" },
            { id: "B", text: question.optionB, isCorrect: question.correct === "B" },
            { id: "C", text: question.optionC, isCorrect: question.correct === "C" },
            { id: "D", text: question.optionD, isCorrect: question.correct === "D" },
          ]
        : [],
  });

  const saveQuestion = async () => {
    const payload = questionPayload();
    if (editingQuestion) {
      await run(
        () => updateCbtQuestion({ questionId: editingQuestion.id, question: payload }),
        "Soal diperbarui.",
      );
    } else {
      await run(
        () =>
          addCbtQuestion({
            assessmentId,
            saveToBank: question.saveToBank,
            question: payload,
          }),
        "Soal ditambahkan.",
      );
    }
    setQuestionOpen(false);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const csvRows = parseCsvRows(text);
    if (csvRows.length < 2) throw new Error("CSV harus memiliki header dan minimal satu soal.");
    const header = csvRows[0].map((cell) => cell.trim().toLowerCase());
    const index = (name: string) => header.indexOf(name);
    if (index("prompt") < 0) throw new Error("CSV wajib memiliki kolom prompt.");
    const rows = csvRows.slice(1).map((cells) => {
      const type = (cells[index("type")] || "MULTIPLE_CHOICE").toUpperCase();
      const prompt = cells[index("prompt")] || "";
      const points = Number(cells[index("points")] || 10);
      const difficulty = (cells[index("difficulty")] || "MEDIUM").toUpperCase();
      if (type === "ESSAY") {
        return {
          questionType: "ESSAY" as const,
          prompt,
          points,
          difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty)
            ? (difficulty as "EASY" | "MEDIUM" | "HARD")
            : "MEDIUM",
          options: [],
          tags: [],
        };
      }
      const correct = (cells[index("correct")] || "A").toUpperCase();
      return {
        questionType: "MULTIPLE_CHOICE" as const,
        prompt,
        points,
        difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty)
          ? (difficulty as "EASY" | "MEDIUM" | "HARD")
          : "MEDIUM",
        tags: [],
        options: ["A", "B", "C", "D"].map((id) => ({
          id,
          text: cells[index(id.toLowerCase())] || "",
          isCorrect: id === correct,
        })),
      };
    });
    await run(
      () => importCbtQuestions({ assessmentId, saveToBank: true, questions: rows }),
      `${rows.length} soal diimpor.`,
    );
  };

  if (workspace.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <M3CircularProgress size={40} />
      </div>
    );
  }

  if (workspace.error || !workspace.data) {
    return (
      <M3Banner
        variant="error"
        headline="Workspace CBT belum dapat dimuat"
        supportingText={(workspace.error as any)?.message || "Ujian tidak ditemukan."}
      />
    );
  }

  const data: any = workspace.data;
  const assessment = data.assessment;
  const tabs = [
    { id: "SETTINGS", label: "Pengaturan", icon: <M3Icon name="tune" size={16} /> },
    { id: "QUESTIONS", label: `Soal (${assessment.questions.length})`, icon: <M3Icon name="quiz" size={16} /> },
    { id: "MONITOR", label: "Monitoring", icon: <M3Icon name="monitoring" size={16} /> },
    { id: "GRADING", label: `Koreksi (${data.summary.pendingEssay})`, icon: <M3Icon name="grading" size={16} /> },
    { id: "ANALYSIS", label: "Analisis", icon: <M3Icon name="analytics" size={16} /> },
    { id: "AUDIT", label: "Audit", icon: <M3Icon name="history" size={16} /> },
  ];

  const pendingEssayRows = assessment.attempts.flatMap((attempt: any) =>
    attempt.answers
      .filter((answer: any) => {
        const q = assessment.questions.find((item: any) => item.id === answer.questionId);
        return q?.questionType === "ESSAY" && !!answer.answerText?.trim() && answer.manualScore === null;
      })
      .map((answer: any) => ({
        answer,
        attempt,
        question: assessment.questions.find((item: any) => item.id === answer.questionId),
      })),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <a href={`/school/lms/courses/${data.course.id}`} className="text-xs font-semibold text-md-primary">
            ← {data.course.subjectName}
          </a>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
            {assessment.title}
          </h1>
          <p className="mt-1 text-sm text-md-on-surface-variant">
            CBT Gen2 · {formatDateTime(assessment.startTime)} — {formatDateTime(assessment.endTime)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <M3Badge variant={assessment.status === "PUBLISHED" ? "success" : "outline"} size="sm">
            {assessment.status}
          </M3Badge>
          <M3Badge variant="secondary" size="sm">{assessment.durationMinutes} menit</M3Badge>
          <M3Badge variant="outline" size="sm">{data.totalPoints} poin</M3Badge>
        </div>
      </div>

      {notice && <M3Banner variant="success" supportingText={notice} />}
      {error && <M3Banner variant="error" supportingText={error} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Peserta", data.summary.eligibleStudents, "groups"],
          ["Belum Mulai", data.summary.notStarted, "schedule"],
          ["Mengerjakan", data.summary.inProgress, "edit_note"],
          ["Terkirim", data.summary.submitted, "task_alt"],
          ["Esai Pending", data.summary.pendingEssay, "grading"],
        ].map(([label, value, icon]) => (
          <M3Card key={String(label)} variant="filled" className="p-4">
            <div className="flex items-center gap-2 text-md-on-surface-variant">
              <M3Icon name={String(icon)} size={17} />
              <span className="text-[11px] font-semibold uppercase tracking-[.05em]">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-md-on-surface">{String(value)}</div>
          </M3Card>
        ))}
      </div>

      <M3Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === "SETTINGS" && (
        <M3Card variant="outlined" className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <M3TextField label="Judul Ujian" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
            <M3TextField label="Durasi (menit)" type="number" min="5" max="480" value={String(settings.durationMinutes)} onChange={(e) => setSettings({ ...settings, durationMinutes: Number(e.target.value) })} />
            <M3TextField label="Mulai" type="datetime-local" value={settings.startTime} onChange={(e) => setSettings({ ...settings, startTime: e.target.value })} />
            <M3TextField label="Selesai" type="datetime-local" value={settings.endTime} onChange={(e) => setSettings({ ...settings, endTime: e.target.value })} />
            <M3Select label="Status" value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value })} options={[
              { value: "DRAFT", label: "Draft" },
              { value: "PUBLISHED", label: "Dipublikasikan" },
              { value: "ARCHIVED", label: "Diarsipkan" },
            ]} />
            <M3TextField label="Batas Attempt" type="number" min="1" max="10" value={String(settings.attemptLimit)} onChange={(e) => setSettings({ ...settings, attemptLimit: Number(e.target.value) })} />
            <M3TextField label="KKM / Passing Score (%)" type="number" min="0" max="100" value={String(settings.passingScore)} onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })} />
            <M3Select label="Tampilkan Nilai" value={settings.showScoreMode} onChange={(e) => setSettings({ ...settings, showScoreMode: e.target.value })} options={[
              { value: "IMMEDIATE", label: "Setelah submit & grading selesai" },
              { value: "AFTER_END", label: "Setelah jadwal ujian berakhir" },
              { value: "HIDDEN", label: "Sembunyikan" },
            ]} />
            <label className="flex items-center gap-2 text-sm text-md-on-surface">
              <input type="checkbox" checked={settings.isRandomized} onChange={(e) => setSettings({ ...settings, isRandomized: e.target.checked })} />
              Acak urutan soal per attempt
            </label>
            <label className="flex items-center gap-2 text-sm text-md-on-surface">
              <input type="checkbox" checked={settings.shuffleOptions} onChange={(e) => setSettings({ ...settings, shuffleOptions: e.target.checked })} />
              Acak opsi pilihan ganda
            </label>
            <label className="flex items-center gap-2 text-sm text-md-on-surface">
              <input type="checkbox" checked={settings.requireToken} onChange={(e) => setSettings({ ...settings, requireToken: e.target.checked })} />
              Wajib token ujian
            </label>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Instruksi</label>
              <textarea rows={4} value={settings.instructions} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} className="w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-sm text-md-on-surface outline-none focus:border-md-primary" />
            </div>
          </div>
          {settings.requireToken && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[12px] bg-md-surface-container-low p-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-md-on-surface-variant">Token aktif</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-[.2em] text-md-on-surface">
                  {assessment.accessToken || "Belum dibuat"}
                </p>
              </div>
              <M3Button
                variant="outlined"
                size="sm"
                icon="refresh"
                disabled={busy}
                onClick={() => run(() => regenerateCbtToken({ assessmentId }), "Token baru dibuat.")}
              >
                Regenerasi Token
              </M3Button>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <M3Button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    updateCbtAssessmentSettings({
                      assessmentId,
                      expectedVersion: settings.version,
                      title: settings.title,
                      instructions: settings.instructions || undefined,
                      durationMinutes: settings.durationMinutes,
                      startTime: new Date(settings.startTime).toISOString(),
                      endTime: new Date(settings.endTime).toISOString(),
                      status: settings.status as any,
                      attemptLimit: settings.attemptLimit,
                      passingScore: settings.passingScore,
                      isRandomized: settings.isRandomized,
                      shuffleOptions: settings.shuffleOptions,
                      requireToken: settings.requireToken,
                      showScoreMode: settings.showScoreMode as any,
                    }),
                  "Pengaturan CBT disimpan.",
                )
              }
            >
              Simpan Pengaturan
            </M3Button>
          </div>
        </M3Card>
      )}

      {tab === "QUESTIONS" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-md-on-surface">Paket Soal</h2>
                <p className="text-xs text-md-on-surface-variant">Struktur dikunci setelah attempt pertama dimulai.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-md-outline-variant px-3 py-2 text-xs font-semibold text-md-primary hover:bg-md-primary/5">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      importCsv(file).catch((err) => setError(err.message));
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <M3Button size="sm" icon="add" onClick={openCreateQuestion}>Tambah Soal</M3Button>
              </div>
            </div>
            {assessment.questions.length === 0 ? (
              <M3Banner variant="standard" headline="Belum ada soal" supportingText="Tambahkan soal baru, pilih dari bank soal, atau import CSV." />
            ) : (
              assessment.questions.map((item: any, index: number) => (
                <M3Card key={item.id} variant="outlined" className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-xs font-bold text-md-primary">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        <M3Badge variant="outline" size="sm">{item.questionType === "ESSAY" ? "Esai" : "Pilihan Ganda"}</M3Badge>
                        <M3Badge variant="secondary" size="sm">{item.points} poin</M3Badge>
                        {item.bankItemId && <M3Badge variant="outline" size="sm">Bank</M3Badge>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-md-on-surface">{item.prompt}</p>
                      {item.questionType === "MULTIPLE_CHOICE" && Array.isArray(item.options) && (
                        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {item.options.map((option: any) => (
                            <div key={option.id} className={`rounded-[8px] border px-2.5 py-2 text-xs ${option.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-md-outline-variant text-md-on-surface"}`}>
                              <strong>{option.id}.</strong> {option.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <M3Button variant="icon" size="icon-sm" icon="edit" aria-label="Edit soal" onClick={() => openEditQuestion(item)} />
                      <M3Button
                        variant="icon"
                        size="icon-sm"
                        icon="delete"
                        aria-label="Hapus soal"
                        onClick={() => {
                          if (!window.confirm("Hapus soal ini dari ujian?")) return;
                          run(() => deleteCbtQuestion({ questionId: item.id }), "Soal dihapus.");
                        }}
                      />
                    </div>
                  </div>
                </M3Card>
              ))
            )}
          </div>

          <M3Card variant="outlined" className="self-start overflow-hidden xl:sticky xl:top-4">
            <div className="border-b border-md-outline-variant px-4 py-3">
              <h2 className="text-sm font-semibold text-md-on-surface">Bank Soal</h2>
              <p className="mt-0.5 text-xs text-md-on-surface-variant">{bank.data?.length || 0} butir tersimpan untuk mapel ini</p>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto p-3">
              {(bank.data || []).length === 0 ? (
                <p className="p-2 text-xs text-md-on-surface-variant">Bank soal masih kosong. Saat membuat soal baru, aktifkan “Simpan ke Bank Soal”.</p>
              ) : (
                (bank.data || []).map((item: any) => (
                  <div key={item.id} className="rounded-[10px] bg-md-surface-container-low p-3">
                    <div className="flex items-center gap-1.5">
                      <M3Badge variant="outline" size="sm">{item.questionType === "ESSAY" ? "Esai" : "PG"}</M3Badge>
                      <M3Badge variant="outline" size="sm">{item.difficulty}</M3Badge>
                      <span className="ml-auto text-[11px] font-semibold text-md-on-surface-variant">{item.points}p</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs font-medium leading-5 text-md-on-surface">{item.prompt}</p>
                    <div className="mt-2 flex gap-1">
                      <M3Button size="sm" variant="tonal" onClick={() => run(() => addCbtQuestionFromBank({ assessmentId, bankItemId: item.id }), "Soal dari bank ditambahkan.")}>Tambah</M3Button>
                      <M3Button
                        size="sm"
                        variant="text"
                        onClick={() => {
                          if (!window.confirm("Hapus butir ini dari bank soal? Soal yang sudah ada di paket ujian tetap dipertahankan.")) return;
                          run(() => deleteCbtQuestionBankItem({ courseId: data.course.id, bankItemId: item.id }), "Butir bank dihapus.");
                        }}
                      >
                        Hapus
                      </M3Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </M3Card>
        </div>
      )}

      {tab === "MONITOR" && (
        <M3Card variant="outlined" className="overflow-hidden">
          <div className="border-b border-md-outline-variant px-4 py-3">
            <h2 className="text-sm font-semibold text-md-on-surface">Monitoring Peserta</h2>
            <p className="mt-0.5 text-xs text-md-on-surface-variant">Status attempt dan waktu berasal dari server.</p>
          </div>
          <div className="divide-y divide-md-outline-variant/60">
            {data.monitoring.map((row: any) => {
              const badge = statusBadge(row.status);
              return (
                <div key={row.student.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.5fr)_140px_170px_90px_80px] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-md-on-surface">{row.student.name}</p>
                    <p className="text-[11px] text-md-on-surface-variant">{row.student.email || "Tanpa email"}</p>
                  </div>
                  <M3Badge variant={badge.variant} size="sm">{badge.label}</M3Badge>
                  <div className="text-[11px] leading-5 text-md-on-surface-variant">
                    <div>Mulai: {formatDateTime(row.startedAt)}</div>
                    <div>Kirim: {formatDateTime(row.submittedAt)}</div>
                  </div>
                  <div className="text-right text-sm font-semibold text-md-on-surface">
                    {row.percentage !== null ? formatPercent(row.percentage) : row.scoreTotal !== null ? `${row.scoreTotal}p` : "—"}
                  </div>
                  <div className="text-right">
                    {row.attemptId ? (
                      <M3Button
                        size="sm"
                        variant="text"
                        onClick={() => {
                          const detail = assessment.attempts.find((item: any) => item.id === row.attemptId);
                          setAttemptDetail(detail || null);
                          setAttemptDetailOpen(!!detail);
                        }}
                      >
                        Detail
                      </M3Button>
                    ) : (
                      <span className="text-[11px] text-md-on-surface-variant">Legacy</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </M3Card>
      )}

      {tab === "GRADING" && (
        <div className="space-y-3">
          {pendingEssayRows.length === 0 ? (
            <M3Banner variant="success" headline="Tidak ada esai menunggu koreksi" supportingText="Semua jawaban esai yang terkirim sudah dinilai." />
          ) : (
            pendingEssayRows.map((row: any) => (
              <M3Card key={row.answer.id} variant="outlined" className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <M3Badge variant="outline" size="sm">{row.attempt.student.name}</M3Badge>
                      <M3Badge variant="secondary" size="sm">Maks {row.question.points} poin</M3Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-md-on-surface">{row.question.prompt}</p>
                    <div className="mt-2 whitespace-pre-wrap rounded-[10px] bg-md-surface-container-low p-3 text-sm leading-6 text-md-on-surface">
                      {row.answer.answerText}
                    </div>
                  </div>
                  <M3Button
                    size="sm"
                    onClick={() => {
                      setGradingAnswer(row);
                      setGradeScore(0);
                      setGradeFeedback("");
                      setGradeOpen(true);
                    }}
                  >
                    Nilai
                  </M3Button>
                </div>
              </M3Card>
            ))
          )}
        </div>
      )}

      {tab === "ANALYSIS" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <M3Card variant="filled" className="p-4"><p className="text-xs text-md-on-surface-variant">Rata-rata</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.summary.averagePercentage)}</p></M3Card>
            <M3Card variant="filled" className="p-4"><p className="text-xs text-md-on-surface-variant">Tertinggi</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.summary.highestPercentage)}</p></M3Card>
            <M3Card variant="filled" className="p-4"><p className="text-xs text-md-on-surface-variant">Terendah</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.summary.lowestPercentage)}</p></M3Card>
          </div>
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="border-b border-md-outline-variant px-4 py-3">
              <h2 className="text-sm font-semibold">Analisis Butir</h2>
            </div>
            <div className="divide-y divide-md-outline-variant/60">
              {data.questionAnalysis.map((item: any, index: number) => (
                <div key={item.questionId} className="grid gap-2 px-4 py-3 sm:grid-cols-[60px_minmax(0,1fr)_160px] sm:items-center">
                  <span className="text-sm font-semibold">#{index + 1}</span>
                  <span className="text-xs text-md-on-surface-variant">
                    {item.questionType === "MULTIPLE_CHOICE"
                      ? `${item.correctCount}/${item.answeredCount} benar`
                      : `${item.pendingGradeCount} menunggu koreksi`}
                  </span>
                  <span className="text-right text-sm font-semibold">
                    {item.correctRate === null ? "Esai" : formatPercent(item.correctRate)}
                  </span>
                </div>
              ))}
            </div>
          </M3Card>
        </div>
      )}

      {tab === "AUDIT" && (
        <M3Card variant="outlined" className="overflow-hidden">
          <div className="border-b border-md-outline-variant px-4 py-3">
            <h2 className="text-sm font-semibold text-md-on-surface">Audit Trail CBT</h2>
            <p className="mt-0.5 text-xs text-md-on-surface-variant">80 event terbaru untuk ujian ini.</p>
          </div>
          <div className="divide-y divide-md-outline-variant/60">
            {assessment.events.length === 0 ? (
              <p className="p-4 text-sm text-md-on-surface-variant">Belum ada event CBT.</p>
            ) : assessment.events.map((event: any) => (
              <div key={event.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)_190px] sm:items-center">
                <M3Badge variant="outline" size="sm">{event.eventType}</M3Badge>
                <div>
                  <p className="text-xs font-medium text-md-on-surface">{event.actor?.name || "System"}</p>
                  {event.payload && (
                    <p className="mt-0.5 truncate text-[10.5px] text-md-on-surface-variant">{JSON.stringify(event.payload)}</p>
                  )}
                </div>
                <span className="text-[11px] text-md-on-surface-variant sm:text-right">{formatDateTime(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </M3Card>
      )}

      <M3Dialog
        isOpen={questionOpen}
        onClose={() => setQuestionOpen(false)}
        title={editingQuestion ? "Edit Soal CBT" : "Tambah Soal CBT"}
        description="Pilihan ganda dinilai otomatis; esai dikoreksi guru setelah dikirim."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <M3Select
              label="Tipe Soal"
              value={question.questionType}
              onChange={(e) => setQuestion({ ...question, questionType: e.target.value as any })}
              options={[
                { value: "MULTIPLE_CHOICE", label: "Pilihan Ganda" },
                { value: "ESSAY", label: "Esai" },
              ]}
            />
            <M3TextField label="Bobot Poin" type="number" min="1" value={String(question.points)} onChange={(e) => setQuestion({ ...question, points: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Pertanyaan</label>
            <textarea rows={4} value={question.prompt} onChange={(e) => setQuestion({ ...question, prompt: e.target.value })} className="w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-sm outline-none focus:border-md-primary" />
          </div>
          {question.questionType === "MULTIPLE_CHOICE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <M3TextField label="Opsi A" value={question.optionA} onChange={(e) => setQuestion({ ...question, optionA: e.target.value })} />
              <M3TextField label="Opsi B" value={question.optionB} onChange={(e) => setQuestion({ ...question, optionB: e.target.value })} />
              <M3TextField label="Opsi C" value={question.optionC} onChange={(e) => setQuestion({ ...question, optionC: e.target.value })} />
              <M3TextField label="Opsi D" value={question.optionD} onChange={(e) => setQuestion({ ...question, optionD: e.target.value })} />
              <M3Select label="Kunci Jawaban" value={question.correct} onChange={(e) => setQuestion({ ...question, correct: e.target.value })} options={["A","B","C","D"].map((value) => ({ value, label: `Opsi ${value}` }))} />
            </div>
          )}
          <M3TextField label="Pembahasan (opsional)" value={question.explanation} onChange={(e) => setQuestion({ ...question, explanation: e.target.value })} />
          {!editingQuestion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={question.saveToBank} onChange={(e) => setQuestion({ ...question, saveToBank: e.target.checked })} />
              Simpan juga ke Bank Soal
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-md-outline-variant pt-4">
            <M3Button variant="outlined" onClick={() => setQuestionOpen(false)}>Batal</M3Button>
            <M3Button disabled={busy} onClick={saveQuestion}>Simpan Soal</M3Button>
          </div>
        </div>
      </M3Dialog>

      <M3Dialog
        isOpen={attemptDetailOpen && !!attemptDetail}
        onClose={() => setAttemptDetailOpen(false)}
        title={attemptDetail?.student?.name ? `Detail Jawaban · ${attemptDetail.student.name}` : "Detail Jawaban"}
        description={attemptDetail ? `Attempt ${attemptDetail.attemptNo} · ${attemptDetail.status} · ${formatPercent(attemptDetail.percentage)}` : undefined}
        maxWidth="lg"
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pt-2">
          {attemptDetail && assessment.questions.map((question: any, index: number) => {
            const answer = attemptDetail.answers.find((item: any) => item.questionId === question.id);
            const selected = question.questionType === "MULTIPLE_CHOICE" && Array.isArray(question.options)
              ? question.options.find((option: any) => option.id === answer?.selectedOptionId)
              : null;
            const score = question.questionType === "MULTIPLE_CHOICE" ? answer?.autoScore : answer?.manualScore;
            return (
              <M3Card key={question.id} variant="outlined" className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-md-on-surface">{index + 1}. {question.prompt}</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-md-on-surface-variant">
                      {question.questionType === "MULTIPLE_CHOICE"
                        ? answer?.selectedOptionId ? `${answer.selectedOptionId}. ${selected?.text || ""}` : "Tidak dijawab"
                        : answer?.answerText || "Tidak dijawab"}
                    </p>
                    {answer?.feedback && <p className="mt-2 text-[11px] text-md-primary">Feedback: {answer.feedback}</p>}
                  </div>
                  <M3Badge variant={score === question.points ? "success" : "outline"} size="sm">
                    {score ?? "—"}/{question.points}
                  </M3Badge>
                </div>
              </M3Card>
            );
          })}
        </div>
      </M3Dialog>

      <M3Dialog
        isOpen={gradeOpen}
        onClose={() => setGradeOpen(false)}
        title="Nilai Jawaban Esai"
        description={gradingAnswer ? `Maksimal ${gradingAnswer.question.points} poin` : undefined}
      >
        <div className="space-y-4 pt-2">
          <M3TextField label="Nilai" type="number" min="0" max={gradingAnswer?.question?.points || 0} value={String(gradeScore)} onChange={(e) => setGradeScore(Number(e.target.value))} />
          <M3TextField label="Feedback" value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} />
          <div className="flex justify-end gap-2">
            <M3Button variant="outlined" onClick={() => setGradeOpen(false)}>Batal</M3Button>
            <M3Button
              disabled={busy || !gradingAnswer}
              onClick={async () => {
                if (!gradingAnswer) return;
                await run(
                  () => gradeCbtEssayAnswer({ answerId: gradingAnswer.answer.id, score: gradeScore, feedback: gradeFeedback || undefined }),
                  "Nilai esai disimpan.",
                );
                setGradeOpen(false);
              }}
            >
              Simpan Nilai
            </M3Button>
          </div>
        </div>
      </M3Dialog>
    </div>
  );
}

function StudentWorkspace({ assessmentId }: { assessmentId: string }) {
  const workspace = useQuery(getCbtStudentWorkspace, { assessmentId });
  const [token, setToken] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [remainingMs, setRemainingMs] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const autoSubmitted = useRef(false);
  const serverOffsetMs = useRef(0);

  useEffect(() => {
    if (!workspace.data?.serverNow) return;
    serverOffsetMs.current = new Date(workspace.data.serverNow).getTime() - Date.now();
  }, [workspace.data?.serverNow]);

  useEffect(() => {
    const active: any = workspace.data?.activeAttempt;
    if (!active) return;
    setAnswers(active.answers || {});
  }, [workspace.data?.activeAttempt?.id]);

  useEffect(() => {
    const active: any = workspace.data?.activeAttempt;
    if (!active) {
      setRemainingMs(0);
      return;
    }
    autoSubmitted.current = false;
    const update = () => {
      const serverNow = Date.now() + serverOffsetMs.current;
      const remaining = Math.max(0, new Date(active.expiresAt).getTime() - serverNow);
      setRemainingMs(remaining);
      if (remaining === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        submitCbtAttempt({ attemptId: active.id })
          .then(() => workspace.refetch())
          .catch(() => workspace.refetch());
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [workspace.data?.activeAttempt?.id, workspace.data?.activeAttempt?.expiresAt]);

  const saveOne = (question: any, value: string) => {
    const active: any = workspace.data?.activeAttempt;
    if (!active) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveCbtAnswers({
          attemptId: active.id,
          answers: [
            question.questionType === "ESSAY"
              ? { questionId: question.id, answerText: value }
              : { questionId: question.id, selectedOptionId: value },
          ],
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, question.questionType === "ESSAY" ? 700 : 250);
  };

  if (workspace.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><M3CircularProgress size={40} /></div>;
  }
  if (workspace.error || !workspace.data) {
    return <M3Banner variant="error" headline="Ujian belum dapat dimuat" supportingText={(workspace.error as any)?.message || "CBT tidak ditemukan."} />;
  }

  const data: any = workspace.data;
  const assessment = data.assessment;
  const attempt = data.activeAttempt;
  const currentQuestion = attempt?.questions?.[currentIndex];
  const totalQuestions = attempt?.questions?.length || 0;
  const answeredCount = attempt
    ? attempt.questions.filter((question: any) => !!String(answers[question.id] || "").trim()).length
    : 0;
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  if (!attempt) {
    const canStart =
      data.availability === "OPEN" &&
      data.attemptsRemaining > 0 &&
      !data.legacyCompleted;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <a href={`/school/lms/courses/${assessment.courseId}`} className="text-xs font-semibold text-md-primary">← Kembali ke LMS</a>
        <M3Card variant="outlined" className="overflow-hidden">
          <div className="bg-md-surface-container-low p-5 sm:p-6">
            <M3Badge variant={data.availability === "OPEN" ? "success" : "outline"} size="sm">{data.availability}</M3Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">{assessment.title}</h1>
            <p className="mt-1 text-sm text-md-on-surface-variant">{assessment.subjectName}</p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Durasi", `${assessment.durationMinutes} menit`],
                ["Soal", assessment.questionCount],
                ["Attempt", `${data.attemptsRemaining} tersisa`],
                ["KKM", `${assessment.passingScore}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-[10px] bg-md-surface-container-low p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.05em] text-md-on-surface-variant">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-md-on-surface">{String(value)}</p>
                </div>
              ))}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-md-on-surface">{assessment.instructions || "Baca setiap soal dengan teliti. Jawaban tersimpan otomatis selama koneksi tersedia."}</p>
            <div className="rounded-[10px] border border-md-outline-variant p-3 text-xs leading-5 text-md-on-surface-variant">
              Jadwal: <strong>{formatDateTime(assessment.startTime)}</strong> — <strong>{formatDateTime(assessment.endTime)}</strong>
            </div>
            {assessment.requireToken && canStart && (
              <M3TextField label="Token Ujian" value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} placeholder="Masukkan token dari guru" />
            )}
            {data.latestResult && (
              <M3Banner
                variant={data.latestResult.gradingStatus === "PENDING" ? "standard" : "success"}
                headline={data.latestResult.gradingStatus === "PENDING" ? "Jawaban terkirim, menunggu koreksi esai" : "Attempt terakhir selesai"}
                supportingText={
                  data.latestResult.scoreVisible
                    ? `Nilai: ${formatPercent(data.latestResult.percentage)} · ${data.latestResult.passed ? "Tuntas" : "Belum tuntas"}`
                    : "Nilai belum ditampilkan sesuai pengaturan guru."
                }
              />
            )}
            <M3Button
              className="w-full"
              disabled={!canStart || busy || (assessment.requireToken && !token.trim())}
              onClick={async () => {
                setBusy(true);
                try {
                  await startCbtAttempt({ assessmentId, token: token || undefined });
                  autoSubmitted.current = false;
                  await workspace.refetch();
                } catch (err: any) {
                  window.alert(err?.message || "Ujian belum dapat dimulai.");
                  await workspace.refetch();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {data.availability === "NOT_STARTED"
                ? "Ujian Belum Dimulai"
                : data.availability === "ENDED"
                  ? "Jadwal Ujian Berakhir"
                  : data.attemptsRemaining <= 0
                    ? "Batas Attempt Tercapai"
                    : "Mulai / Lanjutkan Ujian"}
            </M3Button>
          </div>
        </M3Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="sticky top-0 z-10 -mx-2 mb-4 border-b border-md-outline-variant bg-md-surface/95 px-2 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[14px] sm:border sm:px-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-md-on-surface">{assessment.title}</p>
            <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
              Soal {Math.min(currentIndex + 1, totalQuestions)} dari {totalQuestions} · {answeredCount} terjawab
            </p>
          </div>
          <div className={`rounded-[10px] px-3 py-2 font-mono text-sm font-bold ${remainingMs <= 5 * 60_000 ? "bg-red-100 text-red-800" : "bg-md-primary-container text-md-primary"}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-md-on-surface-variant">
          <span>{saveState === "saving" ? "Menyimpan..." : saveState === "saved" ? "Tersimpan" : saveState === "error" ? "Gagal autosave — periksa koneksi" : "Autosave aktif"}</span>
          <span>Server menentukan batas waktu final</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <M3Card variant="outlined" className="p-4 sm:p-6">
          {currentQuestion ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <M3Badge variant="outline" size="sm">Soal {currentIndex + 1}</M3Badge>
                <M3Badge variant="secondary" size="sm">{currentQuestion.points} poin</M3Badge>
                <M3Badge variant="outline" size="sm">{currentQuestion.questionType === "ESSAY" ? "Esai" : "Pilihan Ganda"}</M3Badge>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base font-medium leading-7 text-md-on-surface">{currentQuestion.prompt}</p>
              {currentQuestion.questionType === "MULTIPLE_CHOICE" ? (
                <div className="mt-5 space-y-2.5">
                  {(currentQuestion.options || []).map((option: any) => {
                    const selected = answers[currentQuestion.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => saveOne(currentQuestion, option.id)}
                        className={`flex min-h-[52px] w-full items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left transition ${selected ? "border-md-primary bg-md-primary-container/50" : "border-md-outline-variant bg-md-surface hover:bg-md-surface-container-low"}`}
                      >
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-md-primary text-md-on-primary" : "bg-md-surface-container-high text-md-on-surface"}`}>{option.id}</span>
                        <span className="text-sm leading-6 text-md-on-surface">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  rows={10}
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => saveOne(currentQuestion, e.target.value)}
                  placeholder="Tuliskan jawaban Anda..."
                  className="mt-5 w-full resize-y rounded-[12px] border border-md-outline-variant bg-md-surface px-4 py-3 text-sm leading-6 text-md-on-surface outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                />
              )}
              <div className="mt-6 flex items-center justify-between gap-2 border-t border-md-outline-variant pt-4">
                <M3Button variant="outlined" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>Sebelumnya</M3Button>
                {currentIndex < totalQuestions - 1 ? (
                  <M3Button onClick={() => setCurrentIndex((value) => Math.min(totalQuestions - 1, value + 1))}>Berikutnya</M3Button>
                ) : (
                  <M3Button
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Kirim jawaban final? ${answeredCount} dari ${totalQuestions} soal sudah terjawab.`)) return;
                      setBusy(true);
                      try {
                        if (saveTimer.current) window.clearTimeout(saveTimer.current);
                        const pending = attempt.questions
                          .filter((q: any) => String(answers[q.id] || "").trim())
                          .map((q: any) =>
                            q.questionType === "ESSAY"
                              ? { questionId: q.id, answerText: answers[q.id] }
                              : { questionId: q.id, selectedOptionId: answers[q.id] },
                          );
                        if (pending.length) {
                          await saveCbtAnswers({ attemptId: attempt.id, answers: pending });
                        }
                        await submitCbtAttempt({ attemptId: attempt.id });
                        await workspace.refetch();
                      } catch (err: any) {
                        window.alert(err?.message || "Jawaban belum dapat dikirim.");
                        await workspace.refetch();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Kirim Jawaban
                  </M3Button>
                )}
              </div>
            </>
          ) : (
            <M3Banner variant="error" headline="Paket soal kosong" supportingText="Hubungi guru pengampu." />
          )}
        </M3Card>

        <M3Card variant="outlined" className="self-start p-3 lg:sticky lg:top-4">
          <p className="px-1 text-xs font-semibold text-md-on-surface">Navigator Soal</p>
          <div className="mt-3 grid grid-cols-5 gap-1.5 lg:grid-cols-4">
            {attempt.questions.map((item: any, index: number) => {
              const filled = !!String(answers[item.id] || "").trim();
              const active = index === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`aspect-square rounded-[8px] text-xs font-semibold transition ${active ? "bg-md-primary text-md-on-primary" : filled ? "bg-emerald-100 text-emerald-800" : "bg-md-surface-container-high text-md-on-surface"}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-[10.5px] text-md-on-surface-variant">
            <p>Hijau: sudah terjawab</p>
            <p>Nomor aktif mengikuti soal yang dibuka</p>
          </div>
        </M3Card>
      </div>
    </div>
  );
}

export function LmsAssessmentPage({ user }: { user: AuthUser }) {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  return (
    <SchoolLayout user={user}>
      <div className="mx-auto max-w-[1180px] pb-6">
        {!assessmentId ? (
          <M3Banner variant="error" headline="ID ujian tidak tersedia" />
        ) : user.role === "STUDENT" && !user.isAdmin ? (
          <StudentWorkspace assessmentId={assessmentId} />
        ) : (
          <TeacherWorkspace user={user} assessmentId={assessmentId} />
        )}
      </div>
    </SchoolLayout>
  );
}
