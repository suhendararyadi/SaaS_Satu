import { type AuthUser } from "wasp/auth";
import { getPlatformStatus, useQuery } from "wasp/client/operations";
import { DefaultLayout } from "../../layout/DefaultLayout";
import {
  M3Button,
  M3Card,
  M3Chip,
  M3EmptyState,
  M3Icon,
  M3PageHeader,
  M3Text,
} from "../../../client/components/m3";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <M3Chip
      clickable={false}
      icon={active ? "check_circle" : "cancel"}
      variant="assist"
    >
      {active ? "Aktif" : "Nonaktif"}
    </M3Chip>
  );
}

function ServiceRow({
  icon,
  title,
  active,
  stateText,
  note,
}: {
  icon: string;
  title: string;
  active: boolean;
  stateText: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="bg-md-surface-container-high flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <M3Icon name={icon} size={22} weight={300} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <M3Text variant="title-medium">{title}</M3Text>
          <StatusBadge active={active} />
        </div>
        <M3Text variant="body-medium" color="on-surface-variant" className="mt-1">
          {stateText}
        </M3Text>
        <M3Text
          variant="body-small"
          color="on-surface-variant"
          className="mt-1 opacity-80"
        >
          {note}
        </M3Text>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <M3Card variant="outlined" className="flex flex-col gap-3 p-5">
      <div className="bg-md-surface-container-high flex h-10 w-10 items-center justify-center rounded-full">
        <M3Icon name={icon} size={20} weight={300} />
      </div>
      <M3Text variant="title-medium">{title}</M3Text>
      <M3Text variant="body-medium" color="on-surface-variant" className="flex-1">
        {description}
      </M3Text>
      <div>
        <M3Button variant="text" href={actionHref}>
          {actionLabel}
        </M3Button>
      </div>
    </M3Card>
  );
}

export function SettingsPage({ user }: { user: AuthUser }) {
  const { data: status, isLoading, error } = useQuery(getPlatformStatus);

  if (error) {
    return (
      <DefaultLayout user={user}>
        <div className="mx-auto max-w-2xl py-10">
          <M3EmptyState
            icon="cloud_off"
            title="Status platform belum dapat dimuat"
            description="Data tidak diubah. Coba muat ulang halaman setelah koneksi kembali stabil."
            actionLabel="Muat ulang"
            onAction={() => window.location.reload()}
          />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="mx-auto max-w-3xl space-y-6 py-2">
        <M3PageHeader
          title="Pengaturan Platform"
          description="Konfigurasi level platform untuk Super Admin. Pengaturan akun pribadi dan pengaturan tiap sekolah dikelola di tempatnya masing-masing."
        />

        <M3Card variant="elevated" className="p-5 sm:p-6">
          <M3Text variant="title-large">Status Layanan</M3Text>
          <M3Text
            variant="body-medium"
            color="on-surface-variant"
            className="mb-2 mt-1"
          >
            Kondisi konfigurasi deployment saat ini. Perubahan nilai dilakukan
            melalui environment deployment, bukan dari halaman ini.
          </M3Text>
          {isLoading ? (
            <div className="space-y-3 py-4" aria-live="polite" aria-busy="true">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="bg-md-surface-container-low h-20 animate-pulse rounded-[14px]"
                />
              ))}
            </div>
          ) : status ? (
            <div className="divide-md-outline-variant divide-y">
              <ServiceRow
                icon="payments"
                title="Pembayaran online"
                active={status.paymentsEnabled}
                stateText={
                  status.paymentsEnabled
                    ? "Pembayaran online aktif pada deployment ini."
                    : "Pembayaran online nonaktif."
                }
                note="Sengaja dinonaktifkan. Pengaktifan membutuhkan keputusan produk terlebih dahulu."
              />
              <ServiceRow
                icon="cloud_upload"
                title="Penyimpanan file"
                active={status.fileUploadsEnabled}
                stateText={
                  status.fileUploadsEnabled
                    ? "Penyimpanan file object storage aktif."
                    : "Penyimpanan file object storage nonaktif."
                }
                note="Media website sekolah dan bukti kegiatan memakai private object storage (Garage, S3-compatible)."
              />
            </div>
          ) : null}
        </M3Card>

        <div>
          <M3Text variant="title-large" className="mb-3">
            Konteks Pengaturan
          </M3Text>
          <div className="grid gap-4 sm:grid-cols-3">
            <ContextCard
              icon="person"
              title="Akun saya"
              description="Profil, kata sandi, dan preferensi akun pribadi Anda."
              actionLabel="Buka Akun Saya"
              actionHref="/account"
            />
            <ContextCard
              icon="school"
              title="Sekolah"
              description="Pengaturan tiap unit sekolah dikelola dari portal sekolah agar perubahan tetap dalam konteks tenant yang benar."
              actionLabel="Buka portal sekolah"
              actionHref="/school"
            />
            <ContextCard
              icon="admin_panel_settings"
              title="Halaman ini"
              description="Status konfigurasi level platform. Hanya dapat dilihat oleh Super Admin."
              actionLabel="Kembali ke ringkasan"
              actionHref="/admin"
            />
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
