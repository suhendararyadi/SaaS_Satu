# Daftar Akun Demo — SMKN 1 Rongga

Status: **Aktif untuk pengujian School OS / Attendance 360**  
Tenant: **SMKN 1 RONGGA**  
URL login: **https://sekolah.suhendararyadi.com/login**  
Tanggal verifikasi akun: **22 September 2026**

> Dokumen ini sengaja **tidak menyimpan password plaintext**. Password adalah rahasia autentikasi dan tidak boleh masuk Git, dokumentasi proyek, log, atau handoff. Akun yang berstatus **HAS_AUTH** sudah mempunyai identitas autentikasi dan siap dipakai jika password demo yang sah diketahui oleh penguji. Akun **NO_AUTH** hanya merupakan data master dan tidak dapat login sampai diprovisikan melalui flow autentikasi resmi School OS.

## 1. Akun utama untuk UAT Attendance 360

| Peran pengujian | Nama | Email / Username login | Status Auth | Cakupan utama | Halaman yang diuji |
|---|---|---|---|---|---|
| Admin Sekolah QA | [DEMO] Admin Sekolah QA | `school_admin-qa@schoolos-demo.invalid` | HAS_AUTH | Administrasi sekolah, konfigurasi, command center, audit | `/school/attendance/settings`, `/school/attendance/command`, `/school/attendance/audit`, `/school/attendance/habituation` |
| Siswa XI RPL 1 | [DEMO] Siswa 01 | `student-01@schoolos-demo.invalid` | HAS_AUTH | Self check-in/out, GPS, selfie, riwayat | `/school/my-attendance` |
| Wali XI RPL 1 + Guru Piket + Guru LMS | [DEMO] Rina Contoh — RPL | `teacher-01@schoolos-demo.invalid` | HAS_AUTH | Wali XI RPL 1, Duty Teacher, LMS KIK & Web | `/school/attendance`, `/school/governance/piket`, LMS |
| Guru Piket + Wali XI RPL 2 | [DEMO] Dedi Contoh — Basis Data | `teacher-02@schoolos-demo.invalid` | HAS_AUTH | Duty Teacher, Wali XI RPL 2, LMS Basis Data | `/school/governance/piket`, `/school/attendance`, LMS |
| Wali murni DKV | [DEMO] Asep Contoh — DKV | `teacher-04@schoolos-demo.invalid` | HAS_AUTH | Wali XI DKV 1, Waka Sarpras, LMS Desain Visual Digital | `/school/attendance` untuk uji pembatasan scope rombel |

### Urutan uji Attendance 360 yang direkomendasikan

1. Login sebagai **Admin Sekolah QA** dan cek konfigurasi Attendance 360.
2. Login sebagai **Siswa 01** dan cek `Kehadiran Saya`.
3. Login sebagai **Dedi** dan cek Gate Console Guru Piket.
4. Login sebagai **Rina** dan cek rekonsiliasi XI RPL 1 serta evidence LMS.
5. Login sebagai **Asep** dan pastikan hanya rombel DKV yang dapat diakses sebagai wali murni.
6. Kembali ke **Admin** untuk memeriksa Command Center, Audit Trail, Pembiasaan, dan EWS.

## 2. Semua akun Admin / staf login-ready

