import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getSchoolInfo,
  importStudentsFromDapodik,
  previewStudentsFromDapodik,
  importTeachersFromCsv,
  importCompaniesFromCsv,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Card,
  M3Button,
  M3Badge,
  M3Tabs,
  M3Banner,
  M3Icon,
  type M3TabItem,
} from "../../client/components/m3";
import { parseDapodikXlsx } from "../import/dapodikXlsx";
import type { DapodikStudentRow } from "../import/dapodikFormat";

type ImportType = "STUDENTS" | "TEACHERS" | "COMPANIES";

type LegacyResult = {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: string[];
};

type DapodikPreview = {
  totalRows: number;
  createCount: number;
  updateCount: number;
  invalidCount: number;
  unmatchedClassCount: number;
  warningCount: number;
  previewRows: Array<{
    sourceRow: number;
    name: string;
    nis: string | null;
    nisn: string | null;
    currentClassName: string | null;
    matchedClassName: string | null;
    action: "CREATE" | "UPDATE" | "INVALID";
    issues: string[];
  }>;
  previewTruncated: boolean;
};

type DapodikResult = {
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  successCount: number;
  failedCount: number;
  unmatchedClassCount: number;
  errors: string[];
  errorsTruncated: boolean;
};

function actionBadge(action: DapodikPreview["previewRows"][number]["action"]) {
  if (action === "CREATE") return <M3Badge variant="success" size="sm">Baru</M3Badge>;
  if (action === "UPDATE") return <M3Badge variant="primary" size="sm">Update</M3Badge>;
  return <M3Badge variant="error" size="sm">Invalid</M3Badge>;
}

