import React from "react";
import { getCustomerPortalUrl, getMyStudentAccountProfile, useQuery } from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import type { User } from "wasp/entities";
import { SchoolLayout } from "../school/components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Card,
  M3CircularProgress,
  M3Icon,
} from "../client/components/m3";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Separator } from "../client/components/ui/separator";
import {
  PaymentPlanId,
  SubscriptionStatus,
  parsePaymentPlanId,
  prettyPaymentPlanName,
} from "../payment/plans";

function initials(name?: string | null) {
  return (name || "S")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function display(value: unknown, fallback = "Belum diisi") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatStudentDate(value: unknown) {
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

function genderLabel(value: unknown) {
  if (value === "L") return "Laki-laki";
  if (value === "P") return "Perempuan";
  return display(value);
}

function studentStatusLabel(value: unknown) {
  if (value === "ACTIVE") return "Aktif";
  if (value === "SUSPENDED") return "Nonaktif / Ditangguhkan";
  if (value === "GRADUATED") return "Lulus";
  return display(value);
}

function semesterLabel(value: unknown) {
  if (value === "GANJIL") return "Semester Ganjil";
  if (value === "GENAP") return "Semester Genap";
  return display(value, "Semester belum ditentukan");
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-md-outline-variant/60 px-4 py-3 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[11.5px] font-medium text-md-on-surface-variant">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] font-medium text-md-on-surface">{value}</dd>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-md-outline-variant px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-md-primary-container text-md-primary">
        <M3Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-md-on-surface">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11.5px] leading-4 text-md-on-surface-variant">{subtitle}</p>}
      </div>
    </div>
  );
}

function StudentAccountPage({ user }: { user: User }) {
  const profileQuery = useQuery(getMyStudentAccountProfile);

  return (
    <SchoolLayout user={user as any}>
      <div className="mx-auto max-w-[980px] space-y-4 pb-3">
        {profileQuery.isLoading ? (
          <div className="flex min-h-[55vh] items-center justify-center">
            <M3CircularProgress size={38} />
          </div>
        ) : profileQuery.error || !profileQuery.data?.student ? (
          <M3Banner
            variant="error"
            headline="Profil siswa belum dapat dimuat"
            supportingText={(profileQuery.error as any)?.message || "Data peserta didik tidak ditemukan pada unit sekolah aktif."}
          />
        ) : (
          <StudentAccountContent student={(profileQuery.data as any).student} />
        )}
      </div>
    </SchoolLayout>
  );
}

