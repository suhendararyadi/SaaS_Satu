import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  delegateTeachingAbsence,
  getTeachingWorkspace,
  startTeachingSession,
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
  M3TextField,
} from "../../client/components/m3";
import { AttendanceEvidenceUploader } from "../../attendance360/components/AttendanceEvidenceUploader";

const STATE_META: Record<string, { label: string; variant: any }> = {
  LOCKED: { label: "Terkunci", variant: "outline" },
  READY: { label: "Siap Dimulai", variant: "primary" },
  SLA_BREACH: { label: "Lewat SLA 15 Menit", variant: "warning" },
  MISSED: { label: "Belum Dilaksanakan", variant: "error" },
  IN_PROGRESS: { label: "Sedang Berlangsung", variant: "primary" },
  COMPLETED: { label: "Selesai", variant: "success" },
  DELEGATED: { label: "Tugas ke Piket", variant: "tertiary" },
  ABSENT: { label: "Tidak Masuk", variant: "warning" },
  CANCELLED: { label: "Dibatalkan", variant: "outline" },
};

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

export function LmsTeachingWorkspacePage({ user }: { user: AuthUser }) {
  const q = useQuery(getTeachingWorkspace, {});
  const [startRow, setStartRow] = useState<any>(null);
  const [absenceRow, setAbsenceRow] = useState<any>(null);
  const [topic, setTopic] = useState("");
  const [method, setMethod] = useState("");
  const [summary, setSummary] = useState("");
  const [evidenceKey, setEvidenceKey] = useState("");
  const [absenceType, setAbsenceType] = useState("SAKIT");
  const [absenceReason, setAbsenceReason] = useState("");
  const [dutyInstruction, setDutyInstruction] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows: any[] = q.data?.rows || [];
  const summaryCards = [
    ["Jadwal Hari Ini", q.data?.summary?.scheduled ?? 0, "calendar_month"],
    ["Belum Dimulai", (q.data?.summary?.ready ?? 0) + (q.data?.summary?.locked ?? 0), "schedule"],
    ["Sedang KBM", q.data?.summary?.active ?? 0, "play_circle"],
    ["Selesai", q.data?.summary?.completed ?? 0, "check_circle"],
    ["Perlu Piket", q.data?.summary?.slaBreaches ?? 0, "warning"],
  ];

  const submitStart = async () => {
    if (!startRow || !topic.trim() || !method.trim() || summary.trim().length < 5 || !evidenceKey) {
      setMessage({ tone: "error", text: "Lengkapi topik, metode, ringkasan, dan selfie check-in guru." });
      return;
    }
    setBusy(true);
    try {
      const coords = await getCoords();
      await startTeachingSession({
        scheduleId: startRow.id,
        topic: topic.trim(),
        method: method.trim(),
        summary: summary.trim(),
        evidenceKey,
        ...coords,
      });
      setStartRow(null);
      setMessage({ tone: "success", text: "Sesi KBM dimulai. Agenda dan bukti check-in guru telah tercatat." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Sesi KBM belum dapat dimulai." });
    } finally {
      setBusy(false);
    }
  };

  const submitAbsence = async () => {
    if (!absenceRow || absenceReason.trim().length < 5 || dutyInstruction.trim().length < 5) {
      setMessage({ tone: "error", text: "Isi alasan ketidakhadiran dan instruksi tugas untuk Guru Piket." });
      return;
    }
    setBusy(true);
    try {
      await delegateTeachingAbsence({
        scheduleId: absenceRow.id,
        dateOnly: q.data?.dateOnly,
        absenceType: absenceType as any,
        reason: absenceReason.trim(),
        dutyInstruction: dutyInstruction.trim(),
      });
      setAbsenceRow(null);
      setMessage({ tone: "success", text: "Ketidakhadiran dan tugas telah dikirim ke antrean Guru Piket." });
      await q.refetch();
    } catch (error: any) {
      setMessage({ tone: "error", text: error?.message || "Delegasi belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] lg:text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Teaching Session</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">KBM Hari Ini</h1>
            <p className="mt-1 max-w-3xl text-sm text-md-on-surface-variant">
              Jadwal → agenda → check-in guru → presensi siswa → keaktifan → check-out. Kehadiran mapel tetap independen dari Kehadiran Global.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="outlined" href="/school/lms/courses" icon="menu_book">Ruang Mapel</M3Button>
            <M3Button variant="outlined" href="/school/lms/teaching/audit" icon="monitoring">Audit KBM</M3Button>
          </div>
        </header>

        {message && (
          <M3Banner
            variant={message.tone === "success" ? "success" : "error"}
            supportingText={message.text}
            dismissible
            onDismiss={() => setMessage(null)}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value, icon]) => (
            <M3Card key={String(label)} variant="outlined" className="p-4">
              <div className="flex items-center gap-2 text-md-on-surface-variant">
                <M3Icon name={String(icon)} size={18} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-md-on-surface">{value}</p>
            </M3Card>
          ))}
        </div>

        {q.isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={36} /></div>
        ) : rows.length === 0 ? (
          <M3Card variant="outlined" className="p-8 text-center">
            <M3Icon name="event_busy" size={32} className="mx-auto text-md-on-surface-variant" />
            <h2 className="mt-3 text-base font-semibold">Belum ada jadwal KBM hari ini</h2>
            <p className="mt-1 text-sm text-md-on-surface-variant">Tambahkan jadwal dari detail KBM pada ruang mata pelajaran.</p>
          </M3Card>
        ) : (
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="divide-y divide-md-outline-variant/25">
              {rows.map((row: any) => {
                const meta = STATE_META[row.derivedState] || STATE_META.LOCKED;
                return (
                  <div key={row.id} className="grid gap-3 p-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                    <div>
                      <p className="text-sm font-bold">{row.startTime}–{row.endTime}</p>
                      <p className="text-[13px] lg:text-[11px] text-md-on-surface-variant">{row.roomLabel || "Ruang belum ditentukan"}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{row.course.subjectName}</p>
                        <M3Badge variant={meta.variant} size="sm">{meta.label}</M3Badge>
                      </div>
                      <p className="mt-1 text-xs text-md-on-surface-variant">
                        {row.course.classRoom.name} · {row.course.teacher.name || "Guru"}
                        {row.course.classRoom.department?.code ? " · " + row.course.classRoom.department.code : ""}
                      </p>
                      {row.session?.agenda && <p className="mt-1 text-xs text-md-on-surface-variant">Agenda: {row.session.agenda.competency}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <M3Button variant="text" size="sm" href={"/school/lms/courses/" + row.course.id + "/teaching"}>Detail</M3Button>
                      {row.isMine && ["READY", "SLA_BREACH"].includes(row.derivedState) && !row.session && (
                        <M3Button variant="filled" size="sm" icon="play_arrow" onClick={() => {
                          setStartRow(row);
                          setTopic(""); setMethod(""); setSummary(""); setEvidenceKey(""); setMessage(null);
                        }}>Mulai KBM</M3Button>
                      )}
                      {row.isMine && ["LOCKED", "READY", "SLA_BREACH"].includes(row.derivedState) && !row.session && (
                        <M3Button variant="outlined" size="sm" icon="forward_to_inbox" onClick={() => {
                          setAbsenceRow(row); setAbsenceReason(""); setDutyInstruction(""); setMessage(null);
                        }}>Tidak Masuk</M3Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </M3Card>
        )}
      </div>

      <M3Dialog
        isOpen={!!startRow}
        onClose={() => { if (!busy) setStartRow(null); }}
        title="Mulai Teaching Session"
        subtitle={startRow ? startRow.course.subjectName + " · " + startRow.course.classRoom.name + " · " + startRow.startTime + "–" + startRow.endTime : ""}
        actions={<>
          <M3Button variant="text" disabled={busy} onClick={() => setStartRow(null)}>Batal</M3Button>
          <M3Button variant="filled" loading={busy} onClick={submitStart}>Check-In & Mulai</M3Button>
        </>}
      >
        <div className="space-y-3">
          <M3TextField label="Topik / Materi *" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <M3TextField label="Metode Pembelajaran *" value={method} onChange={(e) => setMethod(e.target.value)} />
          <label className="block text-[13px] font-semibold text-md-on-surface">
            Ringkasan Aktivitas KBM *
            <textarea
              className="mt-1.5 min-h-28 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[14px] text-md-on-surface outline-none transition focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
            />
          </label>
          <AttendanceEvidenceUploader
            value={evidenceKey}
            onChange={setEvidenceKey}
            required
            label="Selfie check-in guru"
            uploadUrl="/operations/lms-teaching-evidence-upload"
          />
          <p className="text-[13px] lg:text-[11px] leading-5 text-md-on-surface-variant">
            GPS divalidasi server terhadap geofence sekolah bila koordinat sekolah sudah dikonfigurasi.
          </p>
        </div>
      </M3Dialog>

      <M3Dialog
        isOpen={!!absenceRow}
        onClose={() => { if (!busy) setAbsenceRow(null); }}
        title="Pengajuan Tidak Masuk & Delegasi Piket"
        subtitle={absenceRow ? absenceRow.course.subjectName + " · " + absenceRow.course.classRoom.name : ""}
        actions={<>
          <M3Button variant="text" disabled={busy} onClick={() => setAbsenceRow(null)}>Batal</M3Button>
          <M3Button variant="filled" loading={busy} onClick={submitAbsence}>Kirim ke Guru Piket</M3Button>
        </>}
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold">
            Jenis ketidakhadiran
            <select className="mt-1 min-h-11 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3" value={absenceType} onChange={(e) => setAbsenceType(e.target.value)}>
              <option value="SAKIT">Sakit</option>
              <option value="IZIN">Izin</option>
              <option value="DINAS">Dinas Luar</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
          </label>
          <label className="block text-[13px] font-semibold text-md-on-surface">
            Alasan *
            <textarea
              className="mt-1.5 min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[14px] text-md-on-surface outline-none transition focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              rows={3}
            />
          </label>
          <label className="block text-[13px] font-semibold text-md-on-surface">
            Instruksi / Tugas untuk kelas *
            <textarea
              className="mt-1.5 min-h-32 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[14px] text-md-on-surface outline-none transition focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
              value={dutyInstruction}
              onChange={(e) => setDutyInstruction(e.target.value)}
              rows={5}
            />
          </label>
        </div>
      </M3Dialog>
    </SchoolLayout>
  );
}
