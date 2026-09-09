import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getPklEwsAlerts } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3TextField,
  M3Select,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
  M3StatCard,
} from "../../client/components/m3";


export function MonitoringEwsPage({ user }: { user: AuthUser }) {
  const { data: alerts, isLoading } = useQuery(getPklEwsAlerts);

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const highAlerts = alerts?.filter((a) => a.severity === "HIGH") || [];
  const mediumAlerts = alerts?.filter((a) => a.severity === "MEDIUM") || [];

  const filteredAlerts = alerts?.filter((a) => {
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStudent = a.studentName.toLowerCase().includes(q);
      const matchCompany = a.companyName.toLowerCase().includes(q);
      const matchClass = a.className.toLowerCase().includes(q);
      const matchIssue = a.issue.toLowerCase().includes(q);
      return matchStudent || matchCompany || matchClass || matchIssue;
    }
    return true;
  });

  const paginatedAlerts = (filteredAlerts || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil((filteredAlerts?.length || 0) / pageSize);

  const severityOptions = [
    { value: "ALL", label: "Semua Prioritas" },
    { value: "HIGH", label: "Prioritas Tinggi (Kritis)" },
    { value: "MEDIUM", label: "Perhatian Sedang" },
  ];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Monitoring &amp; deteksi dini PKL</h2>
          <p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">Pantau kendala presensi dan jurnal siswa PKL berdasarkan data aktual.</p>
        </div>

        {highAlerts.length > 0 && (
          <M3Banner variant="error" headline={`${highAlerts.length} kasus memerlukan perhatian cepat`} supportingText="Terdeteksi anomali kehadiran atau jurnal tertunda. Tinjau kasus kritis dan koordinasikan dengan pembimbing terkait." actionLabel="Tinjau kasus kritis" onAction={() => setSeverityFilter("HIGH")} />
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <M3StatCard label="Total peringatan" value={alerts?.length || 0} tone="blue" />
          <M3StatCard label="Prioritas tinggi" value={highAlerts.length} tone="orange" />
          <M3StatCard label="Perhatian sedang" value={mediumAlerts.length} tone="amber" />
        </div>

        {/* Search & Severity Filter Toolbar */}
        <M3Card variant="outlined" className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <M3TextField
                placeholder="Cari nama siswa, kelas, mitra, atau isu..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leadingIcon="search"
              />
            </div>

            <div className="w-full sm:w-64">
              <M3Select
                options={severityOptions}
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center">
              <M3Badge variant="outline">
                {filteredAlerts?.length || 0} Peringatan
              </M3Badge>
            </div>
          </div>
        </M3Card>

        {/* Alerts Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-64 gap-3">
            <M3CircularProgress indeterminate />
            <p className="text-body-medium text-md-on-surface-variant">
              Memeriksa sistem monitoring EWS...
            </p>
          </div>
        ) : filteredAlerts?.length === 0 ? (
          <M3Banner
            variant="success"
            headline="Semua Aktivitas PKL Berjalan Lancar"
            supportingText="Tidak ada anomali atau peringatan yang sesuai dengan filter pencarian saat ini. Seluruh siswa aktif presensi dan mengisi jurnal harian."
            className="p-6"
          />
        ) : (
          <div className="space-y-4">
            {paginatedAlerts.map((item, idx) => {
              const isHigh = item.severity === "HIGH";

              return (
                <M3Card
                  key={idx}
                  variant="outlined"
                  className={`p-5 transition-all border-l-4 ${
                    isHigh ? "border-l-red-500" : "border-l-amber-500"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <M3Badge variant={isHigh ? "error" : "warning"}>
                          {item.issue}
                        </M3Badge>
                        <span className="text-body-small text-md-on-surface-variant">
                          • {item.className}
                        </span>
                      </div>

                      <h2 className="text-title-medium font-bold text-md-on-surface">
                        {item.studentName}
                      </h2>

                      <p className="text-body-medium text-md-on-surface-variant">
                        {item.details}
                      </p>

                      <div className="flex items-center gap-4 flex-wrap pt-1 text-body-small text-md-on-surface-variant">
                        <div className="flex items-center gap-1.5">
                          <M3Icon name="apartment" size={14} className="text-md-on-surface-variant/70 shrink-0" />
                          <span>{item.companyName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <M3Icon name="person" size={14} className="text-md-on-surface-variant/70 shrink-0" />
                          <span>
                            Pembimbing: <strong className="font-semibold text-md-on-surface">{item.teacherName}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <a
                        href={`https://wa.me/?text=Halo%20${encodeURIComponent(
                          item.studentName
                        )},%20mohon%20segera%20lengkapi%20presensi/jurnal%20PKL%20Anda.`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <M3Button
                          variant="tonal"
                          icon="call"
                        >
                          Hubungi Siswa
                        </M3Button>
                      </a>
                    </div>
                  </div>
                </M3Card>
              );
            })}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <M3Button
                  variant="outlined"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </M3Button>
                <span className="text-body-medium text-md-on-surface-variant px-2">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <M3Button
                  variant="outlined"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Berikutnya
                </M3Button>
              </div>
            )}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
