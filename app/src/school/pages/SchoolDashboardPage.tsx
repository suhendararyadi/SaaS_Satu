import React, { type ReactNode } from "react";
import { Activity, BookOpen, CalendarX2, CircleAlert, FileText, ShieldAlert, UsersRound, type LucideIcon } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getStudentDashboardData,
  getTeacherDashboardData,
  getSchoolAdminDashboardData,
  getMentorDashboardData,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import { WAKASEK_ROLE_META, type WakasekRoleCode } from "../wakasek";
import { STAFF_ASSIGNMENT_META, type StaffAssignmentRoleCode } from "../staffAssignments";
import {
  M3Badge,
  M3Button,
  M3Card,
  M3EmptyState,
  M3StatCard,
} from "../../client/components/m3";

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function DashboardLoading() {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="h-7 w-56 animate-pulse rounded-[7px] bg-md-surface-container" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-[16px] bg-md-surface-container-low" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="h-56 animate-pulse rounded-[16px] bg-md-surface-container-low" />
        <div className="h-56 animate-pulse rounded-[16px] bg-md-surface-container-low" />
      </div>
      <p className="text-[12.5px] text-md-on-surface-variant">Menyiapkan ringkasan...</p>
    </div>
  );
}

function QueryError({ retry }: { retry: () => void }) {
  return (
    <M3Card variant="outlined">
      <M3EmptyState
        icon="cloud_off"
        title="Ringkasan belum dapat dimuat"
        description="Data utama Anda tetap aman. Coba muat ulang ringkasan tanpa mengubah data yang tersimpan."
        actionLabel="Coba lagi"
        onAction={retry}
      />
    </M3Card>
  );
}

function DashboardIntro({ title, note, actions }: { title: string; note?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] leading-5 text-md-on-surface-variant">{note}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function SectionTitle({ title, note, trailing }: { title: string; note?: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="hig-section-title">{title}</h3>
        {note && <p className="hig-section-note mt-0.5">{note}</p>}
      </div>
      {trailing}
    </div>
  );
}

function ListDot({ tone = "neutral" }: { tone?: "primary" | "success" | "warning" | "error" | "neutral" }) {
  const classes = {
    primary: "bg-md-primary",
    success: "bg-md-secondary",
    warning: "bg-md-tertiary",
    error: "bg-md-error",
    neutral: "bg-md-on-surface-variant/35",
  };
  return <span className={`size-2 shrink-0 rounded-full ${classes[tone]}`} aria-hidden="true" />;
}

const attentionIconConfig: Record<string, { icon: LucideIcon; tile: string }> = {
  NO_ACTIVE_YEAR: { icon: CalendarX2, tile: "bg-[#FF3B30] dark:bg-[#FF453A]" },
  STUDENTS_WITHOUT_CLASS: { icon: UsersRound, tile: "bg-[#007AFF] dark:bg-[#0A84FF]" },
  TEACHERS_WITHOUT_COURSE: { icon: BookOpen, tile: "bg-[#8E8E93]" },
  PKL_EWS_ALERTS: { icon: ShieldAlert, tile: "bg-[#FF9500] dark:bg-[#FF9F0A]" },
};