| Nama | Email login | Role utama | Penugasan / catatan | Status Auth |
|---|---|---|---|---|
| Super Administrator | `admin@sekolah.suhendararyadi.com` | SCHOOL_ADMIN / super-admin application access | Akun administratif utama platform | HAS_AUTH |
| [DEMO] Admin Sekolah QA | `school_admin-qa@schoolos-demo.invalid` | SCHOOL_ADMIN | Admin tenant demo SMKN 1 Rongga | HAS_AUTH |
| [DEMO] Rina Contoh — RPL | `teacher-01@schoolos-demo.invalid` | TEACHER | Wali 11 RPL 1; Duty Teacher; LMS KIK & Kewirausahaan 11 RPL 1; LMS Pemrograman Web 11 RPL 2 | HAS_AUTH |
| [DEMO] Dedi Contoh — Basis Data | `teacher-02@schoolos-demo.invalid` | TEACHER | Wali 11 RPL 2; Duty Teacher; LMS Basis Data 12 RPL 1 | HAS_AUTH |
| [DEMO] Maya Contoh — TJKT | `teacher-03@schoolos-demo.invalid` | TEACHER | Wali 11 TJKT 1; Waka Kesiswaan; LMS Administrasi Infrastruktur Jaringan | HAS_AUTH |
| [DEMO] Asep Contoh — DKV | `teacher-04@schoolos-demo.invalid` | TEACHER | Wali 11 DKV 1; Waka Sarpras; LMS Desain Visual Digital | HAS_AUTH |
| [DEMO] Nadia Contoh — Waka Kurikulum | `teacher-05@schoolos-demo.invalid` | TEACHER | Wali 12 RPL 1; Waka Kurikulum; LMS Projek Kreatif 11 RPL 1 | HAS_AUTH |
| [DEMO] Guru Contoh — Belum Memiliki Mapel | `teacher-06@schoolos-demo.invalid` | TEACHER | Akun guru tanpa mapel untuk menguji empty state / scope terbatas | HAS_AUTH |
| [DEMO] Humas Hubin QA | `teacher-07@schoolos-demo.invalid` | TEACHER | Waka Humas/Hubin | HAS_AUTH |
| [DEMO] Mentor DUDI 01 | `dudi_mentor-01@schoolos-demo.invalid` | DUDI_MENTOR | Pembimbing DUDI demo | HAS_AUTH |

## 3. Akun siswa

### Login-ready

| Nama | Email login | Rombel | Status Auth |
|---|---|---|---|
| [DEMO] Siswa 01 | `student-01@schoolos-demo.invalid` | [DEMO] 11 RPL 1 | HAS_AUTH |

### Data-only / belum diprovisikan login

Akun berikut **belum mempunyai Auth** dan tidak dapat dipakai login saat ini. Mereka tetap dapat digunakan sebagai data siswa oleh admin, wali kelas, LMS, Guru Piket, Attendance 360, dan modul lain.

| Nama | Email data | Rombel | Status Auth |
|---|---|---|---|
| [DEMO] Siswa 02 | `student-02@schoolos-demo.invalid` | [DEMO] 11 RPL 1 | NO_AUTH |
| [DEMO] Siswa 03 | `student-03@schoolos-demo.invalid` | [DEMO] 11 RPL 1 | NO_AUTH |
| [DEMO] Siswa 04 | `student-04@schoolos-demo.invalid` | [DEMO] 11 RPL 1 | NO_AUTH |
| [DEMO] Siswa 05 | `student-05@schoolos-demo.invalid` | [DEMO] 11 RPL 2 | NO_AUTH |
| [DEMO] Siswa 06 | `student-06@schoolos-demo.invalid` | [DEMO] 11 RPL 2 | NO_AUTH |
| [DEMO] Siswa 07 | `student-07@schoolos-demo.invalid` | [DEMO] 11 RPL 2 | NO_AUTH |
| [DEMO] Siswa 08 | `student-08@schoolos-demo.invalid` | [DEMO] 11 RPL 2 | NO_AUTH |
| [DEMO] Siswa 09 | `student-09@schoolos-demo.invalid` | [DEMO] 12 RPL 1 | NO_AUTH |
| [DEMO] Siswa 10 | `student-10@schoolos-demo.invalid` | [DEMO] 12 RPL 1 | NO_AUTH |
| [DEMO] Siswa 11 | `student-11@schoolos-demo.invalid` | [DEMO] 12 RPL 1 | NO_AUTH |
| [DEMO] Siswa 12 | `student-12@schoolos-demo.invalid` | [DEMO] 12 RPL 1 | NO_AUTH |
| [DEMO] Siswa 13 | `student-13@schoolos-demo.invalid` | [DEMO] 11 TJKT 1 | NO_AUTH |
| [DEMO] Siswa 14 | `student-14@schoolos-demo.invalid` | [DEMO] 11 TJKT 1 | NO_AUTH |
| [DEMO] Siswa 15 | `student-15@schoolos-demo.invalid` | [DEMO] 11 TJKT 1 | NO_AUTH |
| [DEMO] Siswa 16 | `student-16@schoolos-demo.invalid` | [DEMO] 11 TJKT 1 | NO_AUTH |
| [DEMO] Siswa 17 | `student-17@schoolos-demo.invalid` | [DEMO] 11 DKV 1 | NO_AUTH |
| [DEMO] Siswa 18 | `student-18@schoolos-demo.invalid` | [DEMO] 11 DKV 1 | NO_AUTH |
| [DEMO] Siswa 19 | `student-19@schoolos-demo.invalid` | [DEMO] 11 DKV 1 | NO_AUTH |
| [DEMO] Siswa 20 | `student-20@schoolos-demo.invalid` | [DEMO] 11 DKV 1 | NO_AUTH |
| [DEMO] Siswa 21 — Belum Masuk Rombel | `student-21@schoolos-demo.invalid` | Belum masuk rombel | NO_AUTH |

