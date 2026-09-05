import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  exportPklAttendanceReport,
  exportLmsGradesReport,
  getLmsCourses,
} from "wasp/client/operations";
import { SchoolLayout } from "../../school/components/SchoolLayout";
import {
  Printer,
  FileSpreadsheet,
  Download,
  School,
  Award,
  CheckCircle2,
  Filter,
} from "lucide-react";

export function ReportsPage({ user }: { user: AuthUser }) {
  const [reportType, setReportType] = useState<"PKL" | "LMS">("PKL");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const { data: pklReport, isLoading: loadingPkl } = useQuery(exportPklAttendanceReport);
  const { data: courses } = useQuery(getLmsCourses);
  const { data: lmsReport, isLoading: loadingLms } = useQuery(
    exportLmsGradesReport,
    { courseId: selectedCourseId || courses?.[0]?.id || "" },
    { enabled: reportType === "LMS" && (!!selectedCourseId || (courses?.length || 0) > 0) }
  );

  const handlePrint = () => {
    window.print();
  };

  const school = reportType === "PKL" ? pklReport?.school : lmsReport?.school;

  return (
    <SchoolLayout user={user}>
      {/* Action Bar (hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Pusat Cetak & Export Laporan Resmi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unduh dan cetak rekapitulasi nilai PKL & buku nilai LMS ber-KOP sekolah resmi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setReportType("PKL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                reportType === "PKL"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Rekapitulasi PKL
            </button>
            <button
              onClick={() => setReportType("LMS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                reportType === "LMS"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Buku Nilai LMS
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {reportType === "LMS" && (
        <div className="print:hidden flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Pilih Mata Pelajaran:</span>
          <select
            value={selectedCourseId || courses?.[0]?.id || ""}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none"
          >
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} ({c.classRoom.name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Official Printable Document Container */}
      <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-8 md:p-12 shadow-md print:border-none print:shadow-none print:p-0 print:m-0">
        {/* KOP Surat Resmi Sekolah */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Pemerintah Daerah Provinsi Jawa Barat • Dinas Pendidikan
          </h2>
          <h1 className="text-xl md:text-2xl font-black uppercase text-slate-900 mt-0.5">
            {school?.name || "SMK NEGERI 9 GARUT"}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            NPSN: {school?.npsn || "20209145"} • {school?.address || "Jl. Raya Bayongbong KM. 3, Garut"}
            {school?.city && ` • Kota ${school.city}`}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Telp: {school?.phone || "(0262) 234567"} • Email: {school?.email || "info@smkn9garut.sch.id"}
          </p>
        </div>

        {/* Title of Document */}
        <div className="text-center mb-6">
          <h3 className="text-base font-bold uppercase underline">
            {reportType === "PKL"
              ? "REKAPITULASI LAPORAN PELAKSANAAN PRAKTIK KERJA LAPANGAN (PKL)"
              : `DAFTAR NILAI & KEMAJUAN BELAJAR SISWA (${lmsReport?.courseTitle?.toUpperCase()})`}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Tahun Ajaran 2026/2027 • Dokumen Resmi Terverifikasi Sistem Smart School
          </p>
        </div>

        {/* PKL Table */}
        {reportType === "PKL" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                  <th className="p-2 border-r border-slate-300">No</th>
                  <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                  <th className="p-2 border-r border-slate-300">NIS</th>
                  <th className="p-2 border-r border-slate-300">Kelas / Jurusan</th>
                  <th className="p-2 border-r border-slate-300">Tempat DUDI</th>
                  <th className="p-2 border-r border-slate-300 text-center">Presensi Hadir</th>
                  <th className="p-2 border-r border-slate-300 text-center">Jurnal Disetujui</th>
                  <th className="p-2 text-center">Rata-rata Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {pklReport?.placements.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-2 border-r border-slate-300 font-mono text-center">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-bold">
                      {p.studentName}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono">
                      {p.nis || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {p.className} ({p.departmentName})
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {p.companyName}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold text-emerald-700">
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
        )}

        {/* LMS Table */}
        {reportType === "LMS" && (
          <div className="overflow-x-auto">
            <div className="mb-4 text-xs space-y-1">
              <p>Kelas: <strong>{lmsReport?.className}</strong> ({lmsReport?.departmentName})</p>
              <p>Guru Pengampu: <strong>{lmsReport?.teacherName}</strong></p>
            </div>
            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                  <th className="p-2 border-r border-slate-300">No</th>
                  <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                  <th className="p-2 border-r border-slate-300">NIS</th>
                  <th className="p-2 border-r border-slate-300 text-center">Kehadiran (%)</th>
                  <th className="p-2 border-r border-slate-300 text-center">Rata-rata Tugas</th>
                  <th className="p-2 border-r border-slate-300 text-center">Rata-rata CBT</th>
                  <th className="p-2 text-center font-bold">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {lmsReport?.studentsGradebook?.map((sg, idx) => (
                  <tr key={sg.studentId}>
                    <td className="p-2 border-r border-slate-300 font-mono text-center">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-bold">
                      {sg.studentName}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono">
                      {sg.nis || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">
                      {sg.attendancePercentage}%
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">
                      {sg.averageAssignment ?? "-"}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">
                      {sg.averageExam ?? "-"}
                    </td>
                    <td className="p-2 text-center font-bold font-mono text-indigo-800">
                      {sg.finalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signatures Section */}
        <div className="mt-12 pt-6 grid grid-cols-2 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala SMKN 9 Garut</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Dra. Hj. Nurjanah, M.Pd.</p>
            <p className="text-slate-500 font-mono">NIP. 196805121994032001</p>
          </div>

          <div>
            <p>Garut, {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
            <p className="font-semibold">
              {reportType === "PKL" ? "Koordinator Pokja PKL" : "Guru Mata Pelajaran"}
            </p>
            <div className="h-16"></div>
            <p className="font-bold underline">
              {reportType === "PKL"
                ? "Suhendar Aryadi, S.Kom., M.T."
                : lmsReport?.teacherName || "Guru Pengampu"}
            </p>
            <p className="text-slate-500 font-mono">NIP. 198502102009021003</p>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