function AttentionIcon({ code, severity }: { code: string; severity?: string }) {
  const fallback = {
    icon: CircleAlert,
    tile: severity === "warning" ? "bg-[#FF3B30] dark:bg-[#FF453A]" : "bg-[#8E8E93]",
  };
  const config = attentionIconConfig[code] ?? fallback;
  const Icon = config.icon;
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,.14)] ${config.tile}`} aria-hidden="true">
      <Icon size={17} strokeWidth={2.1} className="text-white" />
    </span>
  );
}

function formatAttendanceRate(rate: number) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rate);
}

function ClassAttendanceRow({ item, tone = "primary" }: { item: any; tone?: "primary" | "warning" | "error" }) {
  const hasData = item.rate !== null;
  const toneClasses = {
    primary: "bg-md-primary",
    warning: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    error: "bg-md-error",
  };
  const barTone = hasData ? toneClasses[tone] : "bg-transparent";
  const label = String(item.className || "Rombel").replace(/\s+/g, " ").trim();
  const fullLabel = item.departmentCode && !label.toUpperCase().includes(item.departmentCode.toUpperCase())
    ? `${label} · ${item.departmentCode}`
    : label;

  return (
    <div className="grid min-h-9 grid-cols-[104px_minmax(0,1fr)_42px] items-center gap-3 sm:grid-cols-[132px_minmax(0,1fr)_48px]">
      <span className="block w-full truncate text-[13px] font-medium text-md-on-surface-variant" title={fullLabel}>{label}</span>
      <div
        className="h-[7px] overflow-hidden rounded-full bg-md-surface-container-high"
        role={hasData ? "progressbar" : undefined}
        aria-label={hasData ? `Kehadiran ${fullLabel} ${formatAttendanceRate(item.rate)} persen` : `Kehadiran ${fullLabel} belum tercatat`}
        aria-valuemin={hasData ? 0 : undefined}
        aria-valuemax={hasData ? 100 : undefined}
        aria-valuenow={hasData ? item.rate : undefined}
      >
        <div className={`h-full rounded-full transition-[width] duration-300 ${barTone}`} style={{ width: hasData ? `${Math.max(0, Math.min(100, item.rate))}%` : "0%" }} />
      </div>
      <span className={`text-right text-[13px] font-semibold tabular-nums ${
        hasData && tone === "error"
          ? "text-md-error"
          : hasData && tone === "warning"
            ? "text-[#C76B00] dark:text-[#FF9F0A]"
            : "text-md-on-surface"
      }`}>
        {hasData ? formatAttendanceRate(item.rate) : "—"}
      </span>
    </div>
  );
}

function StudentDashboard() {
  const query = useQuery(getStudentDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;

  const data = query.data;
  const pendingAssessments = data.upcomingAssessments.filter((assessment: any) => assessment.attemptStatus !== "COMPLETED");
  const nextAssignment = data.pendingAssignments[0];
  const nextAssessment = pendingAssessments[0];

  if (!data.student.classRoom) {
    return (
      <div className="space-y-5">
        <DashboardIntro title={`Halo, ${data.student.displayName}`} note={formatDate(new Date())} />
        <M3Card variant="outlined"><M3EmptyState icon="meeting_room" title="Kelas belajar belum tersedia" description="Akun Anda belum ditempatkan ke rombel aktif. Hubungi admin sekolah atau wali kelas agar ruang belajar dapat ditampilkan." actionLabel="Buka Akun" actionHref="/account" /></M3Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardIntro title={`Halo, ${data.student.displayName}`} note={`${formatDate(new Date())} · ${data.student.classRoom.name}`} />

      <div className="grid gap-3 sm:grid-cols-3">
        <M3StatCard label="Ruang belajar" value={data.courses.length} tone="blue" href="/school/lms/courses" />
        <M3StatCard label="Tugas belum selesai" value={data.pendingAssignments.length} tone="orange" />
        <M3StatCard label="CBT mendatang" value={pendingAssessments.length} tone="teal" />
      </div>

      <M3Card variant="outlined" className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <ListDot tone={nextAssignment || nextAssessment ? "primary" : "success"} />
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/70">Prioritas berikutnya</p>
              {nextAssignment ? <><h3 className="mt-1 text-[15px] font-semibold text-md-on-surface">{nextAssignment.title}</h3><p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">{nextAssignment.courseName} · tenggat {formatDateTime(nextAssignment.deadline)}</p></> : nextAssessment ? <><h3 className="mt-1 text-[15px] font-semibold text-md-on-surface">{nextAssessment.title}</h3><p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">{nextAssessment.courseName} · mulai {formatDateTime(nextAssessment.startsAt)}</p></> : <><h3 className="mt-1 text-[15px] font-semibold text-md-on-surface">Tidak ada pekerjaan mendesak</h3><p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">Tugas dan CBT yang perlu ditangani akan muncul di sini.</p></>}
            </div>
          </div>
          {(nextAssignment || nextAssessment) && <M3Button href={`/school/lms/courses/${(nextAssignment || nextAssessment).courseId}`} variant="filled" size="sm">Buka kelas</M3Button>}
        </div>
      </M3Card>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="student-work-title">
          <SectionTitle title="Tugas dan CBT" note="Pekerjaan belajar yang masih aktif." trailing={<M3Badge variant="outline">{data.pendingAssignments.length + pendingAssessments.length}</M3Badge>} />
          <div className="hig-list mt-4">
            {data.pendingAssignments.slice(0, 4).map((assignment: any) => <a key={assignment.assignmentId} href={`/school/lms/courses/${assignment.courseId}`} className="hig-list-row"><ListDot tone="primary" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{assignment.title}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{assignment.courseName} · {formatDateTime(assignment.deadline)}</span></span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
            {pendingAssessments.slice(0, 3).map((assessment: any) => <a key={assessment.assessmentId} href={`/school/lms/courses/${assessment.courseId}`} className="hig-list-row"><ListDot tone="warning" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{assessment.title}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{assessment.courseName} · {formatDateTime(assessment.startsAt)}</span></span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
            {!data.pendingAssignments.length && !pendingAssessments.length && <M3EmptyState compact icon="task_alt" title="Semua tertangani" description="Tidak ada tugas atau CBT aktif yang menunggu." />}
          </div>
        </section>

        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="student-courses-title">
          <SectionTitle title="Ruang belajar" note={`${data.courses.length} kelas aktif`} />
          <div className="hig-list mt-4">
            {data.courses.slice(0, 6).map((course: any) => <a key={course.id} href={`/school/lms/courses/${course.id}`} className="hig-list-row"><ListDot tone="success" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{course.subjectName}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{course.teacherDisplayName}</span></span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
          </div>
          {data.courses.length > 6 && <M3Button variant="text" href="/school/lms/courses" size="sm" className="mt-3">Lihat semua</M3Button>}
        </section>
      </div>

      {data.pkl && <section className="hig-grouped-surface p-4 sm:p-5"><SectionTitle title="PKL hari ini" note={data.pkl.companyName} /><div className="mt-3 flex flex-wrap items-center gap-2"><M3Badge variant={data.pkl.attendanceTodayStatus ? "success" : "warning"}>Presensi: {data.pkl.attendanceTodayStatus || "Belum tercatat"}</M3Badge><M3Badge variant={data.pkl.journalTodayStatus ? "secondary" : "warning"}>Jurnal: {data.pkl.journalTodayStatus || "Belum diisi"}</M3Badge><div className="ml-auto flex gap-2"><M3Button variant="text" href="/school/pkl/attendance" size="sm">Presensi</M3Button><M3Button variant="text" href="/school/pkl/journals" size="sm">Jurnal</M3Button></div></div></section>}
    </div>
  );
}

function TeacherDashboard() {
  const query = useQuery(getTeacherDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;

  const data = query.data;
  const attentionItems = [
    ...(data.attention.ungradedSubmissionCount > 0 ? [{ label: "Tugas belum dinilai", value: data.attention.ungradedSubmissionCount, href: "/school/lms/courses", tone: "warning" as const }] : []),
    ...(data.attention.pendingPklJournalReviewCount > 0 ? [{ label: "Jurnal PKL menunggu review", value: data.attention.pendingPklJournalReviewCount, href: "/school/pkl/journals", tone: "primary" as const }] : []),
    ...((data.attention.followUpAssignedCount ?? 0) > 0 ? [{ label: "Tindak lanjut ditugaskan", value: data.attention.followUpAssignedCount ?? 0, href: "/school/follow-up", tone: "warning" as const }] : []),
  ];

  return (
    <div className="space-y-5">
      <DashboardIntro title={`Halo, ${data.teacher.displayName}`} note={`${formatDate(new Date())} · Ringkasan pekerjaan mengajar`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <M3StatCard label="Ruang mengajar" value={data.courses.length} tone="blue" href="/school/lms/courses" />
        <M3StatCard label="Belum dinilai" value={data.attention.ungradedSubmissionCount} tone="orange" />
        <M3StatCard label="Jurnal PKL menunggu" value={data.attention.pendingPklJournalReviewCount} tone="teal" href={data.pkl ? "/school/pkl/journals" : undefined} />
        <M3StatCard label="Tindak lanjut" value={data.attention.followUpAssignedCount ?? 0} tone={(data.attention.followUpAssignedCount ?? 0) ? "orange" : "green"} href="/school/follow-up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="teacher-attention-title">
          <SectionTitle title="Perlu perhatian" note="Pekerjaan yang menunggu tindakan Anda." />
          <div className="hig-list mt-4">
            {attentionItems.map((item) => <a key={item.label} href={item.href} className="hig-list-row"><ListDot tone={item.tone} /><span className="min-w-0 flex-1 text-[13px] font-medium text-md-on-surface">{item.label}</span><span className="text-[16px] font-semibold text-md-on-surface">{item.value}</span></a>)}
            {!attentionItems.length && <M3EmptyState compact icon="task_alt" title="Tidak ada pekerjaan tertunda" description="Penilaian dan review yang perlu tindakan akan muncul di sini." />}
          </div>
        </section>

        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="teacher-courses-title">
          <SectionTitle title="Ruang mengajar" note={`${data.courses.length} kelas dan mapel`} />
          <div className="hig-list mt-4">
            {data.courses.slice(0, 7).map((course: any) => <a key={course.id} href={`/school/lms/courses/${course.id}`} className="hig-list-row"><ListDot tone="primary" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{course.subjectName}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{course.classRoom.name} · {course.academicYear}</span></span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
            {!data.courses.length && <M3EmptyState compact icon="menu_book" title="Belum ada ruang mapel" description="Ruang mengajar akan muncul setelah Admin Sekolah menetapkan mapel dan rombel." />}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.pkl && <section className="hig-grouped-surface p-4 sm:p-5"><SectionTitle title="PKL bimbingan" note={`${data.pkl.activePlacementCount} siswa aktif`} /><div className="hig-list mt-4">{data.pkl.pendingJournalReviews.slice(0, 5).map((journal: any) => <a key={journal.journalId} href="/school/pkl/journals" className="hig-list-row"><ListDot tone="warning" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{journal.studentDisplayName}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{journal.companyName} · {formatDate(journal.date)}</span></span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}</div></section>}
        <section className="hig-grouped-surface p-4 sm:p-5"><SectionTitle title="Tanggung jawab tambahan" note="Peran sekolah yang tercatat pada akun Anda." /><div className="mt-4 flex flex-wrap gap-2">{data.assignments.homeroomClass && <M3Button variant="tonal" href="/school/governance/walikelas" size="sm">Wali {data.assignments.homeroomClass.name}</M3Button>}{((data.assignments.wakasekRoles || []) as WakasekRoleCode[]).map((wakaRole) => <M3Button key={wakaRole} variant="tonal" href={"/school/governance/wakasek?role=" + wakaRole} size="sm">{WAKASEK_ROLE_META[wakaRole].label}</M3Button>)}{((data.assignments.staffAssignments || []) as Array<{ id: string; role: StaffAssignmentRoleCode; displayTitle: string }>).map((assignment) => <M3Button key={assignment.id} variant="tonal" href={assignment.role === "DUTY_TEACHER" ? "/school/governance/piket" : "/school/governance/organization"} size="sm">{assignment.displayTitle || STAFF_ASSIGNMENT_META[assignment.role].label}</M3Button>)}{!data.assignments.homeroomClass && !(data.assignments.wakasekRoles || []).length && !(data.assignments.staffAssignments || []).length && <p className="text-[12.5px] leading-5 text-md-on-surface-variant">Tidak ada penugasan tambahan pada akun ini.</p>}</div></section>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const query = useQuery(getSchoolAdminDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;

  const data = query.data;
  const displayedClassAttendance = [...data.attendance.byClass].sort((a: any, b: any) => {
    if (a.rate === null && b.rate === null) return a.className.localeCompare(b.className, "id");
    if (a.rate === null) return 1;
    if (b.rate === null) return -1;
    return (b.rate - a.rate) || a.className.localeCompare(b.className, "id");
  });
  const measuredIndexes = displayedClassAttendance
    .map((item: any, index: number) => item.rate !== null ? index : -1)
    .filter((index: number) => index >= 0);
  const lowestMeasuredIndex = measuredIndexes.at(-1);
  const secondLowestMeasuredIndex = measuredIndexes.at(-2);
  const isVocational = !data.school.level || data.school.level === "SMA_SMK";
  const quickLinks = [
    ["Data siswa", "/school/students"],
    ["Guru & tendik", "/school/teachers"],
    ["Kelas & rombel", "/school/classes"],
    ["LMS & CBT", "/school/lms/courses"],
    ["Tahun ajaran", "/school/academic-years"],
    ...(isVocational ? [["Mitra DUDI", "/school/pkl/companies"], ["Penempatan PKL", "/school/pkl/placements"]] : []),
  ];

  return (
    <div className="space-y-5">
      <DashboardIntro title="Ringkasan sekolah" note="Statistik operasional terkini berdasarkan data sekolah aktif." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <M3StatCard label="Siswa" value={data.counts.students} tone="blue" href="/school/students" />
        <M3StatCard label="Guru & Tendik" value={data.counts.teachers} tone="teal" href="/school/teachers" />
        <M3StatCard label="Rombel" value={data.counts.classRooms} tone="indigo" href="/school/classes" />
        <M3StatCard
          label="Kehadiran hari ini"
          value={data.attendance.rate !== null ? `${formatAttendanceRate(data.attendance.rate)}%` : "—"}
          tone={data.attendance.rate !== null && data.attendance.rate < 90 ? "orange" : "green"}
          helper={data.attendance.classCount > 0 ? `${data.attendance.classCount} rombel tercatat` : "Belum ada presensi harian"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="attendance-title">
          <SectionTitle
            title="Kehadiran per rombel"
            note="5 rombel prioritas, diurutkan dari kehadiran lebih tinggi ke lebih rendah."
          />
          {displayedClassAttendance.length ? (
            <>
              <div className="mt-4 space-y-2.5">
                {displayedClassAttendance.map((item: any, index: number) => (
                  <ClassAttendanceRow
                    key={item.classRoomId}
                    item={item}
                    tone={index === lowestMeasuredIndex ? "error" : index === secondLowestMeasuredIndex ? "warning" : "primary"}
                  />
                ))}
              </div>
              <p className="mt-4 border-t border-md-outline-variant pt-3 text-[11.5px] leading-5 text-md-on-surface-variant">
                {data.attendance.rate !== null
                  ? `Rata-rata kehadiran sekolah ${data.attendance.rate}% dari ${data.attendance.classCount} rombel yang sudah mencatat presensi harian. Dua rombel terbawah diberi aksen jingga dan merah.`
                  : "Belum ada presensi harian tercatat hari ini. Rombel aktif tetap ditampilkan tanpa menganggap data kosong sebagai 0%."}
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-[10px] border border-md-outline-variant bg-md-surface-container-low px-3.5 py-3">
              <p className="text-[12.5px] font-medium text-md-on-surface">Belum ada rombel aktif</p>
              <p className="mt-1 text-[11.5px] leading-5 text-md-on-surface-variant">Rombel akan muncul setelah tahun ajaran aktif dan kelas tersedia.</p>
            </div>
          )}
        </section>

        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="admin-decision-title">
          <SectionTitle title="Perlu keputusan Anda" note="Hal yang memerlukan keputusan atau tindak lanjut admin." trailing={data.attention.length ? <M3Badge variant="warning">{data.attention.length}</M3Badge> : undefined} />
          <div className="hig-list mt-4">
            {data.attention.map((item: any) => (
              <a key={item.code} href={item.destination} className="hig-list-row min-h-[52px]">
                <AttentionIcon code={item.code} severity={item.severity} />
                <span className="min-w-0 flex-1 text-[13px] font-medium text-md-on-surface">{item.label}</span>
                {item.count !== null && <span className="text-[13px] font-semibold tabular-nums text-md-on-surface">{item.count}</span>}
                <span className="text-[22px] font-light leading-none text-md-on-surface-variant/45" aria-hidden="true">›</span>
              </a>
            ))}
            <a href={isVocational ? "/school/pkl/monitoring" : "/school/reports"} className="hig-list-row min-h-[52px]">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] text-white shadow-[0_1px_2px_rgba(0,0,0,.14)] ${isVocational ? "bg-[#30B0C7]" : "bg-[#5E5CE6]"}`} aria-hidden="true">
                {isVocational ? <Activity size={17} strokeWidth={2.1} /> : <FileText size={17} strokeWidth={2.1} />}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-md-on-surface">{isVocational ? "Buka pusat monitoring PKL" : "Buka laporan operasional"}</span>
              <span className="text-[22px] font-light leading-none text-md-on-surface-variant/45" aria-hidden="true">›</span>
            </a>
            {!data.attention.length && <M3EmptyState compact icon="verified" title="Tidak ada keputusan mendesak" description="Tidak ada kondisi utama yang memerlukan keputusan admin saat ini." />}
          </div>
        </section>
      </div>

      <section className="hig-grouped-surface p-4 sm:p-5">
        <SectionTitle title="Kelola cepat" note="Akses langsung ke area administrasi yang paling sering digunakan." />
        <div className="mt-4 grid overflow-hidden rounded-[12px] border border-md-outline-variant sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(([label, href], index) => <a key={href} href={href} className={`flex min-h-11 items-center gap-2.5 px-3 text-[12.5px] font-medium text-md-on-surface transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04] ${index > 0 ? "border-t border-md-outline-variant sm:border-t-0" : ""} sm:border-r sm:border-md-outline-variant`}><ListDot tone="neutral" /><span className="min-w-0 flex-1 truncate">{label}</span><span className="text-[16px] text-md-on-surface-variant/40">›</span></a>)}
        </div>
      </section>
    </div>
  );
}