export function CsvImportPage({ user }: { user: AuthUser }) {
  const { data: school } = useQuery(getSchoolInfo);
  const schoolLevel = school?.level || "SMA_SMK";
  const isVocationalOrHighSchool = schoolLevel === "SMA_SMK";

  const [activeTab, setActiveTab] = useState<ImportType>("STUDENTS");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [legacyResult, setLegacyResult] = useState<LegacyResult | null>(null);
  const [dapodikResult, setDapodikResult] = useState<DapodikResult | null>(null);
  const [dapodikRows, setDapodikRows] = useState<DapodikStudentRow[]>([]);
  const [dapodikPreview, setDapodikPreview] = useState<DapodikPreview | null>(null);
  const [recognizedColumns, setRecognizedColumns] = useState(0);
  const [headerRowNumber, setHeaderRowNumber] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const templates: Record<
    Exclude<ImportType, "STUDENTS">,
    { title: string; filename: string; sample: string; desc: string }
  > = {
    TEACHERS: {
      title: "Data Guru & Tendik",
      filename: "template_guru.csv",
      desc: "Format CSV untuk pendaftaran akun guru dan tendik. Mendukung penugasan Waka.",
      sample: `nama,nip,gelar,hp,email,is_waka
Guru Contoh 01,190000000000000001,S.Pd.,080000000001,guru01@example.sch.id,ya
Guru Contoh 02,190000000000000002,S.Kom.,080000000002,guru02@example.sch.id,tidak`,
    },
    COMPANIES: {
      title: "Mitra DUDI / Tempat PKL",
      filename: "template_dudi.csv",
      desc: "Format CSV untuk master tempat PKL, lengkap dengan koordinat dan radius presensi GPS.",
      sample: `nama_perusahaan,sektor,alamat,pic_nama,pic_hp,latitude,longitude,radius_meter,kuota
PT Contoh Teknologi,Teknologi Informasi,Alamat contoh,Kontak Contoh,080000000011,-6.9000,107.6000,100,5`,
    },
  };

  const tabs: M3TabItem[] = [
    { id: "STUDENTS", label: "Data Siswa", icon: <M3Icon name="groups" size={18} /> },
    { id: "TEACHERS", label: "Data Guru & Tendik", icon: <M3Icon name="badge" size={18} /> },
    ...(isVocationalOrHighSchool
      ? [{ id: "COMPANIES", label: "Mitra DUDI / PKL", icon: <M3Icon name="apartment" size={18} /> }]
      : []),
  ];

  const resetState = () => {
    setSelectedFile(null);
    setCsvContent("");
    setLegacyResult(null);
    setDapodikResult(null);
    setDapodikRows([]);
    setDapodikPreview(null);
    setRecognizedColumns(0);
    setHeaderRowNumber(0);
    setErrorMsg("");
  };

  const handleStudentFile = async (file: File) => {
    setIsPreviewing(true);
    setErrorMsg("");
    setDapodikPreview(null);
    setDapodikResult(null);
    setDapodikRows([]);

    try {
      const parsed = await parseDapodikXlsx(file);
      setRecognizedColumns(parsed.recognizedColumns);
      setHeaderRowNumber(parsed.headerRowNumber);
      setDapodikRows(parsed.rows);

      const preview = await previewStudentsFromDapodik({ rows: parsed.rows });
      setDapodikPreview(preview as DapodikPreview);
    } catch (error: any) {
      setErrorMsg(error?.message || "File Dapodik tidak dapat diproses.");
      setSelectedFile(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setLegacyResult(null);
    setDapodikResult(null);
    setErrorMsg("");
    if (!file) return;

    if (activeTab === "STUDENTS") {
      await handleStudentFile(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setCsvContent(String(loadEvent.target?.result ?? ""));
    };
    reader.onerror = () => {
      setErrorMsg("Berkas CSV tidak dapat dibaca.");
      setSelectedFile(null);
    };
    reader.readAsText(file);
  };

  const handleLegacySample = () => {
    if (activeTab === "STUDENTS") return;
    setCsvContent(templates[activeTab].sample);
    setSelectedFile(null);
    setLegacyResult(null);
    setErrorMsg("");
  };

  const handleImport = async () => {
    setErrorMsg("");
    setIsUploading(true);
    setLegacyResult(null);
    setDapodikResult(null);

    try {
      if (activeTab === "STUDENTS") {
        if (!dapodikPreview || dapodikRows.length === 0) {
          throw new Error("Pilih file .xlsx Dapodik dan tunggu proses preview selesai.");
        }
        const result = await importStudentsFromDapodik({
          rows: dapodikRows,
          confirm: true,
        });
        setDapodikResult(result as DapodikResult);
        return;
      }

      if (!csvContent.trim()) {
        throw new Error("Harap masukkan atau upload konten CSV terlebih dahulu.");
      }

      const result =
        activeTab === "TEACHERS"
          ? await importTeachersFromCsv({ csvContent })
          : await importCompaniesFromCsv({ csvContent });
      setLegacyResult(result as LegacyResult);
    } catch (error: any) {
      setErrorMsg(error?.message || "Terjadi kesalahan saat memproses berkas.");
    } finally {
      setIsUploading(false);
    }
  };

  const isStudentImport = activeTab === "STUDENTS";
  const legacyTemplate = isStudentImport ? null : templates[activeTab];

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-medium text-md-on-surface">Import Data</h2>
          <p className="mt-0.5 text-xs text-md-on-surface-variant sm:text-sm">
            Data siswa menggunakan format Excel Dapodik; guru dan mitra tetap mendukung CSV.
          </p>
        </div>

        <M3Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId as ImportType);
            resetState();
          }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <M3Card variant="elevated" className="space-y-5 p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-md-on-surface">
                      {isStudentImport ? "Impor Peserta Didik dari Dapodik" : `Unggah ${legacyTemplate?.title}`}
                    </h3>
                    {isStudentImport && (
                      <M3Badge variant="primary" size="sm">Format resmi Dapodik</M3Badge>
                    )}
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-md-on-surface-variant">
                    {isStudentImport
                      ? "Gunakan file Daftar Peserta Didik (.xlsx) hasil unduhan Dapodik tanpa mengubah nama atau urutan kolom. File dibaca untuk preview terlebih dahulu dan belum menyimpan data."
                      : legacyTemplate?.desc}
                  </p>
                </div>
                {!isStudentImport && (
                  <M3Button variant="tonal" size="sm" icon="description" onClick={handleLegacySample}>
                    Isi Contoh Format
                  </M3Button>
                )}
              </div>

              <div className="rounded-[16px] border-2 border-dashed border-md-outline-variant/60 p-6 text-center transition-colors hover:bg-md-on-surface/4">
                <input
                  type="file"
                  id="school-import-file"
                  accept={isStudentImport ? ".xlsx" : ".csv,.txt"}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <label htmlFor="school-import-file" className="flex cursor-pointer flex-col items-center gap-2">
                  <div className="flex size-12 items-center justify-center rounded-full bg-md-primary-container text-md-on-primary-container">
                    <M3Icon name={isStudentImport ? "table_view" : "cloud_upload"} size={26} />
                  </div>
                  <span className="text-sm font-semibold text-md-on-surface">
                    {selectedFile
                      ? selectedFile.name
                      : isStudentImport
                        ? "Pilih File Excel Dapodik"
                        : "Pilih atau Seret Berkas CSV"}
                  </span>
                  <span className="text-xs text-md-on-surface-variant">
                    {isStudentImport ? ".xlsx · maksimal 10 MB" : ".csv atau .txt · maksimal 5 MB"}
                  </span>
                </label>
              </div>

              {isPreviewing && (
                <div className="flex items-center gap-3 rounded-[14px] bg-md-surface-container px-4 py-3 text-sm text-md-on-surface-variant">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  Membaca struktur Dapodik dan memvalidasi data...
                </div>
              )}

              {!isStudentImport && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-md-on-surface-variant">
                    Atau Tempel / Edit Konten CSV Langsung
                  </label>
                  <textarea
                    value={csvContent}
                    onChange={(event) => setCsvContent(event.target.value)}
                    placeholder="nama,nip,..."
                    rows={8}
                    className="w-full rounded-[12px] border border-md-outline bg-transparent p-3 font-mono text-xs text-md-on-surface placeholder:text-md-outline focus:border-md-primary focus:outline-none focus:ring-1 focus:ring-md-primary"
                  />
                </div>
              )}

              {dapodikPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      ["Total", dapodikPreview.totalRows, "outline"],
                      ["Baru", dapodikPreview.createCount, "success"],
                      ["Update", dapodikPreview.updateCount, "primary"],
                      ["Invalid", dapodikPreview.invalidCount, "error"],
                      ["Rombel belum cocok", dapodikPreview.unmatchedClassCount, "warning"],
                    ].map(([label, value, tone]) => (
                      <div key={String(label)} className="rounded-[12px] border border-md-outline-variant/35 bg-md-surface-container-low p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-md-on-surface-variant">
                          {label}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-md-on-surface">{value}</p>
                        <div className="mt-1">
                          <M3Badge variant={tone as any} size="sm">{label}</M3Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <M3Banner
                    variant={dapodikPreview.invalidCount ? "warning" : "success"}
                    headline="Preview Dapodik siap"
                    supportingText={`${recognizedColumns} kolom dikenali. Header terdeteksi pada baris ${headerRowNumber}. Belum ada data yang disimpan. ${dapodikPreview.invalidCount ? "Baris invalid akan dilewati jika impor dilanjutkan." : "Semua baris siap diproses."}`}
                  />

                  <div className="overflow-hidden rounded-[14px] border border-md-outline-variant/40">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-md-surface-container">
                          <tr className="text-md-on-surface-variant">
                            <th className="px-3 py-2.5 font-semibold">Baris</th>
                            <th className="px-3 py-2.5 font-semibold">Nama</th>
                            <th className="px-3 py-2.5 font-semibold">NIPD / NIS</th>
                            <th className="px-3 py-2.5 font-semibold">NISN</th>
                            <th className="px-3 py-2.5 font-semibold">Rombel Dapodik</th>
                            <th className="px-3 py-2.5 font-semibold">Aksi</th>
                            <th className="px-3 py-2.5 font-semibold">Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dapodikPreview.previewRows.slice(0, 25).map((row) => (
                            <tr key={row.sourceRow} className="border-t border-md-outline-variant/25 align-top">
                              <td className="px-3 py-2.5 font-mono text-md-on-surface-variant">{row.sourceRow}</td>
                              <td className="px-3 py-2.5 font-medium text-md-on-surface">{row.name}</td>
                              <td className="px-3 py-2.5 font-mono text-md-on-surface-variant">{row.nis || "—"}</td>
                              <td className="px-3 py-2.5 font-mono text-md-on-surface-variant">{row.nisn || "—"}</td>
                              <td className="px-3 py-2.5 text-md-on-surface-variant">
                                {row.currentClassName || "—"}
                                {row.matchedClassName && row.matchedClassName !== row.currentClassName && (
                                  <span className="block text-[10px] text-md-secondary">→ {row.matchedClassName}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">{actionBadge(row.action)}</td>
                              <td className="max-w-[280px] px-3 py-2.5 text-md-on-surface-variant">
                                {row.issues.length ? row.issues.join(" ") : "Siap diproses."}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(dapodikPreview.previewRows.length > 25 || dapodikPreview.previewTruncated) && (
                      <div className="border-t border-md-outline-variant/25 bg-md-surface-container-low px-3 py-2 text-[11px] text-md-on-surface-variant">
                        Preview tabel dibatasi. Seluruh baris tetap divalidasi oleh server.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorMsg && (
                <M3Banner
                  variant="error"
                  title="Gagal Memproses Berkas"
                  supportingText={errorMsg}
                  dismissible
                  onDismiss={() => setErrorMsg("")}
                />
              )}

              <div className="flex justify-end pt-2">
                <M3Button
                  variant="filled"
                  size="md"
                  icon="upload_file"
                  isLoading={isUploading}
                  disabled={isPreviewing || (isStudentImport && !dapodikPreview)}
                  onClick={handleImport}
                >
                  {isStudentImport ? "Konfirmasi & Import Data Valid" : "Mulai Import Sekarang"}
                </M3Button>
              </div>
            </M3Card>

            {dapodikResult && (
              <M3Card variant="outlined" className="space-y-4 p-5">
                <M3Banner
                  variant={dapodikResult.failedCount === 0 ? "success" : "warning"}
                  headline="Import Dapodik selesai"
                  supportingText={`${dapodikResult.successCount} berhasil diproses: ${dapodikResult.createdCount} siswa baru dan ${dapodikResult.updatedCount} siswa diperbarui. ${dapodikResult.failedCount} baris dilewati.`}
                />
                {dapodikResult.errors.length > 0 && (
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-[12px] bg-md-surface-container p-3">
                    <p className="text-xs font-semibold text-md-on-surface">Catatan import</p>
                    {dapodikResult.errors.map((error, index) => (
                      <p key={index} className="text-xs text-md-on-surface-variant">• {error}</p>
                    ))}
                    {dapodikResult.errorsTruncated && (
                      <p className="text-xs font-medium text-md-tertiary">Daftar error dipotong pada 100 catatan.</p>
                    )}
                  </div>
                )}
              </M3Card>
            )}

            {legacyResult && (
              <M3Banner
                variant={legacyResult.failedCount === 0 ? "success" : "warning"}
                headline="Hasil import selesai"
                supportingText={`Total ${legacyResult.totalProcessed} baris diproses. ${legacyResult.successCount} berhasil, ${legacyResult.failedCount} dilewati.`}
              />
            )}
          </div>

          <div>
            <M3Card variant="filled" className="space-y-4 p-5">
              {isStudentImport ? (
                <>
                  <div>
                    <h4 className="text-base font-semibold text-md-on-surface">Format Dapodik yang didukung</h4>
                    <p className="mt-1 text-xs leading-5 text-md-on-surface-variant">
                      Gunakan menu ekspor <strong>Daftar Peserta Didik</strong> dari Dapodik dalam format Excel .xlsx. Sistem mengenali metadata di bagian atas dan dua baris header Dapodik secara otomatis.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[12px] bg-md-surface-container px-3 py-3 text-xs text-md-on-surface-variant">
                    {[
                      "Nama, NIPD, JK, NISN, tempat/tanggal lahir dan NIK",
                      "Alamat, kontak, agama, tempat tinggal dan transportasi",
                      "Data ayah, ibu dan wali",
                      "Rombel Saat Ini",
                      "KPS, KIP, KKS, PIP dan data rekening",
                      "Kebutuhan khusus, sekolah asal, koordinat dan No KK",
                      "Data fisik dan jarak rumah ke sekolah",
                    ].map((label) => (
                      <div key={label} className="flex items-start gap-2">
                        <M3Icon name="check" size={15} className="mt-0.5 shrink-0 text-md-secondary" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-md-outline-variant/30 pt-3 text-xs leading-5 text-md-on-surface-variant">
                    <strong className="text-md-on-surface">Aturan update:</strong> sistem mencari siswa lama berdasarkan NISN, lalu NIK, lalu NIPD/NIS. File yang sama dapat diimpor ulang tanpa membuat duplikat selama identitas tersebut konsisten.
                  </div>

                  <div className="rounded-[12px] bg-md-tertiary-container/40 px-3 py-3 text-xs leading-5 text-md-on-tertiary-container">
                    File hanya disimpan setelah tombol <strong>Konfirmasi & Import Data Valid</strong> ditekan. Proses preview tidak menulis data ke database.
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-base font-semibold text-md-on-surface">Format Kolom CSV</h4>
                  <p className="text-xs text-md-on-surface-variant">
                    Baris pertama harus berisi header sesuai contoh berikut.
                  </p>
                  <div className="overflow-x-auto rounded-[12px] bg-md-surface-container-highest p-3 font-mono text-[11px] text-md-on-surface">
                    <pre className="m-0 leading-relaxed">{legacyTemplate?.sample}</pre>
                  </div>
                  <div className="space-y-2 border-t border-md-outline-variant/30 pt-3 text-xs text-md-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <M3Icon name="check" size={16} className="shrink-0 text-md-secondary" />
                      <span>Pemisah koma atau titik-koma didukung.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <M3Icon name="check" size={16} className="shrink-0 text-md-secondary" />
                      <span>Data yang sesuai akan diproses oleh sekolah aktif.</span>
                    </div>
                  </div>
                </>
              )}
            </M3Card>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
