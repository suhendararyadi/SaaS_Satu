import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  createStudentCoaching,
  createStudentPermit,
  createStudentViolation,
  getStudentAffairsData,
  saveStudentAchievement,
  updateStudentCoaching,
  updateStudentPermit,
  updateStudentViolation,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  ACHIEVEMENT_LEVELS,
  ACHIEVEMENT_LEVEL_META,
  COACHING_STATUSES,
  COACHING_STATUS_META,
  COACHING_TYPES,
  COACHING_TYPE_META,
  PERMIT_STATUSES,
  PERMIT_STATUS_META,
  PERMIT_TYPES,
  PERMIT_TYPE_META,
  VIOLATION_STATUS_META,
  nextCoachingStatuses,
  nextPermitStatuses,
  nextViolationStatuses,
  type CoachingStatusCode,
  type PermitStatusCode,
  type ViolationStatusCode,
} from "../studentAffairs";
import {
  FOLLOW_UP_SEVERITIES,
  FOLLOW_UP_SEVERITY_META,
  type FollowUpSeverityCode,
} from "../followUp";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3StatCard,
  M3Table,
  M3TableBody,
  M3TableCell,
  M3TableHead,
  M3TableHeader,
  M3TableRow,
  M3Tabs,
  M3TextField,
} from "../../client/components/m3";

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function localDateTimeValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}

function personName(person: any) {
  return person?.name || "-";
}

function studentName(student: any) {
  return student?.name || student?.username || "Siswa";
}

function severityVariant(severity: FollowUpSeverityCode) {
  if (severity === "CRITICAL") return "error" as const;
  if (severity === "HIGH") return "warning" as const;
  if (severity === "MEDIUM") return "secondary" as const;
  return "outline" as const;
}

function violationVariant(status: ViolationStatusCode) {
  if (status === "RESOLVED") return "success" as const;
  if (status === "CANCELED") return "outline" as const;
  if (status === "IN_REVIEW") return "primary" as const;
  return "warning" as const;
}

function coachingVariant(status: CoachingStatusCode) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELED") return "outline" as const;
  if (status === "IN_PROGRESS") return "primary" as const;
  return "warning" as const;
}

function permitVariant(status: PermitStatusCode) {
  if (status === "APPROVED" || status === "RETURNED") return "success" as const;
  if (status === "REJECTED") return "error" as const;
  if (status === "CANCELED") return "outline" as const;
  return "warning" as const;
}

function initialStudentFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("student") || "";
}

function initialTabFromUrl() {
  if (typeof window === "undefined") return "OVERVIEW";
  const value = new URLSearchParams(window.location.search).get("tab");
  return ["OVERVIEW", "VIOLATIONS", "ACHIEVEMENTS", "COACHING", "PERMITS"].includes(value || "")
    ? value || "OVERVIEW"
    : "OVERVIEW";
}

function initialRecordFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("record") || "";
}

