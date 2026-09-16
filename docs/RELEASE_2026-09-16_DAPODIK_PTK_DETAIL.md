# Release — Dapodik PTK Detail Profiles

Date: **16 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

School OS sekarang memiliki halaman detail **Guru & Tenaga Kependidikan** yang mengikuti pola halaman detail siswa dan menggunakan struktur PTK dari workbook resmi Profil Satuan Pendidikan SMKN 12 Garut.

## Runtime

- release: `e212f56-ptk-detail`
- source commit: `e212f563cab755617d1be3f25ff2bdf3407f398c`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/e212f56-ptk-detail`
- static: `/var/www/saas-satu/releases/e212f56-ptk-detail`
- service: `saas-satu.service` active
- rollback backend/static: `24cb787-panel-hardening`

## Feature

Route baru:

`/school/teachers/:id`

Halaman detail menyediakan:

- header profil PTK dengan NIP, jenis PTK, dan jabatan;
- indikator kelengkapan profil;
- status kepegawaian;
- wali kelas aktif;
- status sinkron Dapodik;
- Data Utama;
- Kualifikasi & Sertifikasi;
- Beban Kerja & Mengajar;
- Kontak & Akun School OS;
- Penugasan & Struktur Sekolah: Wakasek, wali kelas, kepala program/konsentrasi, serta assignment aktif lain.

Daftar `/school/teachers` sekarang mempunyai nama yang dapat dibuka ke halaman detail dan tombol **Detail**.

Edit dasar tetap memakai flow CRUD Guru & Tendik yang sudah ada. Penambahan halaman ini tidak membuat kredensial login PTK.

## Dapodik TeacherProfile schema

Migration:

`20260916013500_add_dapodik_teacher_profile`

Field nullable baru:

- NUPTK;
- jenis kelamin;
- tempat/tanggal lahir;
- NIK;
- status kepegawaian;
- jenis PTK;
- gelar depan/belakang;
- jenjang pendidikan;
- jurusan/prodi;
- sertifikasi;
- TMT kerja;
- tugas tambahan;
- mata pelajaran yang diajar;
- jam tugas tambahan;
- JJM;
- total JJM;
- beban/jumlah siswa;
- kompetensi;
- jabatan PTK;
- `dapodikImportedAt`.

Header workbook **Keterangan** diperlakukan sebagai group heading, bukan field database tersendiri.

Index ditambahkan pada `nip`, `nuptk`, dan `nik`.

## Privacy & authorization

- query detail selalu tenant-scoped memakai `schoolId`;
- hanya role dengan `viewSchoolDirectory` yang dapat membuka detail;
- NUPTK, NIK, tempat lahir, dan tanggal lahir tidak dikirim ke viewer non-admin;
- School Admin / platform admin dapat melihat profil lengkap;
- daftar Guru & Tendik juga menerapkan masking yang sama sehingga penambahan field baru tidak memperluas exposure data sensitif secara tidak sengaja;
- unauthenticated `get-school-teacher-detail`: HTTP 401.

## Backfill production SMKN 12 Garut

Sebelum migration/data mutation dibuat backup:

`/home/ubuntu/backups/SaaS_Satu/pre-ptk-detail-dapodik-20260916.dump`

Backup diverifikasi dengan `pg_restore -l`, mode 600.

Backfill menggunakan workbook resmi Profil Satuan Pendidikan dan matching ketat:

1. NIP untuk PTK yang memiliki NIP;
2. fallback normalized exact name hanya untuk PTK tanpa NIP.

Dry-run transaction PASS dan rollback sebelum commit nyata.

Hasil production:

- TeacherProfile: **103**;
- Dapodik profile terisi: **103/103**;
- NUPTK terisi: **100**;
- NIK terisi: **103**;
- NIP terisi: **96**;
- tanggal lahir: **103**;
- status kepegawaian: **103**;
- jenis PTK: **103**;
- jabatan PTK: **103**;
- komposisi: 80 Guru, 22 Tenaga Kependidikan, 1 Kepala Sekolah;
- Auth/login PTK: **0**;
- siswa SMKN 12 Garut tetap **1.539**;
- wali kelas aktif tetap **50/50**.

Tenant student isolation tetap:

- SMKN 1 Rongga: 21;
- SMKN 12 Garut: 1.539;
- SMPN 1 Gununghalu: 0.

## Quality gate

- Prisma schema validation: PASS;
- targeted tests: 7/7 PASS;
- full Vitest dengan `NODE_ENV=test`: **134/134 PASS** pada 23 file;
- Wasp production build: PASS;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client production build: PASS;
- immutable deploy preflight: PASS;
- cutover health: `/auth/me` HTTP 200;
- public `/school`: HTTP 200;
- public `/school/teachers`: HTTP 200;
- unauthenticated detail operation: HTTP 401;
- production static contains `TeacherDetailPage` chunk;
- recent runtime log menunjukkan detail operation 401 yang diharapkan dan tidak menunjukkan detail PTK 500.

Catatan test: satu full-suite run awal diwarisi `NODE_ENV=production`, sehingga React test runtime tidak mengekspos `React.act`. Ini merupakan test-environment issue, bukan source regression. Full suite diulang dengan `NODE_ENV=test` dan 134/134 PASS.
