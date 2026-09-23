import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { SchemaMarkup } from "./components/SchemaMarkup";
import { M3Icon } from "../client/components/m3";

const modules = [
  { icon: "account_tree", name: "Akademik", description: "Tahun ajaran, jurusan, rombel, guru, peserta didik, dan import data.", tone: "bg-md-primary-container text-md-primary" },
  { icon: "menu_book", name: "LMS & CBT", description: "Ruang mapel, materi, tugas, agenda KBM, presensi kelas, dan asesmen CBT.", tone: "bg-md-primary-container text-md-primary" },
  { icon: "work", name: "E-PKL", description: "Mitra DUDI, penempatan, presensi lokasi, jurnal harian, review, dan monitoring.", tone: "bg-md-primary-container text-md-primary" },
  { icon: "verified_user", name: "Tata Kelola", description: "Dukungan kerja Wali Kelas, Wakasek Kurikulum/Kesiswaan/Sarpras/Humas-Hubin, dan Guru Piket sesuai penugasan.", tone: "bg-md-primary-container text-md-primary" },
  { icon: "description", name: "Laporan", description: "Rekap akademik dan PKL tanpa angka contoh atau nilai yang dibuat-buat.", tone: "bg-md-primary-container text-md-primary" },
  { icon: "domain", name: "Multi-tenant", description: "Konteks sekolah aktif dan otorisasi server-side membatasi data sesuai peran dan tenant.", tone: "bg-md-primary-container text-md-primary" },
] as const;

const roles = [
  ["Siswa", "Tugas, kelas, CBT, dan PKL pribadi menjadi prioritas, bukan statistik administrasi."],
  ["Guru", "Ruang mengajar, penilaian, bimbingan PKL, dan tanggung jawab tambahan tampil sesuai penugasan."],
  ["Admin Sekolah", "Kondisi sekolah, data yang perlu diperbaiki, dan operasi pengelolaan berada dalam satu alur kerja."],
] as const;

export function LandingPage() {
  return (
    <div className="bg-md-background text-md-on-background">
      <SchemaMarkup />
      <main>
        <Hero />
        <section id="features" className="border-y border-md-outline-variant bg-md-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl"><p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-md-primary">MODUL YANG TERSEDIA</p><h2 className="mt-2 text-[28px] font-bold tracking-[-0.025em] text-md-on-surface">Satu sistem, beberapa alur kerja sekolah.</h2><p className="mt-3 text-base leading-7 text-md-on-surface-variant">Setiap modul memakai data nyata dari sekolah aktif. Fitur eksternal yang belum dikonfigurasi tetap tidak ditampilkan sebagai layanan siap pakai.</p></div>
            <div className="mt-9 grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-3">{modules.map((module) => <article key={module.name} className="flex gap-4"><span className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] ${module.tone}`}><M3Icon name={module.icon} size={22} /></span><div><h3 className="text-[15px] font-semibold text-md-on-surface">{module.name}</h3><p className="mt-1.5 text-sm leading-6 text-md-on-surface-variant">{module.description}</p></div></article>)}</div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-md-primary">ROLE-FIRST EXPERIENCE</p><h2 className="mt-2 text-[28px] font-bold tracking-[-0.025em] text-md-on-surface">Beranda berbeda untuk pekerjaan yang berbeda.</h2></div><div className="divide-y divide-md-outline-variant/60 border-y border-md-outline-variant">{roles.map(([role, text]) => <div key={role} className="grid gap-2 py-5 sm:grid-cols-[150px_1fr]"><h3 className="font-semibold text-md-on-surface">{role}</h3><p className="text-sm leading-6 text-md-on-surface-variant">{text}</p></div>)}</div></div></section>
      </main>
      <Footer />
    </div>
  );
}