export function StudentAffairsPage({ user }: { user: AuthUser }) {
  const query = useQuery(getStudentAffairsData, {});
  const data = query.data as any;
  const [tab, setTab] = useState(initialTabFromUrl);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState(initialStudentFromUrl);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [violationOpen, setViolationOpen] = useState(false);
  const [violationForm, setViolationForm] = useState({
    studentId: initialStudentFromUrl(),
    category: "",
    title: "",
    description: "",
    severity: "MEDIUM" as FollowUpSeverityCode,
    points: "0",
    incidentAt: localDateTimeValue(new Date()),
    location: "",
    handledById: "",
    createFollowUp: false,
  });

  const [achievementOpen, setAchievementOpen] = useState(false);
  const [achievementForm, setAchievementForm] = useState({
    id: "",
    studentId: initialStudentFromUrl(),
    category: "",
    title: "",
    level: "SCHOOL",
    award: "",
    organizer: "",
    achievementDate: new Date().toISOString().slice(0, 10),
    notes: "",
    evidenceUrl: "",
  });

  const [coachingOpen, setCoachingOpen] = useState(false);
  const [coachingForm, setCoachingForm] = useState({
    studentId: initialStudentFromUrl(),
    type: "COACHING",
    topic: "",
    summary: "",
    attendees: "",
    agreement: "",
    nextAction: "",
    nextReviewAt: "",
    assignedToId: "",
    createFollowUp: false,
  });

  const [permitOpen, setPermitOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({
    studentId: initialStudentFromUrl(),
    type: "EXIT",
    reason: "",
    destination: "",
    startAt: localDateTimeValue(new Date()),
    endAt: "",
    approveImmediately: false,
    approvalNote: "",
  });

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const requestedRecordId = useMemo(initialRecordFromUrl, []);

  useEffect(() => {
    if (!requestedRecordId || selectedRecord || !data) return;
    const requested = [
      ...(data.violations || []),
      ...(data.coachings || []),
      ...(data.achievements || []),
      ...(data.permits || []),
    ].find((item: any) => item.id === requestedRecordId);
    if (requested) setSelectedRecord(requested);
  }, [data, requestedRecordId, selectedRecord]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((student: any) => {
      if (classFilter && student.classRoom?.id !== classFilter) return false;
      if (studentFilter && student.id !== studentFilter) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [
        student.name,
        student.studentProfile?.nis,
        student.studentProfile?.nisn,
        student.classRoom?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data?.students, classFilter, studentFilter, search]);

  const visibleIds = useMemo(() => new Set(filteredStudents.map((item: any) => item.id)), [filteredStudents]);

  const filterRecords = (records: any[]) =>
    (records || []).filter((record) => visibleIds.has(record.studentId));

  const violations = filterRecords(data?.violations || []);
  const achievements = filterRecords(data?.achievements || []);
  const coachings = filterRecords(data?.coachings || []);
  const permits = filterRecords(data?.permits || []);

  const run = async (fn: () => Promise<any>, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await fn();
      await query.refetch();
      setFeedback({ type: "success", text: success });
      return result;
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Operasi Kesiswaan belum berhasil." });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const resetViolation = (studentId = studentFilter) => {
    setViolationForm({
      studentId: studentId || "",
      category: "",
      title: "",
      description: "",
      severity: "MEDIUM",
      points: "0",
      incidentAt: localDateTimeValue(new Date()),
      location: "",
      handledById: "",
      createFollowUp: false,
    });
    setViolationOpen(true);
  };

  const submitViolation = async () => {
    try {
      await run(
        () =>
          createStudentViolation({
            studentId: violationForm.studentId,
            category: violationForm.category,
            title: violationForm.title,
            description: violationForm.description,
            severity: violationForm.severity,
            points: Number(violationForm.points || 0),
            incidentAt: violationForm.incidentAt,
            location: violationForm.location || null,
            handledById: data.access.canManageAll ? violationForm.handledById || null : null,
            createFollowUp: violationForm.createFollowUp,
          }),
        "Pelanggaran siswa berhasil dicatat.",
      );
      setViolationOpen(false);
      setTab("VIOLATIONS");
    } catch {}
  };

  const changeViolationStatus = async (item: any, status: ViolationStatusCode) => {
    let resolutionNote: string | null = null;
    if (status === "RESOLVED") {
      resolutionNote = window.prompt("Catatan penyelesaian:", item.resolutionNote || "");
      if (resolutionNote === null) return;
    }
    try {
      await run(
        () =>
          updateStudentViolation({
            id: item.id,
            status,
            resolutionNote: resolutionNote || undefined,
          }),
        "Status pelanggaran berhasil diperbarui.",
      );
    } catch {}
  };

  const ensureViolationFollowUp = async (item: any) => {
    try {
      await run(
        () => updateStudentViolation({ id: item.id, createFollowUp: true }),
        "Pelanggaran sudah terhubung ke Tindak Lanjut.",
      );
    } catch {}
  };

  const resetAchievement = (studentId = studentFilter) => {
    setAchievementForm({
      id: "",
      studentId: studentId || "",
      category: "",
      title: "",
      level: "SCHOOL",
      award: "",
      organizer: "",
      achievementDate: new Date().toISOString().slice(0, 10),
      notes: "",
      evidenceUrl: "",
    });
    setAchievementOpen(true);
  };

  const editAchievement = (item: any) => {
    setAchievementForm({
      id: item.id,
      studentId: item.studentId,
      category: item.category || "",
      title: item.title || "",
      level: item.level || "SCHOOL",
      award: item.award || "",
      organizer: item.organizer || "",
      achievementDate: new Date(item.achievementDate).toISOString().slice(0, 10),
      notes: item.notes || "",
      evidenceUrl: item.evidenceUrl || "",
    });
    setAchievementOpen(true);
  };

  const submitAchievement = async () => {
    try {
      await run(
        () =>
          saveStudentAchievement({
            id: achievementForm.id || undefined,
            studentId: achievementForm.studentId,
            category: achievementForm.category,
            title: achievementForm.title,
            level: achievementForm.level,
            award: achievementForm.award || null,
            organizer: achievementForm.organizer || null,
            achievementDate: achievementForm.achievementDate,
            notes: achievementForm.notes || null,
            evidenceUrl: achievementForm.evidenceUrl || null,
          }),
        achievementForm.id ? "Prestasi berhasil diperbarui." : "Prestasi siswa berhasil dicatat.",
      );
      setAchievementOpen(false);
      setTab("ACHIEVEMENTS");
    } catch {}
  };

  const resetCoaching = (studentId = studentFilter) => {
    setCoachingForm({
      studentId: studentId || "",
      type: "COACHING",
      topic: "",
      summary: "",
      attendees: "",
      agreement: "",
      nextAction: "",
      nextReviewAt: "",
      assignedToId: "",
      createFollowUp: false,
    });
    setCoachingOpen(true);
  };

  const submitCoaching = async () => {
    try {
      await run(
        () =>
          createStudentCoaching({
            studentId: coachingForm.studentId,
            type: coachingForm.type,
            topic: coachingForm.topic,
            summary: coachingForm.summary,
            attendees: coachingForm.attendees || null,
            agreement: coachingForm.agreement || null,
            nextAction: coachingForm.nextAction || null,
            nextReviewAt: coachingForm.nextReviewAt || null,
            assignedToId: data.access.canManageAll ? coachingForm.assignedToId || null : null,
            createFollowUp: coachingForm.createFollowUp,
          }),
        coachingForm.type === "PARENT_MEETING"
          ? "Pertemuan orang tua berhasil dicatat."
          : "Pembinaan siswa berhasil dicatat.",
      );
      setCoachingOpen(false);
      setTab("COACHING");
    } catch {}
  };

  const changeCoachingStatus = async (item: any, status: CoachingStatusCode) => {
    let resolutionNote: string | null = null;
    if (status === "COMPLETED") {
      resolutionNote = window.prompt("Catatan penyelesaian pembinaan:", item.resolutionNote || "");
      if (resolutionNote === null) return;
    }
    try {
      await run(
        () =>
          updateStudentCoaching({
            id: item.id,
            status,
            resolutionNote: resolutionNote || undefined,
          }),
        "Status pembinaan berhasil diperbarui.",
      );
    } catch {}
  };

  const ensureCoachingFollowUp = async (item: any) => {
    try {
      await run(
        () => updateStudentCoaching({ id: item.id, createFollowUp: true }),
        "Pembinaan sudah terhubung ke Tindak Lanjut.",
      );
    } catch {}
  };

  const resetPermit = (studentId = studentFilter) => {
    setPermitForm({
      studentId: studentId || "",
      type: "EXIT",
      reason: "",
      destination: "",
      startAt: localDateTimeValue(new Date()),
      endAt: "",
      approveImmediately: false,
      approvalNote: "",
    });
    setPermitOpen(true);
  };

  const submitPermit = async () => {
    try {
      await run(
        () =>
          createStudentPermit({
            studentId: permitForm.studentId,
            type: permitForm.type,
            reason: permitForm.reason,
            destination: permitForm.destination || null,
            startAt: permitForm.startAt,
            endAt: permitForm.endAt || null,
            approveImmediately: permitForm.approveImmediately,
            approvalNote: permitForm.approvalNote || null,
          }),
        "Izin/dispensasi siswa berhasil dicatat.",
      );
      setPermitOpen(false);
      setTab("PERMITS");
    } catch {}
  };

  const changePermitStatus = async (item: any, status: PermitStatusCode) => {
    let note: string | null = null;
    if (status === "REJECTED" || status === "CANCELED") {
      note = window.prompt("Catatan keputusan:", item.approvalNote || "");
      if (note === null) return;
    }
    try {
      await run(
        () => updateStudentPermit({ id: item.id, status, approvalNote: note || undefined }),
        "Status izin/dispensasi berhasil diperbarui.",
      );
    } catch {}
  };

  const tabs = [
    { id: "OVERVIEW", label: "Ringkasan", icon: "dashboard" },
    { id: "VIOLATIONS", label: "Pelanggaran", icon: "warning", badge: data?.stats?.openViolations || undefined },
    { id: "ACHIEVEMENTS", label: "Prestasi", icon: "emoji_events" },
    { id: "COACHING", label: "Pembinaan", icon: "forum", badge: data?.stats?.openCoachings || undefined },
    { id: "PERMITS", label: "Perizinan", icon: "confirmation_number", badge: data?.stats?.activePermits || undefined },
  ];

  if (query.isLoading && !data) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[420px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !data) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Kesiswaan Terpadu belum dapat dibuka"
          supportingText={(query.error as any)?.message || "Periksa penugasan atau coba muat ulang."}
          actionLabel="Coba Lagi"
          onAction={() => query.refetch()}
        />
      </SchoolLayout>
    );
  }

  const studentOptions = [
    { value: "", label: "Semua siswa" },
    ...data.students.map((student: any) => ({
      value: student.id,
      label: studentName(student) + (student.classRoom?.name ? " · " + student.classRoom.name : ""),
    })),
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="v2-eyebrow">KESISWAAN</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">
              Kesiswaan Terpadu
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Satu pusat kerja untuk pelanggaran, prestasi, pembinaan, pemanggilan orang tua, izin/dispensasi, dan tindak lanjut siswa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="outlined" size="sm" href="/school/follow-up" icon="assignment_turned_in">
              Tindak Lanjut
            </M3Button>
            <M3Button variant="filled" size="sm" icon="add" onClick={() => resetCoaching()}>
              Pembinaan Baru
            </M3Button>
          </div>
        </header>

        {feedback && (
          <M3Banner
            variant={feedback.type === "success" ? "success" : "error"}
            headline={feedback.type === "success" ? "Berhasil" : "Perlu diperiksa"}
            supportingText={feedback.text}
            dismissible
            onDismiss={() => setFeedback(null)}
          />
        )}

        {data.access.scope === "HOMEROOM" && (
          <M3Banner
            variant="standard"
            headline="Lingkup Wali Kelas"
            supportingText="Anda hanya melihat dan menangani catatan Kesiswaan untuk siswa pada rombel yang menjadi tanggung jawab Anda."
            icon="supervisor_account"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <M3StatCard label="Siswa" value={data.stats.studentCount} tone="blue" />
          <M3StatCard label="Pelanggaran aktif" value={data.stats.openViolations} tone={data.stats.openViolations ? "orange" : "green"} />
          <M3StatCard label="Pembinaan aktif" value={data.stats.openCoachings} tone={data.stats.openCoachings ? "orange" : "green"} />
          <M3StatCard label="Izin aktif" value={data.stats.activePermits} tone="teal" />
          <M3StatCard label="Prestasi" value={data.stats.achievementCount} tone="green" />
          <M3StatCard label="Tindak lanjut" value={data.stats.followUpActive} tone={data.stats.followUpActive ? "orange" : "green"} href="/school/follow-up" />
        </div>

        {data.stats.overduePermits > 0 && (
          <M3Banner
            variant="warning"
            headline="Izin melewati batas waktu"
            supportingText={String(data.stats.overduePermits) + " izin/dispensasi sudah melewati waktu selesai tetapi belum ditandai kembali."}
            actionLabel="Buka Perizinan"
            onAction={() => setTab("PERMITS")}
          />
        )}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <M3Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
          <div className="grid w-full gap-2 sm:grid-cols-[1fr_180px_220px] xl:max-w-3xl">
            <M3TextField
              size="sm"
              leadingIcon="search"
              placeholder="Cari siswa, NIS, NISN, rombel..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <M3Select
              size="sm"
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setStudentFilter("");
              }}
              options={[
                { value: "", label: "Semua rombel" },
                ...data.classes.map((item: any) => ({ value: item.id, label: item.name })),
              ]}
            />
            <M3Select
              size="sm"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
              options={studentOptions}
            />
          </div>
        </div>

        {tab === "OVERVIEW" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <M3Card variant="outlined" className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-md-on-surface">Perlu Perhatian</h2>
                  <p className="text-[11.5px] text-md-on-surface-variant">Pelanggaran dan pembinaan yang masih aktif.</p>
                </div>
                <M3Badge variant="warning" size="sm">{violations.filter((item: any) => item.status !== "RESOLVED" && item.status !== "CANCELED").length + coachings.filter((item: any) => item.status !== "COMPLETED" && item.status !== "CANCELED").length}</M3Badge>
              </div>
              <div className="space-y-2">
                {[...violations.filter((item: any) => item.status !== "RESOLVED" && item.status !== "CANCELED").slice(0, 5),
                  ...coachings.filter((item: any) => item.status !== "COMPLETED" && item.status !== "CANCELED").slice(0, 5)]
                  .slice(0, 8)
                  .map((item: any) => (
                    <button
                      type="button"
                      key={(item.severity ? "v:" : "c:") + item.id}
                      onClick={() => setSelectedRecord(item)}
                      className="w-full rounded-[12px] border border-md-outline-variant/45 p-3 text-left hover:bg-md-surface-container-low"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12.5px] font-semibold text-md-on-surface">{item.title || item.topic}</p>
                          <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
                            {studentName(item.student)} · {item.student?.classRoom?.name || "Tanpa rombel"}
                          </p>
                        </div>
                        <M3Badge variant={item.severity ? severityVariant(item.severity) : coachingVariant(item.status)} size="sm">
                          {item.severity ? FOLLOW_UP_SEVERITY_META[item.severity as FollowUpSeverityCode].label : COACHING_STATUS_META[item.status as CoachingStatusCode].label}
                        </M3Badge>
                      </div>
                    </button>
                  ))}
                {!violations.length && !coachings.length && (
                  <p className="py-8 text-center text-[12px] text-md-on-surface-variant">Tidak ada catatan yang perlu perhatian pada filter ini.</p>
                )}
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-md-on-surface">Prestasi Terbaru</h2>
                  <p className="text-[11.5px] text-md-on-surface-variant">Rekam jejak positif siswa.</p>
                </div>
                <M3Button variant="text" size="sm" onClick={() => setTab("ACHIEVEMENTS")}>Lihat Semua</M3Button>
              </div>
              <div className="space-y-2">
                {achievements.slice(0, 8).map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-[12px] border border-md-outline-variant/45 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-tertiary-container text-md-on-tertiary-container">
                      <M3Icon name="emoji_events" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-md-on-surface">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-md-on-surface-variant">{studentName(item.student)} · {formatDate(item.achievementDate)}</p>
                    </div>
                    <M3Badge variant="success" size="sm">{ACHIEVEMENT_LEVEL_META[item.level as keyof typeof ACHIEVEMENT_LEVEL_META].label}</M3Badge>
                  </div>
                ))}
                {!achievements.length && (
                  <p className="py-8 text-center text-[12px] text-md-on-surface-variant">Belum ada prestasi pada filter ini.</p>
                )}
              </div>
            </M3Card>
          </div>
        )}

        {tab === "VIOLATIONS" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <M3Button variant="tonal" size="sm" icon="add" onClick={() => resetViolation()}>Catat Pelanggaran</M3Button>
            </div>
            {!violations.length ? (
              <M3EmptyState icon="warning" title="Belum ada catatan pelanggaran" description="Pelanggaran yang dicatat akan muncul di sini dan kasus berat dapat diteruskan ke Tindak Lanjut." />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Siswa</M3TableHead>
                      <M3TableHead>Pelanggaran</M3TableHead>
                      <M3TableHead>Waktu</M3TableHead>
                      <M3TableHead>Prioritas</M3TableHead>
                      <M3TableHead>Status</M3TableHead>
                      <M3TableHead>PIC</M3TableHead>
                      <M3TableHead>Tindak Lanjut</M3TableHead>
                      <M3TableHead className="text-right">Aksi</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {violations.map((item: any) => (
                      <M3TableRow key={item.id}>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{studentName(item.student)}</p>
                          <p className="text-[11px] text-md-on-surface-variant">{item.student?.classRoom?.name || "-"}</p>
                        </M3TableCell>
                        <M3TableCell>
                          <button type="button" className="text-left" onClick={() => setSelectedRecord(item)}>
                            <p className="font-semibold text-md-on-surface">{item.title}</p>
                            <p className="mt-0.5 max-w-[320px] line-clamp-1 text-[11px] text-md-on-surface-variant">{item.category} · {item.description}</p>
                          </button>
                        </M3TableCell>
                        <M3TableCell>{formatDateTime(item.incidentAt)}</M3TableCell>
                        <M3TableCell><M3Badge variant={severityVariant(item.severity)} size="sm">{FOLLOW_UP_SEVERITY_META[item.severity as FollowUpSeverityCode].label}</M3Badge></M3TableCell>
                        <M3TableCell><M3Badge variant={violationVariant(item.status)} size="sm">{VIOLATION_STATUS_META[item.status as ViolationStatusCode].label}</M3Badge></M3TableCell>
                        <M3TableCell>{personName(item.handledBy)}</M3TableCell>
                        <M3TableCell>
                          {item.followUp ? (
                            <M3Button variant="text" size="sm" href={"/school/follow-up?case=" + item.followUp.id}>{item.followUp.status}</M3Button>
                          ) : (
                            <M3Button variant="text" size="sm" onClick={() => ensureViolationFollowUp(item)}>Buat</M3Button>
                          )}
                        </M3TableCell>
                        <M3TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {nextViolationStatuses(item.status as ViolationStatusCode).slice(0, 2).map((status) => (
                              <M3Button key={status} variant="text" size="sm" onClick={() => changeViolationStatus(item, status)}>
                                {VIOLATION_STATUS_META[status].label}
                              </M3Button>
                            ))}
                          </div>
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "ACHIEVEMENTS" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <M3Button variant="tonal" size="sm" icon="add" onClick={() => resetAchievement()}>Catat Prestasi</M3Button>
            </div>
            {!achievements.length ? (
              <M3EmptyState icon="emoji_events" title="Belum ada prestasi tercatat" description="Catat prestasi akademik maupun nonakademik siswa untuk membangun rekam jejak positif." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {achievements.map((item: any) => (
                  <M3Card key={item.id} variant="outlined" className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-md-tertiary-container text-md-on-tertiary-container">
                        <M3Icon name="emoji_events" size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <M3Badge variant="success" size="sm">{ACHIEVEMENT_LEVEL_META[item.level as keyof typeof ACHIEVEMENT_LEVEL_META].label}</M3Badge>
                        <h3 className="mt-2 text-[14px] font-bold text-md-on-surface">{item.title}</h3>
                        <p className="mt-1 text-[11.5px] text-md-on-surface-variant">{studentName(item.student)} · {item.student?.classRoom?.name || "-"}</p>
                        <p className="mt-1 text-[11px] text-md-on-surface-variant">{item.award || item.category} · {formatDate(item.achievementDate)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end border-t border-md-outline-variant/35 pt-2">
                      <M3Button variant="text" size="sm" icon="edit" onClick={() => editAchievement(item)}>Edit</M3Button>
                    </div>
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "COACHING" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <M3Button variant="tonal" size="sm" icon="add" onClick={() => resetCoaching()}>Catat Pembinaan</M3Button>
            </div>
            {!coachings.length ? (
              <M3EmptyState icon="forum" title="Belum ada pembinaan tercatat" description="Pembinaan, konseling, dan pemanggilan orang tua akan tersimpan sebagai riwayat internal siswa." />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Siswa</M3TableHead>
                      <M3TableHead>Jenis</M3TableHead>
                      <M3TableHead>Topik</M3TableHead>
                      <M3TableHead>PIC</M3TableHead>
                      <M3TableHead>Tinjau Lagi</M3TableHead>
                      <M3TableHead>Status</M3TableHead>
                      <M3TableHead>Tindak Lanjut</M3TableHead>
                      <M3TableHead className="text-right">Aksi</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {coachings.map((item: any) => (
                      <M3TableRow key={item.id}>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{studentName(item.student)}</p>
                          <p className="text-[11px] text-md-on-surface-variant">{item.student?.classRoom?.name || "-"}</p>
                        </M3TableCell>
                        <M3TableCell><M3Badge variant="outline" size="sm">{COACHING_TYPE_META[item.type as keyof typeof COACHING_TYPE_META].label}</M3Badge></M3TableCell>
                        <M3TableCell>
                          <button type="button" className="text-left" onClick={() => setSelectedRecord(item)}>
                            <p className="font-semibold text-md-on-surface">{item.topic}</p>
                            <p className="mt-0.5 max-w-[320px] line-clamp-1 text-[11px] text-md-on-surface-variant">{item.summary}</p>
                          </button>
                        </M3TableCell>
                        <M3TableCell>{personName(item.assignedTo)}</M3TableCell>
                        <M3TableCell>{formatDate(item.nextReviewAt)}</M3TableCell>
                        <M3TableCell><M3Badge variant={coachingVariant(item.status)} size="sm">{COACHING_STATUS_META[item.status as CoachingStatusCode].label}</M3Badge></M3TableCell>
                        <M3TableCell>
                          {item.followUp ? (
                            <M3Button variant="text" size="sm" href={"/school/follow-up?case=" + item.followUp.id}>{item.followUp.status}</M3Button>
                          ) : (
                            <M3Button variant="text" size="sm" onClick={() => ensureCoachingFollowUp(item)}>Buat</M3Button>
                          )}
                        </M3TableCell>
                        <M3TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {nextCoachingStatuses(item.status as CoachingStatusCode).slice(0, 2).map((status) => (
                              <M3Button key={status} variant="text" size="sm" onClick={() => changeCoachingStatus(item, status)}>
                                {COACHING_STATUS_META[status].label}
                              </M3Button>
                            ))}
                          </div>
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "PERMITS" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <M3Button variant="tonal" size="sm" icon="add" onClick={() => resetPermit()}>Catat Izin / Dispensasi</M3Button>
            </div>
            {!permits.length ? (
              <M3EmptyState icon="confirmation_number" title="Belum ada izin/dispensasi" description="Izin keluar, dispensasi kegiatan, dan izin lain dapat dicatat dan dipantau status kembalinya." />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Siswa</M3TableHead>
                      <M3TableHead>Jenis</M3TableHead>
                      <M3TableHead>Alasan</M3TableHead>
                      <M3TableHead>Mulai</M3TableHead>
                      <M3TableHead>Selesai</M3TableHead>
                      <M3TableHead>Status</M3TableHead>
                      <M3TableHead>Disetujui Oleh</M3TableHead>
                      <M3TableHead className="text-right">Aksi</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {permits.map((item: any) => (
                      <M3TableRow key={item.id}>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{studentName(item.student)}</p>
                          <p className="text-[11px] text-md-on-surface-variant">{item.student?.classRoom?.name || "-"}</p>
                        </M3TableCell>
                        <M3TableCell><M3Badge variant="outline" size="sm">{PERMIT_TYPE_META[item.type as keyof typeof PERMIT_TYPE_META].label}</M3Badge></M3TableCell>
                        <M3TableCell><p className="max-w-[300px] line-clamp-2">{item.reason}</p></M3TableCell>
                        <M3TableCell>{formatDateTime(item.startAt)}</M3TableCell>
                        <M3TableCell>{formatDateTime(item.endAt)}</M3TableCell>
                        <M3TableCell><M3Badge variant={permitVariant(item.status)} size="sm">{PERMIT_STATUS_META[item.status as PermitStatusCode].label}</M3Badge></M3TableCell>
                        <M3TableCell>{personName(item.approvedBy)}</M3TableCell>
                        <M3TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {nextPermitStatuses(item.status as PermitStatusCode).slice(0, 2).map((status) => (
                              <M3Button key={status} variant="text" size="sm" onClick={() => changePermitStatus(item, status)}>
                                {PERMIT_STATUS_META[status].label}
                              </M3Button>
                            ))}
                          </div>
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        <M3Dialog
          isOpen={violationOpen}
          onClose={() => !busy && setViolationOpen(false)}
          title="Catat Pelanggaran Siswa"
          subtitle="Catatan berat/kritis dapat otomatis diteruskan ke Workflow Tindak Lanjut."
          icon="warning"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setViolationOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitViolation}>Simpan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select label="Siswa" value={violationForm.studentId} onChange={(event) => setViolationForm((value) => ({ ...value, studentId: event.target.value }))} options={studentOptions} />
            <div className="grid gap-4 sm:grid-cols-2">
              <M3TextField label="Kategori" value={violationForm.category} onChange={(event) => setViolationForm((value) => ({ ...value, category: event.target.value }))} placeholder="Ketertiban / Kehadiran / Etika" />
              <M3TextField label="Judul" value={violationForm.title} onChange={(event) => setViolationForm((value) => ({ ...value, title: event.target.value }))} />
              <M3Select label="Prioritas" value={violationForm.severity} onChange={(event) => setViolationForm((value) => ({ ...value, severity: event.target.value as FollowUpSeverityCode }))} options={FOLLOW_UP_SEVERITIES.map((severity) => ({ value: severity, label: FOLLOW_UP_SEVERITY_META[severity].label }))} />
              <M3TextField label="Poin" type="number" min="0" value={violationForm.points} onChange={(event) => setViolationForm((value) => ({ ...value, points: event.target.value }))} />
              <M3TextField label="Waktu Kejadian" type="datetime-local" value={violationForm.incidentAt} onChange={(event) => setViolationForm((value) => ({ ...value, incidentAt: event.target.value }))} />
              <M3TextField label="Lokasi" value={violationForm.location} onChange={(event) => setViolationForm((value) => ({ ...value, location: event.target.value }))} />
              {data.access.canManageAll && (
                <M3Select label="PIC Penanganan" value={violationForm.handledById} onChange={(event) => setViolationForm((value) => ({ ...value, handledById: event.target.value }))} options={[{ value: "", label: "Otomatis Wali/Waka Kesiswaan" }, ...data.assignees.map((person: any) => ({ value: person.id, label: personName(person) }))]} />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Deskripsi Kejadian</label>
              <textarea className="min-h-28 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={violationForm.description} onChange={(event) => setViolationForm((value) => ({ ...value, description: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-md-on-surface">
              <input type="checkbox" checked={violationForm.createFollowUp} onChange={(event) => setViolationForm((value) => ({ ...value, createFollowUp: event.target.checked }))} />
              Buat Tindak Lanjut sekarang. Pelanggaran Tinggi/Kritis tetap dieskalasi otomatis.
            </label>
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={achievementOpen}
          onClose={() => !busy && setAchievementOpen(false)}
          title={achievementForm.id ? "Edit Prestasi" : "Catat Prestasi Siswa"}
          icon="emoji_events"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setAchievementOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitAchievement}>Simpan</M3Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <M3Select label="Siswa" value={achievementForm.studentId} onChange={(event) => setAchievementForm((value) => ({ ...value, studentId: event.target.value }))} options={studentOptions} disabled={!!achievementForm.id} />
            <M3TextField label="Kategori" value={achievementForm.category} onChange={(event) => setAchievementForm((value) => ({ ...value, category: event.target.value }))} placeholder="Akademik / Olahraga / Seni / Lainnya" />
            <M3TextField label="Judul Prestasi" value={achievementForm.title} onChange={(event) => setAchievementForm((value) => ({ ...value, title: event.target.value }))} />
            <M3Select label="Tingkat" value={achievementForm.level} onChange={(event) => setAchievementForm((value) => ({ ...value, level: event.target.value }))} options={ACHIEVEMENT_LEVELS.map((level) => ({ value: level, label: ACHIEVEMENT_LEVEL_META[level].label }))} />
            <M3TextField label="Juara / Penghargaan" value={achievementForm.award} onChange={(event) => setAchievementForm((value) => ({ ...value, award: event.target.value }))} />
            <M3TextField label="Penyelenggara" value={achievementForm.organizer} onChange={(event) => setAchievementForm((value) => ({ ...value, organizer: event.target.value }))} />
            <M3TextField label="Tanggal" type="date" value={achievementForm.achievementDate} onChange={(event) => setAchievementForm((value) => ({ ...value, achievementDate: event.target.value }))} />
            <M3TextField label="URL Bukti (opsional)" value={achievementForm.evidenceUrl} onChange={(event) => setAchievementForm((value) => ({ ...value, evidenceUrl: event.target.value }))} />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan</label>
            <textarea className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={achievementForm.notes} onChange={(event) => setAchievementForm((value) => ({ ...value, notes: event.target.value }))} />
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={coachingOpen}
          onClose={() => !busy && setCoachingOpen(false)}
          title="Catat Pembinaan / Pertemuan"
          subtitle="Catatan ini bersifat internal dan hanya terlihat oleh petugas Kesiswaan yang berwenang."
          icon="forum"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setCoachingOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitCoaching}>Simpan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select label="Siswa" value={coachingForm.studentId} onChange={(event) => setCoachingForm((value) => ({ ...value, studentId: event.target.value }))} options={studentOptions} />
            <div className="grid gap-4 sm:grid-cols-2">
              <M3Select label="Jenis" value={coachingForm.type} onChange={(event) => setCoachingForm((value) => ({ ...value, type: event.target.value }))} options={COACHING_TYPES.map((type) => ({ value: type, label: COACHING_TYPE_META[type].label }))} />
              <M3TextField label="Topik" value={coachingForm.topic} onChange={(event) => setCoachingForm((value) => ({ ...value, topic: event.target.value }))} />
              <M3TextField label="Pihak Hadir" value={coachingForm.attendees} onChange={(event) => setCoachingForm((value) => ({ ...value, attendees: event.target.value }))} placeholder="Siswa, orang tua, wali kelas..." />
              <M3TextField label="Tinjau Lagi" type="datetime-local" value={coachingForm.nextReviewAt} onChange={(event) => setCoachingForm((value) => ({ ...value, nextReviewAt: event.target.value }))} />
              {data.access.canManageAll && (
                <M3Select label="PIC" value={coachingForm.assignedToId} onChange={(event) => setCoachingForm((value) => ({ ...value, assignedToId: event.target.value }))} options={[{ value: "", label: "Otomatis Wali/Waka Kesiswaan" }, ...data.assignees.map((person: any) => ({ value: person.id, label: personName(person) }))]} />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Ringkasan Pembinaan</label>
              <textarea className="min-h-28 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={coachingForm.summary} onChange={(event) => setCoachingForm((value) => ({ ...value, summary: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Kesepakatan</label>
              <textarea className="min-h-20 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={coachingForm.agreement} onChange={(event) => setCoachingForm((value) => ({ ...value, agreement: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Aksi Berikutnya</label>
              <textarea className="min-h-20 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={coachingForm.nextAction} onChange={(event) => setCoachingForm((value) => ({ ...value, nextAction: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-md-on-surface">
              <input type="checkbox" checked={coachingForm.createFollowUp} onChange={(event) => setCoachingForm((value) => ({ ...value, createFollowUp: event.target.checked }))} />
              Buat kasus pada Tindak Lanjut Terpadu.
            </label>
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={permitOpen}
          onClose={() => !busy && setPermitOpen(false)}
          title="Catat Izin / Dispensasi"
          icon="confirmation_number"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setPermitOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitPermit}>Simpan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select label="Siswa" value={permitForm.studentId} onChange={(event) => setPermitForm((value) => ({ ...value, studentId: event.target.value }))} options={studentOptions} />
            <div className="grid gap-4 sm:grid-cols-2">
              <M3Select label="Jenis" value={permitForm.type} onChange={(event) => setPermitForm((value) => ({ ...value, type: event.target.value }))} options={PERMIT_TYPES.map((type) => ({ value: type, label: PERMIT_TYPE_META[type].label }))} />
              <M3TextField label="Tujuan" value={permitForm.destination} onChange={(event) => setPermitForm((value) => ({ ...value, destination: event.target.value }))} />
              <M3TextField label="Mulai" type="datetime-local" value={permitForm.startAt} onChange={(event) => setPermitForm((value) => ({ ...value, startAt: event.target.value }))} />
              <M3TextField label="Selesai" type="datetime-local" value={permitForm.endAt} onChange={(event) => setPermitForm((value) => ({ ...value, endAt: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Alasan</label>
              <textarea className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15" value={permitForm.reason} onChange={(event) => setPermitForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
            <M3TextField label="Catatan Persetujuan" value={permitForm.approvalNote} onChange={(event) => setPermitForm((value) => ({ ...value, approvalNote: event.target.value }))} />
            <label className="flex items-center gap-2 text-[12.5px] text-md-on-surface">
              <input type="checkbox" checked={permitForm.approveImmediately} onChange={(event) => setPermitForm((value) => ({ ...value, approveImmediately: event.target.checked }))} />
              Setujui langsung saat disimpan.
            </label>
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={selectedRecord?.title || selectedRecord?.topic || "Detail Kesiswaan"}
          subtitle={selectedRecord ? studentName(selectedRecord.student) + " · " + (selectedRecord.student?.classRoom?.name || "Tanpa rombel") : undefined}
          icon={selectedRecord?.severity ? "warning" : "forum"}
          maxWidth="lg"
          actions={<M3Button variant="text" onClick={() => setSelectedRecord(null)}>Tutup</M3Button>}
        >
          {selectedRecord && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {selectedRecord.severity && <M3Badge variant={severityVariant(selectedRecord.severity)}>{FOLLOW_UP_SEVERITY_META[selectedRecord.severity as FollowUpSeverityCode].label}</M3Badge>}
                {selectedRecord.status && <M3Badge variant="outline">{selectedRecord.status}</M3Badge>}
              </div>
              <M3Card variant="outlined" className="p-4">
                <p className="text-[13px] leading-6 text-md-on-surface">{selectedRecord.description || selectedRecord.summary}</p>
                {selectedRecord.actionTaken && <p className="mt-3 text-[12px] leading-5 text-md-on-surface-variant"><strong>Tindakan:</strong> {selectedRecord.actionTaken}</p>}
                {selectedRecord.agreement && <p className="mt-3 text-[12px] leading-5 text-md-on-surface-variant"><strong>Kesepakatan:</strong> {selectedRecord.agreement}</p>}
                {selectedRecord.nextAction && <p className="mt-3 text-[12px] leading-5 text-md-on-surface-variant"><strong>Aksi berikutnya:</strong> {selectedRecord.nextAction}</p>}
                {selectedRecord.resolutionNote && <p className="mt-3 text-[12px] leading-5 text-md-on-surface-variant"><strong>Penyelesaian:</strong> {selectedRecord.resolutionNote}</p>}
              </M3Card>
            </div>
          )}
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
