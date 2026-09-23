import { ForgotPasswordForm } from "wasp/client/auth";
import { AuthPageLayout } from "../AuthPageLayout";
export function RequestPasswordResetPage() { return <AuthPageLayout><div className="mb-6"><p className="text-xs font-bold text-md-primary">PEMULIHAN AKUN</p><h1 className="mt-2 text-2xl font-extrabold text-md-on-surface">Lupa password?</h1><p className="mt-2 text-sm leading-6 text-md-on-surface-variant">Masukkan email akun untuk menerima langkah pengaturan ulang.</p></div><ForgotPasswordForm /></AuthPageLayout>; }
