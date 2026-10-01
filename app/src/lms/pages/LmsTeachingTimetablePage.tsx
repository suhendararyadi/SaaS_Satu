import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getTeachingTimetable, useQuery } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Icon,
  M3Tabs,
} from "../../client/components/m3";
import { attendanceLocalParts } from "../../attendance360/time";
import {
  formatTimetableDuration,
  groupTimetableByDay,
  summarizeTimetable,
  timetableSlotPhase,
} from "../teachingPolicy";

type TimetableScope = "MINE" | "ALL";

export function LmsTeachingTimetablePage({ user }: { user: AuthUser }) {
  const [scope, setScope] = useState<TimetableScope | undefined>(undefined);
  const q = useQuery(getTeachingTimetable, { scope });
  const [now, setNow] = useState(() => attendanceLocalParts(new Date()));

  // Penanda "Berlangsung" ikut bergeser tanpa perlu memuat ulang halaman.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(attendanceLocalParts(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const slots = q.data?.slots;
  const days = useMemo(() => groupTimetableByDay(slots ?? []), [slots]);
  const summary = useMemo(() => summarizeTimetable(slots ?? []), [slots]);
  const mode: TimetableScope = q.data?.mode ?? "MINE";
  const showTeacher = mode === "ALL";

  const summaryCards: Array<[string, string, string]> = [
    ["Sesi per minggu", String(summary.sessions), "event_repeat"],
    ["Durasi tatap muka", formatTimetableDuration(summary.minutes), "schedule"],
    ["Hari mengajar", String(summary.activeDays), "calendar_month"],
    ["Rombel", String(summary.classes), "meeting_room"],
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] lg:text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">LMS · Teaching Session</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em]">Jadwal Mengajar</h1>
            <p className="mt-1 max-w-3xl text-sm text-md-on-surface-variant">
              {q.data?.academicYear
                ? `Seluruh sesi KBM mingguan, tahun ajaran ${q.data.academicYear.yearName} semester ${q.data.academicYear.semester === "GANJIL" ? "Ganjil" : "Genap"}.`
                : "Seluruh sesi KBM mingguan pada tahun ajaran aktif."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="filled" href="/school/lms/teaching" icon="play_circle">KBM Hari Ini</M3Button>
            <M3Button variant="outlined" href="/school/lms/courses" icon="menu_book">Ruang Mapel</M3Button>
          </div>
        </header>

        {q.error && (
          <M3Banner
            variant="error"
            supportingText={(q.error as any)?.message || "Jadwal mengajar belum dapat dimuat. Coba muat ulang halaman."}
          />
        )}

        {q.data?.canViewAll && (
          <div className="flex flex-wrap items-center gap-3">
            <M3Tabs
              tabs={[
                { id: "MINE", label: "Jadwal saya" },
                { id: "ALL", label: "Semua dalam cakupan" },
              ]}
              activeTab={mode}
              onChange={(id) => setScope(id as TimetableScope)}
            />
            {mode === "ALL" && <span className="text-xs text-md-on-surface-variant">Cakupan: {q.data.scopeLabel}</span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {summaryCards.map(([label, value, icon]) => (
            <M3Card key={label} variant="outlined" className="p-4">
              <div className="flex items-center gap-2 text-md-on-surface-variant">
                <M3Icon name={icon} size={18} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <p className="mt-2 text-xl font-bold text-md-on-surface sm:text-2xl">{value}</p>
            </M3Card>
          ))}
        </div>

        {q.isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={36} /></div>
        ) : summary.sessions === 0 ? (
          <M3Card variant="outlined" className="p-8 text-center">
            <M3Icon name="event_busy" size={32} className="mx-auto text-md-on-surface-variant" />
            <h2 className="mt-3 text-base font-semibold">Belum ada jadwal mengajar</h2>
            <p className="mt-1 text-sm text-md-on-surface-variant">
              {mode === "MINE"
                ? "Jadwal Anda akan muncul di sini setelah ditambahkan dari detail KBM pada ruang mata pelajaran, atau diinput oleh Kurikulum."
                : "Belum ada jadwal KBM aktif dalam cakupan Anda pada tahun ajaran ini."}
            </p>
          </M3Card>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const isToday = day.dayOfWeek === now.weekday;
              return (
                <M3Card key={day.dayOfWeek} variant="outlined" className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-md-outline-variant/25 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">{day.label}</h2>
                      {isToday && <M3Badge variant="primary" size="sm">Hari ini</M3Badge>}
                    </div>
                    <p className="text-xs text-md-on-surface-variant">
                      {day.slots.length > 0
                        ? `${day.slots.length} sesi · ${formatTimetableDuration(day.minutes)}`
                        : "Tidak ada sesi"}
                    </p>
                  </div>
                  {day.slots.length > 0 && (
                    <div className="divide-y divide-md-outline-variant/25">
                      {day.slots.map((slot) => {
                        const phase = timetableSlotPhase(slot, now);
                        return (
                          <div
                            key={slot.id}
                            className={`grid gap-2 p-4 sm:grid-cols-[132px_1fr_auto] sm:items-center ${phase === "NOW" ? "bg-md-primary-container/40" : ""} ${phase === "DONE" ? "opacity-70" : ""}`}
                          >
                            <div>
                              <p className="text-sm font-bold">{slot.startTime}–{slot.endTime}</p>
                              <p className="text-[13px] lg:text-[11px] text-md-on-surface-variant">{slot.roomLabel || "Ruang belum ditentukan"}</p>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">{slot.subjectName}</p>
                                {phase === "NOW" && <M3Badge variant="primary" size="sm">Berlangsung</M3Badge>}
                              </div>
                              <p className="mt-1 text-xs text-md-on-surface-variant">
                                {slot.className}
                                {slot.departmentCode ? " · " + slot.departmentCode : ""}
                                {showTeacher && !slot.isMine ? " · " + (slot.teacherName || "Guru") : ""}
                              </p>
                            </div>
                            <div className="sm:justify-self-end">
                              <M3Button variant="text" size="sm" href={"/school/lms/courses/" + slot.courseId + "/teaching"}>Detail</M3Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </M3Card>
              );
            })}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
