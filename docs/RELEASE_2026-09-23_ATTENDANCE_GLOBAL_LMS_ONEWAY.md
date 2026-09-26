# Release — Kehadiran Global → LMS Satu Arah

Tanggal: **23 September 2026 (Asia/Jakarta)**

## Ringkasan

Release ini menegaskan dua lapisan kehadiran School OS:

1. **Kehadiran Global (`SchoolDailyAttendance`)** adalah sumber resmi kehadiran siswa per hari di sekolah.
2. **Kehadiran LMS/mapel (`LmsAttendanceSession` + `LmsAttendanceRecord`)** adalah catatan independen per sesi pembelajaran.

Hubungan keduanya sekarang **satu arah**: Kehadiran Global menjadi prefill saat guru membuka presensi mapel, tetapi perubahan presensi mapel tidak mengubah Kehadiran Global.

Runtime commit: `3adbefb0e64d37506a215386b437af9f46376191`

Production release: `3adbefb-attendance-global-lms-oneway`

## Kontrak perilaku

### Kehadiran Global

- self check-in siswa tetap menjadi evidence Global;
- `SchoolDailyAttendance` tetap canonical daily truth;
- Admin dapat mengoreksi seluruh rombel;
- Wali Kelas dapat mengoreksi rombel binaannya;
- Guru Piket aktif dapat mengoreksi seluruh rombel **hanya pada hari berjalan**;
- koreksi manusia tetap dicatat ke audit trail dengan actor/source yang membedakan Admin, Wali, dan Piket.

### Kehadiran LMS/mapel

Saat sesi presensi mapel dibuka, default berasal dari Global hari itu:

| Global | Default mapel |
| --- | --- |
| HADIR | HADIR |
| TERLAMBAT | HADIR |
| SAKIT | SAKIT |
| IZIN | IZIN |
| ALPA | ALPA |
| belum tercatat | belum ditentukan |

`TERLAMBAT` Global menjadi `HADIR` sebagai default mapel karena terlambat datang ke sekolah tidak otomatis berarti terlambat di setiap sesi. Guru tetap dapat mengubah status sesi menjadi `TERLAMBAT`.

Jika Global belum tersedia, School OS tidak lagi menganggap siswa otomatis HADIR pada mapel; guru wajib menentukan status.

Setelah presensi mapel disimpan, record sesi bersifat independen. Perubahan Global berikutnya tidak menimpa record LMS yang sudah tersimpan.

`SUBJECT_ATTENDANCE` tetap ditulis ke `StudentAttendanceEvent` untuk audit/EWS, dengan metadata `affectsGlobalAttendance=false`, tetapi tidak lagi memicu `reconcileStudentDay()`.

## Rekonsiliasi Global

`reconcileAttendanceEvidence()` tidak lagi memakai `SUBJECT_ATTENDANCE` untuk membuktikan physical presence, membuat Global ALPA, membuat Global NEEDS_REVIEW hanya karena beberapa mapel ALPA, atau menentukan `arrivalAt`.

Subject evidence tetap tersedia di evidence summary sehingga anomali seperti **Global HADIR + beberapa mapel ALPA** dapat dianalisis sebagai perilaku pembelajaran tanpa merusak status resmi kehadiran sekolah.

## UI

- `/school/attendance` menjelaskan bahwa surface tersebut adalah Kehadiran Global resmi;
- Guru Piket aktif mendapat badge `Piket Hari Ini`, pilihan seluruh rombel, dan tanggal terkunci pada hari berjalan;
- `/school/governance/piket` memiliki aksi `Koreksi Kehadiran Global`;
- dialog presensi LMS menjelaskan prefill Global dan independensi mapel;
- siswa tanpa Global ditandai belum memiliki status awal dan tidak dapat disimpan sebelum guru menentukan status.

## UAT real database

UAT dijalankan pada database sintetis terisolasi bernama khusus `attendance_uat`, bukan database production.

Hasil: **20/20 PASS**. Cakupan mencakup self check-in → Global, idempotency, prefill Global → LMS, Global kosong, course/tenant isolation, independensi subject vs Global, koreksi Wali/Piket, Piket hanya hari berjalan, cross-class denial, dan saved LMS yang tidak tertimpa koreksi Global berikutnya.

Database UAT telah dihapus dan diverifikasi tidak tersisa.

## Quality gate

- targeted attendance tests: **14/14 PASS**;
- real-DB UAT: **20/20 PASS**;
- full regression: **182/182 PASS across 33 files**;
- `git diff --check`: PASS;
- schema/migration diff: **none**;
- Wasp 0.25 build: PASS;
- generated server `tsc --build && rollup`: PASS;
- Vite SSR production build: PASS;
- Vite client production build: PASS;
- immutable release preflight: PASS;
- production deploy: PASS;
- repeated deploy: `idempotent=true`.

Catatan test runner: full Vitest harus dijalankan dengan `NODE_ENV=test`; tanpa itu environment production React menyebabkan `React.act is not a function` pada UI test. Ini adalah test-environment issue, bukan regression aplikasi.

## Security smoke

Unauthenticated POST sesudah deploy:

- `get-course-attendance-seed` → **401**;
- `record-course-attendance` → **401**;
- `get-daily-school-attendance` → **401**;
- `save-daily-school-attendance` → **401**.

Public shell routes `/school`, `/school/attendance`, `/school/lms/courses`, dan `/school/governance/piket` semuanya **200**. `saas-satu.service` aktif dan recent log scan tidak menemukan error/fatal/exception.

## Production data integrity

SMKN 12 GARUT sebelum dan setelah UAT/deploy:

- siswa: **1,539**;
- `SchoolDailyAttendance`: **0**;
- `StudentAttendanceEvent`: **0**;
- `LmsAttendanceSession`: **0**.

Tidak ada fixture UAT yang masuk ke production.

## Backup & rollback

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-attendance-global-lms-oneway-20260923-150935.dump`

- size: `1,598,664` bytes;
- mode: `600`;
- owner: `ubuntu`;
- `pg_restore -l`: PASS;
- SHA-256: `c15244fd4dcc0f203f0fca24e92f47de12b40535304d30c0cfdcbb9ffc1b447a`.

Rollback backend: `/home/ubuntu/deployments/SaaS_Satu/releases/34fcd3b-openclaw-tenant-attribution`

Rollback static: `/var/www/saas-satu/releases/5a4d731-tu-content-gen2`

Static source `5a4d731` telah diverifikasi sebagai ancestor dari backend baseline `34fcd3b` dan sudah terkandung di runtime release ini.

## Continuation point

Arsitektur yang harus dipertahankan: **Self/Piket/Wali/Admin → Global official daily truth → prefill LMS**, lalu **LMS tetap independen**.

Jangan mengembalikan `LMS → reconcile Global`. Untuk EWS, bedakan ALPA sekolah dengan kasus Global HADIR tetapi siswa ALPA pada sesi pembelajaran.
