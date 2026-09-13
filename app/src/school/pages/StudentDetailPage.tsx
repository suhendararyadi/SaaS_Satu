import React from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import {
  getSchoolInfo,
  getSchoolStudentDetail,
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
import { studentFormSections } from "../studentProfileUi";
import { getSchoolCapabilities } from "../schoolCapabilities";

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

function formatValue(key: string, value: unknown, student: any): string {
  if (key === "name") return student?.name || "Belum diisi";
  if (key === "email") return student?.email || "Belum diisi";
  if (key === "classRoomId") return student?.classRoom?.name || "Belum ada rombel";
  if (key === "gender") {
    if (value === "L") return "Laki-laki";
    if (value === "P") return "Perempuan";
  }
  if (key === "status") {
    if (value === "ACTIVE") return "Aktif";
    if (value === "SUSPENDED") return "Nonaktif / Ditangguhkan";
    if (value === "GRADUATED") return "Lulus";
  }
  if (key === "birthDate") return formatDate(value);
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
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

export function StudentDetailPage({ user }: { user: AuthUser }) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useQuery(
    getSchoolStudentDetail,
    { id },
    { enabled: !!id },
  );
  const { data: school } = useQuery(getSchoolInfo);
  const capabilities = school ? getSchoolCapabilities(school.level) : null;
  const usesDepartments = capabilities?.usesDepartments ?? false;
  const usesPkl = capabilities?.usesPkl ?? false;

  if (query.isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[380px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !query.data?.student) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data siswa tidak ditemukan"
          supportingText="Siswa mungkin sudah dihapus atau tidak termasuk unit sekolah aktif."
          actionLabel="Kembali ke Data Siswa"
          onAction={() => navigate("/school/students")}
        />
      </SchoolLayout>
    );
  }

  const { student, canManage } = query.data as any;
  const profile = student.studentProfile || {};
  const totalFields = studentFormSections.reduce(
    (count, section) => count + section.fields.length,
    0,
  );
  const filledFields = studentFormSections.reduce((count, section) => {
    return (
      count +
      section.fields.filter((field) => {
        const value =
          field.key === "name"
            ? student.name
            : field.key === "email"
              ? student.email
              : field.key === "classRoomId"
                ? student.classRoom?.id
                : profile[field.key];
        return value !== null && value !== undefined && value !== "";
      }).length
    );
  }, 0);
  const completeness = Math.round((filledFields / Math.max(totalFields, 1)) * 100);
  const activePlacement = student.studentPlacements?.find(
    (placement: any) => placement.status === "ACTIVE",
  );

  return (
    <SchoolLayout user={user}>
      <div className="mx-auto max-w-[1180px] space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <M3Button
              variant="icon"
              size="icon-sm"
              icon="arrow_back"
              aria-label="Kembali ke Data Siswa"
              onClick={() => navigate("/school/students")}
            />
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-md-primary text-lg font-semibold text-md-on-primary">
                {initials(student.name || student.username || "S")}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
                  Profil Peserta Didik
                </p>
                <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
                  {student.name || student.username}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <M3Badge variant="outline" size="sm">
                    NIPD/NIS {profile.nis || "—"}
                  </M3Badge>
                  <M3Badge variant="outline" size="sm">
                    NISN {profile.nisn || "—"}
                  </M3Badge>
                  <M3Badge
                    variant={profile.status === "ACTIVE" ? "success" : "outline"}
                    size="sm"
                  >
                    {formatValue("status", profile.status, student)}
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
              href={"/school/students/" + student.id + "/edit"}
            >
              Edit Data
            </M3Button>
          )}
        </div>

        {!canManage && (
          <M3Banner
            variant="standard"
            headline="Tampilan data terbatas"
            supportingText="Nomor identitas keluarga, rekening, dan nomor bantuan tertentu hanya ditampilkan kepada administrator sekolah."
          />
        )}

        <div className={`grid grid-cols-2 gap-3 ${usesPkl ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Kelengkapan Profil
            </p>
            <p className="mt-1 text-2xl font-semibold text-md-on-surface">
              {completeness}%
            </p>
            <p className="mt-1 text-[11px] text-md-on-surface-variant">
              {filledFields} dari {totalFields} field terisi
            </p>
          </M3Card>

          <M3Card variant="filled" className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
              Rombel
            </p>
            <p className="mt-1 text-base font-semibold text-md-on-surface">
              {student.classRoom?.name || "Belum ditentukan"}
            </p>
            {usesDepartments && (
              <p className="mt-1 text-[11px] text-md-on-surface-variant">
                {student.classRoom?.department?.name || "Program belum ditentukan"}
              </p>
            )}
          </M3Card>

          {usesPkl && (
            <M3Card variant="filled" className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
                PKL Aktif
              </p>
              <p className="mt-1 text-base font-semibold text-md-on-surface">
                {activePlacement?.company?.name || "Belum ada"}
              </p>
              <p className="mt-1 text-[11px] text-md-on-surface-variant">
                {activePlacement ? "Penempatan sedang berjalan" : "Tidak ada penempatan aktif"}
              </p>
            </M3Card>
          )}

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
          {studentFormSections.map((section) => (
            <M3Card
              key={section.id}
              variant="outlined"
              className={
                "overflow-hidden " +
                (section.id === "utama" || section.id === "alamat"
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
                      ? student.name
                      : field.key === "email"
                        ? student.email
                        : field.key === "classRoomId"
                          ? student.classRoom?.id
                          : profile[field.key];
                  const display = formatValue(field.key, rawValue, student);
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
                          "mt-1 break-words text-[13px] leading-5 " +
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

        {usesPkl && student.studentPlacements?.length > 0 && (
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-md-outline-variant/35 px-4 py-3.5">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-md-secondary-container text-md-secondary">
                <M3Icon name="apartment" size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-md-on-surface">
                  Riwayat Penempatan PKL
                </h2>
                <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">
                  Riwayat mitra industri yang terhubung dengan siswa.
                </p>
              </div>
            </div>
            <div className="divide-y divide-md-outline-variant/25">
              {student.studentPlacements.map((placement: any) => (
                <div
                  key={placement.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-md-on-surface">
                      {placement.company?.name || "Mitra DUDI"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
                      {formatDate(placement.startDate)} — {formatDate(placement.endDate)}
                    </p>
                  </div>
                  <M3Badge
                    variant={placement.status === "ACTIVE" ? "success" : "outline"}
                    size="sm"
                  >
                    {placement.status}
                  </M3Badge>
                </div>
              ))}
            </div>
          </M3Card>
        )}

        <div className="flex justify-between border-t border-md-outline-variant/35 pt-4">
          <M3Button
            variant="text"
            size="sm"
            icon="arrow_back"
            href="/school/students"
          >
            Data Siswa
          </M3Button>
          {canManage && (
            <M3Button
              variant="tonal"
              size="sm"
              icon="edit"
              href={"/school/students/" + student.id + "/edit"}
            >
              Lengkapi / Edit Profil
            </M3Button>
          )}
        </div>
      </div>
    </SchoolLayout>
  );
}
