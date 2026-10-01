import { useState } from "react";
import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { M3Tabs } from "../client/components/m3";
import { AuthPageLayout } from "./AuthPageLayout";
import { StudentNisnLoginForm } from "./StudentNisnLoginForm";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

type LoginMode = "EMAIL" | "NISN";
const MODE_STORAGE_KEY = "school-os-login-mode";

function readStoredMode(): LoginMode {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === "NISN" ? "NISN" : "EMAIL";
  } catch {
    return "EMAIL";
  }
}

export function LoginPage() {
  useRedirectIfLoggedIn();
  const [mode, setMode] = useState<LoginMode>(readStoredMode);

  function changeMode(next: LoginMode) {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Penyimpanan peramban dapat diblokir; pilihan tetap berlaku pada sesi halaman ini.
    }
  }

  return (
    <AuthPageLayout>
      <div className="mb-5 text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-md-on-surface-variant">Portal sekolah</p>
        <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.025em] text-md-on-surface">Masuk ke School OS</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-5 text-md-on-surface-variant">
          {mode === "EMAIL"
            ? "Gunakan email dan kata sandi akun yang terhubung dengan sekolah Anda."
            : "Siswa masuk dengan NISN dan kata sandi yang diberikan sekolah."}
        </p>
      </div>

      <div className="mb-5 flex justify-center">
        <M3Tabs
          tabs={[
            { id: "EMAIL", label: "Email" },
            { id: "NISN", label: "NISN (siswa)" },
          ]}
          activeTab={mode}
          onChange={(id) => changeMode(id as LoginMode)}
        />
      </div>

      {mode === "EMAIL" ? <LoginForm /> : <StudentNisnLoginForm />}

      <div className="mt-5 border-t border-md-outline-variant pt-4 text-center text-[12.5px] leading-6 text-md-on-surface-variant">
        {mode === "EMAIL" ? (
          <>
            <p>
              Lupa kata sandi?{" "}
              <WaspRouterLink to={routes.RequestPasswordResetRoute.to} className="font-semibold text-md-primary hover:underline">
                Atur ulang
              </WaspRouterLink>
            </p>
            <p>
              Belum memiliki akun?{" "}
              <WaspRouterLink to={routes.SignupRoute.to} className="font-semibold text-md-primary hover:underline">
                Daftar akun
              </WaspRouterLink>
            </p>
          </>
        ) : (
          <p>Lupa kata sandi atau belum bisa masuk? Hubungi wali kelas atau admin sekolah.</p>
        )}
      </div>
    </AuthPageLayout>
  );
}
