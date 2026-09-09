import { type ReactNode } from "react";
import { Link } from "react-router";
import { M3Icon } from "../client/components/m3";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-v2 min-h-screen bg-md-background px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[.85fr_1.15fr] lg:gap-0 lg:p-0">
      <section className="hig-sidebar-material hidden border-r border-md-outline-variant px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14" aria-label="Tentang SaaS Satu">
        <div>
          <Link to="/" className="inline-flex min-h-10 items-center gap-2.5 rounded-[9px] text-md-on-surface focus-visible:ring-2 focus-visible:ring-md-primary/50">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-md-primary text-md-on-primary"><M3Icon name="school" size={18} /></span>
            <span className="text-[14px] font-semibold">SaaS Satu</span>
          </Link>
          <div className="mt-24 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-md-on-surface-variant">SMART SCHOOL</p>
            <h1 className="mt-2 text-[34px] font-bold leading-[1.12] tracking-[-0.035em] text-md-on-surface">Ruang kerja sekolah yang terasa familiar sejak pertama dibuka.</h1>
            <p className="mt-4 text-[14px] leading-6 text-md-on-surface-variant">Akses menyesuaikan peran: siswa fokus belajar, guru fokus mengajar, dan admin fokus mengelola sekolah.</p>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-md-on-surface-variant">SaaS Satu Smart School · SMP, SMA, dan SMK</p>
      </section>
      <section className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center py-6 lg:min-h-screen lg:bg-md-surface-container-low lg:px-10">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2.5 rounded-[9px] text-md-on-surface lg:hidden"><span className="flex size-9 items-center justify-center rounded-[9px] bg-md-primary text-md-on-primary"><M3Icon name="school" size={19} /></span><span className="font-semibold">SaaS Satu</span></Link>
          <div className="rounded-[16px] border border-md-outline-variant bg-md-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,.05)] sm:p-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
