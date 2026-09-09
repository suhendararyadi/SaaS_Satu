import React, { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  useQuery,
  getSchoolInfo,
  importStudentsFromCsv,
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
  M3Text,
  M3Icon,
  type M3TabItem,
} from "../../client/components/m3";


type ImportType = "STUDENTS" | "TEACHERS" | "COMPANIES";

export function CsvImportPage({ user }: { user: AuthUser }) {
  const { data: school } = useQuery(getSchoolInfo);
  const schoolLevel = school?.level || "SMA_SMK";
  const isVocationalOrHighSchool = schoolLevel === "SMA_SMK";
  const isElementary = schoolLevel === "SD_MI";
  const isJuniorHigh = schoolLevel === "SMP_MTS";

  const [activeTab, setActiveTab] = useState<ImportType>("STUDENTS");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const studentSample = isElementary
    ? `nama,nis,nisn,gender,kelas,email
Siswa Contoh 01,1000001,0000000001,L,1-A,siswa01@example.sch.id
Siswa Contoh 02,1000002,0000000002,P,1-A,siswa02@example.sch.id
Siswa Contoh 03,1000003,0000000003,L,2-B,siswa03@example.sch.id`
    : isJuniorHigh
    ? `nama,nis,nisn,gender,kelas,email
Siswa Contoh 01,1000001,0000000001,L,7-A,siswa01@example.sch.id
Siswa Contoh 02,1000002,0000000002,P,7-A,siswa02@example.sch.id
Siswa Contoh 03,1000003,0000000003,L,8-B,siswa03@example.sch.id`
    : `nama,nis,nisn,gender,kelas,email
Siswa Contoh 01,1000001,0000000001,L,12 RPL 1,siswa01@example.sch.id
Siswa Contoh 02,1000002,0000000002,P,12 RPL 1,siswa02@example.sch.id
Siswa Contoh 03,1000003,0000000003,L,12 RPL 2,siswa03@example.sch.id`;

  const templates: Record<
    ImportType,
    { title: string; filename: string; sample: string; desc: string }
  > = {
    STUDENTS: {
      title: "Data Siswa",
      filename: "template_siswa.csv",
      desc: "Format CSV untuk pendaftaran massal siswa. Kolom kelas akan otomatis dihubungkan jika nama rombel sesuai.",
      sample: studentSample,
    },
    TEACHERS: {
      title: "Data Guru & Tendik",
      filename: "template_guru.csv",
      desc: "Format CSV untuk pendaftaran akun guru dan tendik. Mendukung penugasan Waka.",
      sample: `nama,nip,gelar,hp,email,is_waka
Guru Contoh 01,190000000000000001,S.Pd.,080000000001,guru01@example.sch.id,ya
Guru Contoh 02,190000000000000002,S.Kom.,080000000002,guru02@example.sch.id,tidak
Guru Contoh 03,190000000000000003,S.Pd.,080000000003,guru03@example.sch.id,tidak`,
    },
    COMPANIES: {
      title: "Mitra DUDI / Tempat PKL",
      filename: "template_dudi.csv",
      desc: "Format CSV untuk master tempat PKL, lengkap dengan titik koordinat latitude/longitude dan radius presensi GPS.",
      sample: `nama_perusahaan,sektor,alamat,pic_nama,pic_hp,latitude,longitude,radius_meter,kuota
PT Contoh Teknologi,Teknologi Informasi,Alamat contoh 1,Kontak Contoh 01,080000000011,-6.9000,107.6000,100,5
CV Contoh Kreatif,Software,Alamat contoh 2,Kontak Contoh 02,080000000012,-7.2100,107.9000,150,4
Industri Contoh Manufaktur,Manufaktur,Alamat contoh 3,Kontak Contoh 03,080000000013,-7.2200,107.9100,100,3`,
    },
  };

  const tabs: M3TabItem[] = [
    { id: "STUDENTS", label: "Data Siswa", icon: <M3Icon name="groups" size={18} /> },
    { id: "TEACHERS", label: "Data Guru & Tendik", icon: <M3Icon name="badge" size={18} /> },
    ...(isVocationalOrHighSchool
      ? [{ id: "COMPANIES", label: "Mitra DUDI / PKL", icon: <M3Icon name="apartment" size={18} /> }]
      : []),
  ];

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setResult(null);
      setErrorMsg("");
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvContent(templates[activeTab].sample);
    setSelectedFile(null);
    setResult(null);
    setErrorMsg("");
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setErrorMsg("Harap masukkan atau upload konten CSV terlebih dahulu.");
      return;
    }

    setErrorMsg("");
    setIsUploading(true);
    setResult(null);

    try {
      let res;
      if (activeTab === "STUDENTS") {
        res = await importStudentsFromCsv({ csvContent });
      } else if (activeTab === "TEACHERS") {
        res = await importTeachersFromCsv({ csvContent });
      } else {
        res = await importCompaniesFromCsv({ csvContent });
      }
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses file CSV.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SchoolLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-medium text-md-on-surface">
            Import Data Massal (CSV)
          </h2>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Upload data siswa, guru, atau mitra dari file CSV dan spreadsheet.
          </p>
        </div>

        {/* Google Material 3 Primary Tabs */}
        <M3Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId as ImportType);
            setSelectedFile(null);
            setResult(null);
            setErrorMsg("");
          }}
        />

        {/* Main Grid: Left Form, Right Example */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <M3Card variant="elevated" className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-md-on-surface">
                    Unggah File {templates[activeTab].title}
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mt-0.5">
                    {templates[activeTab].desc}
                  </p>
                </div>
                <M3Button
                  variant="tonal"
                  size="sm"
                  icon="description"
                  onClick={handleLoadSample}
                >
                  Isi Contoh Format
                </M3Button>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-md-outline-variant/60 rounded-[16px] p-6 text-center hover:bg-md-on-surface/4 transition-colors">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                    <M3Icon name="cloud_upload" size={26} />
                  </div>
                  <span className="text-sm font-semibold text-md-on-surface">
                    {selectedFile ? selectedFile.name : "Pilih atau Seret Berkas CSV"}
                  </span>
                  <span className="text-xs text-md-on-surface-variant">
                    Format berkas yang didukung: .csv, .txt (maksimal 5MB)
                  </span>
                </label>
              </div>

              {/* Raw Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-md-on-surface-variant">
                  Atau Tempel / Edit Konten CSV Langsung
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="nama,nis,kelas..."
                  rows={8}
                  className="w-full rounded-[12px] border border-md-outline bg-transparent p-3 text-xs font-mono text-md-on-surface placeholder:text-md-outline focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary"
                />
              </div>

              {errorMsg && (
                <M3Banner
                  variant="error"
                  title="Gagal Memproses File CSV"
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
                  onClick={handleImport}
                >
                  Mulai Import Sekarang
                </M3Button>
              </div>
            </M3Card>

            {/* Result Card */}
            {result && (
              <div className="space-y-4">
                <M3Banner
                  variant={result.failedCount === 0 ? "success" : "warning"}
                  headline="Hasil Pemrosesan Import Selesai"
                  supportingText={`Total ${result.totalProcessed} baris data diproses. ${result.successCount} baris berhasil disimpan, ${result.failedCount} baris dilewati.`}
                />
                <M3Card variant="outlined" className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[12px] bg-md-secondary-container/55 border border-md-secondary/20">
                    <p className="text-[11px] font-semibold text-md-on-secondary-container uppercase">
                      Berhasil Disimpan
                    </p>
                    <p className="text-2xl font-bold text-md-on-surface mt-1">
                      {result.successCount} Baris
                    </p>
                  </div>
                  <div className="p-3 rounded-[12px] bg-md-tertiary-container/55 border border-md-tertiary/20">
                    <p className="text-[11px] font-semibold text-md-on-tertiary-container uppercase">
                      Dilewati / Gagal
                    </p>
                    <p className="text-2xl font-bold text-md-on-surface mt-1">
                      {result.failedCount} Baris
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="p-3 rounded-[12px] bg-md-surface-container border border-md-outline-variant/40 max-h-44 overflow-y-auto space-y-1">
                    <p className="text-xs font-bold text-md-on-surface">
                      Catatan Penyesuaian:
                    </p>
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-md-on-surface-variant">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}
              </M3Card>
            </div>
          )}
          </div>

          {/* Right Column: Guide & Format */}
          <div>
            <M3Card variant="filled" className="p-5 space-y-4">
              <h4 className="font-semibold text-base text-md-on-surface">
                Format Kolom CSV
              </h4>
              <p className="text-xs text-md-on-surface-variant">
                Pastikan baris pertama CSV Anda menyertakan header kolom sesuai contoh di bawah ini:
              </p>

              <div className="p-3 rounded-[12px] bg-md-surface-container-highest font-mono text-[11px] overflow-x-auto text-md-on-surface">
                <pre className="m-0 leading-relaxed">{templates[activeTab].sample}</pre>
              </div>

              <div className="pt-3 border-t border-md-outline-variant/30 space-y-2 text-xs text-md-on-surface-variant">
                <div className="flex items-center gap-2">
                  <M3Icon name="check" size={16} className="text-md-secondary shrink-0" />
                  <span>Pemisah koma (,) atau titik-koma (;) didukung.</span>
                </div>
                <div className="flex items-center gap-2">
                  <M3Icon name="check" size={16} className="text-md-secondary shrink-0" />
                  <span>Data yang telah ada akan diperbarui otomatis.</span>
                </div>
                <div className="flex items-center gap-2">
                  <M3Icon name="check" size={16} className="text-md-secondary shrink-0" />
                  <span>Akun login siswa/guru langsung siap digunakan.</span>
                </div>
              </div>
            </M3Card>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
