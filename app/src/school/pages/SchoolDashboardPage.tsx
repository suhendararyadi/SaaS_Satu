import React, { type ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getStudentDashboardData,
  getTeacherDashboardData,
  getSchoolAdminDashboardData,
  getMentorDashboardData,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3Card,
  M3EmptyState,
  M3LinearProgress,
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
  ];

  return (
    <div className="space-y-5">
      <DashboardIntro title={`Halo, ${data.teacher.displayName}`} note={`${formatDate(new Date())} · Ringkasan pekerjaan mengajar`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <M3StatCard label="Ruang mengajar" value={data.courses.length} tone="blue" href="/school/lms/courses" />
        <M3StatCard label="Belum dinilai" value={data.attention.ungradedSubmissionCount} tone="orange" />
        <M3StatCard label="Jurnal PKL menunggu" value={data.attention.pendingPklJournalReviewCount} tone="teal" href={data.pkl ? "/school/pkl/journals" : undefined} />
        <M3StatCard label="Siswa PKL aktif" value={data.pkl?.activePlacementCount ?? 0} tone="green" />
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
        <section className="hig-grouped-surface p-4 sm:p-5"><SectionTitle title="Tanggung jawab tambahan" note="Peran sekolah yang tercatat pada akun Anda." /><div className="mt-4 flex flex-wrap gap-2">{data.assignments.homeroomClass && <M3Button variant="tonal" href="/school/governance/walikelas" size="sm">Wali {data.assignments.homeroomClass.name}</M3Button>}{data.assignments.isWaka && <M3Button variant="tonal" href="/school/governance/waka" size="sm">Waka Kurikulum</M3Button>}{!data.assignments.homeroomClass && !data.assignments.isWaka && <p className="text-[12.5px] leading-5 text-md-on-surface-variant">Tidak ada penugasan Wali Kelas atau Waka Kurikulum pada akun ini.</p>}</div></section>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const query = useQuery(getSchoolAdminDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;

  const data = query.data;
  const isVocational = !data.school.level || data.school.level === "SMA_SMK";
  const statColumns = isVocational ? "xl:grid-cols-6" : "xl:grid-cols-4";
  const attendanceBreakdown: Array<{ label: string; value: number; tone: "success" | "neutral" | "warning" | "error" }> = [
    { label: "Hadir", value: data.attendance.hadir, tone: "success" },
    { label: "Sakit", value: data.attendance.sakit, tone: "neutral" },
    { label: "Izin", value: data.attendance.izin, tone: "warning" },
    { label: "Alpa", value: data.attendance.alpa, tone: "error" },
  ];

  const quickLinks = [
    ["Data siswa", "/school/students"],
    ["Guru & tendik", "/school/teachers"],
    ["Kelas & rombel", "/school/classes"],
    ["LMS & CBT", "/school/lms/courses"],
    ["Tahun ajaran", "/school/academic-years"],
    ["Import data", "/school/import"],
    ...(isVocational ? [["Mitra DUDI", "/school/pkl/companies"], ["Penempatan PKL", "/school/pkl/placements"]] : []),
  ];

  return (
    <div className="space-y-5">
      <DashboardIntro title="Ringkasan sekolah" note="Statistik operasional terkini berdasarkan data sekolah aktif." actions={<M3Button variant="text" href="/school/import" size="sm">Import data</M3Button>} />

      <div className={`grid gap-3 sm:grid-cols-2 md:grid-cols-3 ${statColumns}`}>
        <M3StatCard label="Siswa" value={data.counts.students} tone="blue" href="/school/students" />
        <M3StatCard label="Guru" value={data.counts.teachers} tone="teal" href="/school/teachers" />
        <M3StatCard label="Rombel" value={data.counts.classRooms} tone="indigo" href="/school/classes" />
        <M3StatCard label="Ruang LMS" value={data.counts.lmsCourses} tone="blue" href="/school/lms/courses" />
        {isVocational && <M3StatCard label="Mitra DUDI" value={data.counts.companies} tone="orange" href="/school/pkl/companies" />}
        {isVocational && <M3StatCard label="PKL aktif" value={data.counts.placements} tone="green" href="/school/pkl/placements" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="attendance-title">
          <SectionTitle
            title="Kehadiran"
            note={data.attendance.sessionCount > 0 ? `${data.attendance.sessionCount} sesi presensi tercatat hari ini` : "Belum ada sesi presensi LMS hari ini"}
            trailing={data.attendance.rate !== null ? <span className="text-[24px] font-semibold tracking-[-0.035em] text-md-on-surface">{data.attendance.rate}%</span> : undefined}
          />
          {data.attendance.rate !== null ? (
            <>
              <M3LinearProgress value={data.attendance.rate} className="mt-5" />
              <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-md-outline-variant pt-4 sm:grid-cols-4">
                {attendanceBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <ListDot tone={item.tone} />
                    <div><p className="text-[10.5px] text-md-on-surface-variant">{item.label}</p><p className="mt-0.5 text-[18px] font-semibold text-md-on-surface">{item.value}</p></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[10px] border border-md-outline-variant bg-md-surface-container-low px-3.5 py-3">
              <p className="text-[12.5px] font-medium text-md-on-surface">Belum ada presensi tercatat</p>
              <p className="mt-1 text-[11.5px] leading-5 text-md-on-surface-variant">Persentase akan muncul setelah guru mencatat presensi pada ruang LMS hari ini.</p>
            </div>
          )}
        </section>

        <section className="hig-grouped-surface p-4 sm:p-5" aria-labelledby="admin-decision-title">
          <SectionTitle title="Perlu keputusan Anda" note="Hal yang memerlukan keputusan atau tindak lanjut admin." trailing={data.attention.length ? <M3Badge variant="warning">{data.attention.length}</M3Badge> : undefined} />
          <div className="hig-list mt-4">
            {data.attention.map((item: any) => <a key={item.code} href={item.destination} className="hig-list-row"><ListDot tone={item.severity === "warning" ? "warning" : "primary"} /><span className="min-w-0 flex-1 text-[13px] font-medium text-md-on-surface">{item.label}</span>{item.count !== null && <span className="text-[16px] font-semibold text-md-on-surface">{item.count}</span>}<span className="text-[16px] text-md-on-surface-variant/45">›</span></a>)}
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
