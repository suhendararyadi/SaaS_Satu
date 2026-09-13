import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getDailyAttendanceReportData,
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
  M3Tabs,
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

const monthOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
].map((label, index) => ({ value: String(index + 1), label }));

function formatDate(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
}) {
  return (
    <M3Card variant="outlined" className="p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-md-surface-container-high text-md-on-surface-variant">
          <M3Icon name={icon} size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-md-on-surface-variant">
            {label}
          </p>
          <p className="text-xl font-extrabold text-md-on-surface">{value}</p>
        </div>
      </div>
    </M3Card>
  );
}

export function DailyAttendancePage({ user }: { user: AuthUser }) {
  const today = jakartaDateOnly();
  const [view, setView] = useState<"INPUT" | "REPORT">("INPUT");
  const [dateOnly, setDateOnly] = useState(today);
  const [classRoomId, setClassRoomId] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftRecord>>({});
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const now = new Date();
  const [reportDate, setReportDate] = useState(today);
  const [reportClassId, setReportClassId] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"MONTH" | "SEMESTER">("MONTH");
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportStudentId, setReportStudentId] = useState("");

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery(
    getDailySchoolAttendance,
    {
      ...(classRoomId ? { classRoomId } : {}),
      dateOnly,
    },
    { enabled: view === "INPUT" },
  );

  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery(
    getDailyAttendanceReportData,
    {
      dateOnly: reportDate,
      ...(reportClassId ? { classRoomId: reportClassId } : {}),
      period: reportPeriod,
      month: reportMonth,
      year: reportYear,
      ...(reportStudentId ? { studentId: reportStudentId } : {}),
    },
    { enabled: view === "REPORT" },
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

  useEffect(() => {
    if (!reportClassId && reportData?.classes?.[0]?.id) {
      setReportClassId(reportData.classes[0].id);
    }
  }, [reportClassId, reportData?.classes]);

  useEffect(() => {
    const students = reportData?.period?.students || [];
    if (students.length && !students.some((student: any) => student.studentId === reportStudentId)) {
      setReportStudentId(students[0].studentId);
    }
  }, [reportData?.period?.students, reportStudentId]);

  const filteredStudents = useMemo(() => {
    const students = (data?.students || []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) =>
      student.name?.toLowerCase().includes(q) ||
      student.studentProfile?.nis?.toLowerCase().includes(q) ||
      student.studentProfile?.nisn?.toLowerCase().includes(q),
    );
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

  const reportClassOptions = ((reportData?.classes || []) as any[]).map((classRoom) => ({
    value: classRoom.id,
    label: `${classRoom.name} · ${classRoom.studentCount || 0} siswa`,
  }));

  const reportStudentOptions = ((reportData?.period?.students || []) as any[]).map((student) => ({
    value: student.studentId,
    label: `${student.name} · NIS ${student.nis || "-"}`,
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
        `Presensi ${data.selectedClass?.name || "rombel"} tanggal ${formatDate(dateOnly)} berhasil disimpan.`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Presensi harian belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSave = !!data?.students?.length && dateOnly <= today && !submitting;
  const commonError = errorMsg || (error as any)?.message || (reportError as any)?.message;

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="v2-eyebrow">KEHADIRAN SEKOLAH</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-md-on-surface">
              Presensi Harian
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Satu sumber data kehadiran resmi sekolah. Admin mengelola seluruh rombel, sedangkan wali kelas hanya mengelola dan melaporkan rombel binaannya.
            </p>
          </div>
          <M3Tabs
            tabs={[
              { id: "INPUT", label: "Input Presensi", icon: "fact_check" },
              { id: "REPORT", label: "Rekap & Laporan", icon: "analytics" },
            ]}
            activeTab={view}
            onChange={(tab) => setView(tab as "INPUT" | "REPORT")}
          />
        </header>

        {commonError && (
          <M3Banner
            variant="error"
            title="Akses atau data belum dapat diproses"
            supportingText={commonError}
            dismissible={!!errorMsg}
            onDismiss={() => setErrorMsg("")}
          />
        )}

        {view === "INPUT" && (
          <>
            {message && (
              <M3Banner
                variant="success"
                title="Presensi tersimpan"
                supportingText={message}
                dismissible
                onDismiss={() => setMessage("")}
              />
            )}

            <M3Card variant="elevated" className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-md-on-surface">Ruang input presensi</p>
                  <p className="text-xs text-md-on-surface-variant">
                    Cakupan akses: <strong>{data?.access?.scopeLabel || "Memuat..."}</strong>
                  </p>
                </div>
                {data?.access?.isHomeroomTeacher && (
                  <M3Badge variant="primary">Wali Kelas</M3Badge>
                )}
              </div>

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
                  disabled={!classOptions.length || !!data?.access?.isHomeroomTeacher}
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
                {data?.selectedClass?.homeroomTeacher?.name && (
                  <span>
                    Wali Kelas: <strong className="text-md-on-surface">{data.selectedClass.homeroomTeacher.name}</strong>
                  </span>
                )}
                {data?.selectedClass?.department?.name && (
                  <span>
                    Program: <strong className="text-md-on-surface">{data.selectedClass.department.name}</strong>
                  </span>
                )}
              </div>
            </M3Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Total" value={draftSummary.total} icon="groups" />
              <StatCard label="Hadir" value={draftSummary.hadir} icon="check_circle" />
              <StatCard label="Sakit" value={draftSummary.sakit} icon="medical_services" />
              <StatCard label="Izin" value={draftSummary.izin} icon="event_available" />
              <StatCard label="Alpa" value={draftSummary.alpa} icon="cancel" />
              <StatCard label="Terlambat" value={draftSummary.terlambat} icon="schedule" />
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
                icon="supervisor_account"
                title="Belum ada rombel yang dapat diakses"
                description="Admin dapat mengakses seluruh rombel. Guru hanya dapat mengakses Presensi Harian setelah ditugaskan sebagai wali kelas pada rombel aktif."
              />
            ) : !data?.students?.length ? (
              <M3EmptyState
                icon="groups"
                title="Belum ada siswa pada rombel ini"
                description="Tempatkan siswa ke rombel aktif terlebih dahulu."
                actionLabel="Buka Data Siswa"
                actionHref="/school/students"
              />
            ) : (
              <M3Card variant="elevated" className="overflow-hidden">
                <div className="border-b border-md-outline-variant/30 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-md-on-surface">{data.selectedClass?.name}</h2>
                      <p className="mt-0.5 text-xs text-md-on-surface-variant">
                        {filteredStudents.length} dari {data.students.length} siswa ditampilkan
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.savedCount ? (
                        <M3Badge variant="success">{data.savedCount} tersimpan</M3Badge>
                      ) : (
                        <M3Badge variant="secondary">Belum disimpan</M3Badge>
                      )}
                      <M3Button
                        variant="outlined"
                        size="sm"
                        icon="done_all"
                        onClick={setAllPresent}
                      >
                        Semua Hadir
                      </M3Button>
                    </div>
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
                            <p className="truncate text-sm font-semibold text-md-on-surface">{student.name || "Tanpa Nama"}</p>
                            <p className="truncate text-[11.5px] text-md-on-surface-variant">
                              NIS {student.studentProfile?.nis || "-"} · NISN {student.studentProfile?.nisn || "-"}
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
                          placeholder={record.status === "HADIR" ? "Catatan opsional" : "Tambahkan keterangan"}
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
                    Status awal Hadir baru menjadi data resmi setelah disimpan. Perubahan berikutnya tetap tercatat pada pengguna terakhir yang memperbarui.
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
          </>
        )}

        {view === "REPORT" && (
          <>
            <M3Card variant="elevated" className="p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-sm font-bold text-md-on-surface">Filter laporan kehadiran</p>
                <p className="text-xs text-md-on-surface-variant">
                  Cakupan: <strong>{reportData?.access?.scopeLabel || "Memuat..."}</strong>
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <M3TextField
                  label="Tanggal Monitoring"
                  type="date"
                  value={reportDate}
                  max={today}
                  onChange={(event) => setReportDate(event.target.value)}
                />
                <M3Select
                  label="Rombel"
                  value={reportClassId}
                  options={reportClassOptions}
                  onChange={(event) => {
                    setReportClassId(event.target.value);
                    setReportStudentId("");
                  }}
                  disabled={!reportClassOptions.length || !!reportData?.access?.isHomeroomTeacher}
                />
                <M3Select
                  label="Periode Rekap"
                  value={reportPeriod}
                  options={[
                    { value: "MONTH", label: "Bulanan" },
                    { value: "SEMESTER", label: "Semester Aktif" },
                  ]}
                  onChange={(event) => setReportPeriod(event.target.value as "MONTH" | "SEMESTER")}
                />
                <M3Select
                  label="Bulan"
                  value={String(reportMonth)}
                  options={monthOptions}
                  onChange={(event) => setReportMonth(Number(event.target.value))}
                  disabled={reportPeriod === "SEMESTER"}
                />
                <M3TextField
                  label="Tahun"
                  type="number"
                  value={String(reportYear)}
                  min="2000"
                  max="2100"
                  onChange={(event) => setReportYear(Number(event.target.value))}
                  disabled={reportPeriod === "SEMESTER"}
                />
              </div>
            </M3Card>

            {reportLoading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <M3CircularProgress size={38} />
              </div>
            ) : reportData?.selectedClass ? (
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="v2-eyebrow">MONITORING HARIAN</p>
                      <h2 className="text-lg font-bold text-md-on-surface">{formatDate(reportData.daily.dateOnly)}</h2>
                    </div>
                    <M3Badge variant={reportData.daily.unrecordedClasses > 0 ? "warning" : "success"}>
                      {reportData.daily.unrecordedClasses > 0
                        ? `${reportData.daily.unrecordedClasses} rombel belum lengkap`
                        : "Semua rombel tercatat"}
                    </M3Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                    <StatCard label="Tercatat" value={reportData.daily.summary.total} icon="groups" />
                    <StatCard label="Hadir" value={reportData.daily.summary.hadir} icon="check_circle" />
                    <StatCard label="Sakit" value={reportData.daily.summary.sakit} icon="medical_services" />
                    <StatCard label="Izin" value={reportData.daily.summary.izin} icon="event_available" />
                    <StatCard label="Alpa" value={reportData.daily.summary.alpa} icon="cancel" />
                    <StatCard label="Terlambat" value={reportData.daily.summary.terlambat} icon="schedule" />
                    <StatCard label="Rombel Selesai" value={reportData.daily.completedClasses} icon="task_alt" />
                  </div>

                  <M3Card variant="outlined" className="overflow-x-auto">
                    <table className="min-w-[850px] w-full text-sm">
                      <thead className="bg-md-surface-container-low text-left text-xs text-md-on-surface-variant">
                        <tr>
                          <th className="px-4 py-3">Rombel</th>
                          <th className="px-3 py-3 text-center">Siswa</th>
                          <th className="px-3 py-3 text-center">H</th>
                          <th className="px-3 py-3 text-center">S</th>
                          <th className="px-3 py-3 text-center">I</th>
                          <th className="px-3 py-3 text-center">A</th>
                          <th className="px-3 py-3 text-center">T</th>
                          <th className="px-3 py-3 text-center">Kehadiran</th>
                          <th className="px-4 py-3">Status Input</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-md-outline-variant/25">
                        {reportData.daily.rows.map((row: any) => (
                          <tr key={row.classRoomId}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-md-on-surface">{row.className}</p>
                              <p className="text-xs text-md-on-surface-variant">{row.homeroomTeacherName || "Wali kelas belum ditetapkan"}</p>
                            </td>
                            <td className="px-3 py-3 text-center">{row.studentCount}</td>
                            <td className="px-3 py-3 text-center">{row.hadir}</td>
                            <td className="px-3 py-3 text-center">{row.sakit}</td>
                            <td className="px-3 py-3 text-center">{row.izin}</td>
                            <td className="px-3 py-3 text-center">{row.alpa}</td>
                            <td className="px-3 py-3 text-center">{row.terlambat}</td>
                            <td className="px-3 py-3 text-center font-semibold">{row.rate !== null ? `${row.rate}%` : "-"}</td>
                            <td className="px-4 py-3">
                              <M3Badge variant={row.completed ? "success" : "warning"}>
                                {row.completed ? "Lengkap" : `${row.recordedCount}/${row.studentCount}`}
                              </M3Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </M3Card>
                </section>

                <section className="space-y-3">
                  <div>
                    <p className="v2-eyebrow">REKAP ROMBEL</p>
                    <h2 className="text-lg font-bold text-md-on-surface">
                      {reportData.selectedClass.name} · {reportData.period.label}
                    </h2>
                    <p className="text-xs text-md-on-surface-variant">
                      Wali Kelas: {reportData.selectedClass.homeroomTeacher?.name || "-"}
                    </p>
                  </div>

                  <M3Card variant="elevated" className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                      <thead className="bg-md-surface-container-low text-left text-xs text-md-on-surface-variant">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-3 py-3">NIS</th>
                          <th className="px-3 py-3 text-center">H</th>
                          <th className="px-3 py-3 text-center">S</th>
                          <th className="px-3 py-3 text-center">I</th>
                          <th className="px-3 py-3 text-center">A</th>
                          <th className="px-3 py-3 text-center">T</th>
                          <th className="px-3 py-3 text-center">Hari Tercatat</th>
                          <th className="px-4 py-3 text-center">Kehadiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-md-outline-variant/25">
                        {reportData.period.students.map((student: any) => (
                          <tr key={student.studentId}>
                            <td className="px-4 py-3 font-semibold text-md-on-surface">{student.name}</td>
                            <td className="px-3 py-3 text-md-on-surface-variant">{student.nis}</td>
                            <td className="px-3 py-3 text-center">{student.hadir}</td>
                            <td className="px-3 py-3 text-center">{student.sakit}</td>
                            <td className="px-3 py-3 text-center">{student.izin}</td>
                            <td className="px-3 py-3 text-center">{student.alpa}</td>
                            <td className="px-3 py-3 text-center">{student.terlambat}</td>
                            <td className="px-3 py-3 text-center">{student.total}</td>
                            <td className="px-4 py-3 text-center font-bold">{student.rate !== null ? `${student.rate}%` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </M3Card>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <M3Card variant="elevated" className="p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="v2-eyebrow">RIWAYAT INDIVIDU</p>
                        <h2 className="text-lg font-bold text-md-on-surface">Riwayat Kehadiran Siswa</h2>
                      </div>
                      <div className="min-w-[260px]">
                        <M3Select
                          label="Pilih Siswa"
                          value={reportStudentId}
                          options={reportStudentOptions}
                          onChange={(event) => setReportStudentId(event.target.value)}
                        />
                      </div>
                    </div>

                    {reportData.studentHistory ? (
                      <>
                        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                          <StatCard label="Hadir" value={reportData.studentHistory.summary.hadir} icon="check_circle" />
                          <StatCard label="Sakit" value={reportData.studentHistory.summary.sakit} icon="medical_services" />
                          <StatCard label="Izin" value={reportData.studentHistory.summary.izin} icon="event_available" />
                          <StatCard label="Alpa" value={reportData.studentHistory.summary.alpa} icon="cancel" />
                          <StatCard label="Terlambat" value={reportData.studentHistory.summary.terlambat} icon="schedule" />
                          <StatCard label="Kehadiran" value={reportData.studentHistory.summary.rate !== null ? `${reportData.studentHistory.summary.rate}%` : "-"} icon="percent" />
                        </div>
                        <div className="max-h-[360px] overflow-auto rounded-[12px] border border-md-outline-variant/40">
                          <table className="w-full min-w-[620px] text-sm">
                            <thead className="sticky top-0 bg-md-surface-container-low text-left text-xs text-md-on-surface-variant">
                              <tr>
                                <th className="px-3 py-2.5">Tanggal</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-3 py-2.5">Catatan</th>
                                <th className="px-3 py-2.5">Dicatat oleh</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-md-outline-variant/25">
                              {reportData.studentHistory.records.map((record: any) => (
                                <tr key={`${record.dateOnly}-${record.status}`}>
                                  <td className="px-3 py-2.5">{formatDate(record.dateOnly)}</td>
                                  <td className="px-3 py-2.5 font-semibold">{statusLabels[record.status as DailyAttendanceStatus] || record.status}</td>
                                  <td className="px-3 py-2.5 text-md-on-surface-variant">{record.notes || "-"}</td>
                                  <td className="px-3 py-2.5 text-md-on-surface-variant">{record.recordedBy?.name || "-"}</td>
                                </tr>
                              ))}
                              {!reportData.studentHistory.records.length && (
                                <tr>
                                  <td colSpan={4} className="px-3 py-8 text-center text-md-on-surface-variant">
                                    Belum ada presensi pada periode ini.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <M3EmptyState icon="person_search" title="Belum ada siswa" description="Pilih rombel yang memiliki siswa untuk melihat riwayat individu." />
                    )}
                  </M3Card>

                  <M3Card variant="elevated" className="p-4 sm:p-5">
                    <div className="mb-4">
                      <p className="v2-eyebrow">PERLU PERHATIAN</p>
                      <h2 className="text-lg font-bold text-md-on-surface">Monitoring Kehadiran</h2>
                      <p className="mt-1 text-xs leading-5 text-md-on-surface-variant">
                        Otomatis ditandai jika Alpa ≥3 hari, Terlambat ≥5 kali, atau persentase kehadiran di bawah 90% pada periode terpilih.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {reportData.period.attention.map((student: any) => (
                        <div key={student.studentId} className="rounded-[12px] border border-md-outline-variant/40 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-md-on-surface">{student.name}</p>
                              <p className="text-xs text-md-on-surface-variant">NIS {student.nis}</p>
                            </div>
                            <M3Badge variant="warning">{student.rate !== null ? `${student.rate}%` : "Belum terukur"}</M3Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {student.reasons.map((reason: string) => (
                              <span key={reason} className="rounded-full bg-md-error-container px-2 py-1 text-[11px] font-medium text-md-on-error-container">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!reportData.period.attention.length && (
                        <M3EmptyState
                          icon="verified"
                          title="Tidak ada siswa yang melewati ambang perhatian"
                          description="Tidak ditemukan pola alpa, keterlambatan, atau persentase kehadiran yang melewati batas monitoring pada periode ini."
                        />
                      )}
                    </div>
                  </M3Card>
                </section>

                <div className="flex justify-end print:hidden">
                  <M3Button variant="outlined" icon="print" onClick={() => window.print()}>
                    Cetak Laporan
                  </M3Button>
                </div>
              </div>
            ) : (
              <M3EmptyState
                icon="analytics"
                title="Belum ada rombel untuk dilaporkan"
                description="Laporan akan tersedia setelah rombel aktif dan penugasan wali kelas tersedia."
              />
            )}
          </>
        )}
      </div>
    </SchoolLayout>
  );
}
