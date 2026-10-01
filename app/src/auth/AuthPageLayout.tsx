import { type ReactNode } from "react";
import { Link } from "react-router";
import { M3Icon } from "../client/components/m3";

const chipBase =
  "inline-flex min-h-11 items-center rounded-[12px] bg-white/62 text-slate-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,.6),0_1px_2px_rgba(15,23,42,.08)] backdrop-blur-xl transition-colors hover:bg-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:bg-black/30 dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] dark:hover:bg-black/40 dark:focus-visible:ring-white/80";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-v2 relative isolate min-h-screen overflow-hidden bg-[#CFE4FF] text-md-on-background dark:bg-[#0B1030]">
      <img
        src="/school-os-auth-wallpaper.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 h-full w-full object-cover dark:hidden"
      />
      <img
        src="/school-os-auth-wallpaper-dark.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 hidden h-full w-full object-cover dark:block"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-4 sm:px-7 sm:py-6">
        <header className="flex min-h-11 items-center justify-between gap-3">
          <Link to="/" className={`${chipBase} gap-2.5 px-3 py-1.5`} aria-label="Kembali ke beranda SaaS Satu">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/80 text-[#0071E3] dark:bg-white/16 dark:text-white">
              <M3Icon name="school" size={18} weight={300} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-[-0.01em]">School OS</span>
              <span className="text-[10px] text-slate-700 dark:text-white/72">SaaS Satu</span>
            </span>
          </Link>

          <Link to="/" className={`${chipBase} px-3 text-[12.5px] font-medium`}>
            Beranda
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[430px]">
            <div className="relative mx-auto mb-4 flex size-[74px] items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#007AFF] shadow-[0_12px_36px_rgba(30,41,90,.20)] backdrop-blur-xl dark:border-white/55 dark:bg-[#1C1C1E]/90 dark:text-[#0A84FF]">
              <M3Icon name="school" size={34} weight={300} />
            </div>

            <div className="rounded-[22px] border border-white/60 bg-white/86 p-6 shadow-[0_22px_64px_rgba(30,41,90,.22),0_1px_2px_rgba(0,0,0,.06)] backdrop-blur-2xl sm:p-7 dark:border-white/[.13] dark:bg-[#1C1C1E]/90 dark:shadow-[0_22px_64px_rgba(0,0,0,.44)]">
              {children}
            </div>

            <p className="mx-auto mt-4 w-fit max-w-[340px] rounded-[14px] bg-white/62 px-3.5 py-2 text-center text-[10.5px] leading-5 text-slate-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,.6)] backdrop-blur-xl dark:bg-black/30 dark:text-white/85 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]">
              SaaS Satu Smart School · Akses mengikuti peran dan sekolah yang terhubung
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
