import { type AuthUser } from "wasp/auth";
import { DefaultLayout } from "../../layout/DefaultLayout";
import { M3Button, M3Card, M3EmptyState } from "../../../client/components/m3";

export function SettingsPage({ user }: { user: AuthUser }) {
  return (
    <DefaultLayout user={user}>
      <div className="mx-auto max-w-3xl py-8">
        <M3Card variant="elevated">
          <M3EmptyState
            icon="settings"
            title="Pengaturan platform belum tersedia di halaman ini"
            description="Profil pengguna dikelola melalui halaman Akun Saya. Pengaturan unit sekolah dikelola dari portal sekolah agar perubahan tetap berada dalam konteks tenant yang benar."
            actionLabel="Buka Akun Saya"
            actionHref="/account"
            secondary={<M3Button variant="outlined" href="/school">Buka portal sekolah</M3Button>}
          />
        </M3Card>
      </div>
    </DefaultLayout>
  );
}
