import { useState, useMemo } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getHomeroomDashboardData, getSchoolInfo } from "wasp/client/operations";
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
  M3StatCard,
} from "../../client/components/m3";
import { getSchoolCapabilities } from "../../school/schoolCapabilities";

export function WaliKelasPage({ user }: { user: AuthUser }) {
  const { data: homeroomClass, isLoading, error } = useQuery(getHomeroomDashboardData);
  const { data: school } = useQuery(getSchoolInfo);
  const capabilities = school ? getSchoolCapabilities(school.level) : null;
  const usesDepartments = capabilities?.usesDepartments ?? false;
  const usesPkl = capabilities?.usesPkl ?? false;

  const [searchQuery, setSearchQuery] = useState("");
  const [pklFilter, setPklFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const students = homeroomClass?.students || [];
  const totalStudents = students.length;
  const activePklStudents = students.filter(
    (s: any) => s.studentPlacements && s.studentPlacements.length > 0
  ).length;
  const openViolations = students.reduce((sum: number, item: any) => sum + (item._count?.studentViolations || 0), 0);
  const openCoachings = students.reduce((sum: number, item: any) => sum + (item._count?.studentCoachings || 0), 0);
  const achievementCount = students.reduce((sum: number, item: any) => sum + (item._count?.studentAchievements || 0), 0);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.nisn?.toLowerCase().includes(searchQuery.toLowerCase());

      const hasPlacement = s.studentPlacements && s.studentPlacements.length > 0;
      const matchPkl =
        !usesPkl || pklFilter === "ALL" ||
        (pklFilter === "PLACED" && hasPlacement) ||
        (pklFilter === "UNPLACED" && !hasPlacement);

      return matchSearch && matchPkl;
    });
  }, [students, searchQuery, pklFilter, usesPkl]);

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
          <M3Banner
            variant="warning"
            headline={user.role === "TEACHER" ? "Data Wali Kelas Belum Tersedia" : "Ruang Kerja Wali Kelas"}
            supportingText={user.role === "TEACHER"
              ? "Akun Anda belum ditugaskan sebagai wali kelas pada rombel aktif."
              : "Halaman ini merupakan ruang kerja guru yang ditugaskan sebagai wali kelas. Admin sekolah dapat mengelola penugasan wali kelas melalui Struktur & Penugasan dan memantau kehadiran melalui Presensi Harian."}
            actionLabel={user.role === "TEACHER" ? "Kembali ke Dashboard" : "Buka Struktur & Penugasan"}
            actionHref={user.role === "TEACHER" ? "/school" : "/school/governance/organization"}
            className="p-6"
          />
        </div>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-md-on-surface">Kelas {homeroomClass.name}</h2>
            <p className="mt-0.5 text-[12.5px] text-md-on-surface-variant">{usesDepartments && homeroomClass.department?.name ? `${homeroomClass.department.name} · ` : ""}{homeroomClass.academicYear?.yearName} · {homeroomClass.academicYear?.semester}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="tonal" href="/school/attendance" size="sm" icon="fact_check">Presensi Kelas</M3Button>
            <M3Button variant="tonal" href="/school/student-affairs" size="sm" icon="school">Kesiswaan Kelas</M3Button>
            <M3Button variant="outlined" href="/school/ews" size="sm" icon="health_and_safety">EWS Terpadu</M3Button>
            <M3Button variant="text" href="/school/reports" size="sm">Cetak rekap</M3Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <M3StatCard label="Siswa aktif" value={totalStudents} tone="blue" />
          <M3StatCard label="Pelanggaran aktif" value={openViolations} tone={openViolations ? "orange" : "green"} />
          <M3StatCard label="Pembinaan aktif" value={openCoachings} tone={openCoachings ? "orange" : "green"} />
          <M3StatCard label="Prestasi tercatat" value={achievementCount} tone="teal" />
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
              {usesPkl && <div className="w-full sm:w-56">
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
              </div>}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-title-large font-bold text-md-on-surface">
                Daftar Siswa Bimbingan Rombel
              </h2>
              <p className="text-[14px] leading-5 text-md-on-surface-variant md:text-body-small">
                {usesPkl ? "Progres PKL, presensi terkini, dan aktivitas jurnal harian" : "Daftar peserta didik pada rombongan belajar aktif"}
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
                {searchQuery || (usesPkl && pklFilter !== "ALL") ? "Tidak Ditemukan" : "Belum Ada Siswa"}
              </h3>
              <p className="text-body-medium text-md-on-surface-variant mt-1">
                {searchQuery || (usesPkl && pklFilter !== "ALL")
                  ? "Tidak ada siswa yang sesuai dengan filter pencarian yang diterapkan."
                  : "Belum ada data siswa di rombongan belajar ini."}
              </p>
            </M3Card>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 md:hidden">
                {paginatedStudents.map((student: any) => {
                  const placement = student.studentPlacements?.[0];
                  const lastAttendance = placement?.attendances?.[0];
                  const lastJournal = placement?.journals?.[0];
                  const activityCount =
                    (student._count?.studentViolations || 0) +
                    (student._count?.studentCoachings || 0) +
                    (student._count?.studentAchievements || 0) +
                    (student._count?.studentPermits || 0);
                  return (
                    <M3Card key={student.id} variant="outlined" className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-[15px] font-bold text-md-primary">
                          {(student.name || "S").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[16px] font-semibold leading-5 text-md-on-surface">{student.name}</h3>
                          <p className="mt-1 text-[13px] leading-5 text-md-on-surface-variant">
                            NIS {student.studentProfile?.nis || "-"} · NISN {student.studentProfile?.nisn || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {usesPkl && (
                          <div className="rounded-[12px] bg-md-surface-container-low p-3">
                            <p className="text-[12px] font-semibold uppercase tracking-[.04em] text-md-on-surface-variant">PKL</p>
                            <p className="mt-1 text-[14px] font-semibold text-md-on-surface">{placement?.company?.name || "Belum ditempatkan"}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <M3Badge variant={lastAttendance?.status === "HADIR" ? "success" : lastAttendance ? "warning" : "outline"}>
                                Presensi: {lastAttendance?.status || "Belum ada"}
                              </M3Badge>
                              <M3Badge variant={lastJournal?.status === "APPROVED" ? "success" : lastJournal ? "warning" : "outline"}>
                                Jurnal: {lastJournal?.status || "Belum ada"}
                              </M3Badge>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {(student._count?.studentViolations || 0) > 0 && <M3Badge variant="warning">{student._count.studentViolations} pelanggaran</M3Badge>}
                          {(student._count?.studentCoachings || 0) > 0 && <M3Badge variant="secondary">{student._count.studentCoachings} pembinaan</M3Badge>}
                          {(student._count?.studentAchievements || 0) > 0 && <M3Badge variant="success">{student._count.studentAchievements} prestasi</M3Badge>}
                          {(student._count?.studentPermits || 0) > 0 && <M3Badge variant="outline">{student._count.studentPermits} izin</M3Badge>}
                          {!activityCount && <span className="text-[13px] text-md-on-surface-variant">Belum ada catatan kesiswaan.</span>}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <M3Button variant="tonal" href={"/school/students/" + student.id} className="w-full">Buka Profil</M3Button>
                        <M3Button variant="outlined" href={"/school/student-affairs?student=" + student.id} className="w-full">Kesiswaan</M3Button>
                      </div>
                    </M3Card>
                  );
                })}
              </div>

              <M3Card variant="outlined" className="hidden p-0 overflow-hidden md:block">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Nama &amp; Identitas Siswa</M3TableHead>
                      {usesPkl && <M3TableHead>Penempatan PKL</M3TableHead>}
                      {usesPkl && <M3TableHead>Presensi Terkini</M3TableHead>}
                      {usesPkl && <M3TableHead>Jurnal Harian</M3TableHead>}
                      <M3TableHead>Kesiswaan</M3TableHead>
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
                              <span className="text-[13px] font-mono md:text-label-small text-md-on-surface-variant block">
                                NIS: {student.studentProfile?.nis || "-"} • NISN: {student.studentProfile?.nisn || "-"}
                              </span>
                            </div>
                          </M3TableCell>

                          {usesPkl && (
                            <>
                            <M3TableCell>
                              {placement ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-md-primary font-semibold text-body-medium">
                                    <M3Icon name="apartment" size={14} className="shrink-0" />
                                    <span>{placement.company.name}</span>
                                  </div>
                                  <span className="text-[14px] leading-5 text-md-on-surface-variant md:text-body-small block">
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
                                  <span className="text-[13px] font-mono md:text-label-small text-md-on-surface-variant block">
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
                            </>
                          )}

                          <M3TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(student._count?.studentViolations || 0) > 0 && (
                                <M3Badge variant="warning" size="sm">{student._count.studentViolations} pelanggaran</M3Badge>
                              )}
                              {(student._count?.studentCoachings || 0) > 0 && (
                                <M3Badge variant="secondary" size="sm">{student._count.studentCoachings} pembinaan</M3Badge>
                              )}
                              {(student._count?.studentAchievements || 0) > 0 && (
                                <M3Badge variant="success" size="sm">{student._count.studentAchievements} prestasi</M3Badge>
                              )}
                              {(student._count?.studentPermits || 0) > 0 && (
                                <M3Badge variant="outline" size="sm">{student._count.studentPermits} izin</M3Badge>
                              )}
                              {!(student._count?.studentViolations || 0) &&
                               !(student._count?.studentCoachings || 0) &&
                               !(student._count?.studentAchievements || 0) &&
                               !(student._count?.studentPermits || 0) && (
                                <span className="text-[11px] text-md-on-surface-variant">Belum ada catatan</span>
                              )}
                            </div>
                          </M3TableCell>

                          <M3TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {usesPkl && (
                                <M3Button variant="text" size="sm" href="/school/pkl/monitoring">PKL</M3Button>
                              )}
                              <M3Button variant="text" size="sm" href={"/school/students/" + student.id}>Profil</M3Button>
                              <M3Button variant="text" size="sm" href={"/school/student-affairs?student=" + student.id}>Kesiswaan</M3Button>
                            </div>
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
