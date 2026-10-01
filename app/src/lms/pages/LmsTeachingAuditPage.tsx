import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getTeachingAudit, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3Card,
  M3Chip,
  M3CircularProgress,
  M3Icon,
  M3TextField,
} from "../../client/components/m3";
import { TeachingEvidenceDialog, type TeachingEvidenceTarget } from "../components/TeachingEvidenceDialog";
import { PointDetails, clock } from "../components/TeachingLocationPoint";
import { LOCATION_FLAG_LABELS, describeSessionLocation } from "../teachingLocation";

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
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [evidence, setEvidence] = useState<TeachingEvidenceTarget | null>(null);
  const q = useQuery(getTeachingAudit, { from, to });
  const data: any = q.data;

  const rows = useMemo(
    () => (data?.sessions ?? []).map((session: any) => ({ session, location: describeSessionLocation(session, data?.school ?? null) })),
    [data],
  );
  const flaggedCount = rows.filter((row: any) => row.location.flags.length > 0).length;
  const visible = onlyFlagged ? rows.filter((row: any) => row.location.flags.length > 0) : rows;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Governance</p>
            <h1 className="mt-1 text-2xl font-semibold">Audit Pelaksanaan KBM</h1>
            <p className="mt-1 text-sm text-md-on-surface-variant">
              Monitoring sesi, ketepatan check-in, penyelesaian check-out, lokasi check-in/out, agenda, dan presensi siswa sesuai cakupan tugas resmi.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <M3Button variant="outlined" href="/school/lms/peta-kbm" icon="location_on">Lihat di peta</M3Button>
            <div className="grid grid-cols-2 gap-2">
              <M3TextField type="date" label="Dari" value={from} onChange={(e) => setFrom(e.target.value)} />
              <M3TextField type="date" label="Sampai" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["Sesi Tercatat", data?.summary?.totalSessions ?? 0, "event_note"],
                ["Selesai", data?.summary?.completed ?? 0, "check_circle"],
                ["Delegasi", data?.summary?.delegated ?? 0, "forward_to_inbox"],
                ["Missing Checkout", data?.summary?.missingCheckout ?? 0, "warning"],
                ["On-Time", data?.summary?.onTimeRate == null ? "—" : String(data.summary.onTimeRate) + "%", "schedule"],
                ["Bertanda", flaggedCount, "flag"],
              ].map(([label, value, icon]) => (
                <M3Card key={String(label)} variant="outlined" className="p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-md-on-surface-variant">
                    <M3Icon name={String(icon)} size={18} />{label}
                  </div>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </M3Card>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <M3Chip variant="filter" selected={onlyFlagged} onClick={() => setOnlyFlagged((value) => !value)} role="button" aria-pressed={onlyFlagged}>
                Hanya yang bertanda
              </M3Chip>
              <span className="text-xs text-md-on-surface-variant">
                Tanda adalah kondisi objektif untuk ditinjau (geofence belum diatur, akurasi rendah, check-in terlambat, belum check-out), bukan kesimpulan bahwa guru tidak mengajar.
              </span>
            </div>

            <M3Card variant="outlined" className="overflow-hidden">
              {visible.length ? (
                <div className="divide-y divide-md-outline-variant/25">
                  {visible.map(({ session, location }: any) => (
                    <div key={session.id} className="space-y-3 p-4">
                      <div className="grid gap-3 lg:grid-cols-[120px_1fr_180px_auto] lg:items-center">
                        <div>
                          <p className="text-xs font-bold">{session.dateOnly}</p>
                          <p className="text-[11px] text-md-on-surface-variant">{clock(session.scheduledStartAt)}–{clock(session.scheduledEndAt)}</p>
                        </div>
                        <div>
                          <p className="font-semibold">{session.course.subjectName} · {session.course.classRoom.name}</p>
                          <p className="mt-1 text-xs text-md-on-surface-variant">
                            {session.course.teacher.name || "Guru"}
                            {session.schedule?.roomLabel ? " · Ruang jadwal " + session.schedule.roomLabel : ""}
                            {session.agenda?.competency ? " · " + session.agenda.competency : ""}
                          </p>
                        </div>
                        <div className="text-xs text-md-on-surface-variant">
                          <p>Check-in: {clock(session.teacherCheckInAt)}</p>
                          <p>Check-out: {clock(session.teacherCheckOutAt)}</p>
                          {location.checkInToOutM != null && <p>Selisih titik: {location.checkInToOutM} m</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <M3Badge variant={session.status === "COMPLETED" ? "success" : session.status === "DELEGATED" ? "tertiary" : "outline"} size="sm">
                            {session.status.replaceAll("_", " ")}
                          </M3Badge>
                        </div>
                      </div>

                      {(location.checkIn || location.checkOut || session.teacherCheckInAt) && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <PointDetails
                            label="Lokasi check-in"
                            point={location.checkIn}
                            onOpenPhoto={() => setEvidence({
                              sessionId: session.id,
                              kind: "CHECK_IN",
                              title: "Foto check-in guru",
                              subtitle: `${session.course.teacher.name || "Guru"} · ${session.course.subjectName} · ${session.dateOnly}`,
                            })}
                          />
                          <PointDetails
                            label="Lokasi check-out"
                            point={location.checkOut}
                            onOpenPhoto={() => setEvidence({
                              sessionId: session.id,
                              kind: "CHECK_OUT",
                              title: "Foto check-out guru",
                              subtitle: `${session.course.teacher.name || "Guru"} · ${session.course.subjectName} · ${session.dateOnly}`,
                            })}
                          />
                        </div>
                      )}

                      {location.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5" aria-label="Tanda untuk ditinjau">
                          {location.flags.map((flag: keyof typeof LOCATION_FLAG_LABELS) => (
                            <M3Badge key={flag} variant="warning" size="sm" icon={<M3Icon name="flag" size={12} />}>{LOCATION_FLAG_LABELS[flag]}</M3Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-md-on-surface-variant">
                  {onlyFlagged ? "Tidak ada sesi bertanda pada periode ini." : "Belum ada sesi KBM pada periode ini."}
                </div>
              )}
            </M3Card>
          </>
        )}
      </div>
      <TeachingEvidenceDialog target={evidence} onClose={() => setEvidence(null)} />
    </SchoolLayout>
  );
}
