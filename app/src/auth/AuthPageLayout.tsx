import { type ReactNode } from "react";
import { Link } from "react-router";
import { M3Icon } from "../client/components/m3";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-v2 min-h-screen bg-[#F5F5F7] text-md-on-background dark:bg-[#000000]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-5 py-5 sm:px-8 sm:py-6">
        <header className="flex min-h-10 items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2.5 rounded-[10px] text-md-on-surface transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40"
            aria-label="Kembali ke beranda SaaS Satu"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[#DDF3F5] text-[#287C83] shadow-[inset_0_0_0_1px_rgba(0,0,0,.035)] dark:bg-[#173C40] dark:text-[#6CD6DE]">
              <M3Icon name="school" size={20} weight={300} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13.5px] font-semibold tracking-[-0.01em]">School OS</span>
              <span className="text-[10.5px] text-md-on-surface-variant">SaaS Satu</span>
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-medium text-md-primary transition-colors hover:bg-black/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40 dark:hover:bg-white/[.06]"
          >
            Beranda
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-5 flex justify-center">
              <span className="flex size-16 items-center justify-center rounded-[18px] bg-[#007AFF] text-white shadow-[0_10px_28px_rgba(0,122,255,.18)] dark:bg-[#0A84FF]">
                <M3Icon name="school" size={31} weight={300} />
              </span>
            </div>

            <div className="rounded-[22px] border border-black/[.08] bg-white/90 p-6 shadow-[0_18px_55px_rgba(0,0,0,.10),0_1px_2px_rgba(0,0,0,.05)] backdrop-blur-xl sm:p-7 dark:border-white/[.10] dark:bg-[#1C1C1E]/92 dark:shadow-[0_18px_55px_rgba(0,0,0,.38)]">
              {children}
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-md-on-surface-variant">
              SaaS Satu Smart School · Akses aman sesuai peran pengguna
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
