import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getDailySchoolAttendance,
  saveDailySchoolAttendance,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3TextField,
} from "../../client/components/m3";
import {
  DAILY_ATTENDANCE_STATUSES,
  jakartaDateOnly,
  type DailyAttendanceStatus,
} from "../dailyAttendance";

type DraftRecord = {
  status: DailyAttendanceStatus;
  notes: string;
};

const statusLabels: Record<DailyAttendanceStatus, string> = {
  HADIR: "Hadir",
  SAKIT: "Sakit",
  IZIN: "Izin",
  ALPA: "Alpa",
  TERLAMBAT: "Terlambat",
};

function StatusButton({
  status,
  active,
  onClick,
}: {
  status: DailyAttendanceStatus;
  active: boolean;
  onClick: () => void;
}) {
  const activeClass =
    status === "HADIR"
      ? "bg-md-secondary text-md-on-secondary"
      : status === "ALPA"
        ? "bg-md-error text-md-on-error"
        : status === "TERLAMBAT"
          ? "bg-md-tertiary text-md-on-tertiary"
          : "bg-md-primary text-md-on-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-[999px] border px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
        active
          ? `${activeClass} border-transparent`
          : "border-md-outline-variant bg-md-surface text-md-on-surface-variant hover:bg-md-surface-container-high",
      ].join(" ")}
    >
      {statusLabels[status]}
    </button>
  );
}

