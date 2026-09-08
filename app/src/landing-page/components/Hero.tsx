import { M3Button, M3Icon } from "../../client/components/m3";

const flow = [
  { icon: "groups", title: "Data akademik", text: "Siswa, guru, rombel, dan tahun ajaran." },
  { icon: "menu_book", title: "Pembelajaran", text: "LMS, tugas, presensi, agenda, dan CBT." },
  { icon: "work", title: "PKL", text: "Penempatan, presensi lokasi, jurnal, dan monitoring." },
  { icon: "description", title: "Laporan", text: "Rekap dari data yang benar-benar tersedia." },
] as const;

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-24">
      <div>
        <div className="mb-5 inline-flex min-h-8 items-center gap-2 rounded-[10px] bg-md-secondary-container px-3 text-xs font-bold text-md-on-secondary-container"><M3Icon name="school" size={17} />Untuk SMP, SMA, dan SMK</div>
        <h1 className="max-w-3xl text-[42px] font-extrabold leading-[1.05] tracking-[-0.045em] text-md-on-surface sm:text-[58px]">Ruang sekolah digital yang jelas untuk bekerja, nyaman untuk belajar.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-md-on-surface-variant sm:text-lg sm:leading-8">SaaS Satu menghubungkan data akademik, pembelajaran, PKL, tata kelola, dan laporan dalam satu portal dengan akses yang mengikuti sekolah dan peran pengguna.</p>
        <div className="mt-8 flex flex-wrap gap-3"><M3Button size="lg" href="/login" icon="login">Masuk ke portal</M3Button><M3Button size="lg" variant="outlined" href="#features">Lihat modul</M3Button></div>
      </div>
      <div className="rounded-[28px] border border-md-outline-variant/60 bg-md-surface-container-low p-4 sm:p-5" aria-label="Alur layanan SaaS Satu">
        <div className="mb-4 flex items-center justify-between gap-3 px-1"><div><p className="text-xs font-bold text-md-on-surface-variant">SATU ALUR SEKOLAH</p><h2 className="mt-1 text-xl font-extrabold text-md-on-surface">Dari administrasi ke pembelajaran</h2></div><span className="flex size-11 items-center justify-center rounded-[14px] bg-md-primary-container text-md-on-primary-container"><M3Icon name="account_tree" size={23} /></span></div>
        <div className="space-y-2.5">{flow.map((item, index) => <div key={item.title} className="flex items-start gap-3 rounded-[16px] border border-md-outline-variant/55 bg-md-surface p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${index === 0 ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : index === 1 ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : index === 2 ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}><M3Icon name={item.icon} size={20} /></span><div><h3 className="text-sm font-extrabold text-md-on-surface">{item.title}</h3><p className="mt-1 text-xs leading-5 text-md-on-surface-variant">{item.text}</p></div></div>)}</div>
      </div>
    </section>
  );
}
