import { BellRing, BriefcaseBusiness, ShieldAlert, TriangleAlert, UsersRound } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getPklEwsAlerts } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3CircularProgress,
  M3EmptyState,
  M3StatCard,
} from "../../client/components/m3";

function canMonitorEws(user: AuthUser) {
  return !!user.isAdmin || ["SUPERADMIN", "SCHOOL_ADMIN", "TEACHER", "DUDI_MENTOR"].includes(user.role);
}

function EwsSignalIcon({ severity }: { severity: string }) {
  const high = severity === "HIGH";
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,.12)] ${
        high ? "bg-[#FF3B30] dark:bg-[#FF453A]" : "bg-[#FF9500] dark:bg-[#FF9F0A]"
      }`}
      aria-hidden="true"
    >
      <TriangleAlert size={16} strokeWidth={2.2} className="text-white" />
    </span>
  );
}

export function EarlyWarningSystemPage({ user }: { user: AuthUser }) {
  const allowed = canMonitorEws(user);
  const query = useQuery(getPklEwsAlerts, undefined, { enabled: allowed });

  if (!allowed) {
    return (
      <SchoolLayout user={user}>
        <section className="hig-grouped-surface px-4 sm:px-5">
          <M3EmptyState
            icon="lock"
            title="Akses Early Warning terbatas"
            description="Ringkasan EWS tersedia untuk admin sekolah, guru pembimbing, dan pembimbing DUDI yang memiliki akses monitoring PKL."
          />
        </section>
      </SchoolLayout>
    );
  }

  if (query.isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3" aria-live="polite" aria-busy="true">
          <M3CircularProgress size={30} />
          <p className="text-[12.5px] text-md-on-surface-variant">Menyusun ringkasan Early Warning...</p>
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !query.data) {
    return (
      <SchoolLayout user={user}>
        <section className="hig-grouped-surface px-4 sm:px-5">
          <M3EmptyState
            icon="cloud_off"
            title="Early Warning belum dapat dimuat"
            description="Data tidak diubah. Coba muat ulang ringkasan monitoring."
            actionLabel="Coba lagi"
            onAction={() => query.refetch()}
          />
        </section>
      </SchoolLayout>
    );
  }

  const alerts = query.data;
  const high = alerts.filter((alert) => alert.severity === "HIGH");
  const medium = alerts.filter((alert) => alert.severity === "MEDIUM");
  const affectedStudents = new Set(alerts.map((alert) => alert.studentId)).size;
  const affectedPlacements = new Set(alerts.map((alert) => alert.placementId)).size;
  const priorityAlerts = [...high, ...medium].slice(0, 7);

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Early Warning System</h2>
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-5 text-md-on-surface-variant">
              Ringkasan sinyal risiko dari aktivitas PKL aktif. EWS membantu menentukan prioritas tindak lanjut; keputusan tetap diverifikasi oleh sekolah.
            </p>
          </div>
          <M3Button variant="text" size="sm" href="/school/pkl/monitoring" trailingIcon="chevron_right">
            Monitoring PKL
          </M3Button>
        </div>

        <section className="hig-grouped-surface overflow-hidden" aria-labelledby="ews-status-title">
          <div className="flex min-h-[74px] items-center gap-3 px-4 py-3.5 sm:px-5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.14)] ${
                high.length > 0
                  ? "bg-[#FF3B30] dark:bg-[#FF453A]"
                  : alerts.length > 0
                    ? "bg-[#FF9500] dark:bg-[#FF9F0A]"
                    : "bg-[#34C759] dark:bg-[#30D158]"
              }`}
              aria-hidden="true"
            >
              <ShieldAlert size={21} strokeWidth={2.1} className="text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="ews-status-title" className="text-[14px] font-semibold text-md-on-surface">
                {high.length > 0
                  ? `${high.length} sinyal prioritas tinggi perlu ditinjau`
                  : alerts.length > 0
                    ? `${alerts.length} sinyal monitoring perlu ditinjau`
                    : "Tidak ada sinyal risiko aktif"}
              </h3>
              <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">
                Sumber aktif saat ini: presensi geofence dan jurnal harian PKL.
              </p>
            </div>
            <M3Badge variant={high.length > 0 ? "error" : alerts.length > 0 ? "warning" : "success"}>
              {high.length > 0 ? "Prioritas" : alerts.length > 0 ? "Pantau" : "Normal"}
            </M3Badge>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <M3StatCard label="Total sinyal" value={alerts.length} tone="blue" href="/school/pkl/monitoring" />
          <M3StatCard label="Prioritas tinggi" value={high.length} tone="orange" href="/school/pkl/monitoring" />
          <M3StatCard label="Perhatian sedang" value={medium.length} tone="amber" href="/school/pkl/monitoring" />
          <M3StatCard label="Siswa terdampak" value={affectedStudents} tone="indigo" href="/school/pkl/monitoring" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <section className="hig-grouped-surface overflow-hidden" aria-labelledby="ews-priority-title">
            <div className="flex items-center justify-between border-b border-md-outline-variant px-4 py-3 sm:px-5">
              <div>
                <h3 id="ews-priority-title" className="hig-section-title">Prioritas sekarang</h3>
                <p className="hig-section-note mt-0.5">Sinyal diurutkan berdasarkan tingkat prioritas.</p>
              </div>
              {alerts.length > 0 && <M3Badge variant="outline">{alerts.length}</M3Badge>}
            </div>

            {priorityAlerts.length ? (
              <div className="divide-y divide-md-outline-variant">
                {priorityAlerts.map((alert) => (
                  <a
                    key={alert.id}
                    href={alert.destination}
                    className="flex min-h-[62px] items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04] sm:px-5"
                  >
                    <EwsSignalIcon severity={alert.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-[13px] font-semibold text-md-on-surface">{alert.studentName}</span>
                        <span className="text-[10.5px] font-medium text-md-on-surface-variant">{alert.className}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-md-on-surface-variant">
                        {alert.issue} · {alert.companyName}
                      </span>
                    </span>
                    <span className="text-[20px] font-light text-md-on-surface-variant/40" aria-hidden="true">›</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="px-4 sm:px-5">
                <M3EmptyState
                  compact
                  icon="verified"
                  title="Tidak ada sinyal risiko aktif"
                  description="Sinyal baru akan muncul otomatis dari data presensi dan jurnal PKL."
                />
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section className="hig-grouped-surface overflow-hidden" aria-labelledby="ews-source-title">
              <div className="border-b border-md-outline-variant px-4 py-3">
                <h3 id="ews-source-title" className="hig-section-title">Sumber sinyal</h3>
              </div>
              <a href="/school/pkl/monitoring" className="flex min-h-[58px] items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#007AFF] dark:bg-[#0A84FF]" aria-hidden="true">
                  <BriefcaseBusiness size={16} strokeWidth={2.1} className="text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-md-on-surface">PKL</span>
                  <span className="block text-[11.5px] text-md-on-surface-variant">{affectedPlacements} penempatan perlu dipantau</span>
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-md-on-surface">{alerts.length}</span>
                <span className="text-[20px] font-light text-md-on-surface-variant/40" aria-hidden="true">›</span>
              </a>
            </section>

            <section className="hig-grouped-surface overflow-hidden" aria-labelledby="ews-rules-title">
              <div className="border-b border-md-outline-variant px-4 py-3">
                <h3 id="ews-rules-title" className="hig-section-title">Cara membaca EWS</h3>
              </div>
              <div className="divide-y divide-md-outline-variant">
                <div className="flex gap-3 px-4 py-3">
                  <BellRing size={16} className="mt-0.5 shrink-0 text-md-error" />
                  <p className="text-[11.5px] leading-5 text-md-on-surface-variant"><strong className="font-semibold text-md-on-surface">Tinggi</strong> — belum ada presensi atau jurnal terakhir tertunda ≥3 hari.</p>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#FF9500] dark:text-[#FF9F0A]" />
                  <p className="text-[11.5px] leading-5 text-md-on-surface-variant"><strong className="font-semibold text-md-on-surface">Sedang</strong> — presensi di luar radius atau jurnal belum tersedia.</p>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <UsersRound size={16} className="mt-0.5 shrink-0 text-md-primary" />
                  <p className="text-[11.5px] leading-5 text-md-on-surface-variant">Satu siswa dapat memiliki lebih dari satu sinyal. Tinjau bukti sebelum menentukan tindak lanjut.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
