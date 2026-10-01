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
import { TeachingMap, type MapSchool } from "../components/TeachingMap";
import { LOCATION_FLAG_LABELS, buildMapPoints, describeSessionLocation } from "../teachingLocation";

function todayOffset(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function LmsTeachingMapPage({ user }: { user: AuthUser }) {
  const [from, setFrom] = useState(todayOffset(-7));
  const [to, setTo] = useState(todayOffset(0));
  const [search, setSearch] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(true);
  const [showCheckOut, setShowCheckOut] = useState(true);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<TeachingEvidenceTarget | null>(null);
  const q = useQuery(getTeachingAudit, { from, to });
  const data: any = q.data;

  const school: MapSchool = data?.school?.latitude != null && data?.school?.longitude != null
    ? { latitude: data.school.latitude, longitude: data.school.longitude, radiusMeters: data.school.radiusMeters }
    : null;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.sessions ?? [])
      .map((session: any) => ({ session, location: describeSessionLocation(session, data?.school ?? null) }))
      .filter(({ session, location }: any) => {
        if (onlyFlagged && location.flags.length === 0) return false;
        if (!term) return true;
        return [session.course?.teacher?.name, session.course?.subjectName, session.course?.classRoom?.name]
          .some((value) => String(value ?? "").toLowerCase().includes(term));
      });
  }, [data, search, onlyFlagged]);

  const withPoints = rows.filter(({ location }: any) => location.checkIn || location.checkOut);
  const withoutPoints = rows.length - withPoints.length;
  const points = useMemo(
    () => buildMapPoints(
      withPoints.map(({ session, location }: any) => ({
        sessionId: session.id,
        location,
        label: `${session.course.teacher.name || "Guru"} · ${session.course.subjectName} · ${session.course.classRoom.name} · ${clock(session.scheduledStartAt)}`,
      })),
      { checkIn: showCheckIn, checkOut: showCheckOut },
    ),
    [withPoints, showCheckIn, showCheckOut],
  );

  const selected = withPoints.find(({ session }: any) => session.id === selectedSessionId) ?? null;
  const select = (sessionId: string, pointId: string | null) => {
    setSelectedSessionId(sessionId);
    setSelectedPointId(pointId);
  };
  const openPhoto = (session: any, kind: "CHECK_IN" | "CHECK_OUT") =>
    setEvidence({
      sessionId: session.id,
      kind,
      title: kind === "CHECK_IN" ? "Foto check-in guru" : "Foto check-out guru",
      subtitle: `${session.course.teacher.name || "Guru"} · ${session.course.subjectName} · ${session.dateOnly}`,
    });

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Governance</p>
            <h1 className="mt-1 text-2xl font-semibold">Peta KBM</h1>
            <p className="mt-1 max-w-3xl text-sm text-md-on-surface-variant">
              Titik lokasi check-in dan check-out guru pada sesi mengajar, sesuai cakupan tugas resmi. Titik menunjukkan perkiraan posisi ponsel, bukan bukti guru berada di ruang tertentu.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <M3Button variant="outlined" href="/school/lms/teaching/audit" icon="fact_check">Daftar audit</M3Button>
            <div className="grid grid-cols-2 gap-2">
              <M3TextField type="date" label="Dari" value={from} onChange={(e) => setFrom(e.target.value)} />
              <M3TextField type="date" label="Sampai" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-80"><M3TextField label="Cari guru, mapel, atau rombel" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <M3Chip variant="filter" selected={showCheckIn} onClick={() => setShowCheckIn((v) => !v)} role="button" aria-pressed={showCheckIn}>Check-in</M3Chip>
          <M3Chip variant="filter" selected={showCheckOut} onClick={() => setShowCheckOut((v) => !v)} role="button" aria-pressed={showCheckOut}>Check-out</M3Chip>
          <M3Chip variant="filter" selected={onlyFlagged} onClick={() => setOnlyFlagged((v) => !v)} role="button" aria-pressed={onlyFlagged}>Hanya yang bertanda</M3Chip>
        </div>

        {q.isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={36} /></div>
        ) : q.error ? (
          <M3Card variant="outlined" className="p-6 text-sm text-md-error">{(q.error as any)?.message || "Data peta tidak dapat dimuat."}</M3Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-2">
              <M3Card variant="outlined" className="overflow-hidden">
                <TeachingMap
                  school={school}
                  points={points}
                  selectedId={selectedPointId}
                  onSelect={(pointId) => select(pointId.split(":")[0], pointId)}
                  className="h-[380px] w-full sm:h-[480px] lg:h-[600px]"
                />
              </M3Card>
              <p className="text-xs text-md-on-surface-variant" data-testid="map-legend">
                <strong>M</strong> bulat biru = check-in · <strong>P</strong> kotak hijau = check-out · <strong>S</strong> belah ketupat = titik sekolah · cincin oranye = dipilih · lingkaran tipis = akurasi GPS · garis putus-putus = radius sekolah.
              </p>
              {!school && (
                <p className="text-xs text-md-on-surface-variant">Koordinat sekolah belum diatur, jadi titik sekolah dan radiusnya tidak digambar.</p>
              )}
              {points.length === 0 && (
                <p className="text-sm text-md-on-surface-variant" role="status">Belum ada titik lokasi pada periode dan filter ini.</p>
              )}
            </div>

            <div className="space-y-3">
              {selected && (
                <M3Card variant="outlined" className="space-y-3 p-4" data-testid="selected-session">
                  <div>
                    <p className="font-semibold">{selected.session.course.subjectName} · {selected.session.course.classRoom.name}</p>
                    <p className="mt-1 text-xs text-md-on-surface-variant">
                      {selected.session.course.teacher.name || "Guru"} · {selected.session.dateOnly} {clock(selected.session.scheduledStartAt)}–{clock(selected.session.scheduledEndAt)}
                      {selected.session.schedule?.roomLabel ? " · Ruang jadwal " + selected.session.schedule.roomLabel : ""}
                    </p>
                  </div>
                  <PointDetails label="Lokasi check-in" point={selected.location.checkIn} onOpenPhoto={() => openPhoto(selected.session, "CHECK_IN")} />
                  <PointDetails label="Lokasi check-out" point={selected.location.checkOut} onOpenPhoto={() => openPhoto(selected.session, "CHECK_OUT")} />
                  {selected.location.checkInToOutM != null && (
                    <p className="text-xs text-md-on-surface-variant">Selisih titik check-in dan check-out: {selected.location.checkInToOutM} m</p>
                  )}
                  {selected.location.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.location.flags.map((flag: keyof typeof LOCATION_FLAG_LABELS) => (
                        <M3Badge key={flag} variant="warning" size="sm" icon={<M3Icon name="flag" size={12} />}>{LOCATION_FLAG_LABELS[flag]}</M3Badge>
                      ))}
                    </div>
                  )}
                </M3Card>
              )}

              <M3Card variant="outlined" className="overflow-hidden">
                <div className="border-b border-md-outline-variant/25 px-4 py-3">
                  <h2 className="text-sm font-semibold">Sesi dengan titik lokasi ({withPoints.length})</h2>
                  {withoutPoints > 0 && <p className="text-xs text-md-on-surface-variant">{withoutPoints} sesi lain tidak punya titik lokasi tercatat.</p>}
                </div>
                {withPoints.length ? (
                  <ul className="max-h-[420px] divide-y divide-md-outline-variant/25 overflow-y-auto">
                    {withPoints.map(({ session, location }: any) => {
                      const active = session.id === selectedSessionId;
                      return (
                        <li key={session.id}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => select(session.id, location.checkIn ? `${session.id}:CHECK_IN` : `${session.id}:CHECK_OUT`)}
                            className={`flex w-full min-h-11 flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-black/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3] ${active ? "bg-md-primary-container/50" : ""}`}
                          >
                            <span className="text-sm font-semibold">{session.course.teacher.name || "Guru"}</span>
                            <span className="text-xs text-md-on-surface-variant">
                              {session.course.subjectName} · {session.course.classRoom.name} · {session.dateOnly} {clock(session.scheduledStartAt)}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-md-on-surface-variant">
                              {location.checkIn && <span>M {clock(location.checkIn.at)}</span>}
                              {location.checkOut && <span>P {clock(location.checkOut.at)}</span>}
                              {location.flags.length > 0 && <M3Badge variant="warning" size="sm">{location.flags.length} tanda</M3Badge>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="p-6 text-center text-sm text-md-on-surface-variant">Tidak ada sesi yang cocok.</p>
                )}
              </M3Card>
            </div>
          </div>
        )}
      </div>
      <TeachingEvidenceDialog target={evidence} onClose={() => setEvidence(null)} />
    </SchoolLayout>
  );
}
