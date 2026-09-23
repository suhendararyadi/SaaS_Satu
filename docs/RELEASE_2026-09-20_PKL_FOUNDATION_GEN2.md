# Release — PKL Foundation Generasi Kedua

Date: **20 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

PKL Foundation Generasi Kedua membangun master data dan kontrak kapasitas yang diperlukan sebelum School OS melanjutkan ke Penempatan, Presensi, Jurnal, Penilaian, dan Administrasi PKL generasi berikutnya.

## Runtime

- production release: `45a11a5-pkl-foundation-gen2`
- application commit: `45a11a546fe4b6f2fefad46d2120cac7d30de25a`
- main feature commit: `af73bca27cba5e7e0f4a46c491953262817e83e2`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/45a11a5-pkl-foundation-gen2`
- static: `/var/www/saas-satu/releases/45a11a5-pkl-foundation-gen2`
- rollback baseline before rollout: `03655f4-ptk-editor`
- service: `saas-satu.service` active

## 1. Fondasi / Perencanaan PKL

Route admin baru:

`/school/pkl/foundation`

Halaman ini menjadi pusat konfigurasi sebelum plotting siswa dan mencakup:

- Program / Periode PKL;
- master Pembimbing DUDI;
- kapasitas DUDI per Periode × Mitra × Konsentrasi Keahlian;
- ringkasan jumlah periode, mitra, pembimbing, dan total kapasitas Gen2.

Navigasi admin PKL sekarang memiliki item **Fondasi PKL**.

## 2. Program / Periode PKL

Model baru:

`PklPeriod`

Field utama:

- tenant `schoolId`;
- tautan opsional ke `AcademicYear`;
- nama periode;
- tanggal mulai;
- tanggal selesai;
- status aktif/nonaktif;
- catatan;
- timestamps.

Guardrail:

- nama unik per sekolah;
- tanggal selesai harus setelah tanggal mulai;
- AcademicYear harus berasal dari tenant yang sama;
- periode yang sudah memiliki penempatan atau konfigurasi kapasitas tidak dapat dihapus; periode harus dinonaktifkan agar histori tetap terjaga.

`Placement` memperoleh relasi nullable `pklPeriodId`, sehingga data PKL Gen1 tetap valid tanpa backfill paksa.

## 3. Mitra DUDI Generasi Kedua

Model `Company` tetap dipakai agar kompatibel dengan seluruh flow PKL lama, tetapi sekarang memiliki profil kemitraan yang lebih lengkap:

- kode DUDI;
- nama mitra dan nama legal;
- sektor industri;
- alamat;
- telepon kantor;
- email;
- website;
- PIC + nomor PIC;
- koordinat GPS dan radius;
- `maxQuota` legacy;
- status kemitraan: ACTIVE / DRAFT / EXPIRED / INACTIVE;
- tanggal mulai/akhir kerja sama;
- nomor MoU / PKS;
- catatan;
- status aktif/nonaktif;
- timestamps.

Kode DUDI dinormalisasi uppercase dan harus unik dalam tenant jika diisi.

Penghapusan DUDI ditolak bila sudah memiliki:

- riwayat penempatan;
- Pembimbing DUDI;
- konfigurasi kapasitas.

Gunakan status nonaktif agar histori tidak rusak.

## 4. DUDI ↔ Konsentrasi Keahlian

Model baru:

`CompanyDepartment`

Mitra DUDI dapat ditandai menerima satu atau beberapa `Department` / konsentrasi keahlian milik sekolah.

Kontrak keamanan/integritas:

- DUDI dan Department harus berada pada tenant yang sama;
- kombinasi DUDI × Department unik;
- relasi tidak boleh dilepas bila masih dipakai konfigurasi kapasitas;
- halaman Mitra DUDI menyediakan checkbox konsentrasi yang diterima;
- daftar mitra menampilkan badge kode konsentrasi.

Untuk SMKN 12 Garut, model `Department` saat ini mewakili tujuh konsentrasi A–G yang sudah authoritative.

## 5. Kapasitas per Periode × DUDI × Konsentrasi

Model baru:

`PklCompanyCapacity`

Kapasitas disimpan dengan kombinasi unik:

`PklPeriod × Company × Department`

Field:

- `schoolId`;
- period;
- company;
- department;
- quota;
- notes;
- timestamps.

Kontrak:

- period/company/department harus berasal dari tenant yang sama;
- kuota integer 1–999;
- penyimpanan kapasitas memastikan relasi DUDI ↔ konsentrasi tersedia;
- konfigurasi dapat dihapus secara tenant-scoped.

### Boundary kompatibilitas

`Company.maxQuota` **tetap dipertahankan** dan masih menjadi sumber kuota pada flow **Placement Gen1**.

`PklCompanyCapacity` adalah fondasi untuk **Penempatan PKL Generasi Kedua** dan belum menggantikan enforcement kuota Placement Gen1 pada release ini.

Hal ini disengaja agar rollout foundation tidak mengubah perilaku penempatan lama secara diam-diam.

## 6. Master Pembimbing DUDI

Model baru:

`DudiMentorProfile`

Saat admin membuat master Pembimbing DUDI:

- dibuat `User` role `DUDI_MENTOR`;
- dibuat `DudiMentorProfile` yang terhubung ke satu DUDI;
- dapat menyimpan jabatan, telepon, email kontak, catatan, dan status aktif.

### Login safety

Flow master **tidak** membuat:

- password;
- Auth record;
- username;
- email login sintetis.

Email pada profil adalah **kontak**, bukan otomatis identitas login.

Kredensial login Pembimbing DUDI hanya boleh dibuat kemudian melalui flow autentikasi resmi bila sekolah memang menghendakinya.

### Lifecycle

Aksi hapus pada master Pembimbing DUDI menggunakan **archive semantics**: profil dinonaktifkan agar relasi/histori tidak rusak.

Nama pembimbing yang sama pada DUDI yang sama ditolak sebagai duplikasi.

## 7. Tenant isolation

Semua operasi Gen2 memakai `requireSchoolAdmin` dan memvalidasi `schoolId`.

Cross-tenant period, DUDI, Department, dan kapasitas tidak dapat dirangkai melalui parameter ID.

UI visibility bukan security boundary; validasi tenant tetap dilakukan pada server.

## 8. Database migration

Backup sebelum migration:

`/home/ubuntu/backups/SaaS_Satu/pre-pkl-foundation-gen2-20260920.dump`

Backup:

- size: **1,490,693 bytes**;
- mode: **0600**;
- owner: ubuntu;
- `pg_restore -l`: PASS.

Migration:

1. `20260920002500_add_pkl_foundation_gen2`
   - checksum `39b0a4979ab57e3af843dc470ff856e1f92985832f5765617560f70b807d26ca`
2. `20260920003500_align_company_updated_at_default`
   - checksum `7aee38417a2b04316a473227caa07581918d38fb14ab6cb849ba83e5b745f9a9`

Migration pertama additive dan tercatat applied. Migration kedua menjaga schema `Company.updatedAt` tetap sesuai kontrak Prisma `@updatedAt` setelah legacy rows memperoleh nilai saat ALTER.

## 9. Production data preservation

Tidak ada synthetic PKL data yang dibuat untuk SMKN 12 Garut.

Final production baseline:

- students: **1,539**;
- TeacherProfile: **103**;
- PTK Auth: **0**;
- Company / Mitra DUDI: **0**;
- PklPeriod: **0**;
- DudiMentorProfile: **0**;
- PklCompanyCapacity: **0**;
- Placement: **0**;
- AttendanceLog PKL: **0**;
- DailyJournal PKL: **0**.

Empat `Company` milik tenant lama tetap dipertahankan saat migration additive.

## 10. Quality gate

- Prisma schema validation: PASS;
- Wasp compile/build: PASS;
- targeted policy/auth tests: **10/10 PASS**;
- full Vitest final: **141/141 PASS** pada 24 file;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client build: PASS;
- static contains `PklFoundationPage` and updated `CompaniesPage` chunks;
- immutable deploy preflight: PASS;
- production deploy: PASS;
- canonical release preflight after concurrent release-name normalization: PASS;
- repeat deploy: **idempotent true**;
- `/school/pkl/foundation`: HTTP 200;
- `/school/pkl/companies`: HTTP 200;
- `/school/pkl/placements`: HTTP 200;
- unauthenticated `create-pkl-period`: HTTP 401;
- unauthenticated `create-dudi-mentor`: HTTP 401;
- service: active;
- recent runtime log: no PKL/Foundation 500 observed.

## 11. Next development boundary

Foundation Gen2 is complete. The next logical development phase is **Penempatan PKL Generasi Kedua**, which can now consume:

- active `PklPeriod`;
- DUDI ↔ concentration compatibility;
- `PklCompanyCapacity`;
- master `DUDI_MENTOR`;
- existing teacher supervisor relation;
- existing Placement history.

Penempatan Gen2 should be the phase that explicitly promotes per-period/per-concentration capacity from planning metadata into placement enforcement.
