import React from "react";
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
  M3Icon,
  M3LinearProgress,
  M3PageHeader,
  M3StatCard,
} from "../../client/components/m3";

function greetingName(user: AuthUser) {
  return user.name || user.username || user.email?.split("@")[0] || "Anda";
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" }).format(new Date(date));
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function DashboardLoading() {
  return (
    <div className="v2-page" aria-live="polite" aria-busy="true">
      <div className="h-24 animate-pulse rounded-[16px] bg-md-surface-container-low" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-[16px] bg-md-surface-container-low" />)}
      </div>
      <div className="h-48 animate-pulse rounded-[16px] bg-md-surface-container-low" />
      <p className="text-sm text-md-on-surface-variant">Menyiapkan ringkasan yang relevan untuk akun Anda...</p>
    </div>
  );
}

function QueryError({ retry }: { retry: () => void }) {
  return (
    <M3Card variant="elevated">
      <M3EmptyState icon="cloud_off" title="Ringkasan belum dapat dimuat" description="Data utama Anda tetap aman. Coba muat ulang ringkasan tanpa mengubah data yang tersimpan." actionLabel="Coba lagi" onAction={retry} />
    </M3Card>
  );
}

function StudentDashboard({ user }: { user: AuthUser }) {
  const query = useQuery(getStudentDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;
  const data = query.data;
  const nextAssignment = data.pendingAssignments[0];
  const nextAssessment = data.upcomingAssessments.find((assessment: any) => assessment.attemptStatus !== "COMPLETED");

  return (
    <div className="v2-page">
      <M3PageHeader
        eyebrow={formatDate(new Date()).toUpperCase()}
        title={`Selamat datang, ${data.student.displayName}`}
        description={data.student.classRoom ? `Rombel ${data.student.classRoom.name}. Fokus pada pekerjaan belajar yang perlu diselesaikan sekarang.` : "Akun Anda belum ditempatkan ke rombel aktif."}
        icon="school"
        iconTone="primary"
        meta={data.student.classRoom ? <M3Badge variant="secondary">{data.student.classRoom.name}</M3Badge> : undefined}
      />

      {!data.student.classRoom ? (
        <M3Card variant="elevated"><M3EmptyState icon="meeting_room" title="Kelas belajar belum tersedia" description="Akun Anda belum ditempatkan ke rombel aktif. Hubungi admin sekolah atau wali kelas agar ruang belajar dapat ditampilkan." actionLabel="Buka Akun" actionHref="/account" /></M3Card>
      ) : (
        <>
          <section aria-labelledby="student-priority-title">
            <M3Card variant="tonal" className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-md-primary text-md-on-primary"><M3Icon name={nextAssignment ? "assignment" : nextAssessment ? "quiz" : "task_alt"} size={25} /></div>
                  <div>
                    <p id="student-priority-title" className="text-[12px] font-bold tracking-[0.08em] text-md-on-surface-variant">PRIORITAS BERIKUTNYA</p>
                    {nextAssignment ? <><h2 className="mt-1 text-[18px] font-bold text-md-on-surface">{nextAssignment.title}</h2><p className="mt-1 text-sm text-md-on-surface-variant">{nextAssignment.courseName}. Tenggat {formatDateTime(nextAssignment.deadline)}.</p></> : nextAssessment ? <><h2 className="mt-1 text-[18px] font-bold text-md-on-surface">{nextAssessment.title}</h2><p className="mt-1 text-sm text-md-on-surface-variant">{nextAssessment.courseName}. Mulai {formatDateTime(nextAssessment.startsAt)}.</p></> : <><h2 className="mt-1 text-[18px] font-bold text-md-on-surface">Tidak ada tugas mendesak</h2><p className="mt-1 text-sm text-md-on-surface-variant">Tidak ada tugas atau CBT yang perlu ditangani saat ini.</p></>}
                  </div>
                </div>
                {(nextAssignment || nextAssessment) && <M3Button href={`/school/lms/courses/${(nextAssignment || nextAssessment).courseId}`} icon="arrow_forward">Buka kelas</M3Button>}
              </div>
            </M3Card>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <section aria-labelledby="student-tasks-title" className="v2-panel p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="v2-eyebrow">PEMBELAJARAN</p><h2 id="student-tasks-title" className="mt-1 text-[15px] font-bold text-md-on-surface">Tugas dan CBT mendatang</h2></div><M3Badge variant="primary">{data.pendingAssignments.length + data.upcomingAssessments.filter((a: any) => a.attemptStatus !== "COMPLETED").length} aktif</M3Badge></div>
              <div className="hig-list">
                {data.pendingAssignments.slice(0, 4).map((assignment: any) => <a key={assignment.assignmentId} href={`/school/lms/courses/${assignment.courseId}`} className="hig-list-row"><span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-md-primary-container text-md-primary"><M3Icon name="assignment" size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-md-on-surface">{assignment.title}</span><span className="block truncate text-xs text-md-on-surface-variant">{assignment.courseName} · {formatDateTime(assignment.deadline)}</span></span></a>)}
                {data.upcomingAssessments.filter((assessment: any) => assessment.attemptStatus !== "COMPLETED").slice(0, 3).map((assessment: any) => <a key={assessment.assessmentId} href={`/school/lms/courses/${assessment.courseId}`} className="hig-list-row"><span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-purple-500/10 text-purple-700 dark:text-purple-300"><M3Icon name="quiz" size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-md-on-surface">{assessment.title}</span><span className="block truncate text-xs text-md-on-surface-variant">{assessment.courseName} · {formatDateTime(assessment.startsAt)}</span></span></a>)}
                {!data.pendingAssignments.length && !data.upcomingAssessments.some((assessment: any) => assessment.attemptStatus !== "COMPLETED") && <M3EmptyState compact icon="task_alt" title="Tidak ada tugas yang perlu dikumpulkan" description="Daftar ini akan terisi otomatis ketika guru menerbitkan tugas atau CBT untuk rombel Anda." />}
              </div>
            </section>

            <section aria-labelledby="student-courses-title" className="v2-panel-soft p-5 sm:p-6">
              <p className="v2-eyebrow">KELAS SAYA</p><h2 id="student-courses-title" className="mt-1 text-[15px] font-bold text-md-on-surface">Ruang belajar</h2>
              <div className="hig-list mt-4">{data.courses.slice(0, 6).map((course: any) => <a key={course.id} href={`/school/lms/courses/${course.id}`} className="hig-list-row"><span className="flex size-9 items-center justify-center rounded-[8px] bg-md-primary-container text-md-primary"><M3Icon name="menu_book" size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-md-on-surface">{course.subjectName}</span><span className="block truncate text-xs text-md-on-surface-variant">{course.teacherDisplayName}</span></span></a>)}</div>
              {data.courses.length > 6 && <M3Button variant="text" href="/school/lms/courses" className="mt-3">Lihat semua kelas</M3Button>}
            </section>
          </div>

          {data.pkl && <section aria-labelledby="student-pkl-title" className="v2-panel p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="v2-eyebrow">PKL HARI INI</p><h2 id="student-pkl-title" className="mt-1 text-[15px] font-bold text-md-on-surface">{data.pkl.companyName}</h2><div className="mt-3 flex flex-wrap gap-2"><M3Badge variant={data.pkl.attendanceTodayStatus ? "success" : "warning"}>Presensi: {data.pkl.attendanceTodayStatus || "Belum tercatat"}</M3Badge><M3Badge variant={data.pkl.journalTodayStatus ? "secondary" : "warning"}>Jurnal: {data.pkl.journalTodayStatus || "Belum diisi"}</M3Badge></div></div><div className="flex gap-2"><M3Button variant="tonal" href="/school/pkl/attendance" icon="location_on">Presensi</M3Button><M3Button variant="outlined" href="/school/pkl/journals" icon="edit_note">Jurnal</M3Button></div></div></section>}
        </>
      )}
    </div>
  );
}

function TeacherDashboard({ user }: { user: AuthUser }) {
  const query = useQuery(getTeacherDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;
  const data = query.data;
  const attentionItems = [
    ...(data.attention.ungradedSubmissionCount > 0 ? [{ icon: "grading", label: "Tugas belum dinilai", value: data.attention.ungradedSubmissionCount, href: "/school/lms/courses" }] : []),
    ...(data.attention.pendingPklJournalReviewCount > 0 ? [{ icon: "rate_review", label: "Jurnal PKL menunggu review", value: data.attention.pendingPklJournalReviewCount, href: "/school/pkl/journals" }] : []),
  ];
  return (
    <div className="v2-page">
      <M3PageHeader eyebrow={formatDate(new Date()).toUpperCase()} title={`Selamat datang, ${data.teacher.displayName}`} description="Mulai dari kelas, penilaian, atau bimbingan yang memerlukan perhatian Anda." icon="person_book" iconTone="secondary" meta={<M3Badge variant="secondary">Guru</M3Badge>} />

      <div className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <section className="v2-panel p-5 sm:p-6" aria-labelledby="teacher-attention-title">
          <p className="v2-eyebrow">PERLU PERHATIAN</p><h2 id="teacher-attention-title" className="mt-1 text-[15px] font-bold text-md-on-surface">Pekerjaan yang menunggu</h2>
          <div className="hig-list mt-4">
            {attentionItems.map((item) => <a key={item.label} href={item.href} className="hig-list-row"><span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-md-tertiary-container text-md-on-tertiary-container"><M3Icon name={item.icon} size={20} /></span><span className="min-w-0 flex-1 text-sm font-bold text-md-on-surface">{item.label}</span><span className="text-[18px] font-bold text-md-on-surface">{item.value}</span></a>)}
            {!attentionItems.length && <M3EmptyState compact icon="task_alt" title="Tidak ada pekerjaan tertunda" description="Tidak ada penilaian atau jurnal PKL yang sedang menunggu tindakan Anda." />}
          </div>
        </section>

        <section className="v2-panel-soft p-5 sm:p-6" aria-labelledby="teacher-courses-title">
          <div className="flex items-end justify-between gap-3"><div><p className="v2-eyebrow">KELAS & MAPEL</p><h2 id="teacher-courses-title" className="mt-1 text-[15px] font-bold text-md-on-surface">Ruang mengajar Anda</h2></div><M3Badge variant="primary">{data.courses.length} ruang</M3Badge></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.courses.slice(0, 6).map((course: any) => <a key={course.id} href={`/school/lms/courses/${course.id}`} className="rounded-[12px] border border-md-outline-variant bg-md-surface p-3.5 hover:bg-md-surface-container-low"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[12px] bg-md-primary-container text-md-primary"><M3Icon name="menu_book" size={20} /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-md-on-surface">{course.subjectName}</span><span className="mt-1 block truncate text-xs text-md-on-surface-variant">{course.classRoom.name}</span><span className="mt-2 block text-[11px] font-semibold text-md-on-surface-variant">{course.academicYear}</span></span></div></a>)}</div>
          {!data.courses.length && <M3EmptyState compact icon="menu_book" title="Belum ada ruang mapel" description="Ruang mengajar akan muncul setelah Admin Sekolah menetapkan mapel dan rombel kepada akun Anda." />}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.pkl && <section className="v2-panel p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="v2-eyebrow">PKL BIMBINGAN</p><h2 className="mt-1 text-[15px] font-bold text-md-on-surface">{data.pkl.activePlacementCount} siswa aktif</h2><p className="mt-2 text-sm text-md-on-surface-variant">Jurnal yang masuk ditampilkan berdasarkan relasi pembimbing Anda.</p></div><span className="v2-module-icon bg-md-tertiary-container text-md-on-tertiary-container"><M3Icon name="work" size={21} /></span></div><div className="hig-list mt-4">{data.pkl.pendingJournalReviews.slice(0, 4).map((journal: any) => <a key={journal.journalId} href="/school/pkl/journals" className="hig-list-row justify-between"><span className="min-w-0"><span className="block truncate text-sm font-bold text-md-on-surface">{journal.studentDisplayName}</span><span className="block truncate text-xs text-md-on-surface-variant">{journal.companyName} · {formatDate(journal.date)}</span></span><M3Icon name="chevron_right" size={20} className="text-md-on-surface-variant" /></a>)}</div></section>}
        <section className="v2-panel p-5 sm:p-6"><p className="v2-eyebrow">TANGGUNG JAWAB TAMBAHAN</p><h2 className="mt-1 text-[15px] font-bold text-md-on-surface">Peran sekolah</h2><div className="mt-4 flex flex-wrap gap-2">{data.assignments.homeroomClass && <M3Button variant="tonal" href="/school/governance/walikelas" icon="supervisor_account">Wali {data.assignments.homeroomClass.name}</M3Button>}{data.assignments.isWaka && <M3Button variant="tonal" href="/school/governance/waka" icon="verified_user">Waka Kurikulum</M3Button>}{!data.assignments.homeroomClass && !data.assignments.isWaka && <p className="text-sm leading-6 text-md-on-surface-variant">Tidak ada penugasan Wali Kelas atau Waka Kurikulum yang tercatat pada akun ini.</p>}</div></section>
      </div>
    </div>
  );
}

function AdminDashboard({ user }: { user: AuthUser }) {
  const query = useQuery(getSchoolAdminDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;
  const data = query.data;
  const isVocational = !data.school.level || data.school.level === "SMA_SMK";
  return (
    <div className="v2-page">
      <M3PageHeader eyebrow="ADMIN SEKOLAH" title={data.school.name} description={data.academicYear ? `Tahun ajaran aktif ${data.academicYear.yearName}, semester ${data.academicYear.semester.toLowerCase()}.` : "Belum ada tahun ajaran aktif. Atur tahun ajaran sebelum melanjutkan operasional akademik."} icon="school" iconTone="primary" meta={<><M3Badge variant="outline">{data.school.tier}</M3Badge>{data.academicYear && <M3Badge variant="secondary">{data.academicYear.yearName}</M3Badge>}</>} actions={<M3Button variant="tonal" href="/school/import" icon="upload_file">Import data</M3Button>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <M3StatCard label="Siswa" value={data.counts.students} icon="groups" tone="blue" href="/school/students" />
        <M3StatCard label="Guru" value={data.counts.teachers} icon="person_book" tone="teal" href="/school/teachers" />
        <M3StatCard label="Rombel" value={data.counts.classRooms} icon="meeting_room" tone="indigo" href="/school/classes" />
        <M3StatCard label="Ruang LMS" value={data.counts.lmsCourses} icon="menu_book" tone="purple" href="/school/lms/courses" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="v2-panel p-5 sm:p-6" aria-labelledby="admin-attention-title"><div className="flex items-end justify-between gap-3"><div><p className="v2-eyebrow">PERLU PERHATIAN</p><h2 id="admin-attention-title" className="mt-1 text-[15px] font-bold text-md-on-surface">Kondisi yang perlu ditangani</h2></div>{data.attention.length > 0 && <M3Badge variant="warning">{data.attention.length} temuan</M3Badge>}</div><div className="hig-list mt-4">{data.attention.map((item: any) => <a key={item.code} href={item.destination} className="hig-list-row"><span className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${item.severity === "warning" ? "bg-md-tertiary-container text-md-on-tertiary-container" : "bg-md-primary-container text-md-primary"}`}><M3Icon name={item.severity === "warning" ? "warning" : "info"} size={20} /></span><span className="min-w-0 flex-1 text-sm font-bold text-md-on-surface">{item.label}</span>{item.count !== null && <span className="text-[18px] font-bold text-md-on-surface">{item.count}</span>}</a>)}{!data.attention.length && <M3EmptyState compact icon="verified" title="Tidak ada masalah utama yang terdeteksi" description="Pemeriksaan ringkas tidak menemukan tahun ajaran kosong, siswa tanpa rombel, atau guru tanpa ruang mapel." />}</div></section>

        <section className="v2-panel-soft p-5 sm:p-6" aria-labelledby="capacity-title"><div className="flex items-start justify-between gap-4"><div><p className="v2-eyebrow">KAPASITAS SISWA</p><h2 id="capacity-title" className="mt-1 text-[15px] font-bold text-md-on-surface">{data.capacity.studentCount} dari {data.capacity.studentQuota}</h2><p className="mt-2 text-sm text-md-on-surface-variant">Kuota berasal dari konfigurasi sekolah aktif.</p></div><span className="v2-module-icon bg-md-primary-container text-md-on-primary-container"><M3Icon name="donut_large" size={21} /></span></div>{data.capacity.percentage !== null && <><M3LinearProgress value={data.capacity.percentage} className="mt-5" /><p className="mt-2 text-xs font-semibold text-md-on-surface-variant">{data.capacity.percentage}% terpakai</p></>}</section>
      </div>

      <section className="v2-panel p-5 sm:p-6"><p className="v2-eyebrow">KELOLA CEPAT</p><h2 className="mt-1 text-[15px] font-bold text-md-on-surface">Operasi sekolah</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><M3Button variant="outlined" href="/school/students" icon="groups" className="justify-start">Data siswa</M3Button><M3Button variant="outlined" href="/school/teachers" icon="person_book" className="justify-start">Guru & tendik</M3Button><M3Button variant="outlined" href="/school/classes" icon="meeting_room" className="justify-start">Kelas & rombel</M3Button><M3Button variant="outlined" href="/school/lms/courses" icon="menu_book" className="justify-start">LMS & CBT</M3Button>{isVocational && <><M3Button variant="outlined" href="/school/pkl/companies" icon="apartment" className="justify-start">Mitra DUDI</M3Button><M3Button variant="outlined" href="/school/pkl/placements" icon="work" className="justify-start">Penempatan PKL</M3Button></>}</div></section>
    </div>
  );
}

function MentorDashboard({ user }: { user: AuthUser }) {
  const query = useQuery(getMentorDashboardData);
  if (query.isLoading) return <DashboardLoading />;
  if (query.error || !query.data) return <QueryError retry={() => query.refetch()} />;
  const data = query.data;
  return <div className="v2-page"><M3PageHeader eyebrow="PEMBIMBING DUDI" title={`Selamat datang, ${data.mentor.displayName}`} description="Tinjau siswa PKL dan jurnal yang memang berada dalam bimbingan Anda." icon="work" iconTone="orange" /><section className="v2-panel p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="v2-eyebrow">SISWA BIMBINGAN</p><h2 className="mt-1 text-[15px] font-bold text-md-on-surface">{data.activePlacementCount} penempatan aktif</h2></div><M3Button variant="tonal" href="/school/pkl/journals" icon="edit_note">Buka jurnal</M3Button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{data.placements.map((placement: any) => <a key={placement.id} href="/school/pkl/journals" className="rounded-[12px] border border-md-outline-variant bg-md-surface p-3.5 hover:bg-md-surface-container-low"><p className="text-sm font-bold text-md-on-surface">{placement.studentDisplayName}</p><p className="mt-1 text-xs text-md-on-surface-variant">{placement.companyName}</p><div className="mt-3"><M3Badge variant={placement.pendingJournalCount ? "warning" : "success"}>{placement.pendingJournalCount ? `${placement.pendingJournalCount} jurnal menunggu` : "Jurnal tertangani"}</M3Badge></div></a>)}{!data.placements.length && <M3EmptyState compact icon="work_off" title="Belum ada siswa bimbingan aktif" description="Penempatan siswa akan muncul setelah Admin Sekolah menetapkan Anda sebagai pembimbing DUDI." />}</div></section></div>;
}

export function SchoolDashboardPage({ user }: { user: AuthUser }) {
  let content: React.ReactNode;
  if (user.role === "STUDENT") content = <StudentDashboard user={user} />;
  else if (user.role === "TEACHER") content = <TeacherDashboard user={user} />;
  else if (user.role === "DUDI_MENTOR") content = <MentorDashboard user={user} />;
  else content = <AdminDashboard user={user} />;
  return <SchoolLayout user={user}>{content}</SchoolLayout>;
}
