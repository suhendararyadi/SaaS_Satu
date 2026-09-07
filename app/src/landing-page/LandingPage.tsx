import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { SchemaMarkup } from "./components/SchemaMarkup";

const modules = [
  ["Master Data", "Sekolah, tahun ajaran, jurusan, rombel, guru, dan peserta didik."],
  ["LMS dan CBT", "Mata pelajaran, materi, tugas, presensi, agenda KBM, serta asesmen CBT."],
  ["E-PKL", "Mitra DUDI, penempatan, presensi lokasi, jurnal, dan monitoring."],
  ["Tata Kelola", "Dukungan kerja guru piket, wali kelas, dan Waka Kurikulum."],
  ["Laporan", "Dokumen dan rekap berbasis data yang benar-benar tersedia di sekolah."],
  ["Multi-tenant", "Akses server-side dibatasi berdasarkan sekolah aktif dan peran pengguna."],
] as const;

export function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <SchemaMarkup />
      <main>
        <Hero />
        <section id="features" className="border-border border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight">Modul sekolah yang tersedia</h2>
              <p className="text-muted-foreground mt-3">
                Setiap modul menggunakan konteks sekolah aktif dan otorisasi pada server.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map(([name, description]) => (
                <article key={name} className="border-border bg-card rounded-2xl border p-6">
                  <h3 className="font-semibold">{name}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
