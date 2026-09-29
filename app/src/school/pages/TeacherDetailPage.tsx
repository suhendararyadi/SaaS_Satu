import React from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  getSchoolTeacherDetail,
  provisionTeacherLogin,
  resetTeacherLoginPassword,
  revokeTeacherLogin,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Icon,
} from "../../client/components/m3";
import { teacherProfileSections } from "../teacherProfileUi";
import {
  WAKASEK_ROLE_META,
  type WakasekRoleCode,
} from "../wakasek";
import {
  STAFF_ASSIGNMENT_META,
  staffAssignmentDisplayTitle,
  type StaffAssignmentRoleCode,
} from "../staffAssignments";

function formatDate(value: unknown): string {
  if (!value) return "Belum diisi";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatValue(key: string, value: unknown, teacher: any): string {
  if (key === "name") return teacher?.name || "Belum diisi";
  if (key === "email") return teacher?.email || "Belum diisi";
  if (key === "role") return teacher?.role || "Belum diisi";
  if (key === "phone") return teacher?.teacherProfile?.phone || "Belum diisi";
  if (key === "gender") {
    if (value === "L") return "Laki-laki";
    if (value === "P") return "Perempuan";
  }
  if (key === "birthDate" || key === "workStartDate") return formatDate(value);
  if (value === null || value === undefined || value === "") return "Belum diisi";
  return String(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TeacherDetailPage({ user }: { user: AuthUser }) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useQuery(
    getSchoolTeacherDetail,
    { id },
    { enabled: !!id },
  );
  const [loginBusy, setLoginBusy] = React.useState(false);
  const [loginError, setLoginError] = React.useState("");
  const [temporaryLogin, setTemporaryLogin] = React.useState<{
    loginEmail: string;
    temporaryPassword: string;
  } | null>(null);

  if (query.isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[380px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !query.data?.teacher) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data Guru & Tendik tidak ditemukan"
          supportingText="PTK mungkin sudah dihapus atau tidak termasuk unit sekolah aktif."
          actionLabel="Kembali ke Guru & Tendik"
          onAction={() => navigate("/school/teachers")}
        />
      </SchoolLayout>
    );
  }

  const { teacher, canManage, profileStats, hasLogin, loginEmail } = query.data as any;
  const profile = teacher.teacherProfile || {};
  const activeHomerooms = (teacher.homeroomClasses || []).filter(
    (room: any) => room.academicYear?.isActive,
  );
  const assignments = teacher.staffAssignments || [];
  const wakasekAssignments = teacher.wakasekAssignments || [];

  const provisionLogin = async () => {
    if (!window.confirm("Buat akun login sementara untuk Guru/GTK ini? Password hanya ditampilkan sekali.")) {
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      const result: any = await provisionTeacherLogin({
        teacherId: teacher.id,
        confirm: "PROVISION_TEACHER_TEMPORARY_LOGIN",
      });
      setTemporaryLogin({
        loginEmail: result.loginEmail,
        temporaryPassword: result.temporaryPassword,
      });
      await query.refetch();
    } catch (error: any) {
      setLoginError(error?.message || "Akun login Guru/GTK belum dapat dibuat.");
    } finally {
      setLoginBusy(false);
    }
  };

  const resetLogin = async () => {
    if (!window.confirm("Reset password akun Guru/GTK ini? Semua sesi login aktif akan diputus dan password baru hanya ditampilkan sekali.")) {
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      const result: any = await resetTeacherLoginPassword({
        teacherId: teacher.id,
        confirm: "RESET_TEACHER_TEMPORARY_PASSWORD",
      });
      setTemporaryLogin({
        loginEmail: result.loginEmail,
        temporaryPassword: result.temporaryPassword,
      });
      await query.refetch();
    } catch (error: any) {
      setLoginError(error?.message || "Password Guru/GTK belum dapat direset.");
    } finally {
      setLoginBusy(false);
    }
  };

  const revokeLogin = async () => {
    if (!window.confirm("Cabut akun login Guru/GTK ini? Profil, penugasan, LMS, presensi, dan data PKL tidak akan dihapus.")) {
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      await revokeTeacherLogin({
        teacherId: teacher.id,
        confirm: "REVOKE_TEACHER_LOGIN",
      });
      setTemporaryLogin(null);
      await query.refetch();
    } catch (error: any) {
      setLoginError(error?.message || "Akun login Guru/GTK belum dapat dicabut.");
    } finally {
      setLoginBusy(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="mx-auto max-w-[1180px] space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <M3Button
              variant="icon"
              size="icon-sm"
              icon="arrow_back"
              aria-label="Kembali ke Guru & Tendik"
              onClick={() => navigate("/school/teachers")}
            />
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-md-primary text-lg font-semibold text-md-on-primary">
                {initials(teacher.name || teacher.username || "PTK")}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
                  Profil Guru & Tenaga Kependidikan
                </p>
                <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
                  {teacher.name || teacher.username}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <M3Badge variant="outline" size="sm">
                    NIP {profile.nip || "—"}
                  </M3Badge>
                  <M3Badge variant="outline" size="sm">
                    {profile.ptkType || "Jenis PTK belum diisi"}
                  </M3Badge>
                  <M3Badge variant="secondary" size="sm">
                    {profile.jobTitle || teacher.role}
                  </M3Badge>
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <M3Button
              variant="filled"
              size="md"
              icon="edit"
              href={"/school/teachers/" + teacher.id + "/edit"}
            >
              Edit Data
            </M3Button>
          )}
        </div>

        {searchParams.get("saved") === "1" && (
          <M3Banner
            variant="success"
            headline="Data PTK berhasil diperbarui"
            supportingText="Perubahan profil telah tersimpan. Penugasan struktur sekolah tidak berubah."
            dismissible
            onDismiss={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("saved");
              setSearchParams(next, { replace: true });
            }}
          />
        )}

        {canManage && loginError && (
          <M3Banner
            variant="error"
            headline="Akun login belum dapat diproses"
            supportingText={loginError}
          />
        )}

        {canManage && temporaryLogin && (
          <M3Banner
            variant="success"
            headline="Kredensial sementara Guru/GTK berhasil dibuat"
            supportingText={
              "Salin sekarang. Email: " +
              temporaryLogin.loginEmail +
              " · Password sementara: " +
              temporaryLogin.temporaryPassword
            }
          />
        )}

        {canManage && (
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-md-primary-container text-md-primary">
                  <M3Icon name="key" size={19} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-md-on-surface">Akun Login</h2>
                    <M3Badge variant={hasLogin ? "success" : "outline"} size="sm">
                      {hasLogin ? "Aktif" : "Belum dibuat"}
                    </M3Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-md-on-surface-variant">
                    {hasLogin
                      ? "Identitas login: " + (loginEmail || "provider non-email")
                      : "Guru/GTK belum memiliki identitas Auth School OS."}
                  </p>
                  {hasLogin && !temporaryLogin && (
                    <p className="mt-1 text-[11px] text-md-on-surface-variant">
                      Password tidak dapat ditampilkan kembali. Gunakan reset untuk membuat password sementara baru.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!hasLogin ? (
                  <M3Button
                    variant="tonal"
                    size="sm"
                    icon="key"
                    isLoading={loginBusy}
                    onClick={provisionLogin}
                  >
                    Buat Akun Login
                  </M3Button>
                ) : (
                  <>
                    <M3Button
                      variant="tonal"
                      size="sm"
                      icon="password"
                      isLoading={loginBusy}
                      onClick={resetLogin}
                    >
                      Reset Password
                    </M3Button>
                    <M3Button
                      variant="outlined"
                      size="sm"
                      icon="key_off"
                      disabled={loginBusy}
                      onClick={revokeLogin}
                    >
                      Cabut Akun Login
                    </M3Button>
                  </>
                )}
              </div>
            </div>
          </M3Card>
        )}

        {!canManage && (
          <M3Banner
            variant="standard"
            headline="Tampilan data terbatas"
            supportingText="NUPTK, NIK, serta tempat dan tanggal lahir hanya ditampilkan kepada administrator sekolah."
          />
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Kelengkapan Profil
            </p>
            <p className="mt-1 text-2xl font-semibold text-md-on-surface">
              {profileStats?.completeness ?? 0}%
            </p>
            <p className="mt-1 text-[11px] text-md-on-surface-variant">
              {profileStats?.filledFields ?? 0} dari {profileStats?.totalFields ?? 0} field terisi
            </p>
          </M3Card>

          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Status Kepegawaian
            </p>
            <p className="mt-1 text-base font-semibold text-md-on-surface">
              {profile.employmentStatus || "Belum diisi"}
            </p>
            <p className="mt-1 text-[11px] text-md-on-surface-variant">
              {profile.ptkType || "Jenis PTK belum diisi"}
            </p>
          </M3Card>

          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Wali Kelas Aktif
            </p>
            <p className="mt-1 text-base font-semibold text-md-on-surface">
              {activeHomerooms.length ? activeHomerooms.map((r: any) => r.name).join(", ") : "Tidak ada"}
            </p>
            <p className="mt-1 text-[11px] text-md-on-surface-variant">
              {activeHomerooms.length ? activeHomerooms.length + " rombel aktif" : "Tidak sedang menjadi wali kelas"}
            </p>
          </M3Card>

          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Sinkron Dapodik
            </p>
            <p className="mt-1 text-base font-semibold text-md-on-surface">
              {profile.dapodikImportedAt ? "Pernah diimpor" : "Belum pernah"}
            </p>
            <p className="mt-1 text-[11px] text-md-on-surface-variant">
              {profile.dapodikImportedAt
                ? formatDate(profile.dapodikImportedAt)
                : "Data manual / data lama"}
            </p>
          </M3Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {teacherProfileSections.map((section) => (
            <M3Card
              key={section.id}
              variant="outlined"
              className={
                "overflow-hidden " +
                (section.id === "utama" || section.id === "beban-kerja"
                  ? "lg:col-span-2"
                  : "")
              }
            >
              <div className="flex items-start gap-3 border-b border-md-outline-variant/35 px-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-primary-container text-md-primary">
                  <M3Icon name={section.icon} size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-md-on-surface">
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">
                    {section.description}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const rawValue =
                    field.key === "name"
                      ? teacher.name
                      : field.key === "email"
                        ? teacher.email
                        : field.key === "role"
                          ? teacher.role
                          : field.key === "phone"
                            ? profile.phone
                            : profile[field.key];
                  const display = formatValue(field.key, rawValue, teacher);
                  const empty =
                    rawValue === null ||
                    rawValue === undefined ||
                    rawValue === "";

                  return (
                    <div
                      key={field.key}
                      className={
                        "border-b border-md-outline-variant/25 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 " +
                        (field.span === 2 ? "sm:col-span-2" : "")
                      }
                    >
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[.055em] text-md-on-surface-variant">
                        {field.label}
                      </dt>
                      <dd
                        className={
                          "mt-1 whitespace-pre-line break-words text-[13px] leading-5 " +
                          (empty
                            ? "italic text-md-on-surface-variant"
                            : "font-medium text-md-on-surface")
                        }
                      >
                        {display}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </M3Card>
          ))}
        </div>

        <M3Card variant="outlined" className="overflow-hidden">
          <div className="flex items-start gap-3 border-b border-md-outline-variant/35 px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-secondary-container text-md-secondary">
              <M3Icon name="account_tree" size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-md-on-surface">
                Penugasan & Struktur Sekolah
              </h2>
              <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">
                Wali kelas, Wakasek, kepala program, dan penugasan organisasi School OS yang aktif.
              </p>
            </div>
          </div>

          {!activeHomerooms.length && !wakasekAssignments.length && !assignments.length ? (
            <div className="px-4 py-8 text-center text-[12px] text-md-on-surface-variant">
              Belum ada penugasan aktif pada profil ini.
            </div>
          ) : (
            <div className="divide-y divide-md-outline-variant/25">
              {wakasekAssignments.map((assignment: any) => {
                const role = assignment.role as WakasekRoleCode;
                return (
                  <div key={"waka-" + assignment.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-md-primary-container text-md-primary">
                      <M3Icon name={WAKASEK_ROLE_META[role].icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-md-on-surface">
                        {WAKASEK_ROLE_META[role].label}
                      </p>
                      <p className="text-[11px] text-md-on-surface-variant">
                        Penugasan Wakil Kepala Sekolah
                      </p>
                    </div>
                    <M3Badge variant="tertiary" size="sm">Wakasek</M3Badge>
                  </div>
                );
              })}

              {activeHomerooms.map((room: any) => (
                <div key={"homeroom-" + room.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-md-primary-container text-md-primary">
                    <M3Icon name="groups" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-md-on-surface">
                      Wali Kelas {room.name}
                    </p>
                    <p className="text-[11px] text-md-on-surface-variant">
                      {room.department?.name || "Program belum ditentukan"} · {room.academicYear?.yearName || "Tahun ajaran aktif"}
                    </p>
                  </div>
                  <M3Badge variant="primary" size="sm">Wali Kelas</M3Badge>
                </div>
              ))}

              {assignments.map((assignment: any) => {
                const role = assignment.role as StaffAssignmentRoleCode;
                return (
                  <div key={"staff-" + assignment.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-md-surface-container-high text-md-on-surface-variant">
                      <M3Icon name={STAFF_ASSIGNMENT_META[role].icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-md-on-surface">
                        {staffAssignmentDisplayTitle({
                          role,
                          unitName: assignment.unitName,
                          customTitle: assignment.customTitle,
                          department: assignment.department,
                        })}
                      </p>
                      <p className="text-[11px] text-md-on-surface-variant">
                        {assignment.department?.name ||
                          assignment.unitName ||
                          assignment.academicYear?.yearName ||
                          "Penugasan sekolah"}
                      </p>
                    </div>
                    <M3Badge variant="secondary" size="sm">Aktif</M3Badge>
                  </div>
                );
              })}
            </div>
          )}
        </M3Card>

        <div className="flex justify-between border-t border-md-outline-variant/35 pt-4">
          <M3Button
            variant="text"
            size="sm"
            icon="arrow_back"
            href="/school/teachers"
          >
            Guru & Tendik
          </M3Button>
          {canManage && (
            <M3Button
              variant="tonal"
              size="sm"
              icon="edit"
              href={"/school/teachers/" + teacher.id + "/edit"}
            >
              Edit Data Dasar
            </M3Button>
          )}
        </div>
      </div>
    </SchoolLayout>
  );
}
