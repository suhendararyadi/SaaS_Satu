import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function LoginPage() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <div className="mb-6 text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-md-on-surface-variant">Portal sekolah</p>
        <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.025em] text-md-on-surface">Masuk ke School OS</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-5 text-md-on-surface-variant">
          Gunakan email dan kata sandi akun yang terhubung dengan sekolah Anda.
        </p>
      </div>

      <LoginForm />

      <div className="mt-5 border-t border-md-outline-variant pt-4 text-center text-[12.5px] leading-6 text-md-on-surface-variant">
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
      </div>
    </AuthPageLayout>
  );
}
