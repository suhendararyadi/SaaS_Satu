import { useEffect, useMemo, useState } from "react";
import { BookOpenText, MapPinOff, ShieldAlert, TriangleAlert } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getPklEwsAlerts } from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Badge,
  M3Button,
  M3CircularProgress,
  M3EmptyState,
  M3Select,
  M3StatCard,
  M3TextField,
} from "../../client/components/m3";

const PAGE_SIZE = 6;

function AlertTile({ code, severity }: { code: string; severity: string }) {
  const Icon = code === "OUT_OF_RADIUS" ? MapPinOff : code.includes("JOURNAL") ? BookOpenText : TriangleAlert;
  const tile = severity === "HIGH"
    ? "bg-[#FF3B30] dark:bg-[#FF453A]"
    : "bg-[#FF9500] dark:bg-[#FF9F0A]";

  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,.14)] ${tile}`} aria-hidden="true">
      <Icon size={18} strokeWidth={2.1} className="text-white" />
    </span>
  );
}

export function MonitoringEwsPage({ user }: { user: AuthUser }) {
  const query = useQuery(getPklEwsAlerts);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const alerts = query.data ?? [];
  const highAlerts = alerts.filter((alert) => alert.severity === "HIGH");
  const mediumAlerts = alerts.filter((alert) => alert.severity === "MEDIUM");

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("id");
    return alerts.filter((alert) => {
      if (severityFilter !== "ALL" && alert.severity !== severityFilter) return false;
      if (!normalizedQuery) return true;
      return [alert.studentName, alert.companyName, alert.className, alert.issue, alert.details]
        .some((value) => value.toLocaleLowerCase("id").includes(normalizedQuery));
    });
  }, [alerts, searchQuery, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const severityOptions = [
    { value: "ALL", label: "Semua prioritas" },
    { value: "HIGH", label: "Prioritas tinggi" },
    { value: "MEDIUM", label: "Perhatian sedang" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Monitoring PKL</h2>
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-5 text-md-on-surface-variant">
              Detail sinyal Early Warning berdasarkan presensi geofence dan jurnal siswa pada penempatan PKL aktif.
            </p>
          </div>
          <M3Button variant="text" size="sm" href="/school/ews" icon="shield">
            Early Warning System
          </M3Button>
        </div>

        {highAlerts.length > 0 && (
          <section className="hig-grouped-surface overflow-hidden" aria-label="Peringatan prioritas tinggi">
            <div className="flex min-h-[68px] items-center gap-3 px-4 py-3 sm:px-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FF3B30] shadow-[0_1px_2px_rgba(0,0,0,.14)] dark:bg-[#FF453A]" aria-hidden="true">
                <ShieldAlert size={18} strokeWidth={2.1} className="text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-md-on-surface">{highAlerts.length} sinyal membutuhkan perhatian lebih dulu</p>
                <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">Tinjau bukti presensi dan jurnal sebelum menentukan tindak lanjut.</p>
              </div>
              <M3Button
                variant="text"
                size="sm"
                onClick={() => {
                  setSeverityFilter("HIGH");
                  setCurrentPage(1);
                }}
              >
                Tampilkan
              </M3Button>
            </div>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <M3StatCard label="Total sinyal" value={alerts.length} tone="blue" />
          <M3StatCard label="Prioritas tinggi" value={highAlerts.length} tone="orange" />
          <M3StatCard label="Perhatian sedang" value={mediumAlerts.length} tone="amber" />
        </div>

        <section className="hig-grouped-surface p-2.5 sm:p-3" aria-label="Filter monitoring PKL">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="w-full flex-1">
              <M3TextField
                placeholder="Cari siswa, rombel, mitra, atau isu"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
                size="sm"
              />
            </div>
            <div className="w-full sm:w-52">
              <M3Select
                options={severityOptions}
                value={severityFilter}
                onChange={(event) => {
                  setSeverityFilter(event.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
              />
            </div>
            <span className="shrink-0 px-1 text-[11.5px] font-medium tabular-nums text-md-on-surface-variant">
              {filteredAlerts.length} sinyal
            </span>
          </div>
        </section>

        {query.isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3" aria-live="polite" aria-busy="true">
            <M3CircularProgress size={30} />
            <p className="text-[12.5px] text-md-on-surface-variant">Memeriksa sinyal monitoring PKL...</p>
          </div>
        ) : query.error ? (
          <section className="hig-grouped-surface px-4 sm:px-5">
            <M3EmptyState
              icon="cloud_off"
              title="Monitoring belum dapat dimuat"
              description="Data tidak diubah. Coba muat ulang halaman monitoring."
              actionLabel="Coba lagi"
              onAction={() => query.refetch()}
            />
          </section>
        ) : (
          <section className="hig-grouped-surface overflow-hidden" aria-labelledby="pkl-alerts-title">
            <div className="flex items-center justify-between border-b border-md-outline-variant px-4 py-3 sm:px-5">
              <div>
                <h3 id="pkl-alerts-title" className="hig-section-title">Sinyal yang perlu ditinjau</h3>
                <p className="hig-section-note mt-0.5">Urutan menempatkan prioritas tinggi terlebih dahulu.</p>
              </div>
              {filteredAlerts.length > 0 && <M3Badge variant="outline">{filteredAlerts.length}</M3Badge>}
            </div>

            {paginatedAlerts.length === 0 ? (
              <div className="px-4 sm:px-5">
                <M3EmptyState
                  compact
                  icon="verified"
                  title={alerts.length === 0 ? "Tidak ada sinyal risiko aktif" : "Tidak ada hasil pada filter ini"}
                  description={alerts.length === 0
                    ? "Data presensi dan jurnal PKL saat ini tidak menghasilkan peringatan EWS."
                    : "Ubah kata pencarian atau prioritas untuk melihat sinyal lainnya."}
                />
              </div>
            ) : (
              <div className="divide-y divide-md-outline-variant">
                {paginatedAlerts.map((item) => (
                  <a
                    key={item.id}
                    href={item.destination}
                    className="group flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-black/[.025] dark:hover:bg-white/[.04] sm:px-5 md:flex-row md:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <AlertTile code={item.code} severity={item.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-[13px] font-semibold text-md-on-surface">{item.studentName}</p>
                          <span className="text-[10.5px] font-medium text-md-on-surface-variant">{item.className}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <M3Badge variant={item.severity === "HIGH" ? "error" : "warning"}>
                            {item.severity === "HIGH" ? "Tinggi" : "Sedang"}
                          </M3Badge>
                          <span className="text-[12px] font-medium text-md-on-surface">{item.issue}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-5 text-md-on-surface-variant">{item.details}</p>
                        <p className="mt-1 truncate text-[11px] text-md-on-surface-variant/80">
                          {item.companyName} · Pembimbing {item.teacherName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pl-12 md:pl-0">
                      <span className="text-[11.5px] font-medium text-md-primary opacity-80 group-hover:opacity-100">
                        {item.category === "JOURNAL" ? "Buka jurnal" : "Buka presensi"}
                      </span>
                      <span className="text-[20px] font-light text-md-on-surface-variant/40" aria-hidden="true">›</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {!query.isLoading && !query.error && totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[11.5px] text-md-on-surface-variant">Hal {currentPage} dari {totalPages}</p>
            <div className="flex items-center gap-1">
              <M3Button variant="text" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} icon="chevron_left">
                Sebelumnya
              </M3Button>
              <M3Button variant="text" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} trailingIcon="chevron_right">
                Berikutnya
              </M3Button>
            </div>
          </div>
        )}

        <section className="hig-grouped-surface overflow-hidden" aria-labelledby="pkl-ews-rules-title">
          <div className="border-b border-md-outline-variant px-4 py-2.5 sm:px-5">
            <h3 id="pkl-ews-rules-title" className="text-[10.5px] font-semibold uppercase tracking-[0.055em] text-md-on-surface-variant/70">Aturan deteksi saat ini</h3>
          </div>
          <div className="grid divide-y divide-md-outline-variant sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-3 sm:px-5">
              <p className="text-[12px] font-semibold text-md-on-surface">Presensi</p>
              <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">Belum pernah presensi menjadi prioritas tinggi; check-in di luar radius menjadi perhatian sedang.</p>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <p className="text-[12px] font-semibold text-md-on-surface">Jurnal</p>
              <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">Belum ada jurnal menjadi perhatian sedang; jurnal terakhir tertunda ≥3 hari menjadi prioritas tinggi.</p>
            </div>
          </div>
        </section>
      </div>
    </SchoolLayout>
  );
}