function StudentAccountContent({ student }: { student: any }) {
  const profile = student.studentProfile || {};
  const school = student.school || {};
  const classRoom = student.classRoom || {};
  const academicYear = classRoom.academicYear || {};
  const department = classRoom.department || {};
  const addressPrimary = [profile.address, profile.hamlet].filter(Boolean).join(", ");
  const addressSecondary = [
    profile.rt || profile.rw ? `RT ${profile.rt || "—"} / RW ${profile.rw || "—"}` : null,
    profile.village,
    profile.district,
    profile.postalCode ? `Kode Pos ${profile.postalCode}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <header className="flex items-center gap-3 px-1 pt-1 sm:gap-4">
        {school.logoUrl ? (
          <img src={school.logoUrl} alt="" className="size-14 shrink-0 rounded-[14px] border border-md-outline-variant bg-md-surface object-cover sm:size-16" />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-md-primary text-lg font-semibold text-md-on-primary sm:size-16 sm:text-xl">
            {initials(student.name || student.username)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-md-primary">Profil Peserta Didik</p>
          <h1 className="mt-0.5 truncate text-[21px] font-semibold tracking-[-.02em] text-md-on-surface sm:text-2xl">
            {student.name || student.username || "Peserta Didik"}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <M3Badge variant="outline" size="sm">NIS {profile.nis || "—"}</M3Badge>
            <M3Badge variant="outline" size="sm">NISN {profile.nisn || "—"}</M3Badge>
            <M3Badge variant={profile.status === "ACTIVE" ? "success" : "outline"} size="sm">
              {studentStatusLabel(profile.status)}
            </M3Badge>
          </div>
        </div>
      </header>

      <M3Banner
        variant="standard"
        headline="Data profil berasal dari database sekolah"
        supportingText="Halaman ini bersifat baca-saja. Jika ada data yang tidak sesuai, hubungi wali kelas atau administrator sekolah agar diperbaiki pada data induk siswa."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Sekolah</p>
          <p className="mt-1.5 text-[14px] font-semibold leading-5 text-md-on-surface">{display(school.name, "Sekolah belum ditentukan")}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">NPSN {school.npsn || "—"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Rombel</p>
          <p className="mt-1.5 text-[14px] font-semibold leading-5 text-md-on-surface">{display(classRoom.name, "Belum ditempatkan")}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{department.name || "Program belum ditentukan"}</p>
        </M3Card>
        <M3Card variant="filled" className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">Tahun Ajaran</p>
          <p className="mt-1.5 text-[14px] font-semibold leading-5 text-md-on-surface">{display(academicYear.yearName, "Belum ditentukan")}</p>
          <p className="mt-1 text-[11px] text-md-on-surface-variant">{semesterLabel(academicYear.semester)}</p>
        </M3Card>
      </div>

      <M3Card variant="outlined">
        <SectionHeader icon="badge" title="Identitas Siswa" subtitle="Identitas utama sesuai data induk sekolah." />
        <dl>
          <InfoRow label="Nama Lengkap" value={display(student.name)} />
          <InfoRow label="NIPD / NIS" value={display(profile.nis)} />
          <InfoRow label="NISN" value={display(profile.nisn)} />
          <InfoRow label="Jenis Kelamin" value={genderLabel(profile.gender)} />
          <InfoRow label="Tempat, Tanggal Lahir" value={`${display(profile.birthPlace)} · ${formatStudentDate(profile.birthDate)}`} />
          <InfoRow label="Agama / Kepercayaan" value={display(profile.religion)} />
          <InfoRow label="Status Siswa" value={studentStatusLabel(profile.status)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="school" title="Informasi Akademik" subtitle="Penempatan siswa pada unit sekolah aktif." />
        <dl>
          <InfoRow label="Sekolah" value={display(school.name)} />
          <InfoRow label="NPSN" value={display(school.npsn)} />
          <InfoRow label="Rombel" value={display(classRoom.name, "Belum ditempatkan")} />
          <InfoRow label="Program / Konsentrasi" value={display(department.name, "Belum ditentukan")} />
          <InfoRow label="Tahun Ajaran" value={display(academicYear.yearName, "Belum ditentukan")} />
          <InfoRow label="Semester" value={semesterLabel(academicYear.semester)} />
          <InfoRow label="Sekolah Asal" value={display(profile.previousSchool)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="home" title="Alamat & Kontak" subtitle="Data domisili dan komunikasi yang tersimpan di sekolah." />
        <dl>
          <InfoRow label="Alamat" value={<span>{display(addressPrimary)}{addressSecondary && <span className="mt-0.5 block text-[11.5px] font-normal text-md-on-surface-variant">{addressSecondary}</span>}</span>} />
          <InfoRow label="Jenis Tinggal" value={display(profile.residenceType)} />
          <InfoRow label="Transportasi" value={display(profile.transportation)} />
          <InfoRow label="Nomor HP" value={display(profile.mobilePhone)} />
          <InfoRow label="Telepon" value={display(profile.phone)} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="supervisor_account" title="Orang Tua / Wali" subtitle="Informasi dasar keluarga tanpa menampilkan nomor identitas atau data finansial." />
        <dl>
          <InfoRow label="Nama Ayah" value={display(profile.fatherName)} />
          <InfoRow label="Nama Ibu" value={display(profile.motherName)} />
          <InfoRow label="Nama Wali" value={display(profile.guardianName, "Tidak ada / belum diisi")} />
        </dl>
      </M3Card>

      <M3Card variant="outlined">
        <SectionHeader icon="key" title="Akun Login" subtitle="Identitas yang digunakan untuk masuk ke School OS." />
        <dl>
          <InfoRow label="Email Login" value={display(student.email)} />
          <InfoRow label="Username" value={display(student.username)} />
          <InfoRow label="Sumber Data" value={profile.dapodikImportedAt ? `Data sekolah · sinkron ${formatStudentDate(profile.dapodikImportedAt)}` : "Database School OS"} />
        </dl>
      </M3Card>
    </>
  );
}

export function AccountPage({ user }: { user: User }) {
  if (user.role === "STUDENT" && user.schoolId) {
    return <StudentAccountPage user={user} />;
  }

  return (
    <div className="mt-10 px-6">
      <Card className="mb-4 lg:m-8">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-semibold leading-6">
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {!!user.email && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                  <div className="text-muted-foreground text-sm font-medium">
                    Email address
                  </div>
                  <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                    {user.email}
                  </div>
                </div>
              </div>
            )}
            {!!user.username && (
              <>
                <Separator />
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                    <div className="text-muted-foreground text-sm font-medium">
                      Username
                    </div>
                    <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                      {user.username}
                    </div>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                <div className="text-muted-foreground text-sm font-medium">
                  Your Plan
                </div>
                <UserCurrentSubscriptionPlan
                  subscriptionPlan={user.subscriptionPlan}
                  subscriptionStatus={user.subscriptionStatus}
                  datePaid={user.datePaid}
                />
              </div>
            </div>
            <Separator />
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                <div className="text-muted-foreground text-sm font-medium">
                  Credits
                </div>
                <div className="text-foreground mt-1 text-sm sm:col-span-1 sm:mt-0">
                  {user.credits} credits
                </div>
                <div className="ml-auto mt-4 sm:mt-0">
                  <BuyMoreButton subscriptionStatus={user.subscriptionStatus} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                <div className="text-muted-foreground text-sm font-medium">
                  About
                </div>
                <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                  I'm a cool customer.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserCurrentSubscriptionPlan({
  subscriptionPlan,
  subscriptionStatus,
  datePaid,
}: Pick<User, "subscriptionPlan" | "subscriptionStatus" | "datePaid">) {
  let subscriptionPlanMessage = "Free Plan";
  if (
    subscriptionPlan !== null &&
    subscriptionStatus !== null &&
    datePaid !== null
  ) {
    subscriptionPlanMessage = formatSubscriptionStatusMessage(
      parsePaymentPlanId(subscriptionPlan),
      datePaid,
      subscriptionStatus as SubscriptionStatus,
    );
  }

  return (
    <>
      <div className="text-foreground mt-1 text-sm sm:col-span-1 sm:mt-0">
        {subscriptionPlanMessage}
      </div>
      <div className="ml-auto mt-4 sm:mt-0">
        <CustomerPortalButton />
      </div>
    </>
  );
}

function formatSubscriptionStatusMessage(
  subscriptionPlan: PaymentPlanId,
  datePaid: Date,
  subscriptionStatus: SubscriptionStatus,
): string {
  const paymentPlanName = prettyPaymentPlanName(subscriptionPlan);
  const statusToMessage: Record<SubscriptionStatus, string> = {
    active: `${paymentPlanName}`,
    past_due: `Payment for your ${paymentPlanName} plan is past due! Please update your subscription payment information.`,
    cancel_at_period_end: `Your ${paymentPlanName} plan subscription has been canceled, but remains active until the end of the current billing period: ${prettyPrintEndOfBillingPeriod(
      datePaid,
    )}`,
    deleted: `Your previous subscription has been canceled and is no longer active.`,
  };

  if (!statusToMessage[subscriptionStatus]) {
    throw new Error(`Invalid subscription status: ${subscriptionStatus}`);
  }

  return statusToMessage[subscriptionStatus];
}

function prettyPrintEndOfBillingPeriod(datePaid: Date) {
  const lastDayOfNextMonth = new Date(datePaid);
  lastDayOfNextMonth.setMonth(lastDayOfNextMonth.getMonth() + 2, 0);
  const clampedDayOfMonth = Math.min(
    datePaid.getDate(),
    lastDayOfNextMonth.getDate(),
  );
  const endOfBillingPeriod = new Date(datePaid);
  endOfBillingPeriod.setMonth(
    endOfBillingPeriod.getMonth() + 1,
    clampedDayOfMonth,
  );
  return endOfBillingPeriod.toLocaleDateString();
}

function CustomerPortalButton() {
  const { data: customerPortalUrl, isLoading: isCustomerPortalUrlLoading } =
    useQuery(getCustomerPortalUrl);

  if (!customerPortalUrl) {
    return null;
  }

  return (
    <a href={customerPortalUrl} target="_blank" rel="noopener noreferrer">
      <Button disabled={isCustomerPortalUrlLoading} variant="link">
        Manage Payment Details
      </Button>
    </a>
  );
}

function BuyMoreButton({
  subscriptionStatus,
}: Pick<User, "subscriptionStatus">) {
  if (
    subscriptionStatus === SubscriptionStatus.Active ||
    subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd
  ) {
    return null;
  }

  return (
    <WaspRouterLink
      to={routes.PricingPageRoute.to}
      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
    >
      <Button variant="link">Buy More Credits</Button>
    </WaspRouterLink>
  );
}
