# School OS — Persistent Project Context

Last updated: **10 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah snapshot konteks operasional untuk melanjutkan pengembangan School OS lintas chat/sesi. Baca dokumen ini sebelum membuat perubahan baru, lalu gunakan dokumen teknis yang ditautkan sebagai source of truth per area.

## 1. Source tree yang aktif

- Repository utama: `/home/ubuntu/projects/SaaS_Satu`
- Worktree pengembangan School OS saat ini: `/home/ubuntu/projects/SaaS_Satu-hardening`
- Branch aktif: `redesign/apple-hig`
- Implementasi fitur EWS/monitoring terbaru: `af4bf88` (`feat(school): add EWS hub and polish PKL monitoring`)
- Refinement Kehadiran terbaru: `6f5d9b2` (`refine(dashboard): reverse attendance priority order`)
- Jalur deployment bounded: `6f7fae9` (`ops: add bounded School OS deployment function`)
- Branch `main` masih berada pada garis baseline yang lebih lama dan **bukan** tempat perubahan School OS terbaru ini dikembangkan.

Jika melanjutkan pekerjaan School OS dari konteks ini, gunakan worktree `SaaS_Satu-hardening` kecuali ada keputusan eksplisit untuk merge/rebase/promote ke branch lain.

## 2. Kontrak visual aktif

Design system aktif adalah **School OS — Apple HIG-inspired**, bukan Material 3. Dokumen visual utama: [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md).

Nama folder/komponen `components/m3/` dan public API `M3*` dipertahankan sementara sebagai compatibility layer. Jangan menafsirkan nama tersebut sebagai otoritas desain Material 3.

Refinement visual terbaru yang sudah menjadi bagian dari branch ini:

- ikon sidebar kembali digunakan dengan karakter stroke yang restrained/macOS-like;
- indikator titik biru di identitas sekolah dihapus;
- kontrol hide/show sidebar memakai gaya macOS;
- label menu sidebar diperkuat menjadi near-black agar sesuai referensi Finder/macOS;
- navigation drawer kemudian disempurnakan lagi mengikuti komposisi sidebar jendela Settings macOS;
- grouped surfaces, compact toolbar, thin separators, data-dense tables, dan real-data-only dashboard tetap menjadi prinsip utama;
- panel Admin **Kehadiran per rombel** tetap memilih maksimal 5 rombel prioritas dengan persentase hadir terendah pada hari berjalan, lalu menampilkannya dari persentase yang lebih tinggi ke yang lebih rendah; lane nama rombel sekarang berlebar tetap agar seluruh bar sejajar, nama utama ditampilkan tanpa suffix jurusan kondisional, dan nama lengkap tetap tersedia sebagai tooltip/accessibility label; nilai tanpa data tidak diperlakukan sebagai 0%;
- ranking kehadiran dinormalisasi dengan persentase, bukan jumlah absen mentah, agar rombel dengan ukuran/jumlah sesi berbeda tetap dapat dibandingkan secara adil; jumlah ketidakhadiran dipakai sebagai tie-breaker saat pemilihan prioritas;
- tiga posisi teratas dari rombel terukur menggunakan biru, posisi kedua terbawah jingga, dan posisi terbawah merah; rombel tanpa data tetap netral agar tidak memberi sinyal risiko palsu;
- panel **Perlu keputusan Anda** memakai icon tile bergaya macOS dan sekarang juga memuat ringkasan Early Warning System (EWS) PKL bila ada sinyal nyata;
- halaman **`/school/ews`** menjadi hub EWS dengan ringkasan prioritas, siswa/penempatan terdampak, sumber sinyal, dan tautan tindak lanjut;
- halaman **`/school/pkl/monitoring`** dipoles menjadi grouped surface/list-row Apple HIG-inspired yang lebih ringkas dan langsung mengarah ke bukti presensi/jurnal;
- lifecycle fokus `M3Dialog` diperbaiki agar controlled input tidak kehilangan fokus/caret ketika dialog parent re-render saat pengguna mengetik;
- tombol/shortcut **Import Data** dihilangkan dari Beranda Admin agar header dan area Kelola cepat lebih bersih; fitur Import Data tetap tersedia dari sidebar;
- palette icon tile sidebar diperluas: `account_tree` dan `warning` tidak lagi jatuh ke fallback abu-abu, sedangkan Mitra DUDI, Laporan, Pengaturan, dan fallback memakai warna Apple-like yang lebih bervariasi namun tetap restrained;
- identitas sekolah di bagian atas sidebar sekarang mengikuti hierarki account row ala macOS Settings yang disesuaikan untuk School OS: avatar/icon sekolah bulat, nama sekolah sebagai primary label, serta `Unit sekolah aktif · <kota>` sebagai secondary context;
- kontrol desktop hide/show sidebar memakai satu glyph split-panel (`PanelLeft`) yang ditempatkan sebagai trailing action di header sidebar; top app bar desktop tidak lagi memuat kontrol collapse, sedangkan tombol menu mobile tetap berada di top bar;
- kartu **Perlu keputusan Anda** mempunyai supplemental operational row `Buka pusat monitoring PKL` (atau laporan operasional untuk non-SMK) yang dipisahkan dari attention list. Baris ini tidak dihitung sebagai keputusan dan tidak mengubah badge attention; seluruh attention utama tetap berasal dari DTO server nyata.

