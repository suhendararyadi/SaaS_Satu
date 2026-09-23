import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getTeachingAudit, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Card,
  M3CircularProgress,
  M3Icon,
  M3TextField,
} from "../../client/components/m3";

function todayOffset(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function LmsTeachingAuditPage({ user }: { user: AuthUser }) {
  const [from, setFrom] = useState(todayOffset(-7));
  const [to, setTo] = useState(todayOffset(0));
  const q = useQuery(getTeachingAudit, { from, to });
  const data = q.data;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Governance</p>
            <h1 className="mt-1 text-2xl font-semibold">Audit Pelaksanaan KBM</h1>
            <p className="mt-1 text-sm text-md-on-surface-variant">
              Monitoring sesi, ketepatan check-in, penyelesaian check-out, agenda, dan presensi siswa sesuai cakupan tugas resmi.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <M3TextField type="date" label="Dari" value={from} onChange={(e) => setFrom(e.target.value)} />
            <M3TextField type="date" label="Sampai" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </header>

        {q.isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={36} /></div>
        ) : q.error ? (
          <M3Card variant="outlined" className="p-6 text-sm text-md-error">
            {(q.error as any)?.message || "Audit KBM tidak dapat dimuat."}
          </M3Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Sesi Tercatat", data?.summary?.totalSessions ?? 0, "event_note"],
                ["Selesai", data?.summary?.completed ?? 0, "check_circle"],
                ["Delegasi", data?.summary?.delegated ?? 0, "forward_to_inbox"],
                ["Missing Checkout", data?.summary?.missingCheckout ?? 0, "warning"],
                ["On-Time", data?.summary?.onTimeRate == null ? "—" : String(data.summary.onTimeRate) + "%", "schedule"],
              ].map(([label, value, icon]) => (
                <M3Card key={String(label)} variant="outlined" className="p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-md-on-surface-variant">
                    <M3Icon name={String(icon)} size={18}/>{label}
                  </div>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </M3Card>
              ))}
            </div>

            <M3Card variant="outlined" className="overflow-hidden">
              {data?.sessions?.length ? (
                <div className="divide-y divide-md-outline-variant/25">
                  {data.sessions.map((session: any) => (
                    <div key={session.id} className="grid gap-3 p-4 lg:grid-cols-[120px_1fr_180px_auto] lg:items-center">
                      <div>
                        <p className="text-xs font-bold">{session.dateOnly}</p>
                        <p className="text-[11px] text-md-on-surface-variant">
                          {new Date(session.scheduledStartAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                          {"–"}
                          {new Date(session.scheduledEndAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">{session.course.subjectName} · {session.course.classRoom.name}</p>
                        <p className="mt-1 text-xs text-md-on-surface-variant">
                          {session.course.teacher.name || "Guru"}
                          {session.agenda?.competency ? " · " + session.agenda.competency : ""}
                        </p>
                      </div>
                      <div className="text-xs text-md-on-surface-variant">
                        <p>Check-in: {session.teacherCheckInAt ? new Date(session.teacherCheckInAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                        <p>Check-out: {session.teacherCheckOutAt ? new Date(session.teacherCheckOutAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <M3Badge variant={session.status === "COMPLETED" ? "success" : session.status === "DELEGATED" ? "tertiary" : "outline"} size="sm">
                          {session.status.replaceAll("_", " ")}
                        </M3Badge>
                        {session.checkInEvidenceKey && <a className="text-xs font-semibold text-md-primary" href={"/operations/lms-teaching-evidence/" + session.id + "/CHECK_IN"} target="_blank" rel="noreferrer">Foto Masuk</a>}
                        {session.checkOutEvidenceKey && <a className="text-xs font-semibold text-md-primary" href={"/operations/lms-teaching-evidence/" + session.id + "/CHECK_OUT"} target="_blank" rel="noreferrer">Foto Pulang</a>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-md-on-surface-variant">Belum ada sesi KBM pada periode ini.</div>
              )}
            </M3Card>
          </>
        )}
      </div>
    </SchoolLayout>
  );
}
