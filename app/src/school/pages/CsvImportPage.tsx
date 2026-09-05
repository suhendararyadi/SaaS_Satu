import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  importStudentsFromCsv,
  importTeachersFromCsv,
  importCompaniesFromCsv,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Users,
  UserCheck,
  Building2,
} from "lucide-react";

type ImportType = "STUDENTS" | "TEACHERS" | "COMPANIES";

export function CsvImportPage({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<ImportType>("STUDENTS");
  const [csvContent, setCsvContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const templates: Record<ImportType, { title: string; filename: string; sample: string; desc: string }> = {
    STUDENTS: {
      title: "Data Siswa",
      filename: "template_siswa.csv",
      desc: "Format CSV untuk pendaftaran massal siswa. Kolom kelas akan otomatis dihubungkan jika nama rombel sesuai.",
      sample: `nama,nis,nisn,gender,kelas,email
Ahmad Fauzi,1024001,0071234567,L,XII RPL 1,ahmad@siswa.id
Siti Rahma,1024002,0071234568,P,XII RPL 1,siti@siswa.id
Budi Pratama,1024003,0071234569,L,XII TKJ 2,budi@siswa.id`,
    },
    TEACHERS: {
      title: "Data Guru & Tendik",
      filename: "template_guru.csv",
      desc: "Format CSV untuk pendaftaran akun guru dan tendik. Mendukung penugasan Waka.",
      sample: `nama,nip,gelar,hp,email,is_waka
Dra. Hj. Nurjanah,196805121994032001,M.Pd.,08122334455,nurjanah@guru.sch.id,ya
Rahmat Hidayat,198502102009021003,S.Kom.,08133445566,rahmat@guru.sch.id,tidak
Endah Triastuti,199011152015032002,S.Pd.,08155667788,endah@guru.sch.id,tidak`,
    },
    COMPANIES: {
      title: "Mitra DUDI / Perusahaan PKL",
      filename: "template_dudi.csv",
      desc: "Format CSV untuk master tempat PKL, lengkap dengan titik koordinat latitude/longitude dan radius presensi GPS.",
      sample: `nama_perusahaan,sektor,alamat,pic_nama,pic_hp,latitude,longitude,radius_meter,kuota
PT Telkom Indonesia,Teknologi Informasi,Jl. Japati No. 1 Bandung,Budi Santoso,08123456789,-6.9008,107.6186,100,5
CV Techno Kreatif,Software House,Jl. Cimanuk No. 45 Garut,Deni Firmansyah,08198765432,-7.2145,107.9012,150,4
Bank BJB Cabang Garut,Perbankan,Jl. Ahmad Yani No. 10 Garut,Dewi Lestari,08132165498,-7.2189,107.9045,80,3`,
    },
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Import Data Massal (CSV / Excel)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Daftarkan ratusan siswa, guru, dan tempat PKL sekaligus dalam hitungan detik.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab("STUDENTS");
            setResult(null);
            setErrorMsg("");
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "STUDENTS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Siswa
        </button>
        <button
          onClick={() => {
            setActiveTab("TEACHERS");
            setResult(null);
            setErrorMsg("");
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "TEACHERS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Guru & Tendik
        </button>
        <button
          onClick={() => {
            setActiveTab("COMPANIES");
            setResult(null);
            setErrorMsg("");
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "COMPANIES"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Mitra DUDI
        </button>
      </div>

      {/* Main Import Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Unggah File {templates[activeTab].title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {templates[activeTab].desc}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
              >
                <FileText className="w-3.5 h-3.5" />
                Isi Contoh Format
              </button>
            </div>

            {/* Drag & Drop File Input */}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-6 text-center transition-colors mb-4">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Klik untuk pilih berkas CSV
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  atau seret dan lepas berkas CSV Anda di sini
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Raw Textarea */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Atau Paste Konten CSV Langsung:
              </label>
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="nama,nis,kelas..."
                className="w-full font-mono text-xs p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleImport}
                disabled={isUploading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isUploading ? "Memproses Data..." : "Mulai Import Sekarang"}
              </button>
            </div>
          </div>

          {/* Result Banner */}
          {result && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Hasil Pemrosesan Import
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total: {result.totalProcessed} baris data diproses.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <span className="text-xs font-semibold uppercase">Berhasil Disimpan</span>
                  <p className="text-xl font-bold">{result.successCount} Baris</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-700 dark:text-amber-300">
                  <span className="text-xs font-semibold uppercase">Dilewati / Gagal</span>
                  <p className="text-xl font-bold">{result.failedCount} Baris</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white mb-1">Catatan Kesalahan:</p>
                  {result.errors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Preview Template */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Contoh Format Kolom
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Pastikan baris pertama CSV Anda memiliki judul kolom seperti berikut:
            </p>
            <pre className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
              {templates[activeTab].sample}
            </pre>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <p>✓ Pemisah koma (,) atau titik-koma (;) didukung otomatis.</p>
              <p>✓ Jika siswa sudah ada (berdasarkan NIS/email), data akan diperbarui.</p>
              <p>✓ Password default akan disesuaikan saat siswa pertama kali login.</p>
            </div>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