Commit refinement terkait: `70108d1`, `5b66eb1`, `0adb095`, `ea99802`, `10eb867`, `af4bf88`, `6f5d9b2`, `d16662a`, `349ac7c`, dan `bcca333`.

## 3. Snapshot production terakhir yang terverifikasi

Domain School OS: `https://sekolah.suhendararyadi.com`.

Pada 10 September 2026, setelah insiden autentikasi pada rollout frontend-only, production aktif memakai **split release yang disengaja**: static terbaru dengan backend sebelumnya yang telah terbukti sehat.

- static web: `/var/www/saas-satu/releases/bcca333-sidebar-identity`;
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring`;
- static commit: `bcca333f5a5d31b782e6d9d9406e85a5392f5482`;
- backend commit: `6f5d9b27b48ede1881904f7cc9572dc32ff09c04`;
- `saas-satu.service`: **active/running**;
- public `/school`: HTTP 200;
- public `/login`: HTTP 200;
- unauthenticated POST Admin Dashboard operation: HTTP 401;
- bundle dashboard production tidak lagi memuat tombol/shortcut `Import data`;
- bundle dashboard memuat fixed-width attendance label lane sehingga progress bar rombel sejajar;
- CSS production memuat palette sidebar tambahan Apple-like (purple/cyan/orange) untuk mengurangi fallback abu-abu;
- authenticated `/auth/me` setelah recovery menghasilkan HTTP 200/304 dan tidak ada lagi error `Cannot read properties of undefined (reading 'name')`;
- static-only deploy digunakan untuk refinement UI terbaru sambil mempertahankan backend sehat; bundle live memuat marker `Unit sekolah aktif`, `Sembunyikan sidebar`, dan `Buka pusat monitoring PKL`, serta tidak ada `/auth/me` 500 setelah cutover static.

Insiden yang ditemukan: backend `d16662a-dashboard-sidebar-polish` membawa Prisma Client runtime tanpa delegate `auth` dan `session`. Lucia/Wasp menginisialisasi adapter dengan `prisma.session` dan `prisma.auth`, sehingga request dengan bearer/session valid menghasilkan HTTP 500 walaupun request anonim `/auth/me` tetap 200. Release tersebut **jangan dipromosikan sebagai backend**.

Rollback/backend sehat yang dipertahankan: `/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring`. Static sebelumnya tetap tersedia di `/var/www/saas-satu/releases/6f5d9b2-ews-apple-monitoring`.

Schema/migrations tidak berubah dan recovery ini tidak melakukan mutation data.

Jalur deployment project-scoped tersedia melalui `.mso/functions.json` dan `ops/deploy-school-os-release.mjs`. Untuk perubahan frontend-only gunakan `school_os_deploy_static_preflight` -> `school_os_deploy_static`; jalur ini tidak mengganti backend atau restart service. Untuk perubahan backend/full-stack gunakan `school_os_deploy_preflight` -> `school_os_deploy_release`; full preflight sekarang wajib membuktikan Prisma runtime memiliki delegate `user`, `auth`, dan `session` sebelum backend boleh dipromosikan. Jika tahap full cutover gagal, fungsi mengembalikan backend/static ke pointer sebelumnya dan memulihkan backend rollback. Jalur ini sengaja dibuat untuk menghindari pelemahan global safety guard MSO.

## 4. Demo dataset School OS

Runner permanen:

`app/scripts/school-os-demo-data.mjs`

Dokumentasi lengkap: [`DEMO_DATA.md`](./DEMO_DATA.md).

Seed DEMO sudah dipasang pada database production **SMKN 1 RONGGA** untuk QA visual dan workflow. Record sintetis diberi marker `[DEMO]`, `DEMO-`, atau domain `@schoolos-demo.invalid` agar mudah dibedakan dari data sekolah nyata.

Coverage dataset saat seed terakhir:

- 29 user demo: 6 guru, 21 siswa, 2 pembimbing DUDI;
- 5 rombel dan 2 jurusan demo tambahan;
- 4 DUDI dan 8 penempatan PKL aktif;
- 6 ruang LMS;
- 12 agenda, 12 materi, 12 tugas, 18 submission;
- 12 CBT, 24 soal, 18 hasil CBT;
- 18 sesi presensi LMS dengan 72 record presensi;
- 36 presensi PKL dan 7 jurnal PKL;
- 3 laporan guru piket;
- 1 guru dengan penugasan Waka Kurikulum.

Dataset juga sengaja memuat state untuk menguji warning/monitoring: 1 siswa tanpa rombel, 1 guru tanpa mapel/ruang mengajar, 6 submission belum dinilai, jurnal yang perlu review/revisi, dan beberapa kondisi EWS.

Contoh agregat dashboard pada saat verifikasi seed: **20 Hadir, 2 Izin, 2 Sakit** dari 24 pencatatan, sehingga Kehadiran sekitar **83%**. Panel **Perlu Keputusan Anda** juga memiliki kondisi nyata untuk ditampilkan.

## 5. Safety contract demo data

- Seed bersifat idempotent untuk target sekolah/tanggal yang sama.
- Menjalankan seed dua kali telah diverifikasi tidak menggandakan dataset.
- `cleanup --dry-run` telah diverifikasi dapat membawa jumlah record DEMO menjadi nol di dalam transaksi lalu rollback.
- Cleanup nyata memerlukan confirmation token yang didefinisikan runner; jangan menghapus record demo dengan query ad-hoc.
- Runner sengaja tidak terdaftar pada default Wasp `db.seeds`.
- Jangan mencampur data demo dengan data sekolah nyata tanpa marker eksplisit.

Backup database yang dibuat sebelum seed production terakhir tercatat sebagai:

`/var/backups/saas-satu/saas_satu_staging-20260910T011823Z.sql.gz`

Pada run tersebut backup telah diverifikasi gzip PASS dan permission mode `600` root-only.

## 6. Verifikasi setelah seed terakhir

Pada verifikasi terakhir, halaman berikut merespons HTTP 200: Beranda, Siswa, Guru, Rombel, LMS, DUDI, PKL, Monitoring EWS, Guru Piket, Wali Kelas, Waka, dan Laporan. Dashboard API juga tetap 200 dan tidak ditemukan 5xx baru pada pemeriksaan terakhir.

Status ini adalah snapshot historis, bukan pengganti health check baru sebelum/selepas perubahan berikutnya.

## 7. Pekerjaan berikutnya yang belum dilakukan

**Belum dibuat password/login demo untuk role Guru, Siswa, dan Pembimbing DUDI.** Record user/relasi demo sudah tersedia sebagai data aplikasi, tetapi belum dijadikan kredensial login buatan.

Jika pengujian role-based dashboard dilanjutkan, buat tiga akun uji melalui **flow autentikasi resmi School OS**, bukan dengan menyisipkan password/hash secara ad-hoc ke database production. Tujuannya adalah menguji tampilan dan authorization dari sudut pandang:

- Guru;
- Siswa;
- Pembimbing DUDI.

## 8. Guardrails untuk pekerjaan lanjutan

- Pertahankan tenant isolation dan authorization server-side; UI visibility bukan security boundary.
- Jangan membuat fake metrics atau data contoh yang terlihat sebagai data sekolah nyata.
- Untuk perubahan frontend-only, jangan menyentuh schema/database/backend tanpa kebutuhan fitur yang jelas.
- Sebelum deployment, jalankan quality gate relevan: TypeScript/Wasp compile, client tests, `git diff --check`, build bila diperlukan, lalu smoke test sesuai dampak.
- Backup database sebelum operasi production yang mengubah data/schema.
- Pertahankan release sebelumnya sebagai rollback target saat melakukan cutover.
- Jangan mengubah atau membersihkan `.agent/` hanya untuk merapikan `git status`; direktori tersebut adalah artefak workflow lokal dan saat snapshot ini tidak dilacak Git.

## 9. Dokumen yang harus dibaca saat melanjutkan

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — snapshot lintas sesi ini.
- [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md) — source of truth visual aktif.
- [`DEMO_DATA.md`](./DEMO_DATA.md) — operasi seed/status/cleanup demo.
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — kronologi implementasi dan rollout.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arsitektur dan security boundaries.
- [`ANTI_SLOP_GUIDELINES.md`](./ANTI_SLOP_GUIDELINES.md) — quality/copy/UI guardrails.

Jika dokumen ini bertentangan dengan kondisi runtime aktual, **runtime/repository terbaru harus diverifikasi lebih dulu**, kemudian snapshot ini diperbarui agar tidak menjadi konteks basi.
