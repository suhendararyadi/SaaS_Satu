import { useState, useMemo } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getHomeroomDashboardData } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3TextField,
  M3Select,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";


export function WaliKelasPage({ user }: { user: AuthUser }) {
  const { data: homeroomClass, isLoading, error } = useQuery(getHomeroomDashboardData);

  const [searchQuery, setSearchQuery] = useState("");
  const [pklFilter, setPklFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const students = homeroomClass?.students || [];
  const totalStudents = students.length;
  const activePklStudents = students.filter(
    (s: any) => s.studentPlacements && s.studentPlacements.length > 0
  ).length;

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.nisn?.toLowerCase().includes(searchQuery.toLowerCase());

      const hasPlacement = s.studentPlacements && s.studentPlacements.length > 0;
      const matchPkl =
        pklFilter === "ALL" ||
        (pklFilter === "PLACED" && hasPlacement) ||
        (pklFilter === "UNPLACED" && !hasPlacement);

      return matchSearch && matchPkl;
    });
  }, [students, searchQuery, pklFilter]);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);

  if (isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex flex-col items-center justify-center min-h-64 gap-3">
          <M3CircularProgress indeterminate />
          <p className="text-body-medium text-md-on-surface-variant">
            Memuat dashboard wali kelas...
          </p>
        </div>
      </SchoolLayout>
    );
  }

  if (error || !homeroomClass) {
    return (
      <SchoolLayout user={user}>
        <div className="space-y-6">
          <nav className="flex items-center gap-2 text-label-large text-md-on-surface-variant">
            <Link to="/school" className="hover:text-md-primary transition-colors">
              Portal Sekolah
            </Link>
            <M3Icon name="chevron_right" size={16} />
            <Link to="/school/governance/walikelas" className="hover:text-md-primary transition-colors">
              Tata Kelola
            </Link>
            <M3Icon name="chevron_right" size={16} />
            <span className="text-md-on-surface font-medium">Wali Kelas</span>
          </nav>

          <M3Banner
            variant="warning"
            headline="Data Wali Kelas Belum Tersedia"
            supportingText="Akun Anda belum ditugaskan sebagai wali kelas pada rombel aktif."
            actionLabel="Kembali ke Dashboard"
            actionHref="/school"
            className="p-6"
          />
        </div>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* M3 Breadcrumbs */}
        <nav className="flex items-center gap-2 text-label-large text-md-on-surface-variant">
          <Link to="/school" className="hover:text-md-primary transition-colors">
            Portal Sekolah
          </Link>
          <M3Icon name="chevron_right" size={16} />
          <Link to="/school/governance/walikelas" className="hover:text-md-primary transition-colors">
            Tata Kelola
          </Link>
          <M3Icon name="chevron_right" size={16} />
          <span className="text-md-on-surface font-medium">Wali Kelas</span>
        </nav>

        {/* Header Banner Component */}
        <M3Banner
          variant="hero"
          className="p-6"
          headline={
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-md-full text-label-small font-semibold uppercase tracking-wider text-white">
                  Wali Kelas
                </span>
                <span className="px-3 py-1 bg-emerald-500/40 rounded-md-full text-label-small font-semibold text-white">
                  {homeroomClass.academicYear?.yearName} - {homeroomClass.academicYear?.semester}
                </span>
              </div>
              <h1 className="text-headline-medium font-bold text-white">
                Kelas {homeroomClass.name}
              </h1>
            </div>
          }
          supportingText={`Konsentrasi Keahlian: ${homeroomClass.department?.name} (${homeroomClass.department?.code})`}
          icon="group"
          actions={
            <M3Button
              variant="elevated"
              href="/school/reports"
              icon="print"
              className="bg-white text-emerald-800 hover:bg-emerald-50"
            >
              Cetak Rekap Nilai &amp; Presensi
            </M3Button>
          }
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <M3Card variant="elevated" className="p-5">
            <div className="flex justify-between items-center">
              <span className="text-label-large uppercase font-semibold tracking-wider text-md-on-surface-variant">
                Total Siswa Rombel
              </span>
              <div className="w-9 h-9 rounded-md-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                <M3Icon name="groups" size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-display-small font-bold text-md-on-surface">{totalStudents}</span>
              <span className="text-body-small text-md-on-surface-variant">Siswa Aktif</span>
            </div>
          </M3Card>

          <M3Card variant="elevated" className="p-5">
            <div className="flex justify-between items-center">
              <span className="text-label-large uppercase font-semibold tracking-wider text-md-on-surface-variant">
                Siswa Terplot PKL
              </span>
              <div className="w-9 h-9 rounded-md-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <M3Icon name="work" size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-display-small font-bold text-emerald-600 dark:text-emerald-400">
                {activePklStudents}
              </span>
              <span className="text-body-small text-md-on-surface-variant">
                / {totalStudents} Siswa ({totalStudents > 0 ? Math.round((activePklStudents / totalStudents) * 100) : 0}%)
              </span>
            </div>
          </M3Card>

          <M3Card variant="elevated" className="p-5">
            <div className="flex justify-between items-center">
              <span className="text-label-large uppercase font-semibold tracking-wider text-md-on-surface-variant">
                Monitoring Presensi &amp; Jurnal
              </span>
              <div className="w-9 h-9 rounded-md-md bg-md-tertiary-container text-md-on-tertiary-container flex items-center justify-center">
                <M3Icon name="event_available" size={18} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-title-small font-semibold text-emerald-600 dark:text-emerald-400">
                Sistem EWS Aktif
              </span>
            </div>
            <p className="text-body-small text-md-on-surface-variant mt-1">
              Peringatan alfa &amp; keterlambatan terpantau
            </p>
          </M3Card>
        </div>

        {/* Filter Toolbar Card */}
        <M3Card variant="outlined" className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              <div className="w-full sm:w-72">
                <M3TextField
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari siswa, NIS, NISN..."
                  leadingIcon="search"
                />
              </div>
              <div className="w-full sm:w-56">
                <M3Select
                  value={pklFilter}
                  onChange={(e) => {
                    setPklFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "Semua Status PKL" },
                    { value: "PLACED", label: "Sudah Ditempatkan" },
                    { value: "UNPLACED", label: "Belum Ditempatkan" },
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center">
              <M3Badge variant="outline">
                {filteredStudents.length} Siswa Ditemukan
              </M3Badge>
            </div>
          </div>
        </M3Card>

        {/* Student List Table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-title-large font-bold text-md-on-surface">
                Daftar Siswa Bimbingan Rombel
              </h2>
              <p className="text-body-small text-md-on-surface-variant">
                Progres PKL, presensi terkini, dan aktivitas jurnal harian
              </p>
            </div>
            <M3Badge variant="primary">
              {students.length} Siswa Terdaftar
            </M3Badge>
          </div>

          {filteredStudents.length === 0 ? (
            <M3Card variant="outlined" className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-md-surface-container-high text-md-on-surface-variant flex items-center justify-center mx-auto mb-3">
                <M3Icon name="groups" size={24} />
              </div>
              <h3 className="text-title-medium font-semibold text-md-on-surface">
                {searchQuery || pklFilter !== "ALL" ? "Tidak Ditemukan" : "Belum Ada Siswa"}
              </h3>
              <p className="text-body-medium text-md-on-surface-variant mt-1">
                {searchQuery || pklFilter !== "ALL"
                  ? "Tidak ada siswa yang sesuai dengan filter pencarian yang diterapkan."
                  : "Belum ada data siswa di rombongan belajar ini."}
              </p>
            </M3Card>
          ) : (
            <div className="space-y-4">
              <M3Card variant="outlined" className="p-0 overflow-hidden">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Nama &amp; Identitas Siswa</M3TableHead>
                      <M3TableHead>Penempatan PKL</M3TableHead>
                      <M3TableHead>Presensi Terkini</M3TableHead>
                      <M3TableHead>Jurnal Harian</M3TableHead>
                      <M3TableHead className="text-right">Tindakan</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {paginatedStudents.map((student: any) => {
                      const placement = student.studentPlacements?.[0];
                      const lastAttendance = placement?.attendances?.[0];
                      const lastJournal = placement?.journals?.[0];

                      return (
                        <M3TableRow key={student.id}>
                          <M3TableCell>
                            <div className="space-y-0.5">
                              <span className="font-semibold block text-md-on-surface">
                                {student.name}
                              </span>
                              <span className="text-label-small font-mono text-md-on-surface-variant block">
                                NIS: {student.studentProfile?.nis || "-"} • NISN: {student.studentProfile?.nisn || "-"}
                              </span>
                            </div>
                          </M3TableCell>

                          <M3TableCell>
                            {placement ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-md-primary font-semibold text-body-medium">
                                  <M3Icon name="apartment" size={14} className="shrink-0" />
                                  <span>{placement.company.name}</span>
                                </div>
                                <span className="text-body-small text-md-on-surface-variant block">
                                  PIC: {placement.company.picName || "-"} ({placement.company.picPhone || "-"})
                                </span>
                              </div>
                            ) : (
                              <M3Badge variant="warning">
                                Belum Ditempatkan
                              </M3Badge>
                            )}
                          </M3TableCell>

                          <M3TableCell>
                            {lastAttendance ? (
                              <div className="space-y-0.5">
                                <M3Badge variant={lastAttendance.status === "HADIR" ? "success" : "error"}>
                                  {lastAttendance.status} ({lastAttendance.type})
                                </M3Badge>
                                <span className="text-label-small font-mono text-md-on-surface-variant block">
                                  {new Date(lastAttendance.timestamp).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="italic text-body-small text-md-on-surface-variant">
                                Belum ada catatan
                              </span>
                            )}
                          </M3TableCell>

                          <M3TableCell>
                            {lastJournal ? (
                              <div className="space-y-0.5 max-w-[260px]">
                                <M3Badge variant={lastJournal.status === "APPROVED" ? "success" : "warning"}>
                                  {lastJournal.status}{lastJournal.score ? ` (Nilai: ${lastJournal.score})` : ""}
                                </M3Badge>
                                <p className="text-body-small text-md-on-surface-variant truncate">
                                  {lastJournal.activityDescription}
                                </p>
                              </div>
                            ) : (
                              <span className="italic text-body-small text-md-on-surface-variant">
                                Belum ada jurnal
                              </span>
                            )}
                          </M3TableCell>

                          <M3TableCell className="text-right">
                            <Link to="/school/pkl/monitoring">
                              <M3Button
                                variant="text"
                                size="sm"
                                trailingIcon="open_in_new"
                              >
                                Monitoring
                              </M3Button>
                            </Link>
                          </M3TableCell>
                        </M3TableRow>
                      );
                    })}
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