export function DailyAttendancePage({ user }: { user: AuthUser }) {
  const today = jakartaDateOnly();
  const [dateOnly, setDateOnly] = useState(today);
  const [classRoomId, setClassRoomId] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftRecord>>({});
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data, isLoading, error, refetch } = useQuery(
    getDailySchoolAttendance,
    {
      ...(classRoomId ? { classRoomId } : {}),
      dateOnly,
    },
  );

  useEffect(() => {
    if (!classRoomId && data?.classes?.[0]?.id) {
      setClassRoomId(data.classes[0].id);
    }
  }, [classRoomId, data?.classes]);

  useEffect(() => {
    if (!data?.students) return;
    const next: Record<string, DraftRecord> = {};
    for (const student of data.students as any[]) {
      next[student.id] = {
        status: (student.attendance?.status || "HADIR") as DailyAttendanceStatus,
        notes: student.attendance?.notes || "",
      };
    }
    setDraft(next);
  }, [data?.students, dateOnly, classRoomId]);

  const filteredStudents = useMemo(() => {
    const students = (data?.students || []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      return (
        student.name?.toLowerCase().includes(q) ||
        student.studentProfile?.nis?.toLowerCase().includes(q) ||
        student.studentProfile?.nisn?.toLowerCase().includes(q)
      );
    });
  }, [data?.students, search]);

  const draftSummary = useMemo(() => {
    const values = Object.values(draft);
    return {
      total: values.length,
      hadir: values.filter((record) => record.status === "HADIR").length,
      sakit: values.filter((record) => record.status === "SAKIT").length,
      izin: values.filter((record) => record.status === "IZIN").length,
      alpa: values.filter((record) => record.status === "ALPA").length,
      terlambat: values.filter((record) => record.status === "TERLAMBAT").length,
    };
  }, [draft]);

  const classOptions = ((data?.classes || []) as any[]).map((classRoom) => ({
    value: classRoom.id,
    label: `${classRoom.name} · ${classRoom._count?.students || 0} siswa`,
  }));

  const setAllPresent = () => {
    setDraft((current) =>
      Object.fromEntries(
        Object.entries(current).map(([studentId, record]) => [
          studentId,
          { ...record, status: "HADIR" as const },
        ]),
      ),
    );
  };

  const handleSave = async () => {
    if (!classRoomId || !data?.students?.length) return;
    setSubmitting(true);
    setMessage("");
    setErrorMsg("");
    try {
      await saveDailySchoolAttendance({
        classRoomId,
        dateOnly,
        records: (data.students as any[]).map((student) => ({
          studentId: student.id,
          status: draft[student.id]?.status || "HADIR",
          notes: draft[student.id]?.notes?.trim() || null,
        })),
      });
      await refetch();
      setMessage(
        `Presensi ${data.selectedClass?.name || "rombel"} tanggal ${new Date(
          `${dateOnly}T00:00:00`,
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} berhasil disimpan.`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Presensi harian belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSave = !!data?.students?.length && dateOnly <= today && !submitting;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="v2-eyebrow">KEHADIRAN SEKOLAH</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-md-on-surface">
              Presensi Harian
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-md-on-surface-variant">
              Catat satu status kehadiran resmi per siswa setiap hari. Presensi ini berdiri
              terpisah dari presensi KBM dan presensi PKL.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.savedCount ? (
              <M3Badge variant="success">{data.savedCount} sudah tersimpan</M3Badge>
            ) : (
              <M3Badge variant="secondary">Belum disimpan</M3Badge>
            )}
            <M3Button
              variant="outlined"
              size="sm"
              icon="done_all"
              onClick={setAllPresent}
              disabled={!data?.students?.length}
            >
              Semua Hadir
            </M3Button>
          </div>
        </header>

        {message && (
          <M3Banner
            variant="success"
            title="Presensi tersimpan"
            supportingText={message}
            dismissible
            onDismiss={() => setMessage("")}
          />
        )}
        {(errorMsg || error) && (
          <M3Banner
            variant="error"
            title="Presensi belum dapat diproses"
            supportingText={errorMsg || (error as any)?.message || "Terjadi kesalahan."}
            dismissible={!!errorMsg}
            onDismiss={() => setErrorMsg("")}
          />
        )}

        <M3Card variant="elevated" className="p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_minmax(220px,1fr)]">
            <M3TextField
              label="Tanggal"
              type="date"
              value={dateOnly}
              max={today}
              onChange={(event) => {
                setDateOnly(event.target.value);
                setMessage("");
              }}
            />
            <M3Select
              label="Kelas / Rombel"
              value={classRoomId}
              options={classOptions}
              onChange={(event) => {
                setClassRoomId(event.target.value);
                setMessage("");
                setSearch("");
              }}
              disabled={!classOptions.length}
            />
            <M3TextField
              label="Cari siswa"
              placeholder="Nama, NIS, atau NISN"
              leadingIcon="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-md-outline-variant/30 pt-4 text-xs text-md-on-surface-variant">
            <span>
              Tahun Ajaran:{" "}
              <strong className="text-md-on-surface">
                {data?.activeAcademicYear
                  ? `${data.activeAcademicYear.yearName} · ${data.activeAcademicYear.semester}`
                  : "Belum ada tahun ajaran aktif"}
              </strong>
            </span>
            {data?.selectedClass?.department?.name && (
              <span>
                Program:{" "}
                <strong className="text-md-on-surface">
                  {data.selectedClass.department.name}
                </strong>
              </span>
            )}
          </div>
        </M3Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total", draftSummary.total, "groups"],
            ["Hadir", draftSummary.hadir, "check_circle"],
            ["Sakit", draftSummary.sakit, "medical_services"],
            ["Izin", draftSummary.izin, "event_available"],
            ["Alpa", draftSummary.alpa, "cancel"],
            ["Terlambat", draftSummary.terlambat, "schedule"],
          ].map(([label, value, icon]) => (
            <M3Card key={String(label)} variant="outlined" className="p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[11px] bg-md-surface-container-high text-md-on-surface-variant">
                  <M3Icon name={String(icon)} size={19} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-md-on-surface-variant">
                    {label}
                  </p>
                  <p className="text-xl font-extrabold text-md-on-surface">{value}</p>
                </div>
              </div>
            </M3Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <M3CircularProgress size={38} />
          </div>
        ) : !data?.activeAcademicYear ? (
          <M3EmptyState
            icon="calendar_month"
            title="Tahun ajaran aktif belum tersedia"
            description="Aktifkan tahun ajaran terlebih dahulu sebelum membuat presensi harian."
            actionLabel="Atur Tahun Ajaran"
            actionHref="/school/academic-years"
          />
        ) : !classOptions.length ? (
          <M3EmptyState
            icon="meeting_room"
            title="Belum ada rombel aktif"
            description="Tambahkan kelas/rombel pada tahun ajaran aktif untuk mulai mencatat kehadiran."
            actionLabel="Buka Kelas & Rombel"
            actionHref="/school/classes"
          />
        ) : !data?.students?.length ? (
          <M3EmptyState
            icon="groups"
            title="Belum ada siswa aktif di rombel ini"
            description="Tempatkan siswa ke rombel aktif terlebih dahulu."
            actionLabel="Buka Data Siswa"
            actionHref="/school/students"
          />
        ) : (
          <M3Card variant="elevated" className="overflow-hidden">
            <div className="border-b border-md-outline-variant/30 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-md-on-surface">
                    {data.selectedClass?.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-md-on-surface-variant">
                    {filteredStudents.length} dari {data.students.length} siswa ditampilkan
                  </p>
                </div>
                <p className="text-xs text-md-on-surface-variant">
                  Status awal siswa yang belum pernah dicatat ditampilkan sebagai{" "}
                  <strong>Hadir</strong>, tetapi belum menjadi data resmi sampai tombol Simpan
                  ditekan.
                </p>
              </div>
            </div>

            <div className="divide-y divide-md-outline-variant/25">
              {filteredStudents.map((student: any, index: number) => {
                const record = draft[student.id] || { status: "HADIR", notes: "" };
                return (
                  <div
                    key={student.id}
                    className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(220px,1fr)_minmax(420px,1.8fr)_minmax(220px,1fr)] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-md-surface-container-high text-xs font-bold text-md-on-surface-variant">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-md-on-surface">
                          {student.name || "Tanpa Nama"}
                        </p>
                        <p className="truncate text-[11.5px] text-md-on-surface-variant">
                          NIS {student.studentProfile?.nis || "-"} · NISN{" "}
                          {student.studentProfile?.nisn || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {DAILY_ATTENDANCE_STATUSES.map((status) => (
                        <StatusButton
                          key={status}
                          status={status}
                          active={record.status === status}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              [student.id]: { ...record, status },
                            }))
                          }
                        />
                      ))}
                    </div>

                    <M3TextField
                      size="sm"
                      aria-label={`Catatan presensi ${student.name || "siswa"}`}
                      placeholder={
                        record.status === "HADIR" ? "Catatan opsional" : "Tambahkan keterangan"
                      }
                      value={record.notes}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [student.id]: { ...record, notes: event.target.value },
                        }))
                      }
                      maxLength={500}
                    />
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-md-outline-variant/30 bg-md-surface/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs leading-5 text-md-on-surface-variant">
                Penyimpanan akan memperbarui seluruh siswa aktif dalam rombel untuk tanggal ini.
                Perubahan berikutnya tetap dapat disimpan ulang.
              </p>
              <M3Button
                variant="filled"
                icon="save"
                onClick={handleSave}
                disabled={!canSave}
                className="shrink-0"
              >
                {submitting ? "Menyimpan..." : "Simpan Presensi Harian"}
              </M3Button>
            </div>
          </M3Card>
        )}
      </div>
    </SchoolLayout>
  );
}
