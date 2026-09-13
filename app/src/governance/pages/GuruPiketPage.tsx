import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
  getSchoolInfo,
} from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3TextField,
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
} from "../../client/components/m3";
import { getSchoolCapabilities } from "../../school/schoolCapabilities";

export function GuruPiketPage({ user }: { user: AuthUser }) {
  const { data: dutyReports, isLoading, refetch } = useQuery(getDutyTeacherReports);
  const { data: homeroomClass } = useQuery(getHomeroomDashboardData);
  const { data: school } = useQuery(getSchoolInfo);
  const capabilities = school ? getSchoolCapabilities(school.level) : null;
  const usesDepartments = capabilities?.usesDepartments ?? false;
  const usesPkl = capabilities?.usesPkl ?? false;

  const [lateCount, setLateCount] = useState(0);
  const [dispensationCount, setDispensationCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const paginatedReports = (dutyReports || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil((dutyReports?.length || 0) / pageSize);

  const handleSubmitDutyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await createDutyTeacherReport({
        lateStudentsCount: Number(lateCount),
        dispensationsCount: Number(dispensationCount),
        notes: notes.trim() || null,
      });
      setSuccessMsg("Laporan piket harian berhasil dikirim!");
      setLateCount(0);
      setDispensationCount(0);
      setNotes("");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengirim laporan piket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <M3Badge variant="tertiary">Piket Harian</M3Badge>
          </div>
          <h1 className="text-headline-medium font-bold text-md-on-surface">
            Laporan Guru Piket
          </h1>
          <p className="text-body-large text-md-on-surface-variant">
            Catat keterlambatan, izin dispensasi, dan ketertiban harian siswa.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Guru Piket */}
          <M3Card variant="elevated" className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                  <M3Icon name="schedule" size={18} />
                </div>
                <h2 className="text-title-medium font-bold text-md-on-surface">
                  Catat Laporan Piket
                </h2>
              </div>

              {successMsg && (
                <M3Banner
                  variant="success"
                  title="Laporan Terkirim"
                  supportingText={successMsg}
                  dismissible
                  onDismiss={() => setSuccessMsg("")}
                />
              )}

              {errorMsg && (
                <M3Banner
                  variant="error"
                  title="Gagal Mengirim Laporan"
                  supportingText={errorMsg}
                  dismissible
                  onDismiss={() => setErrorMsg("")}
                />
              )}

              <form onSubmit={handleSubmitDutyReport} className="space-y-4">
                <M3TextField
                  label="Jumlah Siswa Terlambat *"
                  type="number"
                  placeholder="0"
                  value={String(lateCount)}
                  onChange={(e) => setLateCount(Number(e.target.value) || 0)}
                  required
                />

                <M3TextField
                  label="Jumlah Surat Dispensasi *"
                  type="number"
                  placeholder="0"
                  value={String(dispensationCount)}
                  onChange={(e) => setDispensationCount(Number(e.target.value) || 0)}
                  required
                />

                <div>
                  <label className="block text-label-medium text-md-on-surface-variant mb-1 font-medium">
                    Catatan Kejadian / Dispensasi (Opsional)
                  </label>
                  <textarea
                    className="w-full rounded-md-md border border-md-outline bg-md-surface px-4 py-3 text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-transparent transition-all"
                    placeholder="Catat nama siswa atau kejadian khusus hari ini..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <M3Button
                  variant="filled"
                  icon="send"
                  loading={submitting}
                  type="submit"
                  className="w-full"
                >
                  Kirim Laporan Piket
                </M3Button>
              </form>
            </div>
          </M3Card>

          {/* History List */}
          <div className="lg:col-span-2">
            <M3Card variant="outlined" className="p-0 overflow-hidden">
              <div className="p-5 pb-3 flex justify-between items-center border-b border-md-outline/10">
                <h2 className="text-title-medium font-bold text-md-on-surface">
                  Riwayat Catatan Guru Piket
                </h2>
                <M3Badge variant="outline">
                  {dutyReports?.length || 0} Laporan
                </M3Badge>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-48 gap-2 p-6">
                  <M3CircularProgress indeterminate />
                  <p className="text-body-medium text-md-on-surface-variant">Memuat riwayat piket...</p>
                </div>
              ) : dutyReports?.length === 0 ? (
                <div className="p-12 text-center">
                  <M3Icon name="schedule" size={28} className="text-md-on-surface-variant/50 mx-auto mb-2" />
                  <h3 className="text-title-medium font-semibold text-md-on-surface">Belum Ada Riwayat</h3>
                  <p className="text-body-medium text-md-on-surface-variant mt-1">
                    Belum ada riwayat laporan piket yang dikirim.
                  </p>
                </div>
              ) : (
                <>
                  <M3Table>
                    <M3TableHeader>
                      <M3TableRow>
                        <M3TableHead>Guru Piket &amp; Tanggal</M3TableHead>
                        <M3TableHead>Siswa Terlambat</M3TableHead>
                        <M3TableHead>Dispensasi</M3TableHead>
                        <M3TableHead>Catatan Khusus</M3TableHead>
                      </M3TableRow>
                    </M3TableHeader>
                    <M3TableBody>
                      {paginatedReports.map((r) => (
                        <M3TableRow key={r.id}>
                          <M3TableCell>
                            <div className="space-y-0.5">
                              <span className="font-semibold block text-md-on-surface">
                                {r.dutyTeacher.name || r.dutyTeacher.email}
                              </span>
                              <div className="flex items-center gap-1 text-label-small font-mono text-md-on-surface-variant">
                                <M3Icon name="calendar_month" size={13} className="shrink-0" />
                                <span>
                                  {new Date(r.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                </span>
                              </div>
                            </div>
                          </M3TableCell>
                          <M3TableCell>
                            <M3Badge variant="error">
                              {r.lateStudentsCount} siswa
                            </M3Badge>
                          </M3TableCell>
                          <M3TableCell>
                            <M3Badge variant="warning">
                              {r.dispensationsCount} surat
                            </M3Badge>
                          </M3TableCell>
                          <M3TableCell>
                            {r.notes ? (
                              <span className="italic max-w-[240px] line-clamp-2 text-body-small text-md-on-surface-variant">
                                &ldquo;{r.notes}&rdquo;
                              </span>
                            ) : (
                              <span className="text-body-small text-md-on-surface-variant">-</span>
                            )}
                          </M3TableCell>
                        </M3TableRow>
                      ))}
                    </M3TableBody>
                  </M3Table>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 p-3 border-t border-md-outline/10">
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
                </>
              )}
            </M3Card>
          </div>
        </div>

        {/* Homeroom Overview Section (Wali Kelas) */}
        {homeroomClass && (
          <M3Card variant="outlined" className="p-0 overflow-hidden">
            <div className="p-5 pb-3 border-b border-md-outline/10 flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-label-large uppercase font-semibold tracking-wider text-md-primary">
                  Kelas Asuhan Saya
                </span>
                <h2 className="text-title-large font-bold text-md-on-surface mt-0.5">
                  Rombel: {homeroomClass.name}
                  {usesDepartments && homeroomClass.department ? ` (${homeroomClass.department.name})` : ""}
                </h2>
              </div>
              <M3Badge variant="primary">
                Total {homeroomClass.students.length} Siswa
              </M3Badge>
            </div>

            <M3Table>
              <M3TableHeader>
                <M3TableRow>
                  <M3TableHead>Nama Siswa</M3TableHead>
                  <M3TableHead>NIS</M3TableHead>
                  {usesPkl && <M3TableHead>Status Penempatan PKL</M3TableHead>}
                </M3TableRow>
              </M3TableHeader>
              <M3TableBody>
                {homeroomClass.students.map((s) => {
                  const activePlacement = s.studentPlacements?.[0];
                  return (
                    <M3TableRow key={s.id}>
                      <M3TableCell className="font-semibold text-md-on-surface">
                        {s.name}
                      </M3TableCell>
                      <M3TableCell className="font-mono text-md-on-surface-variant">
                        {s.studentProfile?.nis || "-"}
                      </M3TableCell>
                      {usesPkl && (
                        <M3TableCell>
                          {activePlacement ? (
                            <M3Badge variant="success">
                              PKL: {activePlacement.company?.name}
                            </M3Badge>
                          ) : (
                            <span className="italic text-body-small text-md-on-surface-variant">
                              Belum PKL
                            </span>
                          )}
                        </M3TableCell>
                      )}
                    </M3TableRow>
                  );
                })}
              </M3TableBody>
            </M3Table>
          </M3Card>
        )}
      </div>
    </SchoolLayout>
  );
}
