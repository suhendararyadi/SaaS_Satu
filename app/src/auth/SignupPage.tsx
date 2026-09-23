import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function SignupPage() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <div className="mb-6 text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-md-on-surface-variant">Akun baru</p>
        <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.025em] text-md-on-surface">Buat akun School OS</h1>
        <p className="mx-auto mt-2 max-w-[330px] text-[13px] leading-5 text-md-on-surface-variant">
          Daftarkan akun, lalu lanjutkan verifikasi dan pengaturan sekolah sesuai akses yang diberikan.
        </p>
      </div>

      <SignupForm />

      <p className="mt-5 border-t border-md-outline-variant pt-4 text-center text-[12.5px] leading-6 text-md-on-surface-variant">
        Sudah memiliki akun?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-md-primary hover:underline">
          Masuk
        </WaspRouterLink>
      </p>
    </AuthPageLayout>
  );
}
