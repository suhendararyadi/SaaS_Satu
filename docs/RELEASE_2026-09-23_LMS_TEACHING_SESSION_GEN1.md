# Release — LMS Teaching Session Gen1

Tanggal: **23 September 2026 (Asia/Jakarta)**

Runtime commit: `c7814f5de663cac48df38eeca860782af940923d`

Production release: `c7814f5-lms-teaching-session-gen1`

Migration: `20260923233000_add_lms_teaching_session_gen1`

## Tujuan bisnis

Release ini mengadaptasi model operasional Modul Guru Mata Pelajaran Jingga Asik ke arsitektur School OS tanpa menyalin struktur route atau datastore lama. LMS sekarang bukan hanya ruang materi/tugas/CBT, tetapi juga pusat eksekusi KBM harian:

**Jadwal → Teaching Session → Agenda → Check-in guru → Presensi mapel → Keaktifan → Check-out → Riwayat/Rekap/Audit.**

Kontrak Kehadiran Global dari release sebelumnya tetap berlaku: `SchoolDailyAttendance` adalah sumber resmi harian sekolah, sedangkan presensi mapel tetap independen dan hanya menerima prefill satu arah dari Global.

## Implementasi

### Teaching Schedule

Model `LmsTeachingSchedule` menambahkan jadwal per course, hari, jam mulai/selesai, ruang, dan status aktif. Backend menolak:

- jam selesai yang tidak lebih besar dari jam mulai;
- jadwal guru yang bertabrakan;
- jadwal rombel yang bertabrakan;
- pengelolaan course di luar ownership/tenant.

### Teaching Session

Model `LmsTeachingSession` menjadi parent operasional pertemuan. Satu schedule hanya boleh memiliki satu session per tanggal.

Saat start:

- harus berada pada hari dan jendela waktu jadwal;
- topik, metode, dan ringkasan agenda wajib;
- selfie langsung guru wajib;
- GPS divalidasi server terhadap geofence sekolah bila koordinat Attendance Policy telah dikonfigurasi;
- agenda lama `LmsAgenda` ditautkan ke Teaching Session, bukan diduplikasi.

Saat check-out:

- sesi harus sedang berjalan;
- seluruh roster siswa wajib sudah mempunyai presensi mapel;
- selfie + GPS check-out wajib;
- optimistic `version` mencegah stale concurrent completion.

### Presensi mapel

`LmsAttendanceSession` lama tetap digunakan dan sekarang dapat ditautkan ke Teaching Session.

- prefill tetap berasal satu arah dari Global;
- linked save harus mencakup seluruh roster aktif;
- save berulang melakukan upsert, bukan membuat session duplikat;
- `SUBJECT_ATTENDANCE` tetap ditulis untuk audit/EWS dengan `affectsGlobalAttendance=false`;
- tidak ada jalur LMS yang mengubah `SchoolDailyAttendance`.

### Keaktifan siswa

`LmsEngagementScore` menyimpan rubrik harian 0–100 dan level:

- 90–100: Sangat Aktif;
- 80–89: Aktif;
- 70–79: Cukup;
- <70: Perlu Bimbingan.

Perubahan ditutup setelah 7 hari dari waktu akhir sesi.

### Guru Piket dan SLA

Teaching Workspace menghitung status:

- LOCKED;
- READY;
- SLA_BREACH setelah 15 menit;
- MISSED;
- IN_PROGRESS;
- COMPLETED;
- DELEGATED.

Guru berhalangan dapat mengirim alasan dan instruksi kelas ke Piket. Guru Piket aktif melihat antrean delegasi dan sesi yang melewati SLA, lalu dapat menandai tugas sudah diteruskan.

### Monitoring dan EWS

- Waka Kurikulum/Principal/Admin: cakupan sekolah;
- Department Head/Kaprog: cakupan program/departemen;
- guru: course miliknya.

EWS sekarang mengenali **Selective Truancy** ketika siswa Global HADIR/TERLAMBAT tetapi ALPA pada sesi mapel. Sinyal ini tidak mengubah Global Attendance.

Rekap kehadiran mapel menandai persentase <85% sebagai **warning**, bukan hard block CBT.

## Surface production

- `/school/lms/teaching` — KBM Hari Ini;
- `/school/lms/courses/:id/teaching` — Teaching Session, jadwal, riwayat, rekap;
- `/school/lms/teaching/audit` — audit KBM;
- `/school/governance/piket` — antrean SLA/delegasi terintegrasi.

## Database

Schema aditif:

- `LmsTeachingSchedule`;
- `LmsTeachingSession`;
- `LmsEngagementScore`;
- `LmsTeachingSessionEvent`;
- nullable link `LmsAgenda.teachingSessionId`;
- nullable link `LmsAttendanceSession.teachingSessionId`;
- `LmsAgenda.method`.

Migration divalidasi pada clone production sebelum production deploy.

## Quality gate

- targeted unit/policy: **21/21 PASS**;
- production-clone real-DB UAT: **30/30 PASS**;
- full regression: **189/189 PASS across 35 test files**;
- Prisma validate: PASS;
- Wasp 0.25 build: PASS;
- generated server bundle: PASS;
- Vite SSR production build: PASS;
- Vite client production build: PASS;
- immutable preflight: PASS;
- production deploy: PASS;
- repeat deploy: `idempotent=true`.

## Security smoke

Tanpa login, seluruh operation Teaching Session yang diuji mengembalikan **401**, termasuk workspace, course teaching data, schedule write, start/finish session, delegation, engagement, duty queue, audit, dan evidence upload/file.

## Production integrity

Setelah migration/deploy, SMKN 12 Garut:

- students: **1,539**;
- `SchoolDailyAttendance`: **0**;
- legacy `LmsAttendanceSession`: **0**;
- `LmsTeachingSchedule`: **0**;
- `LmsTeachingSession`: **0**;
- `LmsEngagementScore`: **0**;
- synthetic UAT schools: **0**.

Tidak ada seed otomatis pada tenant production.

## Backup dan rollback

Final pre-migration backup:

`/home/ubuntu/backups/SaaS_Satu/pre-lms-teaching-session-gen1-final-20260923-164144.dump`

- size: 1,613,400 bytes;
- mode: 600;
- owner: ubuntu;
- SHA-256: `c7b8ab0becfcb0ec65f0accb67435b7ba5fb6b3658e7d7b9ac6c5f0804ef1c85`.

Rollback backend/static:

`3adbefb-attendance-global-lms-oneway`

Catatan: rollback runtime tidak menghapus tabel migration baru; schema bersifat aditif dan runtime lama tidak bergantung pada tabel baru.

## Scope yang sengaja belum diadopsi

Blueprint Jingga Asik juga memiliki offline sync queue, push scheduler, dan ekspor Excel khusus administrasi. Ketiganya **tidak** termasuk dalam fase Teaching Session Gen1 ini. Fase yang disepakati untuk integrasi School OS—Teaching Session, schedule/time window, teacher evidence, Piket SLA/delegation, history/recap, monitoring/EWS, dan engagement rubric—telah diimplementasikan.
