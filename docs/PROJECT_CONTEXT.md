# School OS — Persistent Project Context

Last updated: **10 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah snapshot konteks operasional untuk melanjutkan pengembangan School OS lintas chat/sesi. Baca dokumen ini sebelum membuat perubahan baru, lalu gunakan dokumen teknis yang ditautkan sebagai source of truth per area.

## 1. Source tree yang aktif

- Repository utama: `/home/ubuntu/projects/SaaS_Satu`
- Worktree pengembangan School OS saat ini: `/home/ubuntu/projects/SaaS_Satu-hardening`
- Branch aktif: `redesign/apple-hig`
- Implementasi dashboard terbaru yang tercatat: `10eb867` (`refine(dashboard): prioritize class attendance and decision icons`)
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
- panel Admin **Kehadiran per rombel** menampilkan maksimal 5 rombel prioritas berdasarkan persentase hadir terendah pada hari berjalan; nilai tanpa data tidak diperlakukan sebagai 0%;
- ranking kehadiran dinormalisasi dengan persentase, bukan jumlah absen mentah, agar rombel dengan ukuran/jumlah sesi berbeda tetap dapat dibandingkan secara adil; jumlah ketidakhadiran dipakai sebagai tie-breaker;
- rombel dengan record `ALPA` memakai aksen merah, sedangkan data kosong tetap netral;
- panel **Perlu keputusan Anda** memakai icon tile bergaya macOS per jenis kondisi tanpa membuat kasus atau angka contoh baru.

Commit refinement terkait: `70108d1`, `5b66eb1`, `0adb095`, `ea99802`, dan `10eb867`.

## 3. Snapshot production terakhir yang terverifikasi

Domain School OS: `https://sekolah.suhendararyadi.com`.

Pada 10 September 2026, pointer runtime yang dibaca dari server adalah:

- static web: `/var/www/saas-satu/releases/ea99802-macos-settings-sidebar`;
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/107c2e8-dashboard-attendance`;
- `saas-satu.service`: **active/running**.

Perubahan seed demo terakhir tidak membutuhkan schema migration, restart backend, atau deploy UI.

Refinement dashboard commit `10eb867` sudah terverifikasi di source tree tetapi **belum dipromosikan ke production** pada snapshot ini. Deployment harus mengikuti quality gate dan immutable release/cutover yang berlaku.

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
