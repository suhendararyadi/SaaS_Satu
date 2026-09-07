import React from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery, getSchoolInfo } from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3LinearProgress,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function SchoolDashboardPage({ user }: { user: AuthUser }) {
  const { data: school, isLoading } = useQuery(getSchoolInfo);

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <M3CircularProgress size={44} />
        </div>
      </SchoolLayout>
    );
  }

  const studentCount = school?.studentCount || 0;
  const studentQuota = school?.studentQuota || 100;
  const quotaPercentage = Math.min(
    100,
    Math.round((studentCount / studentQuota) * 100)
  );

  const isVocationalOrHighSchool = !school?.level || school?.level === "SMA_SMK";
  const canManageSchool = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary">
            Portal Sekolah
          </Link>
          <span>/</span>
          <span className="text-md-on-surface font-medium">
            Ringkasan Dashboard
          </span>
        </div>

        {/* Hero Banner Component */}
        <M3Banner
          variant="hero"
          headline={
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white border border-white/25 backdrop-blur-xs">
                  <M3Icon name="domain" size={14} />
                  Multi-Tenant Aktif
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-md-primary-container text-md-on-primary-container shadow-2xs">
                  {school?.tier || "FREE_TRIAL"}
                </span>
                {school?.level && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    {school.level === "SD_MI"
                      ? "Jenjang: SD / MI"
                      : school.level === "SMP_MTS"
                      ? "Jenjang: SMP / MTs"
                      : "Jenjang: SMA / SMK Sederajat"}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-md-on-primary">
                {school?.name || "SaaS Satu Smart School"}
              </h2>
            </div>
          }
          supportingText={
            isVocationalOrHighSchool
              ? "Kelola data akademik, PKL industri, pembelajaran kelas, dan tata kelola sekolah."
              : "Kelola data akademik, pembelajaran kelas, dan administrasi sekolah."
          }
          icon="school"
          {...(canManageSchool
            ? { actionLabel: "Import Data Massal", actionHref: "/school/import" }
            : {})}
          className="p-6 sm:p-8"
        />

        {/* Quota Warning Banner if quota >= 90% */}
        {quotaPercentage >= 90 && (
          <M3Banner
            variant="warning"
            headline="Kapasitas Kuota Siswa Hampir Penuh"
            supportingText={`Sekolah telah menggunakan ${quotaPercentage}% (${studentCount}/${studentQuota}) dari alokasi siswa. Hubungi administrator untuk meningkatkan tier lisensi.`}
            {...(canManageSchool
              ? { actionLabel: "Lihat Status Paket", actionHref: "/pricing" }
              : {})}
          />
        )}

        {/* Quota & Capacity Overview Card */}
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-md-on-surface-variant">
                Kuota Siswa Terdaftar
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg sm:text-xl font-bold text-md-on-surface">
                  {studentCount} / {studentQuota} Siswa Terdaftar
                </span>
                <M3Badge
                  variant={quotaPercentage > 90 ? "error" : "secondary"}
                  size="sm"
                >
                  {quotaPercentage}% Terpakai
                </M3Badge>
              </div>
            </div>

            <M3Badge variant="tertiary" size="md">
              Status: {school?.tier || "TRIAL"}
            </M3Badge>
          </div>

          <M3LinearProgress value={quotaPercentage} />
        </M3Card>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <M3Card variant="outlined" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-[14px] bg-md-primary-container text-md-on-primary-container flex items-center justify-center shadow-xs">
                <M3Icon name="groups" size={24} />
              </div>
              <M3Badge variant="secondary" size="sm">Peserta Didik</M3Badge>
            </div>
            <div>
              <p className="text-xs text-md-on-surface-variant">Total Siswa Aktif</p>
              <p className="text-2xl font-bold text-md-on-surface mt-0.5">
                {school?.studentCount || 0}
              </p>
            </div>
            <M3Button
              variant="text"
              size="sm"
              href="/school/students"
            >
              Kelola Siswa
            </M3Button>
          </M3Card>

          <M3Card variant="outlined" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-[14px] bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center shadow-xs">
                <M3Icon name="school" size={24} />
              </div>
              <M3Badge variant="tertiary" size="sm">Pendidik</M3Badge>
            </div>
            <div>
              <p className="text-xs text-md-on-surface-variant">Guru &amp; Tendik</p>
              <p className="text-2xl font-bold text-md-on-surface mt-0.5">
                {school?.teacherCount || 0}
              </p>
            </div>
            <M3Button
              variant="text"
              size="sm"
              href="/school/teachers"
            >
              Kelola Guru
            </M3Button>
          </M3Card>

          <M3Card variant="outlined" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-[14px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <M3Icon name="meeting_room" size={24} />
              </div>
              <M3Badge variant="outline" size="sm">Akademik</M3Badge>
            </div>
            <div>
              <p className="text-xs text-md-on-surface-variant">Rombel Kelas</p>
              <p className="text-2xl font-bold text-md-on-surface mt-0.5">
                {school?._count?.classRooms || 0}
              </p>
            </div>
            <M3Button
              variant="text"
              size="sm"
              href="/school/classes"
            >
              Kelola Kelas
            </M3Button>
          </M3Card>

          {isVocationalOrHighSchool ? (
            <M3Card variant="outlined" className="p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-[14px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shadow-xs">
                  <M3Icon name="apartment" size={24} />
                </div>
                <M3Badge variant="outline" size="sm">Mitra DUDI</M3Badge>
              </div>
              <div>
                <p className="text-xs text-md-on-surface-variant">Tempat PKL</p>
                <p className="text-2xl font-bold text-md-on-surface mt-0.5">
                  {school?._count?.companies || 0}
                </p>
              </div>
              <M3Button
                variant="text"
                size="sm"
                href="/school/pkl/companies"
              >
                Kelola DUDI
              </M3Button>
            </M3Card>
          ) : (
            <M3Card variant="outlined" className="p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-[14px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center shadow-xs">
                  <M3Icon name="menu_book" size={24} />
                </div>
                <M3Badge variant="outline" size="sm">Pembelajaran</M3Badge>
              </div>
              <div>
                <p className="text-xs text-md-on-surface-variant">Mata Pelajaran LMS</p>
                <p className="text-2xl font-bold text-md-on-surface mt-0.5">
                  {school?._count?.lmsCourses || 0}
                </p>
              </div>
              <M3Button
                variant="text"
                size="sm"
                href="/school/lms/courses"
              >
                Buka Mapel
              </M3Button>
            </M3Card>
          )}
        </div>

        {/* Quick Setup Checklist */}
        {canManageSchool && (
        <M3Card variant="elevated" className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-md-on-surface">
              Panduan Awal Sekolah
            </h3>
            <p className="text-xs sm:text-sm text-md-on-surface-variant">
              Langkah penyiapan tahun ajaran, rombel, dan data siswa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isVocationalOrHighSchool ? (
              <M3Card variant="filled" className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[10px] bg-md-primary text-md-on-primary">
                    <M3Icon name="school" size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-md-on-surface">1. Tambah Jurusan</h4>
                </div>
                <p className="text-xs text-md-on-surface-variant">
                  Definisikan konsentrasi keahlian seperti RPL, TKJ, DKV, dll.
                </p>
                <M3Button variant="text" size="sm" href="/school/departments">
                  Buka Jurusan
                </M3Button>
              </M3Card>
            ) : (
              <M3Card variant="filled" className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[10px] bg-md-primary text-md-on-primary">
                    <M3Icon name="calendar_month" size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-md-on-surface">1. Tahun Ajaran</h4>
                </div>
                <p className="text-xs text-md-on-surface-variant">
                  Atur kalender tahun ajaran dan semester aktif sekolah.
                </p>
                <M3Button variant="text" size="sm" href="/school/academic-years">
                  Buka Tahun Ajaran
                </M3Button>
              </M3Card>
            )}

            <M3Card variant="filled" className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[10px] bg-md-secondary text-md-on-secondary">
                  <M3Icon name="meeting_room" size={20} />
                </div>
                <h4 className="font-semibold text-sm text-md-on-surface">2. Buat Rombel Kelas</h4>
              </div>
              <p className="text-xs text-md-on-surface-variant">
                Atur kelas rombel dan tetapkan wali kelas.
              </p>
              <M3Button variant="text" size="sm" href="/school/classes">
                Buka Kelas
              </M3Button>
            </M3Card>

            <M3Card variant="filled" className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[10px] bg-md-tertiary text-md-on-tertiary">
                  <M3Icon name="upload_file" size={20} />
                </div>
                <h4 className="font-semibold text-sm text-md-on-surface">3. Import Data Massal</h4>
              </div>
              <p className="text-xs text-md-on-surface-variant">
                Upload CSV siswa &amp; guru langsung dari format Dapodik/Excel.
              </p>
              <M3Button variant="text" size="sm" href="/school/import">
                Mulai Import
              </M3Button>
            </M3Card>
          </div>
        </M3Card>
        )}
      </div>
    </SchoolLayout>
  );
}
