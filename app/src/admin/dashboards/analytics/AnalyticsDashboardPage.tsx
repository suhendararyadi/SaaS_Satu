import { type AuthUser } from "wasp/auth";
import { getDailyStats, useQuery } from "wasp/client/operations";
import { M3EmptyState, M3Icon } from "../../../client/components/m3";
import { DefaultLayout } from "../../layout/DefaultLayout";

function formatNumber(value: number | null | undefined) {
  return value == null ? "Belum ada" : new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrency(value: number | null | undefined) {
  return value == null
    ? "Belum ada"
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatShortDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric" }).format(new Date(value));
}

export function AnalyticsDashboardPage({ user }: { user: AuthUser }) {
  const { data: stats, isLoading, error } = useQuery(getDailyStats);

  if (error) {
    return (
      <DefaultLayout user={user}>
        <div className="mx-auto max-w-2xl py-10">
          <div className="hig-grouped-surface p-4 sm:p-6">
            <M3EmptyState
              icon="cloud_off"
              title="Statistik platform belum dapat dimuat"
              description="Data tidak diubah. Coba muat ulang halaman setelah koneksi kembali stabil."
              actionLabel="Muat ulang"
              onAction={() => window.location.reload()}
            />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="space-y-5" aria-live="polite" aria-busy="true">
          <div className="h-16 max-w-lg animate-pulse rounded-[14px] bg-md-surface-container" />
          <div className="grid overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse border-b border-md-outline-variant bg-md-surface-container-low p-4 sm:border-r xl:border-b-0" />)}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
            <div className="h-80 animate-pulse rounded-[16px] bg-md-surface-container-low" />
            <div className="h-80 animate-pulse rounded-[16px] bg-md-surface-container-low" />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (!stats) {
    return (
      <DefaultLayout user={user}>
        <div className="mx-auto max-w-2xl py-10">
          <div className="hig-grouped-surface p-4 sm:p-6">
            <M3EmptyState
              icon="monitoring"
              title="Statistik platform belum tersedia"
              description="Ringkasan akan muncul setelah proses statistik harian menghasilkan data pertama."
            />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const daily = stats.dailyStats;
  const weekly = [...stats.weeklyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const maxWeeklyViews = Math.max(1, ...weekly.map((item) => item.totalViews ?? 0));
  const sources = [...daily.sources].sort((a, b) => b.visitors - a.visitors).slice(0, 6);

  const metrics = [
    {
      label: "Tayangan hari ini",
      value: formatNumber(daily.totalViews),
      note: daily.prevDayViewsChangePercent ? `${daily.prevDayViewsChangePercent} dari hari sebelumnya` : "Aktivitas kunjungan platform",
      icon: "visibility",
      tone: "bg-[#0A84FF]",
    },
    {
      label: "Pengguna",
      value: formatNumber(daily.userCount),
      note: daily.userDelta === 0 ? "Tidak ada perubahan hari ini" : `${daily.userDelta > 0 ? "+" : ""}${daily.userDelta} perubahan hari ini`,
      icon: "groups",
      tone: "bg-[#34C759]",
    },
    {
      label: "Pengguna berlangganan",
      value: formatNumber(daily.paidUserCount),
      note: daily.paidUserDelta === 0 ? "Tidak ada perubahan hari ini" : `${daily.paidUserDelta > 0 ? "+" : ""}${daily.paidUserDelta} perubahan hari ini`,
      icon: "workspace_premium",
      tone: "bg-[#AF52DE] dark:bg-[#BF5AF2]",
    },
    {
      label: "Pendapatan",
      value: formatCurrency(daily.totalRevenue),
      note: daily.totalProfit == null ? "Profit belum tersedia" : `Profit ${formatCurrency(daily.totalProfit)}`,
      icon: "payments",
      tone: "bg-[#FF9500] dark:bg-[#FF9F0A]",
    },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-5 lg:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.045em] text-md-on-surface-variant">KONTROL PLATFORM</p>
            <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-md-on-surface">Ringkasan SaaS Satu</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-md-on-surface-variant">
              Pantau penggunaan platform, akun, dan aktivitas langganan dari data statistik yang tersedia.
            </p>
          </div>
          <p className="text-[11.5px] text-md-on-surface-variant">Data {formatDate(daily.date)}</p>
        </div>

        <section className="grid overflow-hidden rounded-[16px] border border-md-outline-variant bg-md-surface shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan statistik platform">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`min-w-0 p-4 sm:p-5 ${index < metrics.length - 1 ? "border-b border-md-outline-variant sm:border-r xl:border-b-0" : ""} ${index === 1 ? "sm:border-r-0 xl:border-r" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] text-white shadow-[0_1px_2px_rgba(0,0,0,.14)] ${metric.tone}`}>
                  <M3Icon name={metric.icon} size={17} weight={300} />
                </span>
                <p className="truncate text-[12px] font-medium text-md-on-surface-variant">{metric.label}</p>
              </div>
              <p className="mt-3 truncate text-[24px] font-semibold tracking-[-0.025em] text-md-on-surface" title={metric.value}>{metric.value}</p>
              <p className="mt-1 truncate text-[11px] text-md-on-surface-variant" title={metric.note}>{metric.note}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
          <section className="hig-grouped-surface overflow-hidden" aria-labelledby="weekly-platform-title">
            <div className="border-b border-md-outline-variant px-4 py-3.5 sm:px-5">
              <h3 id="weekly-platform-title" className="text-[15px] font-semibold tracking-[-0.01em] text-md-on-surface">Aktivitas 7 hari</h3>
              <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">Tayangan yang tercatat pada statistik harian platform.</p>
            </div>
            <div className="divide-y divide-md-outline-variant px-4 sm:px-5">
              {weekly.map((item) => {
                const value = item.totalViews;
                const width = value == null ? 0 : Math.min(100, (value / maxWeeklyViews) * 100);
                return (
                  <div key={item.id} className="grid min-h-12 grid-cols-[70px_minmax(0,1fr)_76px] items-center gap-3 py-2.5">
                    <span className="text-[11.5px] font-medium text-md-on-surface-variant">{formatShortDate(item.date)}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-md-surface-container-high" aria-hidden="true">
                      <span className="block h-full rounded-full bg-[#0A84FF]" style={{ width: `${width}%` }} />
                    </span>
                    <span className="truncate text-right text-[12px] font-semibold text-md-on-surface" title={formatNumber(value)}>{formatNumber(value)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="hig-grouped-surface overflow-hidden" aria-labelledby="sources-title">
            <div className="border-b border-md-outline-variant px-4 py-3.5 sm:px-5">
              <h3 id="sources-title" className="text-[15px] font-semibold tracking-[-0.01em] text-md-on-surface">Sumber kunjungan</h3>
              <p className="mt-0.5 text-[11.5px] text-md-on-surface-variant">Sumber yang tercatat pada statistik terbaru.</p>
            </div>
            {sources.length > 0 ? (
              <div className="divide-y divide-md-outline-variant px-4 sm:px-5">
                {sources.map((source) => (
                  <div key={`${source.name}-${new Date(source.date).toISOString()}`} className="flex min-h-12 items-center gap-3 py-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[#32ADE6] text-white">
                      <M3Icon name="language" size={15} weight={300} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-md-on-surface">{source.name}</span>
                    <span className="text-[12px] font-semibold text-md-on-surface">{formatNumber(source.visitors)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-[12px] text-md-on-surface-variant">Belum ada sumber kunjungan yang tercatat.</div>
            )}
          </section>
        </div>
      </div>
    </DefaultLayout>
  );
}
