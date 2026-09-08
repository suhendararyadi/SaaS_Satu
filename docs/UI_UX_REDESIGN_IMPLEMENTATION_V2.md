# SaaS Satu Smart School - UI/UX Redesign v2 Implementation Report

> **Status:** Implemented and quality-gated, ready for production rollout
> **Tanggal:** 8 September 2026
> **Design direction:** Playful Academic
> **Target utama:** SMP, SMA, dan SMK

## Ringkasan

Redesign UI/UX v2 telah diimplementasikan di source aplikasi dengan fokus pada pengalaman berbasis peran, kejujuran data, navigasi mobile yang nyata, serta bahasa visual pendidikan tingkat menengah yang lebih ramah dan hidup tanpa menjadi kekanak-kanakan.

Implementasi mempertahankan seluruh hardening tenant dan authorization server-side yang sudah ada. Visibility UI tidak digunakan sebagai pengganti authorization di server.

## Cakupan Implementasi

### 1. Semantic design tokens v2

Fondasi visual berpindah ke token Playful Academic:

- Academic Indigo sebagai warna identitas utama;
- Learning Teal sebagai warna pendukung pembelajaran;
- Creative Amber dan Playful Coral untuk status/aksen yang terkontrol;
- surface, outline, focus state, light mode, dan dark mode berbasis token semantik;
- Inter sebagai tipografi antarmuka utama;
- reduced-motion support dan focus ring yang terlihat.

### 2. Core Material 3 components

Komponen bersama diperbarui sehingga modul lama ikut memperoleh bahasa visual v2 tanpa rewrite logic bisnis per halaman:

- M3Button;
- M3Card;
- M3Badge;
- M3TextField;
- M3Select;
- M3Table;
- M3Dialog;
- M3NavigationDrawer;
- M3TopAppBar.

Komponen baru:

- M3AccountMenu;
- M3BottomNavigation;
- M3EmptyState;
- M3PageHeader;
- M3StatCard.

### 3. Role-first app shell

`SchoolLayout` kini membentuk pengalaman berbeda berdasarkan role dan assignment nyata.

- desktop memakai navigation drawer yang disederhanakan;
- mobile memakai bottom navigation yang benar-benar dirancang untuk mobile;
- account avatar menjadi account menu yang berfungsi;
- state loading, error, dan belum terhubung sekolah dipisahkan;
- navigasi guru mempertimbangkan assignment Wali Kelas, Waka, dan PKL;
- siswa tidak mendapat destination administratif yang tidak relevan.

### 4. Role-specific dashboard DTO

Dashboard tidak lagi memakai satu komposisi administratif untuk semua role.

Server menyediakan DTO terpisah:

- `getStudentDashboardData()`;
- `getTeacherDashboardData()`;
- `getSchoolAdminDashboardData()`;
- `getMentorDashboardData()`.

Aturan data:

- semua query di-scope dengan `schoolId` dan relationship pengguna;
- siswa hanya menerima data dirinya, rombelnya, ruang mapelnya, submission/result miliknya, serta PKL miliknya;
- guru menerima course yang diampu dan penempatan PKL yang dibimbing;
- admin menerima aggregate tenant sekolah aktif;
- mentor DUDI menerima penempatan yang memang dibimbing;
- tidak ada answer key CBT dalam DTO siswa;
- angka dashboard berasal dari query nyata, bukan fallback statistik buatan.

### 5. Dashboard per role

#### Siswa

Fokus dashboard: apa yang perlu dikerjakan sekarang.

- tugas yang masih pending;
- CBT mendatang;
- kelas/mapel siswa;
- status PKL hari ini bila relevan.

#### Guru

Fokus dashboard: apa yang perlu diajar, dinilai, atau direview.

- ruang mapel yang diampu;
- submission belum dinilai;
- jurnal PKL bimbingan yang menunggu review;
- konteks Wali Kelas dan Waka bila memang ditugaskan.

#### Admin Sekolah / Super Admin

Fokus dashboard: kondisi sekolah dan hal yang perlu dikelola.

- aggregate siswa, guru, rombel, LMS, DUDI, dan PKL dari data nyata;
- tahun ajaran aktif;
- siswa tanpa rombel;
- guru tanpa ruang mapel;
- kapasitas siswa berdasarkan kuota nyata.

#### Pembimbing DUDI

Fokus dashboard: siswa bimbingan dan jurnal PKL yang perlu ditinjau.

### 6. Authorization-aware UI

UI diselaraskan dengan authorization matrix server.

