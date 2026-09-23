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
        <div className="mb-4 inline-flex min-h-7 items-center gap-1.5 rounded-[8px] bg-md-primary-container px-2.5 text-[11px] font-semibold text-md-primary"><M3Icon name="school" size={15} />Untuk SMP, SMA, dan SMK</div>
        <h1 className="max-w-3xl text-[40px] font-bold leading-[1.06] tracking-[-0.045em] text-md-on-surface sm:text-[54px]">Sekolah digital yang sederhana dipahami, cepat digunakan.</h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-md-on-surface-variant sm:text-[17px]">SaaS Satu menyatukan data akademik, pembelajaran, PKL, tata kelola, dan laporan dalam pengalaman yang mengikuti peran pengguna.</p>
        <div className="mt-7 flex flex-wrap gap-2.5"><M3Button size="lg" href="/login" icon="login">Masuk ke portal</M3Button><M3Button size="lg" variant="outlined" href="#features">Lihat modul</M3Button></div>
      </div>
      <div className="rounded-[18px] border border-md-outline-variant bg-md-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,.05)]" aria-label="Alur layanan SaaS Satu">
        <div className="px-2 pb-3 pt-1"><p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-md-on-surface-variant">SATU ALUR SEKOLAH</p><h2 className="mt-1 text-[18px] font-semibold text-md-on-surface">Dari administrasi ke pembelajaran</h2></div>
        <div className="hig-list">{flow.map((item) => <div key={item.title} className="hig-list-row"><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-md-primary-container text-md-primary"><M3Icon name={item.icon} size={17} /></span><div><h3 className="text-[13px] font-semibold text-md-on-surface">{item.title}</h3><p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">{item.text}</p></div></div>)}</div>
      </div>
    </section>
  );
}