function MentorDashboard() {
  const query = useQuery(getMentorDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;

  const data = query.data;
  const pendingJournals = data.placements.reduce((total: number, placement: any) => total + placement.pendingJournalCount, 0);

  return (
    <div className="space-y-5">
      <DashboardIntro title={`Halo, ${data.mentor.displayName}`} note={`${formatDate(new Date())} · Ringkasan bimbingan PKL`} actions={<M3Button variant="text" href="/school/pkl/journals" size="sm">Buka jurnal</M3Button>} />
      <div className="grid gap-3 sm:grid-cols-2">
        <M3StatCard label="Siswa PKL aktif" value={data.activePlacementCount} tone="blue" />
        <M3StatCard label="Jurnal menunggu" value={pendingJournals} tone="orange" href="/school/pkl/journals" />
      </div>
      <section className="hig-grouped-surface p-4 sm:p-5">
        <SectionTitle title="Siswa bimbingan" note="Hanya penempatan yang berada dalam relasi bimbingan Anda." />
        <div className="hig-list mt-4">
          {data.placements.map((placement: any) => <a key={placement.id} href="/school/pkl/journals" className="hig-list-row"><ListDot tone={placement.pendingJournalCount ? "warning" : "success"} /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-md-on-surface">{placement.studentDisplayName}</span><span className="block truncate text-[11.5px] text-md-on-surface-variant">{placement.companyName}</span></span><span className="text-[11.5px] text-md-on-surface-variant">{placement.pendingJournalCount ? `${placement.pendingJournalCount} menunggu` : "Tertangani"}</span><span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
          {!data.placements.length && <M3EmptyState compact icon="work_off" title="Belum ada siswa bimbingan aktif" description="Penempatan akan muncul setelah Admin Sekolah menetapkan Anda sebagai pembimbing DUDI." />}
        </div>
      </section>
    </div>
  );
}

export function SchoolDashboardPage({ user }: { user: AuthUser }) {
  let content: React.ReactNode;
  if (user.role === "STUDENT") content = <StudentDashboard />;
  else if (user.role === "TEACHER") content = <TeacherDashboard />;
  else if (user.role === "DUDI_MENTOR") content = <MentorDashboard />;
  else content = <AdminDashboard />;
  return <SchoolLayout user={user}>{content}</SchoolLayout>;
}
