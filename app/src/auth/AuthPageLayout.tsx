import { type ReactNode } from "react";
import { Link } from "react-router";
import { M3Icon } from "../client/components/m3";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-v2 min-h-screen bg-md-background px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[.9fr_1.1fr] lg:gap-8 lg:px-8 lg:py-8">
      <section className="hidden rounded-[28px] bg-md-primary-container p-8 lg:flex lg:flex-col lg:justify-between xl:p-12" aria-label="Tentang SaaS Satu">
        <div>
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-[12px] text-md-on-primary-container focus-visible:ring-2 focus-visible:ring-md-primary"><span className="flex size-10 items-center justify-center rounded-[14px] bg-md-primary text-md-on-primary"><M3Icon name="school" size={22} /></span><span className="font-extrabold">SaaS Satu</span></Link>
          <div className="mt-16 max-w-lg"><p className="text-xs font-bold text-md-on-primary-container/75">SMART SCHOOL</p><h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-[-0.035em] text-md-on-primary-container">Masuk ke ruang kerja sekolah sesuai peran Anda.</h1><p className="mt-5 text-base leading-7 text-md-on-primary-container/80">Siswa melihat tugas dan kelasnya. Guru melihat pengajaran dan bimbingannya. Admin melihat kondisi sekolah yang perlu dikelola.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[16px] bg-white/55 p-4 text-md-on-primary-container dark:bg-black/10"><M3Icon name="menu_book" size={22} /><p className="mt-2 text-sm font-bold">Pembelajaran</p></div><div className="rounded-[16px] bg-white/55 p-4 text-md-on-primary-container dark:bg-black/10"><M3Icon name="work" size={22} /><p className="mt-2 text-sm font-bold">PKL</p></div><div className="rounded-[16px] bg-white/55 p-4 text-md-on-primary-container dark:bg-black/10"><M3Icon name="description" size={22} /><p className="mt-2 text-sm font-bold">Laporan</p></div></div>
      </section>
      <section className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center py-6 lg:min-h-0">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2.5 rounded-[12px] text-md-on-surface lg:hidden"><span className="flex size-10 items-center justify-center rounded-[14px] bg-md-primary text-md-on-primary"><M3Icon name="school" size={22} /></span><span className="font-extrabold">SaaS Satu</span></Link>
          <div className="rounded-[24px] border border-md-outline-variant/60 bg-md-surface p-5 shadow-[0_4px_18px_rgba(15,23,42,.06)] sm:p-7">{children}</div>
        </div>
      </section>
    </main>
  );
}
