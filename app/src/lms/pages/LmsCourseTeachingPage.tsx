import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useParams } from "react-router";
import {
  deactivateTeachingSchedule,
  finishTeachingSession,
  getCourseAttendanceSeed,
  getCourseTeachingData,
  recordCourseAttendance,
  saveTeachingEngagementScores,
  upsertTeachingSchedule,
  useQuery,
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
  M3Tabs,
  M3TextField,
} from "../../client/components/m3";
import { AttendanceEvidenceUploader } from "../../attendance360/components/AttendanceEvidenceUploader";
import { type SubjectAttendanceStatus } from "../attendancePolicy";

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ATTENDANCE_OPTIONS: SubjectAttendanceStatus[] = ["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DISPENSASI", "ALPA"];
const RUBRICS = [
  { score: 95, label: "Sangat Aktif" },
  { score: 85, label: "Aktif" },
  { score: 75, label: "Cukup" },
  { score: 65, label: "Bimbingan" },
];

function getCoords() {
  return new Promise<{ latitude: number; longitude: number; accuracy: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Perangkat tidak mendukung GPS."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => reject(new Error("Lokasi belum dapat dibaca. Aktifkan izin lokasi dan coba lagi.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

function timeLabel(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LmsCourseTeachingPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const q = useQuery(getCourseTeachingData, { courseId: id || "" }, { enabled: !!id });
  const data = q.data;
  const course: any = data?.course;
  const sessions: any[] = data?.sessions || [];
  const activeSession = sessions.find((session) => session.status === "IN_PROGRESS") || null;
  const [activeTab, setActiveTab] = useState("SESSION");
  const [targetSessionId, setTargetSessionId] = useState("");
  const targetSession = sessions.find((session) => session.id === targetSessionId) || activeSession || sessions[0] || null;

  const attendanceSeedQ = useQuery(
    getCourseAttendanceSeed,
    { courseId: id || "", dateOnly: targetSession?.dateOnly },
    { enabled: !!id && !!targetSession },
  );
  const [statusMap, setStatusMap] = useState<Record<string, SubjectAttendanceStatus>>({});
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleStart, setScheduleStart] = useState("07:00");
  const [scheduleEnd, setScheduleEnd] = useState("08:30");
  const [scheduleRoom, setScheduleRoom] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishEvidence, setFinishEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (!targetSession || !course) return;
    const existing: Record<string, SubjectAttendanceStatus> = {};
    for (const record of targetSession.attendance?.records || []) {
      existing[record.studentId] = record.status as SubjectAttendanceStatus;
    }
    if (Object.keys(existing).length) {
      setStatusMap(existing);
      return;
    }
    const seeded: Record<string, SubjectAttendanceStatus> = {};
    for (const student of attendanceSeedQ.data?.students || []) {
      if (student.defaultStatus) seeded[student.id] = student.defaultStatus as SubjectAttendanceStatus;
    }
    setStatusMap(seeded);
  }, [targetSession?.id, attendanceSeedQ.data, course]);

  useEffect(() => {
    if (!targetSession) return;
    const existing: Record<string, number> = {};
    for (const item of targetSession.engagementScores || []) existing[item.studentId] = item.score;
    setScoreMap(existing);
  }, [targetSession?.id]);

  const roster: any[] = course?.classRoom?.students || [];
  const missingAttendance = roster.filter((student) => !statusMap[student.id]).length;
  const attendanceComplete = roster.length > 0 && missingAttendance === 0;
  const canManage = !!user.isAdmin || user.role === "SCHOOL_ADMIN" || user.role === "SUPERADMIN" || course?.teacherId === user.id;

  const selectedCounts = useMemo(() => {
    const values = Object.values(statusMap);
    return ATTENDANCE_OPTIONS.reduce<Record<string, number>>((acc, status) => {
      acc[status] = values.filter((value) => value === status).length;
      return acc;
    }, {});
  }, [statusMap]);

  const saveSchedule = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await upsertTeachingSchedule({
        courseId: id,
        dayOfWeek: scheduleDay,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        roomLabel: scheduleRoom || null,
      });
      setScheduleOpen(false);
      setMessage({ tone: "success", text: "Jadwal mengajar tersimpan dan sudah melewati validasi anti-bentrok." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Jadwal belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  };

  const saveAttendance = async () => {
    if (!id || !targetSession) return;
    if (!attendanceComplete) {
      setMessage({ tone: "error", text: "Lengkapi status seluruh siswa sebelum menyimpan presensi sesi." });
      return;
    }
    setBusy(true);
    try {
      await recordCourseAttendance({
        courseId: id,
        teachingSessionId: targetSession.id,
        sessionNumber: Math.max(1, sessions.length),
        records: roster.map((student) => ({
          studentId: student.id,
          status: statusMap[student.id],
        })),
      });
      setMessage({ tone: "success", text: "Presensi mapel tersimpan. Data ini tidak mengubah Kehadiran Global." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Presensi belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  };

  const saveScores = async () => {
    if (!targetSession) return;
    const scores = roster
      .filter((student) => scoreMap[student.id] != null)
      .map((student) => ({ studentId: student.id, score: scoreMap[student.id] }));
    if (!scores.length) {
      setMessage({ tone: "error", text: "Pilih minimal satu rubrik keaktifan siswa." });
      return;
    }
    setBusy(true);
    try {
      await saveTeachingEngagementScores({ sessionId: targetSession.id, scores });
      setMessage({ tone: "success", text: "Penilaian keaktifan tersimpan pada sesi KBM." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Penilaian belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  };

  const finishSession = async () => {
    if (!activeSession || !finishEvidence) {
      setMessage({ tone: "error", text: "Selfie check-out guru wajib diambil." });
      return;
    }
    setBusy(true);
    try {
      const coords = await getCoords();
      await finishTeachingSession({
        sessionId: activeSession.id,
        version: activeSession.version,
        evidenceKey: finishEvidence,
        ...coords,
      });
      setFinishOpen(false);
      setFinishEvidence("");
      setMessage({ tone: "success", text: "Teaching Session selesai dan bukti check-out guru tersimpan." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Check-out belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading || !course) {
    return <SchoolLayout user={user}><div className="flex min-h-[360px] items-center justify-center"><M3CircularProgress size={40}/></div></SchoolLayout>;
  }

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Teaching Session</p>
            <h1 className="mt-1 text-2xl font-semibold">{course.subjectName}</h1>
            <p className="mt-1 text-sm text-md-on-surface-variant">
              {course.classRoom.name} · {course.teacher.name || "Guru"} · {course.academicYear.yearName} {course.academicYear.semester}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="outlined" href="/school/lms/teaching" icon="today">KBM Hari Ini</M3Button>
            <M3Button variant="outlined" href={"/school/lms/courses/" + course.id} icon="menu_book">Ruang Mapel</M3Button>
          </div>
        </header>

        {message && (
          <M3Banner
            variant={message.tone === "success" ? "success" : message.tone === "error" ? "error" : "info"}
            supportingText={message.text}
            dismissible
            onDismiss={() => setMessage(null)}
          />
        )}

        <M3Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "SESSION", label: "Pertemuan", icon: <M3Icon name="play_circle" size={16}/> },
            { id: "SCHEDULE", label: "Jadwal", icon: <M3Icon name="calendar_month" size={16}/> },
            { id: "HISTORY", label: "Riwayat", icon: <M3Icon name="history" size={16}/>, badge: sessions.length },
            { id: "RECAP", label: "Rekap", icon: <M3Icon name="analytics" size={16}/> },
          ]}
        />

        {activeTab === "SESSION" && (
          <div className="space-y-4">
            {!targetSession ? (
              <M3Card variant="outlined" className="p-8 text-center">
                <M3Icon name="event_busy" size={32} className="mx-auto text-md-on-surface-variant"/>
                <h2 className="mt-3 font-semibold">Belum ada Teaching Session</h2>
                <p className="mt-1 text-sm text-md-on-surface-variant">Mulai sesi dari halaman KBM Hari Ini ketika jam pelajaran tiba.</p>
              </M3Card>
            ) : (
              <>
                <M3Card variant="outlined" className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <M3Badge variant={targetSession.status === "COMPLETED" ? "success" : targetSession.status === "IN_PROGRESS" ? "primary" : "outline"}>
                          {targetSession.status.replaceAll("_", " ")}
                        </M3Badge>
                        <span className="text-xs text-md-on-surface-variant">{targetSession.dateOnly} · {timeLabel(targetSession.scheduledStartAt)}–{timeLabel(targetSession.scheduledEndAt)}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold">{targetSession.agenda?.competency || "Agenda belum tersedia"}</h2>
                      <p className="mt-1 text-sm text-md-on-surface-variant">{targetSession.agenda?.method || "Metode belum dicatat"}</p>
                      {targetSession.agenda?.summary && <p className="mt-2 text-sm leading-6">{targetSession.agenda.summary}</p>}
                    </div>
                    <div className="text-xs text-md-on-surface-variant md:text-right">
                      <p>Check-in guru: <strong>{timeLabel(targetSession.teacherCheckInAt)}</strong></p>
                      <p>Check-out guru: <strong>{timeLabel(targetSession.teacherCheckOutAt)}</strong></p>
                    </div>
                  </div>
                </M3Card>

                <M3Card variant="outlined" className="overflow-hidden">
                  <div className="border-b border-md-outline-variant/25 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-semibold">Kehadiran Siswa per Mapel</h2>
                        <p className="mt-1 text-xs text-md-on-surface-variant">Prefill satu arah dari Kehadiran Global. Koreksi di sini hanya berlaku untuk sesi mapel.</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ATTENDANCE_OPTIONS.map((status) => <M3Badge key={status} variant="outline" size="sm">{status} {selectedCounts[status] || 0}</M3Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-md-outline-variant/20">
                    {roster.map((student) => (
                      <div key={student.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{student.name || "Siswa"}</p>
                          <p className="text-[11px] text-md-on-surface-variant">
                            Global: {attendanceSeedQ.data?.students?.find((item: any) => item.id === student.id)?.globalStatus || "Belum tercatat"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ATTENDANCE_OPTIONS.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStatusMap((current) => ({ ...current, [student.id]: status }))}
                              className={"min-h-9 rounded-full border px-2.5 text-[11px] font-semibold " + (statusMap[student.id] === status ? "border-md-primary bg-md-primary-container text-md-on-primary-container" : "border-md-outline-variant text-md-on-surface-variant")}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-md-outline-variant/25 p-4">
                      <p className="text-xs text-md-on-surface-variant">{missingAttendance ? String(missingAttendance) + " siswa belum memiliki status." : "Seluruh roster sudah memiliki status."}</p>
                      <M3Button variant="filled" disabled={!attendanceComplete || busy} loading={busy} onClick={saveAttendance}>Simpan Presensi</M3Button>
                    </div>
                  )}
                </M3Card>

                <M3Card variant="outlined" className="overflow-hidden">
                  <div className="border-b border-md-outline-variant/25 p-4">
                    <h2 className="font-semibold">Keaktifan & Observasi Siswa</h2>
                    <p className="mt-1 text-xs text-md-on-surface-variant">Rubrik 95/85/75/65. Backend mengunci perubahan setelah 7 hari dari sesi.</p>
                  </div>
                  <div className="divide-y divide-md-outline-variant/20">
                    {roster.map((student) => (
                      <div key={student.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">{student.name || "Siswa"}</p>
                        <div className="flex flex-wrap gap-1">
                          {RUBRICS.map((rubric) => (
                            <button
                              key={rubric.score}
                              type="button"
                              onClick={() => setScoreMap((current) => ({ ...current, [student.id]: rubric.score }))}
                              className={"min-h-9 rounded-full border px-2.5 text-[11px] font-semibold " + (scoreMap[student.id] === rubric.score ? "border-md-primary bg-md-primary-container text-md-on-primary-container" : "border-md-outline-variant text-md-on-surface-variant")}
                            >
                              {rubric.label} · {rubric.score}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && <div className="flex justify-end border-t border-md-outline-variant/25 p-4"><M3Button variant="tonal" disabled={busy} onClick={saveScores}>Simpan Keaktifan</M3Button></div>}
                </M3Card>

                {activeSession?.id === targetSession.id && canManage && (
                  <M3Card variant="outlined" className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-semibold">Selesaikan Pertemuan</h2>
                        <p className="mt-1 text-xs text-md-on-surface-variant">Check-out baru dapat berhasil setelah seluruh roster memiliki presensi mapel.</p>
                      </div>
                      <M3Button variant="filled" icon="logout" disabled={!attendanceComplete} onClick={() => setFinishOpen(true)}>Check-Out KBM</M3Button>
                    </div>
                  </M3Card>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "SCHEDULE" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Jadwal Mengajar</h2>
                <p className="text-xs text-md-on-surface-variant">Server menolak bentrok guru maupun bentrok rombel pada waktu yang sama.</p>
              </div>
              {canManage && <M3Button variant="filled" icon="add" onClick={() => setScheduleOpen(true)}>Tambah Jadwal</M3Button>}
            </div>
            <M3Card variant="outlined" className="overflow-hidden">
              {data?.schedules?.length ? (
                <div className="divide-y divide-md-outline-variant/25">
                  {data.schedules.map((schedule: any) => (
                    <div key={schedule.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{DAY_LABELS[schedule.dayOfWeek]} · {schedule.startTime}–{schedule.endTime}</p>
                        <p className="text-xs text-md-on-surface-variant">{schedule.roomLabel || "Ruang belum ditentukan"}</p>
                      </div>
                      {canManage && <M3Button variant="text" size="sm" onClick={async () => { await deactivateTeachingSchedule({ scheduleId: schedule.id }); await q.refetch(); }}>Nonaktifkan</M3Button>}
                    </div>
                  ))}
                </div>
              ) : <div className="p-8 text-center text-sm text-md-on-surface-variant">Belum ada jadwal mengajar.</div>}
            </M3Card>
          </div>
        )}

        {activeTab === "HISTORY" && (
          <M3Card variant="outlined" className="overflow-hidden">
            {sessions.length ? (
              <div className="divide-y divide-md-outline-variant/25">
                {sessions.map((session) => (
                  <div key={session.id} className="grid gap-3 p-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                    <div>
                      <p className="text-xs font-bold">{session.dateOnly}</p>
                      <p className="text-[11px] text-md-on-surface-variant">{timeLabel(session.scheduledStartAt)}–{timeLabel(session.scheduledEndAt)}</p>
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2"><p className="font-semibold">{session.agenda?.competency || "Tanpa agenda"}</p><M3Badge variant={session.status === "COMPLETED" ? "success" : "outline"} size="sm">{session.status}</M3Badge></div>
                      <p className="mt-1 text-xs text-md-on-surface-variant">Presensi: {session.attendance?.records?.length || 0}/{roster.length} · Nilai keaktifan: {session.engagementScores?.length || 0}</p>
                    </div>
                    <M3Button variant="text" size="sm" onClick={() => { setTargetSessionId(session.id); setActiveTab("SESSION"); }}>Buka Pertemuan</M3Button>
                  </div>
                ))}
              </div>
            ) : <div className="p-8 text-center text-sm text-md-on-surface-variant">Belum ada riwayat Teaching Session.</div>}
          </M3Card>
        )}

        {activeTab === "RECAP" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <M3Card variant="outlined" className="overflow-hidden">
              <div className="border-b border-md-outline-variant/25 p-4"><h2 className="font-semibold">Rekap Kehadiran Mapel</h2></div>
              <div className="divide-y divide-md-outline-variant/20">
                {(data?.attendanceRecap || []).map((row: any) => (
                  <div key={row.studentId} className="grid grid-cols-[1fr_auto] gap-3 p-3">
                    <div><p className="text-sm font-semibold">{row.studentName || "Siswa"}</p><p className="text-[11px] text-md-on-surface-variant">H {row.hadir} · S {row.sakit} · I {row.izin} · A {row.alpa} · {row.total} sesi</p></div>
                    <M3Badge variant={row.percentage != null && row.percentage < 85 ? "warning" : "success"}>{row.percentage == null ? "—" : String(row.percentage) + "%"}</M3Badge>
                  </div>
                ))}
                {!data?.attendanceRecap?.length && <div className="p-6 text-sm text-md-on-surface-variant">Belum ada presensi mapel.</div>}
              </div>
            </M3Card>
            <M3Card variant="outlined" className="overflow-hidden">
              <div className="border-b border-md-outline-variant/25 p-4"><h2 className="font-semibold">Rekap Keaktifan</h2></div>
              <div className="divide-y divide-md-outline-variant/20">
                {(data?.engagementRecap || []).map((row: any) => (
                  <div key={row.studentId} className="flex items-center justify-between gap-3 p-3">
                    <div><p className="text-sm font-semibold">{row.studentName || "Siswa"}</p><p className="text-[11px] text-md-on-surface-variant">{row.count} pertemuan dinilai</p></div>
                    <M3Badge variant="outline">{row.average == null ? "—" : row.average}</M3Badge>
                  </div>
                ))}
                {!data?.engagementRecap?.length && <div className="p-6 text-sm text-md-on-surface-variant">Belum ada nilai keaktifan.</div>}
              </div>
            </M3Card>
          </div>
        )}
      </div>

      <M3Dialog
        isOpen={scheduleOpen}
        onClose={() => { if (!busy) setScheduleOpen(false); }}
        title="Tambah Jadwal Mengajar"
        subtitle="Jadwal divalidasi terhadap bentrok guru dan rombel."
        actions={<><M3Button variant="text" onClick={() => setScheduleOpen(false)}>Batal</M3Button><M3Button variant="filled" loading={busy} onClick={saveSchedule}>Simpan Jadwal</M3Button></>}
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold">
            Hari
            <select className="mt-1 min-h-11 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3" value={scheduleDay} onChange={(e) => setScheduleDay(Number(e.target.value))}>
              {DAY_LABELS.map((label, index) => index === 0 ? null : <option key={index} value={index}>{label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <M3TextField type="time" label="Jam Mulai" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
            <M3TextField type="time" label="Jam Selesai" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
          </div>
          <M3TextField label="Ruang / Lab" value={scheduleRoom} onChange={(e) => setScheduleRoom(e.target.value)} />
        </div>
      </M3Dialog>

      <M3Dialog
        isOpen={finishOpen}
        onClose={() => { if (!busy) setFinishOpen(false); }}
        title="Check-Out Teaching Session"
        subtitle="Bukti foto dan GPS disimpan untuk audit pelaksanaan KBM."
        actions={<><M3Button variant="text" onClick={() => setFinishOpen(false)}>Batal</M3Button><M3Button variant="filled" loading={busy} onClick={finishSession}>Selesaikan KBM</M3Button></>}
      >
        <AttendanceEvidenceUploader
          value={finishEvidence}
          onChange={setFinishEvidence}
          required
          label="Selfie check-out guru"
          uploadUrl="/operations/lms-teaching-evidence-upload"
        />
      </M3Dialog>
    </SchoolLayout>
  );
}