## 4. Akun Pembimbing DUDI

| Nama | Email / identifier | Status Auth | Catatan |
|---|---|---|---|
| [DEMO] Mentor DUDI 01 | `dudi_mentor-01@schoolos-demo.invalid` | HAS_AUTH | Login-ready untuk panel DUDI/PKL bila password demo yang sah tersedia |
| [DEMO] Mentor DUDI 02 | `dudi_mentor-02@schoolos-demo.invalid` | NO_AUTH | Data-only; belum dapat login |

## 5. Password dan reset akses

### Kebijakan

Password plaintext **tidak disimpan di file ini**, tidak dimasukkan ke Git, dan tidak dibaca kembali dari database. School OS memakai autentikasi email/password Wasp dan menyediakan halaman resmi:

- Login: `/login`
- Lupa password: `/request-password-reset`
- Set password baru dari token reset: `/password-reset`

Alamat `@schoolos-demo.invalid` memang merupakan alamat demo dan **tidak menerima email Internet**. Karena itu password akun demo tidak boleh “dipulihkan” dengan membaca hash atau menyuntik hash secara langsung ke database.

### Jika password login-ready sudah tidak diketahui

Gunakan salah satu jalur aman berikut:

1. Provision akun test baru melalui flow autentikasi resmi menggunakan alamat email test yang benar-benar dapat menerima email; lalu berikan role/tenant demo yang diperlukan.
2. Gunakan workflow reset password resmi bila akun memakai alamat email yang dapat menerima pesan reset.
3. Untuk pengujian jangka panjang, sediakan satu atau beberapa alamat mailbox test khusus yang dikontrol tim dan jangan commit passwordnya ke source control.

**Jangan** menggunakan pola `password = NIS`, shared password permanen lintas role, insert hash manual, atau menyimpan password di `.md`/Git.

## 6. Data UAT Attendance 360 yang saat ini tersedia

Tenant SMKN 1 Rongga sengaja menyimpan hasil UAT Attendance 360 agar dapat diperiksa manual:

- Attendance 360 policy aktif;
- titik geofence sekolah: `-7.0011, 107.2721`;
- radius: `150 m`;
- batas akurasi GPS: `75 m`;
- selfie check-in wajib;
- special schedule `[UAT] Attendance 360 end-to-end` untuk 22 September 2026;
- evidence self check-in/check-out;
- event Guru Piket terlambat;
- izin sakit yang telah disetujui;
- evidence LMS;
- rekonsiliasi dan verifikasi Wali Kelas;
- kegiatan `[UAT] Sapa Pagi`;
- signal EWS keterlambatan berulang;
- data Command Center dan Audit Trail.

Backup sebelum UAT:

`/home/ubuntu/backups/SaaS_Satu/pre-attendance360-rongga-uat-20260922.dump`

Cleanup reversible yang sudah diuji pada database clone:

`/home/ubuntu/backups/SaaS_Satu/attendance360-rongga-uat-20260922.cleanup.sql`

Jangan menjalankan cleanup selama data UAT masih dibutuhkan untuk pengecekan manual.

## 7. Checklist cepat pengujian

- [ ] Admin QA dapat membuka Pengaturan Kehadiran.
- [ ] Admin QA dapat membuka Command Center.
- [ ] Siswa 01 dapat membuka Kehadiran Saya.
- [ ] Check-in meminta GPS dan selfie.
- [ ] Guru Piket dapat membuka Gate Console.
- [ ] Wali XI RPL 1 dapat membuka rekonsiliasi XI RPL 1.
- [ ] Wali murni DKV tidak dapat membuka XI RPL 1.
- [ ] Matriks bulanan tersedia.
- [ ] Pembiasaan tidak mengubah status hadir sekolah secara otomatis.
- [ ] Audit Trail menampilkan sumber self/piket/LMS/permit/pembiasaan/wali.
- [ ] EWS menampilkan signal keterlambatan berulang pada data UAT.
