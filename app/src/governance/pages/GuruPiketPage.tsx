import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getDutyTeacherReports,
  createDutyTeacherReport,
  getHomeroomDashboardData,
  getSchoolInfo,
  getSchoolOrganizationData,
  getDutyAttendanceConsole,
  recordDutyAttendanceEvent,
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
  M3Dialog,
  M3Select,
} from "../../client/components/m3";
import { getSchoolCapabilities } from "../../school/schoolCapabilities";
import { DUTY_DAY_LABELS, isDutyAssignmentForDay, jakartaDutyDayCode, type DutyDayCode } from "../../school/staffAssignments";

export function GuruPiketPage({ user }: { user: AuthUser }) {
  const { data: dutyReports, isLoading, error: dutyReportsError, refetch } = useQuery(getDutyTeacherReports);
  const { data: homeroomClass } = useQuery(getHomeroomDashboardData);
  const { data: school } = useQuery(getSchoolInfo);
  const { data: organization } = useQuery(getSchoolOrganizationData);
  const dutyConsoleQuery = useQuery(getDutyAttendanceConsole);
  const dutyConsole: any = dutyConsoleQuery.data;
  const capabilities = school ? getSchoolCapabilities(school.level) : null;
  const usesDepartments = capabilities?.usesDepartments ?? false;
  const usesPkl = capabilities?.usesPkl ?? false;
  const isAdmin = !!user.isAdmin || user.role === "SUPERADMIN" || user.role === "SCHOOL_ADMIN";
  const dutyTeachers = (organization as any)?.assignments?.dutyTeachers || [];
  const myDutyAssignments = dutyTeachers.filter((assignment: any) => assignment.teacher?.id === user.id);
  const todayDutyCode = jakartaDutyDayCode();
  const scheduledToday = myDutyAssignments.some((assignment: any) =>
    isDutyAssignmentForDay(assignment.dutyDays || [], todayDutyCode),
  );
  const canSubmitDutyReport = isAdmin || dutyTeachers.length === 0 || scheduledToday;

  const [lateCount, setLateCount] = useState(0);
  const [dispensationCount, setDispensationCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [eventType, setEventType] = useState<"LATE" | "EARLY_LEAVE" | "DISPENSATION">("LATE");
  const [eventReason, setEventReason] = useState("");
  const [eventAction, setEventAction] = useState("");
  const [eventDestination, setEventDestination] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [eventBusy, setEventBusy] = useState(false);
  const [lastPass, setLastPass] = useState<any>(null);

  const studentOptions = ((dutyConsole?.students || []) as any[])
    .filter((student: any) => {
      const q = studentSearch.trim().toLowerCase();
      return !q || [student.name, student.classRoom?.name, student.studentProfile?.nis, student.studentProfile?.nisn]
        .filter(Boolean).some((value: any) => String(value).toLowerCase().includes(q));
    })
    .slice(0, 100)
    .map((student: any) => ({ value: student.id, label: `${student.name} · ${student.classRoom?.name || "Tanpa rombel"}` }));

  const submitStudentEvent = async () => {
    if (!selectedStudentId || eventReason.trim().length < 3) return;
    setEventBusy(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const result: any = await recordDutyAttendanceEvent({
        studentId: selectedStudentId, type: eventType, reason: eventReason, actionNote: eventAction || null,
        destination: eventDestination || null, guardianName: guardianName || null,
      });
      setLastPass(result.pass || null);
      setSuccessMsg(result.alreadyRecorded ? "Kejadian sebelumnya sudah tercatat; tidak dibuat duplikat." : "Kejadian siswa berhasil dicatat ke Attendance 360.");
      setEventReason(""); setEventAction(""); setEventDestination(""); setGuardianName("");
      await dutyConsoleQuery.refetch();
    } catch (err: any) { setErrorMsg(err?.message || "Kejadian belum berhasil dicatat."); }
    finally { setEventBusy(false); }
  };

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

  if (dutyReportsError && !isAdmin) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="warning"
          headline="Panel Guru Piket tidak tersedia"
          supportingText={(dutyReportsError as any)?.message || "Akun Anda tidak memiliki penugasan Guru Piket aktif."}
          actionLabel="Kembali ke Dashboard"
          actionHref="/school"
          icon="event_busy"
        />
      </SchoolLayout>
    );
  }

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

        {!isAdmin && dutyTeachers.length === 0 && (
          <M3Banner
            variant="warning"
            headline="Jadwal piket resmi belum dikonfigurasi"
            supportingText="Mode kompatibilitas masih aktif, sehingga guru tetap dapat mencatat laporan. Admin dapat menyusun jadwal dari Struktur & Penugasan."
            actionLabel="Lihat Struktur"
            actionHref="/school/governance/organization"
            icon="schedule"
          />
        )}

        {!isAdmin && dutyTeachers.length > 0 && (
          <M3Banner
            variant={scheduledToday ? "success" : "standard"}
            headline={scheduledToday ? "Anda terjadwal sebagai Guru Piket hari ini" : "Hari ini bukan jadwal piket Anda"}
            supportingText={
              myDutyAssignments.length
                ? `Jadwal Anda: ${myDutyAssignments.flatMap((assignment: any) => assignment.dutyDays || []).length ? [...new Set(myDutyAssignments.flatMap((assignment: any) => assignment.dutyDays || []))].map((day: any) => DUTY_DAY_LABELS[day as DutyDayCode]).join(", ") : "fleksibel / setiap hari"}.`
                : "Anda belum memiliki penugasan Guru Piket aktif. Laporan tetap dapat dilihat, tetapi input mengikuti jadwal resmi."
            }
            icon={scheduledToday ? "task_alt" : "event_busy"}
          />
        )}

        <M3Card variant="outlined" className="p-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">Attendance 360 · Gate Console</p><h2 className="mt-1 text-title-large font-bold">Catat Kejadian per Siswa</h2><p className="mt-1 text-xs text-md-on-surface-variant">Keterlambatan, izin pulang, dan dispensasi langsung menjadi evidence event dan direkonsiliasi ke presensi harian.</p></div>
            <div className="flex flex-wrap gap-2"><M3Badge variant="outline">{dutyConsole?.dateOnly || "Hari ini"}</M3Badge><M3Badge variant="primary">{dutyConsole?.students?.length || 0} siswa</M3Badge></div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
            <M3TextField label="Cari siswa" leadingIcon="search" value={studentSearch} onChange={(e)=>setStudentSearch(e.target.value)} placeholder="Nama / NIS / rombel"/>
            <M3Select label="Siswa" value={selectedStudentId} onChange={(e)=>setSelectedStudentId(e.target.value)} options={[{value:"",label:"Pilih siswa"},...studentOptions]}/>
            <M3Select label="Jenis kejadian" value={eventType} onChange={(e)=>setEventType(e.target.value as any)} options={[{value:"LATE",label:"Terlambat"},{value:"EARLY_LEAVE",label:"Izin Pulang"},{value:"DISPENSATION",label:"Dispensasi"}]}/>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <M3TextField label="Alasan *" value={eventReason} onChange={(e)=>setEventReason(e.target.value)} placeholder="Alasan kejadian"/>
            <M3TextField label="Tindakan / pembinaan" value={eventAction} onChange={(e)=>setEventAction(e.target.value)} placeholder="Opsional"/>
            {eventType !== "LATE" && <><M3TextField label="Tujuan" value={eventDestination} onChange={(e)=>setEventDestination(e.target.value)} placeholder="Rumah / rumah sakit / kegiatan"/><M3TextField label="Penjemput / wali" value={guardianName} onChange={(e)=>setGuardianName(e.target.value)} placeholder="Opsional"/></>}
          </div>
          <div className="flex flex-wrap items-center gap-3"><M3Button icon="fact_check" onClick={submitStudentEvent} isLoading={eventBusy} disabled={!canSubmitDutyReport || !selectedStudentId || eventReason.trim().length < 3}>Catat Kejadian</M3Button><span className="text-[11px] text-md-on-surface-variant">Request berulang untuk siswa/jenis/tanggal yang sama tidak membuat event ganda.</span></div>
          {lastPass && <div className="rounded-[12px] border border-md-primary/25 bg-md-primary/5 p-4"><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">Izin Masuk Kelas Digital</p><p className="mt-1 font-semibold">{lastPass.studentName} · {lastPass.className}</p><p className="mt-1 text-xs text-md-on-surface-variant">Terlambat {lastPass.lateMinutes} menit · diverifikasi {lastPass.verifiedBy}</p></div>}
        </M3Card>

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
                  disabled={!canSubmitDutyReport}
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
