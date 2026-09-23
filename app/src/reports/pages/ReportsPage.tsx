import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  exportPklAttendanceReport,
  exportLmsGradesReport,
  getClassRoomAttendanceReport,
  getActiveStudentCertificateData,
  getSchoolReportContext,
  getLmsCourses,
  getSchoolInfo,
} from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3Select,
  M3TextField,
  M3Tabs,
  M3CircularProgress,
  M3Banner,
  M3Text,
  M3Icon,
} from "../../client/components/m3";
import { getSchoolCapabilities } from "../../school/schoolCapabilities";

export function ReportsPage({ user }: { user: AuthUser }) {
  const { data: schoolInfo } = useQuery(getSchoolInfo);
  const { data: reportContext } = useQuery(getSchoolReportContext);
  const { data: courses } = useQuery(getLmsCourses);

  const capabilities = schoolInfo ? getSchoolCapabilities(schoolInfo.level) : null;
  const isVocational = capabilities?.usesPkl ?? false;
  const usesDepartments = capabilities?.usesDepartments ?? false;

  // Document Type Tabs based on School Level
  const reportTabs = [
    ...(isVocational ? [{ id: "PKL", label: "Rekapitulasi PKL" }] : []),
    { id: "PRESENSI", label: "Rekap Presensi Rombel" },
    { id: "SURAT_AKTIF", label: "Surat Keterangan Aktif" },
    { id: "LMS", label: "Buku Nilai LMS" },
  ];

  const [reportType, setReportType] = useState<string>(isVocational ? "PKL" : "PRESENSI");

  // If school changes level or not vocational, ensure reportType is valid
  useEffect(() => {
    if (!isVocational && reportType === "PKL") {
      setReportType("PRESENSI");
    }
  }, [isVocational, reportType]);

  // Parameters: Presensi Rombel
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Parameters: Surat Keterangan Aktif
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [letterNumber, setLetterNumber] = useState<string>("");
  const [letterPurpose, setLetterPurpose] = useState<string>("");
  const [headmasterName, setHeadmasterName] = useState<string>("");
  const [headmasterNip, setHeadmasterNip] = useState<string>("");
  const [letterDate, setLetterDate] = useState<string>(
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  // Parameters: LMS
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [logoError, setLogoError] = useState(false);

  // Sync default selectors when context loads
  useEffect(() => {
    if (reportContext?.classRooms?.length && !selectedClassId) {
      setSelectedClassId(reportContext.classRooms[0].id);
    }
    if (reportContext?.students?.length && !selectedStudentId) {
      setSelectedStudentId(reportContext.students[0].id);
    }
  }, [reportContext, selectedClassId, selectedStudentId]);

  // Queries
  const { data: pklReport, isLoading: loadingPkl } = useQuery(
    exportPklAttendanceReport,
    undefined,
    { enabled: isVocational && reportType === "PKL" }
  );

  const { data: attendanceReport, isLoading: loadingAttendance } = useQuery(
    getClassRoomAttendanceReport,
    {
      classRoomId: selectedClassId || undefined,
      month: Number(selectedMonth) || undefined,
      year: new Date().getFullYear(),
    },
    { enabled: reportType === "PRESENSI" }
  );

  const { data: certReport, isLoading: loadingCert } = useQuery(
    getActiveStudentCertificateData,
    { studentId: selectedStudentId || undefined },
    { enabled: reportType === "SURAT_AKTIF" }
  );

  const { data: lmsReport, isLoading: loadingLms } = useQuery(
    exportLmsGradesReport,
    { courseId: selectedCourseId || courses?.[0]?.id || "" },
    { enabled: reportType === "LMS" && (!!selectedCourseId || (courses?.length || 0) > 0) }
  );

  const handlePrint = () => {
    window.print();
  };

  // Determine active school details
  const activeSchool =
    schoolInfo ||
    reportContext?.school ||
    pklReport?.school ||
    attendanceReport?.school ||
    certReport?.school ||
    lmsReport?.school;

  // Options
  const classOptions = [
    ...(reportContext?.classRooms?.map((c) => ({
      value: c.id,
      label: `${c.name}${usesDepartments && c.department ? ` (${c.department.code})` : ""}`,
    })) || []),
  ];

  const studentOptions = [
    ...(reportContext?.students?.map((s) => ({
      value: s.id,
      label: `${s.name}${s.classRoom ? ` - ${s.classRoom.name}` : ""}${
        s.studentProfile?.nisn ? ` (NISN: ${s.studentProfile.nisn})` : ""
      }`,
    })) || []),
  ];

  const monthOptions = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const courseOptions = [
    ...(courses?.map((c) => ({
      value: c.id,
      label: `${c.subjectName} (${c.classRoom.name})`,
    })) || []),
  ];

  const isLoadingCurrent =
    (reportType === "PKL" && loadingPkl) ||
    (reportType === "PRESENSI" && loadingAttendance) ||
    (reportType === "SURAT_AKTIF" && loadingCert) ||
    (reportType === "LMS" && loadingLms);

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Action Toolbar Card (hidden when printing) */}
        <div className="print:hidden space-y-4">
          <M3Banner
            variant="info"
            headline="Cetak Dokumen &amp; Laporan Sekolah"
            supportingText={`KOP surat, logo dinas, dan identitas disesuaikan otomatis dengan jenjang ${
              activeSchool?.level === "SD_MI"
                ? "SD / MI"
                : activeSchool?.level === "SMP_MTS"
                ? "SMP / MTs"
                : "SMA / SMK"
            }.`}
            icon="print"
          />

          <M3Card variant="elevated" className="p-5">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <M3Badge variant="primary">Dokumen Resmi</M3Badge>
                    <span className="text-xs text-md-on-surface-variant font-medium">
                      Jenjang: {activeSchool?.level?.replace("_", " ") || "SMP / MTs"}
                    </span>
                  </div>
                  <h1 className="text-headline-medium font-bold text-md-on-surface">
                    Cetak Dokumen &amp; Laporan
                  </h1>
                  <p className="text-body-medium text-md-on-surface-variant">
                    Pilih format dokumen lalu klik "Cetak / Simpan PDF".
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <M3Tabs
                    tabs={reportTabs}
                    activeTab={reportType}
                    onChange={(val) => setReportType(val)}
                  />

                  <M3Button
                    variant="filled"
                    icon="print"
                    onClick={handlePrint}
                  >
                    Cetak / Simpan PDF
                  </M3Button>
                </div>
              </div>

              {/* Dynamic Filter Controls per Tab */}
              <div className="pt-2 border-t border-md-outline/10">
                {reportType === "PRESENSI" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <M3Select
                      label="Pilih Rombel Kelas"
                      options={classOptions}
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                    />
                    <M3Select
                      label="Pilih Bulan Rekap"
                      options={monthOptions}
                      value={String(selectedMonth)}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    />
                  </div>
                )}

                {reportType === "SURAT_AKTIF" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <M3Select
                        label="Pilih Peserta Didik *"
                        options={studentOptions}
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                      />
                      <M3TextField
                        label="Nomor Surat Resmi *"
                        placeholder="Contoh: 421.2/015/SMPN1/2026"
                        value={letterNumber}
                        onChange={(e) => setLetterNumber(e.target.value)}
                      />
                      <M3TextField
                        label="Tanggal Surat"
                        value={letterDate}
                        onChange={(e) => setLetterDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <M3TextField
                          label="Keperluan Pembuatan Surat *"
                          placeholder="Contoh: Pengurusan Beasiswa PIP / Lomba Tingkat Kota"
                          value={letterPurpose}
                          onChange={(e) => setLetterPurpose(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:col-span-1">
                        <M3TextField
                          label="Nama Kepala Sekolah"
                          value={headmasterName}
                          onChange={(e) => setHeadmasterName(e.target.value)}
                        />
                        <M3TextField
                          label="NIP Kepala Sekolah"
                          value={headmasterNip}
                          onChange={(e) => setHeadmasterNip(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {reportType === "LMS" && (
                  <div className="max-w-md">
                    <M3Select
                      label="Pilih Mata Pelajaran"
                      options={courseOptions}
                      value={selectedCourseId || courses?.[0]?.id || ""}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    />
                  </div>
                )}

                {reportType === "PKL" && (
                  <p className="text-body-small text-md-on-surface-variant italic">
                    Menampilkan rekapitulasi data Praktik Kerja Lapangan (PKL) seluruh peserta didik aktif di mitra DUDI.
                  </p>
                )}
              </div>
            </div>
          </M3Card>
        </div>

        {/* Loading Indicator */}
        {isLoadingCurrent && (
          <div className="flex justify-center p-8 print:hidden">
            <M3CircularProgress />
          </div>
        )}

        {/* Official Printable Document Container (Styled as A4 Paper) */}
        <div className="bg-white text-slate-900 border border-slate-200 rounded-[16px] p-8 md:p-12 shadow-[0_1px_2px_rgba(0,0,0,.05)] print:border-none print:shadow-none print:p-0 print:m-0 max-w-4xl mx-auto">
          {/* KOP Surat Resmi Sekolah */}
          <div className="border-b-[3px] border-double border-slate-900 pb-4 mb-6 flex items-center gap-6">
            {/* Logo Sekolah */}
            <div className="shrink-0 w-24 h-24 flex items-center justify-center">
              {activeSchool?.logoUrl && !logoError ? (
                <img
                  src={activeSchool.logoUrl}
                  alt={`Logo ${activeSchool.name}`}
                  className="w-20 h-20 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center text-slate-800 text-center p-1">
                  <span className="material-symbols-rounded text-2xl">account_balance</span>
                  <span className="text-[9px] font-bold uppercase leading-tight mt-0.5">
                    Tut Wuri Handayani
                  </span>
                </div>
              )}
            </div>

            {/* Teks Lembaga & Legalitas KOP */}
            <div className="flex-1 text-center pr-12">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                PEMERINTAH DAERAH PROVINSI {activeSchool?.province?.toUpperCase() || "-"}
              </h3>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h4>
              <h1 className="text-lg md:text-xl font-black uppercase text-slate-900 tracking-wide mt-0.5">
                {activeSchool?.name || "NAMA SATUAN PENDIDIKAN BELUM DIISI"}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                NPSN: {activeSchool?.npsn || "-"} • Alamat: {activeSchool?.address || "-"}
                {activeSchool?.city ? `, ${activeSchool.city}` : ""}
                {activeSchool?.province ? `, ${activeSchool.province}` : ""}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Telepon: {activeSchool?.phone || "-"} • Pos-el: {activeSchool?.email || "-"}
              </p>
            </div>
          </div>

          {/* DOKUMEN 1: REKAP PRESENSI ROMBEL */}
          {reportType === "PRESENSI" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold uppercase tracking-wide underline">
                  REKAPITULASI PRESENSI HARIAN &amp; KEHADIRAN PESERTA DIDIK
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Bulan {attendanceReport?.monthName} {attendanceReport?.year} • Tahun Ajaran{" "}
                  {attendanceReport?.classRoom?.academicYear || "-"} (Semester{" "}
                  {attendanceReport?.classRoom?.semester || "-"})
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-700 pb-2 border-b border-slate-200">
                <div>
                  <p>
                    Rombel Kelas:{" "}
                    <strong>{attendanceReport?.classRoom?.name || "Kelas Belum Dipilih"}</strong>
                    {usesDepartments && attendanceReport?.classRoom?.departmentName &&
                      ` (${attendanceReport.classRoom.departmentName})`}
                  </p>
                  <p>
                    Wali Kelas:{" "}
                    <strong>{attendanceReport?.classRoom?.homeroomTeacherName || "-"}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p>Total Peserta Didik: <strong>{attendanceReport?.studentsAttendance?.length || 0} Siswa</strong></p>
                  <p>Status: <strong>Terverifikasi Sistem Smart School</strong></p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[11px]">
                      <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-slate-300">Nama Lengkap Peserta Didik</th>
                      <th className="p-2 border-r border-slate-300 font-mono text-center">NIS / NISN</th>
                      <th className="p-2 border-r border-slate-300 text-center w-12">L/P</th>
                      <th className="p-2 border-r border-slate-300 text-center w-14 bg-md-secondary-container/55 text-md-on-secondary-container">
                        Hadir (H)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-center w-14 bg-md-primary-container/55 text-md-on-primary-container">
                        Sakit (S)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-center w-14 bg-md-tertiary-container/55 text-md-on-tertiary-container">
                        Izin (I)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-center w-14 bg-rose-50 text-rose-800">
                        Alpa (A)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-center w-16 bg-amber-50 text-amber-800">
                        Terlambat (T)
                      </th>
                      <th className="p-2 text-center w-20 font-bold">Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {(!attendanceReport?.studentsAttendance ||
                      attendanceReport.studentsAttendance.length === 0) && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500 italic">
                          Belum ada peserta didik terdaftar pada rombel kelas ini.
                        </td>
                      </tr>
                    )}
                    {attendanceReport?.studentsAttendance?.map((st, idx) => (
                      <tr key={st.studentId} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold">
                          {st.name}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {st.nis !== "-" ? st.nis : st.nisn}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center">
                          {st.gender}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-md-on-secondary-container">
                          {st.hadir}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {st.sakit}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {st.izin}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-rose-600">
                          {st.alpa}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-amber-700">
                          {st.terlambat}
                        </td>
                        <td className="p-2 text-center font-bold font-mono">
                          {st.rate ?? "-"}{st.rate !== null ? "%" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Wali Kelas & Kepala Sekolah */}
              <div className="mt-12 pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Kepala {activeSchool?.name || "Satuan Pendidikan"}</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{headmasterName}</p>
                  <p className="text-slate-500 font-mono">NIP. {headmasterNip}</p>
                </div>

                <div>
                  <p>
                    {activeSchool?.city || "-"},{" "}
                    {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                  <p className="font-semibold">Wali Kelas</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">
                    {attendanceReport?.classRoom?.homeroomTeacherName || "Wali Kelas"}
                  </p>
                  <p className="text-slate-500 font-mono">
                    NIP. {attendanceReport?.classRoom?.homeroomTeacherNip || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DOKUMEN 2: SURAT KETERANGAN SISWA AKTIF */}
          {reportType === "SURAT_AKTIF" && (
            <div className="space-y-6 text-xs text-slate-800 leading-relaxed px-4">
              <div className="text-center">
                <h2 className="text-base font-black uppercase tracking-wider underline">
                  SURAT KETERANGAN AKTIF SEKOLAH
                </h2>
                <p className="font-mono text-xs text-slate-700 mt-1">
                  Nomor: {letterNumber || "-"}
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <p>
                  Yang bertanda tangan di bawah ini Kepala{" "}
                  <strong>{activeSchool?.name || "Satuan Pendidikan"}</strong>, menerangkan dengan
                  sebenarnya bahwa:
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 max-w-xl mx-auto text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="col-span-2 font-bold text-slate-900">
                      : {certReport?.student?.name || "Pilih Peserta Didik"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Nomor Induk Siswa (NIS)</span>
                    <span className="col-span-2 font-mono">: {certReport?.student?.nis || "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">NISN</span>
                    <span className="col-span-2 font-mono">: {certReport?.student?.nisn || "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Jenis Kelamin</span>
                    <span className="col-span-2">: {certReport?.student?.gender || "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Rombel / Kelas</span>
                    <span className="col-span-2 font-bold">: {certReport?.student?.className || "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Tahun Pelajaran</span>
                    <span className="col-span-2">: {certReport?.student?.academicYear || "-"}</span>
                  </div>
                </div>

                <p>
                  Adalah benar nama yang tercantum di atas merupakan peserta didik yang terdaftar aktif
                  mengikuti kegiatan belajar mengajar pada semester berjalan di{" "}
                  <strong>{activeSchool?.name || "Satuan Pendidikan"}</strong> dengan catatan
                  berkelakuan baik serta mematuhi seluruh tata tertib sekolah.
                </p>

                <p>
                  Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan:{" "}
                  <strong className="underline">{letterPurpose}</strong>.
                </p>

                <p>
                  Demikian surat keterangan ini dibuat dengan sesungguhnya untuk dapat dipergunakan
                  sebagaimana mestinya bagi yang berkepentingan.
                </p>
              </div>

              {/* Tanda Tangan Resmi Kepala Sekolah */}
              <div className="pt-10 flex justify-end">
                <div className="w-64 text-center">
                  <p>
                    Ditetapkan di: {activeSchool?.city || "-"}
                  </p>
                  <p>Pada tanggal: {letterDate}</p>
                  <p className="font-semibold mt-2">
                    Kepala {activeSchool?.name || "Sekolah"}
                  </p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-[11px] text-slate-600 font-medium italic">( Tanda Tangan &amp; Cap Dinas )</span>
                  </div>
                  <p className="font-bold underline text-sm">{headmasterName}</p>
                  <p className="text-slate-600 font-mono">NIP. {headmasterNip}</p>
                </div>
              </div>
            </div>
          )}

          {/* DOKUMEN 3: BUKU NILAI LMS */}
          {reportType === "LMS" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold uppercase tracking-wide underline">
                  DAFTAR NILAI &amp; KEMAJUAN BELAJAR SISWA
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Mata Pelajaran: <strong>{lmsReport?.courseTitle || "LMS"}</strong> • Rombel Kelas:{" "}
                  <strong>{lmsReport?.className}</strong>{usesDepartments && lmsReport?.departmentName ? ` (${lmsReport.departmentName})` : ""}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-700 pb-2 border-b border-slate-200">
                <p>Guru Pengampu: <strong>{lmsReport?.teacherName || "Guru Pengampu"}</strong></p>
                <p>Tahun Ajaran: <strong>{lmsReport?.academicYear || "-"}</strong></p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                      <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                      <th className="p-2 border-r border-slate-300 text-center font-mono">NIS</th>
                      <th className="p-2 border-r border-slate-300 text-center">Kehadiran (%)</th>
                      <th className="p-2 border-r border-slate-300 text-center">Rata-rata Tugas</th>
                      <th className="p-2 border-r border-slate-300 text-center">Rata-rata CBT</th>
                      <th className="p-2 text-center font-bold">Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {(!lmsReport?.studentsGradebook || lmsReport.studentsGradebook.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                          Belum ada peserta didik atau nilai tugas pada mata pelajaran ini.
                        </td>
                      </tr>
                    )}
                    {lmsReport?.studentsGradebook?.map((sg, idx) => (
                      <tr key={sg.studentId} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 font-mono text-center">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold">
                          {sg.studentName}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-mono text-center">
                          {sg.nis || "-"}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {sg.attendancePercentage ?? "-"}{sg.attendancePercentage !== null ? "%" : ""}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {sg.averageAssignment ?? "-"}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">
                          {sg.averageExam ?? "-"}
                        </td>
                        <td className="p-2 text-center font-bold font-mono text-md-on-secondary-container">
                          {sg.finalScore ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="mt-12 pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Kepala {activeSchool?.name || "Sekolah"}</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{headmasterName}</p>
                  <p className="text-slate-500 font-mono">NIP. {headmasterNip}</p>
                </div>

                <div>
                  <p>
                    {activeSchool?.city || "-"},{" "}
                    {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                  <p className="font-semibold">Guru Pengampu Mata Pelajaran</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">
                    {lmsReport?.teacherName || "Guru Pengampu"}
                  </p>
                  <p className="text-slate-500 font-mono">Guru Terverifikasi</p>
                </div>
              </div>
            </div>
          )}

          {/* DOKUMEN 4: REKAPITULASI PKL (KHUSUS SMA / SMK) */}
          {reportType === "PKL" && isVocational && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold uppercase tracking-wide underline">
                  REKAPITULASI LAPORAN PELAKSANAAN PRAKTIK KERJA LAPANGAN (PKL)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Tahun Ajaran 2026/2027 • Dokumen Resmi Terverifikasi Sistem Smart School
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                      <th className="p-2 border-r border-slate-300 text-center">No</th>
                      <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                      <th className="p-2 border-r border-slate-300 text-center font-mono">NIS</th>
                      <th className="p-2 border-r border-slate-300">{usesDepartments ? "Kelas / Jurusan" : "Kelas"}</th>
                      <th className="p-2 border-r border-slate-300">Tempat DUDI</th>
                      <th className="p-2 border-r border-slate-300 text-center">Presensi Hadir</th>
                      <th className="p-2 border-r border-slate-300 text-center">Jurnal Disetujui</th>
                      <th className="p-2 text-center font-bold">Rata-rata Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {(!pklReport?.placements || pklReport.placements.length === 0) && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                          Belum ada data penempatan PKL aktif.
                        </td>
                      </tr>
                    )}
                    {pklReport?.placements?.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 font-mono text-center">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold">
                          {p.studentName}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-mono text-center">
                          {p.nis || "-"}
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          {p.className}{usesDepartments && p.departmentName ? ` (${p.departmentName})` : ""}
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          {p.companyName}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-md-on-secondary-container">
                          {p.stats.hadirCount} Hari
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center">
                          {p.stats.approvedJournals} Jurnal
                        </td>
                        <td className="p-2 text-center font-bold font-mono">
                          {p.stats.averageJournalScore ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan PKL */}
              <div className="mt-12 pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Kepala {activeSchool?.name || "SMK"}</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{headmasterName}</p>
                  <p className="text-slate-500 font-mono">NIP. {headmasterNip}</p>
                </div>

                <div>
                  <p>
                    {activeSchool?.city || "Bandung"},{" "}
                    {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                  <p className="font-semibold">Koordinator Pokja PKL</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">Koordinator Hubin / Pokja</p>
                  <p className="text-slate-500 font-mono">NIP. 198502102009021003</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SchoolLayout>
  );
}
