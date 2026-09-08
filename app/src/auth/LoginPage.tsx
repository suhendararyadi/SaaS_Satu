import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function LoginPage() {
  useRedirectIfLoggedIn();
  return <AuthPageLayout><div className="mb-6"><p className="text-xs font-bold text-md-primary">PORTAL SEKOLAH</p><h1 className="mt-2 text-2xl font-extrabold text-md-on-surface">Masuk ke akun Anda</h1><p className="mt-2 text-sm leading-6 text-md-on-surface-variant">Gunakan email dan password akun SaaS Satu.</p></div><LoginForm /><div className="mt-5 space-y-2 border-t border-md-outline-variant/50 pt-4 text-sm text-md-on-surface-variant"><p>Belum memiliki akun? <WaspRouterLink to={routes.SignupRoute.to} className="font-bold text-md-primary hover:underline">Daftar akun</WaspRouterLink></p><p>Lupa password? <WaspRouterLink to={routes.RequestPasswordResetRoute.to} className="font-bold text-md-primary hover:underline">Atur ulang password</WaspRouterLink></p></div></AuthPageLayout>;
}
