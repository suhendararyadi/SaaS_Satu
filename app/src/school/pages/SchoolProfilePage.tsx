import React from "react";
import type { User } from "wasp/entities";
import {
  getMyStudentAccountProfile,
  getSchoolTeacherDetail,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Card,
  M3CircularProgress,
  M3Icon,
} from "../../client/components/m3";
import { canManageSaasAccount } from "../../user/profileRouting";

function initials(name?: string | null) {
  return (name || "A")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function display(value: unknown, fallback = "Belum diisi") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "Belum diisi";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function roleLabel(role: string | null | undefined) {
  const labels: Record<string, string> = {
    SUPERADMIN: "Super Admin",
    SCHOOL_ADMIN: "Administrator Sekolah",
    TEACHER: "Guru / Tenaga Kependidikan",
    STUDENT: "Peserta Didik",
    DUDI_MENTOR: "Pembimbing DUDI",
  };
  return labels[String(role || "")] || display(role, "Pengguna Sekolah");
}

function genderLabel(value: unknown) {
  if (value === "L") return "Laki-laki";
  if (value === "P") return "Perempuan";
  return display(value);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-md-outline-variant/50 px-4 py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[11.5px] font-medium text-md-on-surface-variant">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] font-medium text-md-on-surface">{value}</dd>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-md-outline-variant/40 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-primary-container text-md-primary">
        <M3Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-md-on-surface">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ProfileHeader({
  user,
  eyebrow,
  badges,
}: {
  user: Pick<User, "name" | "username" | "email" | "role">;
  eyebrow: string;
  badges?: React.ReactNode;
}) {
  const name = user.name || user.username || user.email || "Pengguna School OS";
  return (
    <header className="flex items-center gap-3 px-1 pt-1 sm:gap-4">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-md-primary text-lg font-semibold text-md-on-primary sm:size-16 sm:text-xl">
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-md-primary">{eyebrow}</p>
        <h1 className="mt-0.5 truncate text-[21px] font-semibold tracking-[-.02em] text-md-on-surface sm:text-2xl">
          {name}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <M3Badge variant="secondary" size="sm">{roleLabel(user.role)}</M3Badge>
          {badges}
        </div>
      </div>
    </header>
  );
}