- guru dapat membaca direktori yang dibutuhkan tetapi tidak melihat CRUD admin;
- query pendukung pembuatan LMS hanya dijalankan untuk admin;
- guru hanya mendapat kontrol pengelolaan LMS untuk course yang benar-benar diampu;
- siswa saja yang mendapat aksi mengerjakan CBT;
- siswa saja yang mendapat aksi membuat jurnal PKL;
- review jurnal hanya tersedia bagi role pembimbing/admin yang relevan, sementara server tetap memvalidasi relationship;
- presensi GPS dan geolocation hanya berjalan untuk akun siswa.

### 7. Data honesty

Perubahan penting:

- default nilai jurnal `85` dihapus;
- settings admin lama yang berisi identitas fiktif dan tombol nonfungsional diganti dengan honest empty state;
- template CSV memakai nama eksplisit seperti `Siswa Contoh`, `Guru Contoh`, dan `PT Contoh`;
- landing page tidak menampilkan statistik atau testimonial buatan;
- empty state tidak menyamar sebagai data nyata;
- pending journal count menggunakan filtered database count, bukan panjang sampel list yang hanya ditampilkan sebagian.

### 8. Auth dan public experience

Landing, login, signup, reset password, dan email verification memakai copy Bahasa Indonesia yang konsisten dengan SaaS Satu Smart School.

Landing page menjelaskan modul yang memang ada dan tidak menggunakan fabricated social proof.

## Accessibility dan Anti-Slop Gate

Checklist source UI final:

- tidak ada em dash pada source UI TS/TSX;
- tidak ada Lorem ipsum atau identitas filler yang tampak nyata;
- tidak ada tombol "not implemented" yang disamarkan sebagai fungsi siap pakai;
- tidak ada decorative emoji baru;
- tidak ada decorative gradient baru pada diff redesign;
- mobile primary navigation dibuat khusus, bukan sekadar sidebar desktop yang dipindahkan;
- focus states dan reduced motion tersedia;
- target sentuh tombol utama minimum 44 px.

Kontras pasangan token utama yang diuji:

| Foreground | Background | Contrast | WCAG AA normal text |
|---|---|---:|---|
| `#4F46E5` | `#FFFFFF` | 6.29:1 | PASS |
| `#0F766E` | `#FFFFFF` | 5.47:1 | PASS |
| `#B45309` | `#FFFFFF` | 5.02:1 | PASS |
| `#172033` | `#F8FAFC` | 15.55:1 | PASS |
| `#CBD5E1` | `#0F172A` | 12.02:1 | PASS |
| `#C7D2FE` | `#312E81` | 7.66:1 | PASS |

## Verification

### Wasp / TypeScript

`wasp compile` berhasil dengan 0 error.

### Unit and policy tests

`wasp test client --run`:

- M3 components: 32 passed;
- typography/banner: 28 passed;
- school authorization matrix: 5 passed;
- LMS access policy: 2 passed;
- total: **67/67 passed**.

### Production build

Berhasil:

- Wasp production build;
- Vite SSR build;
- Vite client build;
- generated server bundle;
- Prisma Client 5.19.1 generate;
- runtime dependency prune.

Artifact verification:

- `web-app/build/index.html`: tersedia;
- `web-app/build/200.html`: tersedia;
- `server/bundle/server.js`: tersedia;
- client bundle mengandung domain `https://sekolah.suhendararyadi.com`;
- client bundle tidak mengandung port lama 8443/8444.

## Database impact

Redesign ini **tidak mengubah `schema.prisma` atau migration database**. Tidak ada migration yang perlu dijalankan untuk rollout UI v2.

## Known nonblocking technical debt

Tidak diklaim audit bersih.

- runtime dependency audit setelah prune masih melaporkan **2 moderate vulnerabilities**, tanpa high/critical;
- Vite memberi warning alias `.prisma/client/index-browser` yang dapat menggandakan module path;
- bundle Analytics Dashboard sekitar 519 KB dan melewati warning threshold 500 KB;
- area produksi lain seperti SMTP nyata, payment, upload, atau analytics tetap mengikuti kesiapan konfigurasi masing-masing dan bukan bagian dari redesign UI v2.

## Rollout strategy

Rollout menggunakan immutable release:

1. source dan dokumentasi di-commit;
2. backup database aplikasi diverifikasi sebelum cutover;
3. release app dan static dibuat di direktori baru;
4. symlink app/static diganti secara atomik;
5. `saas-satu.service` direstart;
6. HTTPS, static, backend, auth, dan operation smoke test diverifikasi;
7. jika verifikasi gagal, symlink dikembalikan ke release hardening sebelumnya dan service direstart.

Karena tidak ada migration database, rollback source/static tidak memerlukan rollback schema.

## Source of truth

Dokumen ini menjelaskan implementasi aktual. Arah desain dan prinsip tetap dirujuk dari:

- `UI_UX_REDESIGN_PLAN_V2.md`;
- `UX_AUDIT_PHASE0_V2.md`;
- `WIREFRAMES_DASHBOARDS_V2.md`.
