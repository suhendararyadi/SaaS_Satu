import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function SignupPage() {
  useRedirectIfLoggedIn();
  return <AuthPageLayout><div className="mb-6"><p className="text-xs font-bold text-md-primary">AKUN BARU</p><h1 className="mt-2 text-2xl font-extrabold text-md-on-surface">Buat akun SaaS Satu</h1><p className="mt-2 text-sm leading-6 text-md-on-surface-variant">Setelah mendaftar, akun akan mengikuti proses verifikasi dan pengaturan sekolah.</p></div><SignupForm /><p className="mt-5 border-t border-md-outline-variant/50 pt-4 text-sm text-md-on-surface-variant">Sudah memiliki akun? <WaspRouterLink to={routes.LoginRoute.to} className="font-bold text-md-primary hover:underline">Masuk</WaspRouterLink></p></AuthPageLayout>;
}