function StudentProfile({ user }: { user: User }) {
  const query = useQuery(getMyStudentAccountProfile);

  if (query.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><M3CircularProgress size={38} /></div>;
  }

  if (query.error || !query.data?.student) {
    return (
      <M3Banner
        variant="error"
        headline="Profil siswa belum dapat dimuat"
        supportingText={(query.error as any)?.message || "Data peserta didik tidak ditemukan."}
      />
    );
  }

  const student: any = query.data.student;
  const profile = student.studentProfile || {};
  const school = student.school || {};
  const classRoom = student.classRoom || {};
  const academicYear = classRoom.academicYear || {};
  const department = classRoom.department || {};
  const address = [
    profile.address,
    profile.hamlet,
    profile.village,
    profile.district,
    profile.postalCode ? "Kode Pos " + profile.postalCode : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <ProfileHeader
        user={student}
        eyebrow="Profil Saya"
        badges={
          <>
            <M3Badge variant="outline" size="sm">NIS {profile.nis || "—"}</M3Badge>
            <M3Badge variant="outline" size="sm">{classRoom.name || "Belum ada rombel"}</M3Badge>
          </>
        }
      />
      <M3Banner
        variant="standard"
        headline="Data sekolah bersifat baca-saja"
        supportingText="Jika ada data yang tidak sesuai, hubungi wali kelas atau administrator sekolah agar diperbaiki pada data induk."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Sekolah</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{display(school.name)}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">NPSN {school.npsn || "—"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Rombel</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{display(classRoom.name)}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{department.name || "Program belum ditentukan"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Tahun Ajaran</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{display(academicYear.yearName)}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{display(academicYear.semester)}</p>
        </M3Card>
      </div>

      <M3Card variant="outlined">
        <SectionHeader icon="badge" title="Identitas" subtitle="Identitas utama sesuai data induk sekolah." />
        <dl>
          <InfoRow label="Nama Lengkap" value={display(student.name)} />
          <InfoRow label="NIS / NIPD" value={display(profile.nis)} />
          <InfoRow label="NISN" value={display(profile.nisn)} />
          <InfoRow label="Jenis Kelamin" value={genderLabel(profile.gender)} />
          <InfoRow label="Tempat, Tanggal Lahir" value={display(profile.birthPlace) + " · " + formatDate(profile.birthDate)} />
          <InfoRow label="Status" value={display(profile.status)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="school" title="Akademik" subtitle="Penempatan pada unit sekolah aktif." />
        <dl>
          <InfoRow label="Rombel" value={display(classRoom.name)} />
          <InfoRow label="Program / Konsentrasi" value={display(department.name)} />
          <InfoRow label="Tahun Ajaran" value={display(academicYear.yearName)} />
          <InfoRow label="Semester" value={display(academicYear.semester)} />
          <InfoRow label="Sekolah Asal" value={display(profile.previousSchool)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="home" title="Kontak & Domisili" subtitle="Data komunikasi yang tersimpan di sekolah." />
        <dl>
          <InfoRow label="Alamat" value={display(address)} />
          <InfoRow label="Nomor HP" value={display(profile.mobilePhone)} />
          <InfoRow label="Telepon" value={display(profile.phone)} />
        </dl>
      </M3Card>

      <SecuritySection user={user} />
    </div>
  );
}

function TeacherProfile({ user }: { user: User }) {
  const query = useQuery(getSchoolTeacherDetail, { id: user.id });

  if (query.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><M3CircularProgress size={38} /></div>;
  }

  if (query.error || !query.data?.teacher) {
    return (
      <M3Banner
        variant="error"
        headline="Profil Guru/GTK belum dapat dimuat"
        supportingText={(query.error as any)?.message || "Data Guru/GTK tidak ditemukan pada unit sekolah aktif."}
      />
    );
  }

  const data: any = query.data;
  const teacher = data.teacher;
  const profile = teacher.teacherProfile || {};
  const homerooms = (teacher.homeroomClasses || []).filter((item: any) => item.academicYear?.isActive);
  const assignments = teacher.staffAssignments || [];
  const wakasek = teacher.wakasekAssignments || [];

  return (
    <div className="space-y-4">
      <ProfileHeader
        user={teacher}
        eyebrow="Profil Saya"
        badges={
          <>
            <M3Badge variant="outline" size="sm">NIP {profile.nip || "—"}</M3Badge>
            <M3Badge variant="outline" size="sm">{profile.ptkType || "Jenis PTK belum diisi"}</M3Badge>
          </>
        }
      />

      <M3Banner
        variant="standard"
        headline="Profil kepegawaian dikelola oleh sekolah"
        supportingText="Data resmi seperti NIP, status kepegawaian, jenis PTK, beban kerja, dan penugasan bersifat baca-saja. Hubungi administrator sekolah jika perlu koreksi."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Status Kepegawaian</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{display(profile.employmentStatus)}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{profile.ptkType || "Jenis PTK belum diisi"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Wali Kelas</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{homerooms.length ? homerooms.map((x: any) => x.name).join(", ") : "Tidak ada"}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{homerooms.length ? homerooms.length + " rombel aktif" : "Tidak sedang menjadi wali kelas"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Beban Mengajar</p>
          <p className="mt-1.5 text-[14px] font-semibold text-md-on-surface">{profile.teachingHours ?? "—"} JP</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">Total {profile.totalTeachingHours ?? "—"} JP</p>
        </M3Card>
      </div>

      <M3Card variant="outlined">
        <SectionHeader icon="badge" title="Identitas & Kepegawaian" subtitle="Ringkasan data PTK yang tersimpan di School OS." />
        <dl>
          <InfoRow label="Nama Lengkap" value={display(teacher.name)} />
          <InfoRow label="NIP" value={display(profile.nip)} />
          <InfoRow label="Jenis PTK" value={display(profile.ptkType)} />
          <InfoRow label="Status Kepegawaian" value={display(profile.employmentStatus)} />
          <InfoRow label="Jabatan" value={display(profile.jobTitle)} />
          <InfoRow label="Pendidikan" value={[profile.educationLevel, profile.educationMajor].filter(Boolean).join(" · ") || "Belum diisi"} />
          <InfoRow label="Sertifikasi" value={display(profile.certification)} />
          <InfoRow label="Mulai Bertugas" value={formatDate(profile.workStartDate)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="menu_book" title="Pembelajaran & Beban Kerja" subtitle="Informasi akademik dan beban kerja yang tercatat." />
        <dl>
          <InfoRow label="Mata Pelajaran" value={display(profile.subjectsTaught)} />
          <InfoRow label="Kompetensi" value={display(profile.competencies)} />
          <InfoRow label="Jam Mengajar" value={profile.teachingHours != null ? profile.teachingHours + " JP" : "Belum diisi"} />
          <InfoRow label="Total Jam" value={profile.totalTeachingHours != null ? profile.totalTeachingHours + " JP" : "Belum diisi"} />
          <InfoRow label="Beban Siswa" value={display(profile.studentLoad)} />
          <InfoRow label="Tugas Tambahan" value={display(profile.additionalDuties)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="assignment_ind" title="Penugasan Aktif" subtitle="Wali kelas, Wakasek, Guru Piket, Kaprog, pembimbing PKL, atau tugas struktural lain." />
        <div className="space-y-2 p-4">
          {!homerooms.length && !assignments.length && !wakasek.length ? (
            <p className="text-[12.5px] text-md-on-surface-variant">Belum ada penugasan aktif yang tercatat.</p>
          ) : (
            <>
              {homerooms.map((item: any) => (
                <div key={"homeroom-" + item.id} className="flex items-start justify-between gap-3 rounded-[12px] bg-md-surface-container-low px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-semibold text-md-on-surface">Wali Kelas · {item.name}</p>
                    <p className="mt-0.5 text-[11px] text-md-on-surface-variant">{item.department?.name || "Tanpa program"} · {item.academicYear?.yearName || "Tahun ajaran aktif"}</p>
                  </div>
                  <M3Badge variant="success" size="sm">Aktif</M3Badge>
                </div>
              ))}
              {wakasek.map((item: any) => (
                <div key={"waka-" + item.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-md-surface-container-low px-3 py-2.5">
                  <p className="text-[12.5px] font-semibold text-md-on-surface">Wakasek · {item.role}</p>
                  <M3Badge variant="secondary" size="sm">Aktif</M3Badge>
                </div>
              ))}
              {assignments.map((item: any) => (
                <div key={"staff-" + item.id} className="flex items-start justify-between gap-3 rounded-[12px] bg-md-surface-container-low px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-semibold text-md-on-surface">{item.customTitle || item.role}</p>
                    <p className="mt-0.5 text-[11px] text-md-on-surface-variant">{item.unitName || item.department?.name || "Penugasan sekolah"}</p>
                  </div>
                  <M3Badge variant="outline" size="sm">Aktif</M3Badge>
                </div>
              ))}
            </>
          )}
        </div>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="call" title="Kontak" subtitle="Kontak kerja yang tersimpan pada data PTK." />
        <dl>
          <InfoRow label="Email" value={display(teacher.email)} />
          <InfoRow label="Nomor HP" value={display(profile.phone)} />
        </dl>
      </M3Card>

      <SecuritySection user={user} />
    </div>
  );
}

function SecuritySection({ user }: { user: User }) {
  return (
    <M3Card variant="outlined">
      <SectionHeader icon="shield" title="Keamanan Akun" subtitle="Informasi login School OS. Tidak ada informasi paket atau billing SaaS di profil sekolah." />
      <dl>
        <InfoRow label="Email Login" value={display(user.email)} />
        <InfoRow label="Username" value={display(user.username)} />
        <InfoRow label="Peran Utama" value={roleLabel(user.role)} />
        <InfoRow label="Pengelolaan Kredensial" value="Password dan identitas login dikelola melalui mekanisme keamanan School OS. Hubungi administrator sekolah jika perlu reset akses." />
      </dl>
    </M3Card>
  );
}

function GenericSchoolProfile({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <ProfileHeader user={user} eyebrow="Profil Saya" />
      <M3Banner
        variant="standard"
        headline="Profil pengguna sekolah"
        supportingText="Halaman ini hanya menampilkan identitas operasional School OS. Informasi langganan SaaS tidak ditampilkan untuk pengguna sekolah."
      />
      <M3Card variant="outlined">
        <SectionHeader icon="person" title="Identitas Akun" subtitle="Identitas dasar yang digunakan pada unit sekolah aktif." />
        <dl>
          <InfoRow label="Nama" value={display(user.name)} />
          <InfoRow label="Email" value={display(user.email)} />
          <InfoRow label="Username" value={display(user.username)} />
          <InfoRow label="Peran" value={roleLabel(user.role)} />
        </dl>
      </M3Card>
      <SecuritySection user={user} />
      {canManageSaasAccount(user) && (
        <M3Banner
          variant="standard"
          headline="Anda juga memiliki akses pengelolaan SaaS"
          supportingText="Informasi paket dan langganan tetap tersedia di halaman Akun & Langganan."
          secondaryActionLabel="Buka Akun & Langganan"
          secondaryActionHref="/account"
        />
      )}
    </div>
  );
}

export function SchoolProfilePage({ user }: { user: User }) {
  return (
    <SchoolLayout user={user as any}>
      <div className="mx-auto max-w-[980px] space-y-4 pb-4">
        {user.role === "STUDENT" ? (
          <StudentProfile user={user} />
        ) : user.role === "TEACHER" ? (
          <TeacherProfile user={user} />
        ) : (
          <GenericSchoolProfile user={user} />
        )}
      </div>
    </SchoolLayout>
  );
}
