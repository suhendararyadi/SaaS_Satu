import React, { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getDailyAttendanceReportData,
  getDailySchoolAttendance,
  getAttendanceReconciliationWorkspace,
  reconcileAttendanceClass,
  verifyAttendanceRecord,
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
  getAcademicSemesterDateRange,
  jakartaDateOnly,
  summarizeDailyAttendanceDraft,
  type DailyAttendanceStatus,
} from "../dailyAttendance";

type DraftRecord = {
  status: DailyAttendanceStatus | null;
  notes: string;
};

const statusLabels: Record<DailyAttendanceStatus, string> = {
  HADIR: "Hadir",
  SAKIT: "Sakit",
  IZIN: "Izin",
  ALPA: "Alpa",
  TERLAMBAT: "Terlambat",
};

const statusVisuals: Record<DailyAttendanceStatus, {
  icon: string;
  activeClass: string;
  idleClass: string;
  iconClass: string;
}> = {
  HADIR: {
    icon: "check_circle",
    activeClass: "border-[#34C759]/30 bg-[#34C759]/16 text-[#187A35] shadow-[0_1px_2px_rgba(52,199,89,.16)] dark:border-[#30D158]/30 dark:bg-[#30D158]/18 dark:text-[#78E995]",
    idleClass: "border-[#34C759]/16 bg-[#34C759]/[.055] text-[#4C6B55] hover:bg-[#34C759]/10 dark:border-[#30D158]/18 dark:bg-[#30D158]/[.07] dark:text-[#9CCDA9]",
    iconClass: "bg-[#34C759]/15 text-[#248A3D] dark:bg-[#30D158]/18 dark:text-[#67D881]",
  },
  SAKIT: {
    icon: "medical_services",
    activeClass: "border-[#AF52DE]/30 bg-[#AF52DE]/15 text-[#7A2FA1] shadow-[0_1px_2px_rgba(175,82,222,.14)] dark:border-[#BF5AF2]/30 dark:bg-[#BF5AF2]/18 dark:text-[#D899F7]",
    idleClass: "border-[#AF52DE]/16 bg-[#AF52DE]/[.05] text-[#6D5A73] hover:bg-[#AF52DE]/10 dark:border-[#BF5AF2]/18 dark:bg-[#BF5AF2]/[.07] dark:text-[#C6A9D2]",
    iconClass: "bg-[#AF52DE]/14 text-[#8944AB] dark:bg-[#BF5AF2]/18 dark:text-[#D28AF4]",
  },
  IZIN: {
    icon: "event_available",
    activeClass: "border-[#007AFF]/28 bg-[#007AFF]/14 text-[#0058B8] shadow-[0_1px_2px_rgba(0,122,255,.14)] dark:border-[#0A84FF]/30 dark:bg-[#0A84FF]/18 dark:text-[#79B8FF]",
    idleClass: "border-[#007AFF]/15 bg-[#007AFF]/[.05] text-[#52677B] hover:bg-[#007AFF]/10 dark:border-[#0A84FF]/18 dark:bg-[#0A84FF]/[.07] dark:text-[#9EB9D5]",
    iconClass: "bg-[#007AFF]/13 text-[#0066CC] dark:bg-[#0A84FF]/18 dark:text-[#6BB1FF]",
  },
  ALPA: {
    icon: "cancel",
    activeClass: "border-[#FF3B30]/28 bg-[#FF3B30]/14 text-[#C2261E] shadow-[0_1px_2px_rgba(255,59,48,.13)] dark:border-[#FF453A]/30 dark:bg-[#FF453A]/18 dark:text-[#FF8A83]",
    idleClass: "border-[#FF3B30]/15 bg-[#FF3B30]/[.045] text-[#765B59] hover:bg-[#FF3B30]/10 dark:border-[#FF453A]/18 dark:bg-[#FF453A]/[.065] dark:text-[#D0AAA7]",
    iconClass: "bg-[#FF3B30]/13 text-[#D52B21] dark:bg-[#FF453A]/18 dark:text-[#FF817A]",
  },
  TERLAMBAT: {
    icon: "schedule",
    activeClass: "border-[#FF9500]/30 bg-[#FF9500]/16 text-[#A65D00] shadow-[0_1px_2px_rgba(255,149,0,.14)] dark:border-[#FF9F0A]/30 dark:bg-[#FF9F0A]/18 dark:text-[#FFC56E]",
    idleClass: "border-[#FF9500]/16 bg-[#FF9500]/[.055] text-[#776551] hover:bg-[#FF9500]/11 dark:border-[#FF9F0A]/18 dark:bg-[#FF9F0A]/[.07] dark:text-[#D1B896]",
    iconClass: "bg-[#FF9500]/14 text-[#C67600] dark:bg-[#FF9F0A]/18 dark:text-[#FFC15C]",
  },
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
  const visual = statusVisuals[status];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group inline-flex min-h-8 items-center gap-1.5 rounded-[999px] border py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[.98]",
        active ? visual.activeClass : visual.idleClass,
      ].join(" ")}
    >
      <span
        className={[
          "flex size-[22px] shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105",
          active ? "bg-white/55 dark:bg-black/15" : visual.iconClass,
        ].join(" ")}
      >
        <M3Icon name={visual.icon} size={15} filled={active} weight={active ? 600 : 500} />
      </span>
      <span>{statusLabels[status]}</span>
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  tone?: DailyAttendanceStatus | "TOTAL";
}) {
  const toneClass = tone && tone !== "TOTAL"
    ? statusVisuals[tone].iconClass
    : "bg-[#8E8E93]/12 text-[#636366] dark:bg-[#8E8E93]/18 dark:text-[#AEAEB2]";

  return (
    <M3Card variant="outlined" className="p-3.5">
      <div className="flex items-center gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-[11px] ${toneClass}`}>
          <M3Icon name={icon} size={19} filled={tone && tone !== "TOTAL"} weight={500} />
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
  const [view, setView] = useState<"INPUT" | "RECONCILE" | "MATRIX" | "REPORT">("INPUT");
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
  const [reconcileClassId, setReconcileClassId] = useState("");
  const [reconcileDate, setReconcileDate] = useState(today);
  const [reconcileMonth, setReconcileMonth] = useState(now.getMonth() + 1);
  const [reconcileYear, setReconcileYear] = useState(now.getFullYear());
  const [reconcileBusy, setReconcileBusy] = useState(false);

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

  const {
    data: reconciliationData,
    isLoading: reconciliationLoading,
    error: reconciliationError,
    refetch: refetchReconciliation,
  } = useQuery(
    getAttendanceReconciliationWorkspace,
    {
      ...(reconcileClassId ? { classRoomId: reconcileClassId } : {}),
      dateOnly: reconcileDate,
      month: reconcileMonth,
      year: reconcileYear,
    },
    { enabled: view === "RECONCILE" || view === "MATRIX" },
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
        status: (student.attendance?.status || null) as DailyAttendanceStatus | null,
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
    if (!reconcileClassId && reconciliationData?.classes?.[0]?.id) {
      setReconcileClassId(reconciliationData.classes[0].id);
    }
  }, [reconcileClassId, reconciliationData?.classes]);

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

  const draftSummary = useMemo(
    () => summarizeDailyAttendanceDraft(Object.values(draft)),
    [draft],
  );

  const activeSemesterRange = data?.activeAcademicYear
    ? getAcademicSemesterDateRange(data.activeAcademicYear.yearName, data.activeAcademicYear.semester)
    : null;

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
      const records = (data.students as any[]).flatMap((student) => {
        const record = draft[student.id];
        if (!record?.status) return [];
        return [{
          studentId: student.id,
          status: record.status,
          notes: record.notes?.trim() || null,
        }];
      });
      if (!records.length) {
        setErrorMsg("Pilih minimal satu status presensi sebelum menyimpan.");
        return;
      }
      await saveDailySchoolAttendance({
        classRoomId,
        dateOnly,
        records,
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

  const exportMonthlyCsv = () => {
    if (!reconciliationData?.monthly?.students?.length) return;
    const days: number[] = reconciliationData.monthly.days;
    const header = ["NIS","NISN","Nama","L/P",...days.map((day)=>String(day)),"H","S","I","A","T","Persentase"];
    const rows = reconciliationData.monthly.students.map((student:any) => [
      student.studentProfile?.nis || "", student.studentProfile?.nisn || "", student.name || "", student.studentProfile?.gender || "",
      ...days.map((day)=>({HADIR:"H",SAKIT:"S",IZIN:"I",ALPA:"A",TERLAMBAT:"T"} as any)[student.statuses[day]] || ""),
      student.counts.HADIR, student.counts.SAKIT, student.counts.IZIN, student.counts.ALPA, student.counts.TERLAMBAT, student.rate == null ? "" : `${student.rate}%`,
    ]);
    const quote=(value:any)=>`"${String(value??"").replaceAll('"','""')}"`;
    const csv=[header,...rows].map((row)=>row.map(quote).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`rekap-kehadiran-${reconciliationData.selectedClass?.name || "kelas"}-${reconcileYear}-${String(reconcileMonth).padStart(2,"0")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const runReconciliation = async () => {
    if (!reconcileClassId) return;
    setReconcileBusy(true); setErrorMsg(""); setMessage("");
    try {
      const result = await reconcileAttendanceClass({ classRoomId: reconcileClassId, dateOnly: reconcileDate });
      setMessage(`Rekonsiliasi selesai: ${result.updated} record diperbarui, ${result.humanProtected} keputusan manusia dipertahankan.`);
      await refetchReconciliation();
    } catch (err: any) { setErrorMsg(err?.message || "Rekonsiliasi belum berhasil."); }
    finally { setReconcileBusy(false); }
  };

  const verifyRow = async (row: any, status?: DailyAttendanceStatus) => {
    const nextStatus = (status || row.record?.status || row.suggestion?.status || "HADIR") as DailyAttendanceStatus;
    setReconcileBusy(true); setErrorMsg("");
    try {
      await verifyAttendanceRecord({ studentId: row.id, dateOnly: reconcileDate, status: nextStatus, notes: row.record?.notes || null, expectedUpdatedAt: row.record?.updatedAt || null });
      await refetchReconciliation();
      setMessage(`${row.name} diverifikasi sebagai ${statusLabels[nextStatus]}.`);
    } catch (err: any) { setErrorMsg(err?.message || "Verifikasi belum berhasil."); }
    finally { setReconcileBusy(false); }
  };

  const dutyOnly = !!data?.access?.isDutyTeacher
    && !data?.access?.isAdmin
    && !data?.access?.hasHomeroomAssignment;
  const canSave = !!data?.students?.length
    && Object.values(draft).some((record) => !!record.status)
    && dateOnly <= today
    && !submitting;
  const attendanceTabs = dutyOnly
    ? [{ id: "INPUT", label: "Kehadiran Global", icon: "fact_check" }]
    : [
        { id: "INPUT", label: "Input Manual", icon: "fact_check" },
        { id: "RECONCILE", label: "Perlu Verifikasi", icon: "sync_alt" },
        { id: "MATRIX", label: "Matriks Bulanan", icon: "calendar_view_month" },
        { id: "REPORT", label: "Rekap & Laporan", icon: "analytics" },
      ];
  const commonError = errorMsg || (error as any)?.message || (reportError as any)?.message || (reconciliationError as any)?.message;

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
              Satu sumber data kehadiran resmi sekolah. Kehadiran mandiri siswa menjadi dasar Global, lalu dapat dikoreksi Admin, wali kelas, atau Guru Piket aktif sesuai cakupannya.
            </p>
          </div>
          <M3Tabs
            tabs={attendanceTabs}
            activeTab={view}
            onChange={(tab) => setView(tab as "INPUT" | "RECONCILE" | "MATRIX" | "REPORT")}
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
                <div className="flex flex-wrap items-center gap-2">
                  {data?.access?.isHomeroomTeacher && (
                    <M3Badge variant="primary">Wali Kelas</M3Badge>
                  )}
                  {data?.access?.isDutyTeacher && (
                    <M3Badge variant="warning">Piket Hari Ini</M3Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_minmax(220px,1fr)]">
                <M3TextField
                  label="Tanggal"
                  type="date"
                  value={dateOnly}
                  min={dutyOnly ? today : activeSemesterRange?.startDateOnly}
                  max={dutyOnly ? today : activeSemesterRange && activeSemesterRange.endDateOnly < today ? activeSemesterRange.endDateOnly : today}
                  disabled={dutyOnly}
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
                  disabled={
                    !classOptions.length
                    || (!!data?.access?.hasHomeroomAssignment && !data?.access?.isDutyTeacher && !data?.access?.isAdmin)
                  }
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              <StatCard label="Total Siswa" value={draftSummary.rosterTotal} icon="groups" tone="TOTAL" />
              <StatCard label="Belum Diinput" value={draftSummary.unrecorded} icon="pending_actions" tone="TOTAL" />
              <StatCard label="Hadir" value={draftSummary.hadir} icon="check_circle" tone="HADIR" />
              <StatCard label="Sakit" value={draftSummary.sakit} icon="medical_services" tone="SAKIT" />
              <StatCard label="Izin" value={draftSummary.izin} icon="event_available" tone="IZIN" />
              <StatCard label="Alpa" value={draftSummary.alpa} icon="cancel" tone="ALPA" />
              <StatCard label="Terlambat" value={draftSummary.terlambat} icon="schedule" tone="TERLAMBAT" />
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
                description="Admin dapat mengakses seluruh rombel. Guru dapat mengakses sebagai wali kelas rombel aktif atau sebagai Guru Piket yang terjadwal pada hari berjalan."
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
                      <M3Badge variant={draftSummary.unrecorded > 0 ? "warning" : "success"}>
                        {draftSummary.recorded} tercatat · {draftSummary.unrecorded} belum diinput
                      </M3Badge>
                      <M3Button
                        variant="outlined"
                        size="sm"
                        icon="done_all"
                        onClick={setAllPresent}
                      >
                        Tandai Semua Hadir
                      </M3Button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-md-outline-variant/25">
                  {filteredStudents.map((student: any, index: number) => {
                    const record = draft[student.id] || { status: null, notes: "" };
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

                        <div className="flex flex-wrap items-center gap-1.5">
                          {!record.status && (
                            <M3Badge variant="outline">Belum diinput</M3Badge>
                          )}
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
                          placeholder={!record.status ? "Isi status terlebih dahulu" : record.status === "HADIR" ? "Catatan opsional" : "Tambahkan keterangan"}
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
                    Siswa tanpa status tetap dianggap belum diinput dan tidak dihitung Hadir maupun Alpa. Hanya status yang dipilih yang disimpan sebagai Kehadiran Global resmi.
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

        {view === "RECONCILE" && (
          <>
            {message && <M3Banner variant="success" supportingText={message} dismissible onDismiss={() => setMessage("")} />}
            <M3Card variant="elevated" className="p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <M3TextField label="Tanggal" type="date" value={reconcileDate} max={today} onChange={(event) => setReconcileDate(event.target.value)} />
                <M3Select label="Rombel" value={reconcileClassId} options={(reconciliationData?.classes || []).map((c:any)=>({value:c.id,label:c.name}))} onChange={(event)=>setReconcileClassId(event.target.value)} />
                <M3Button icon="sync" onClick={runReconciliation} isLoading={reconcileBusy} disabled={!reconcileClassId}>Rekonsiliasi Sumber</M3Button>
              </div>
              <p className="mt-3 text-xs text-md-on-surface-variant">Mesin menyatukan check-in/out sekolah, piket, izin/sakit, dan evidence Global lain. Presensi mapel tetap tercatat terpisah dan tidak mengubah Kehadiran Global. Record MANUAL/VERIFIED tidak ditimpa otomatis.</p>
            </M3Card>
            {reconciliationLoading ? <div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={38}/></div> :
              <div className="space-y-3">{(reconciliationData?.rows || []).filter((row:any)=>row.needsReview).map((row:any)=><M3Card key={row.id} variant="outlined" className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.name}</p><M3Badge variant="warning">Perlu Verifikasi</M3Badge>{row.record?.status&&<M3Badge variant="outline">Saat ini: {row.record.status}</M3Badge>}{row.suggestion?.status&&<M3Badge variant="primary">Saran: {row.suggestion.status}</M3Badge>}</div><p className="mt-1 text-[11px] text-md-on-surface-variant">NIS {row.studentProfile?.nis||"-"} · {row.eventCount} evidence</p>{row.suggestion?.reasons?.length>0&&<div className="mt-2 space-y-1">{row.suggestion.reasons.map((reason:string)=><p key={reason} className="text-xs text-md-error">• {reason}</p>)}</div>}</div><div className="flex flex-wrap gap-1.5">{DAILY_ATTENDANCE_STATUSES.map((status)=><M3Button key={status} variant={status===(row.record?.status||row.suggestion?.status)?"filled":"outlined"} size="sm" disabled={reconcileBusy} onClick={()=>verifyRow(row,status)}>{statusLabels[status]}</M3Button>)}</div></div>
                <div className="mt-3 flex flex-wrap gap-1.5">{row.evidence.map((e:any)=><span key={e.id} className="rounded-full bg-md-surface-container px-2 py-1 text-[10.5px] text-md-on-surface-variant">{e.type.replaceAll("_"," ")} · {e.status} · {new Date(e.occurredAt).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})}</span>)}</div>
              </M3Card>)}{reconciliationData?.rows && !reconciliationData.rows.some((row:any)=>row.needsReview)&&<M3EmptyState icon="verified" title="Tidak ada konflik kehadiran" description="Semua evidence yang tersedia dapat direkonsiliasi atau sudah diverifikasi."/>}</div>}
          </>
        )}

        {view === "MATRIX" && (
          <>
            <M3Card variant="elevated" className="p-4 sm:p-5"><div className="grid gap-3 md:grid-cols-3"><M3Select label="Rombel" value={reconcileClassId} options={(reconciliationData?.classes || []).map((c:any)=>({value:c.id,label:c.name}))} onChange={(event)=>setReconcileClassId(event.target.value)}/><M3Select label="Bulan" value={String(reconcileMonth)} options={monthOptions} onChange={(event)=>setReconcileMonth(Number(event.target.value))}/><M3TextField label="Tahun" type="number" min="2000" max="2100" value={String(reconcileYear)} onChange={(event)=>setReconcileYear(Number(event.target.value))}/></div></M3Card>
            {reconciliationLoading?<div className="flex min-h-[260px] items-center justify-center"><M3CircularProgress size={38}/></div>:reconciliationData?.selectedClass?<M3Card variant="elevated" className="overflow-x-auto"><table className="min-w-[1600px] w-full text-[11px]"><thead className="bg-md-surface-container-low"><tr><th className="sticky left-0 z-10 bg-md-surface-container-low px-3 py-3 text-left">Nama Siswa</th>{reconciliationData.monthly.days.map((day:number)=><th key={day} className="px-1.5 py-3 text-center">{day}</th>)}<th>H</th><th>S</th><th>I</th><th>A</th><th>T</th><th>%</th></tr></thead><tbody className="divide-y divide-md-outline-variant/25">{reconciliationData.monthly.students.map((student:any)=><tr key={student.id}><td className="sticky left-0 bg-md-surface px-3 py-2 font-semibold">{student.name}</td>{reconciliationData.monthly.days.map((day:number)=><td key={day} className="px-1.5 py-2 text-center">{({HADIR:"H",SAKIT:"S",IZIN:"I",ALPA:"A",TERLAMBAT:"T"} as any)[student.statuses[day]]||"·"}</td>)}<td className="text-center">{student.counts.HADIR}</td><td className="text-center">{student.counts.SAKIT}</td><td className="text-center">{student.counts.IZIN}</td><td className="text-center">{student.counts.ALPA}</td><td className="text-center">{student.counts.TERLAMBAT}</td><td className="px-2 text-center font-semibold">{student.rate==null?"—":`${student.rate}%`}</td></tr>)}</tbody></table></M3Card>:<M3EmptyState icon="calendar_view_month" title="Belum ada rombel" description="Pilih rombel aktif untuk melihat matriks bulanan."/>}
            <div className="flex justify-end gap-2 print:hidden"><M3Button variant="outlined" icon="download" onClick={exportMonthlyCsv}>Ekspor CSV / Excel</M3Button><M3Button variant="outlined" icon="print" onClick={()=>window.print()}>Cetak / Simpan PDF</M3Button></div>
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
                    <StatCard label="Hadir" value={reportData.daily.summary.hadir} icon="check_circle" tone="HADIR" />
                    <StatCard label="Sakit" value={reportData.daily.summary.sakit} icon="medical_services" tone="SAKIT" />
                    <StatCard label="Izin" value={reportData.daily.summary.izin} icon="event_available" tone="IZIN" />
                    <StatCard label="Alpa" value={reportData.daily.summary.alpa} icon="cancel" tone="ALPA" />
                    <StatCard label="Terlambat" value={reportData.daily.summary.terlambat} icon="schedule" tone="TERLAMBAT" />
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
                          <StatCard label="Hadir" value={reportData.studentHistory.summary.hadir} icon="check_circle" tone="HADIR" />
                          <StatCard label="Sakit" value={reportData.studentHistory.summary.sakit} icon="medical_services" tone="SAKIT" />
                          <StatCard label="Izin" value={reportData.studentHistory.summary.izin} icon="event_available" tone="IZIN" />
                          <StatCard label="Alpa" value={reportData.studentHistory.summary.alpa} icon="cancel" tone="ALPA" />
                          <StatCard label="Terlambat" value={reportData.studentHistory.summary.terlambat} icon="schedule" tone="TERLAMBAT" />
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
