import { type ReactNode } from "react";
import { Link } from "react-router";
import { M3Icon } from "../client/components/m3";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-v2 relative isolate min-h-screen overflow-hidden bg-[#244A42] text-md-on-background">
      <img
        src="/school-os-auth-wallpaper.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-black/20" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[58%] bg-gradient-to-t from-black/35 via-black/10 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-4 sm:px-7 sm:py-6">
        <header className="flex min-h-11 items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-[12px] bg-black/22 px-3 py-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] backdrop-blur-md transition-colors hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Kembali ke beranda SaaS Satu"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white/16 text-white">
              <M3Icon name="school" size={18} weight={300} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-[-0.01em]">School OS</span>
              <span className="text-[10px] text-white/72">SaaS Satu</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-[11px] bg-black/18 px-3 text-[12.5px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.10)] backdrop-blur-md transition-colors hover:bg-black/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Beranda
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[430px]">
            <div className="relative mx-auto mb-4 flex size-[74px] items-center justify-center rounded-full border border-white/55 bg-white/88 text-[#007AFF] shadow-[0_12px_36px_rgba(0,0,0,.22)] backdrop-blur-xl dark:bg-[#1C1C1E]/90 dark:text-[#0A84FF]">
              <M3Icon name="school" size={34} weight={300} />
            </div>

            <div className="rounded-[22px] border border-white/44 bg-white/88 p-6 shadow-[0_22px_64px_rgba(0,0,0,.24),0_1px_2px_rgba(0,0,0,.08)] backdrop-blur-2xl sm:p-7 dark:border-white/[.13] dark:bg-[#1C1C1E]/90 dark:shadow-[0_22px_64px_rgba(0,0,0,.44)]">
              {children}
            </div>

            <p className="mx-auto mt-4 max-w-[340px] text-center text-[10.5px] leading-5 text-white/82 drop-shadow-[0_1px_2px_rgba(0,0,0,.45)]">
              SaaS Satu Smart School · Akses mengikuti peran dan sekolah yang terhubung
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
