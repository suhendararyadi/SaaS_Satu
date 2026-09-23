import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getWakaSupervisionData } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3TextField,
  M3LinearProgress,
  M3CircularProgress,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3Banner,
  M3Text,
  M3Icon,
  M3StatCard,
} from "../../client/components/m3";


export function WakaKurikulumPage({ user }: { user: AuthUser }) {
  const { data: supervision, isLoading } = useQuery(getWakaSupervisionData);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const todayFilled = supervision?.todayAgendasCount || 0;
  const totalCourses = supervision?.totalCoursesCount || 1;
  const complianceRate = Math.min(100, Math.round((todayFilled / totalCourses) * 100));

  const filteredCompliance = supervision?.teacherCompliance?.filter((tc) => {
    if (searchQuery.trim()) {
      return tc.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const paginatedCompliance = (filteredCompliance || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil((filteredCompliance?.length || 0) / pageSize);

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Supervisi pembelajaran</h2>
          <p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">Pantau pengisian agenda mengajar dan kepatuhan KBM hari ini.</p>
        </div>

        {complianceRate < 50 && totalCourses > 0 && (
          <M3Banner variant="warning" headline="Kepatuhan mengajar rendah" supportingText={`${todayFilled} dari ${totalCourses} mapel (${complianceRate}%) telah mengisi agenda KBM hari ini.`} />
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <M3StatCard label="Kepatuhan hari ini" value={`${complianceRate}%`} tone={complianceRate < 50 ? "orange" : "green"} helper={`${todayFilled} / ${totalCourses} mapel`} />
          <M3StatCard label="Guru aktif" value={supervision?.teacherCompliance?.length || 0} tone="blue" />
          <M3StatCard label="Mapel terjadwal" value={totalCourses} tone="teal" />
        </div>

        {/* Filter Toolbar Card */}
        <M3Card variant="outlined" className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <M3TextField
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama guru pengampu..."
                leadingIcon="search"
              />
            </div>
            <div className="flex items-center gap-2">
              <M3Badge variant="outline">
                {filteredCompliance?.length || 0} Guru Ditemukan
              </M3Badge>
            </div>
          </div>
        </M3Card>

        {/* Teacher Compliance Table */}
        <div className="space-y-4">
          <h2 className="text-title-large font-bold text-md-on-surface">
            Rekap Pengisian Agenda Mengajar Per Guru
          </h2>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-64 gap-3">
              <M3CircularProgress indeterminate />
              <p className="text-body-medium text-md-on-surface-variant">
                Memuat data supervisi guru...
              </p>
            </div>
          ) : !filteredCompliance || filteredCompliance.length === 0 ? (
            <M3Banner
              variant="standard"
              headline={searchQuery ? "Tidak Ditemukan" : "Belum Ada Data Guru"}
              supportingText={
                searchQuery
                  ? `Tidak ada guru pengampu yang cocok dengan kata kunci "${searchQuery}".`
                  : "Belum ada data kepatuhan mengajar guru yang tercatat untuk semester ini."
              }
              className="p-6"
            />
          ) : (
            <div className="space-y-4">
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Nama Guru Pengampu</M3TableHead>
                      <M3TableHead>Jumlah Kelas Diampu</M3TableHead>
                      <M3TableHead>Agenda Terisi Hari Ini</M3TableHead>
                      <M3TableHead>Total Agenda Semester</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {paginatedCompliance.map((tc) => (
                      <M3TableRow key={tc.teacherId}>
                        <M3TableCell className="font-semibold text-md-on-surface">
                          {tc.teacherName}
                        </M3TableCell>
                        <M3TableCell className="text-md-on-surface-variant">
                          {tc.totalCourses} Rombel
                        </M3TableCell>
                        <M3TableCell>
                          {tc.todayAgendasFilled > 0 ? (
                            <M3Badge variant="success">
                              {tc.todayAgendasFilled} Selesai
                            </M3Badge>
                          ) : (
                            <M3Badge variant="outline">
                              Belum Terisi
                            </M3Badge>
                          )}
                        </M3TableCell>
                        <M3TableCell className="font-mono font-bold text-md-primary">
                          {tc.totalAgendasSemester} Agenda
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2">
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
      </div>
    </SchoolLayout>
  );
}
