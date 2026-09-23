# Release/Handoff — SMKN 12 Garut Profile, PTK, Program, and Sarpras Import

Date: **15 September 2026 (Asia/Jakarta)**  
Status: **LIVE / production data baseline**

Dokumen ini mencatat import master data dari workbook resmi profil satuan pendidikan **SMKN 12 GARUT** yang diunduh 14 September 2026. Handoff ini hanya menyimpan agregat, mapping struktural, dan keputusan import; identitas sensitif PTK tidak disalin ke dokumentasi permanen.

## Source

Workbook sumber: `profil-SMKN 12 GARUT-2026-09-14 14_04_05.xlsx`.

Sheet yang diaudit:

- Profil SMKN 12 GARUT
- PTK
- Peserta Didik
- Rombongan Belajar
- Prasarana
- Sarana
- Blockgrant

## Backup

Backup production sebelum mutation:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`

Backup berukuran 1,430,726 byte, mode 600, dan `pg_restore -l` PASS.

## Data yang diimpor

### Profil sekolah

Field yang memang tersedia pada model `School` diperbarui dari sumber resmi:

- nama/NPSN tetap SMKN 12 GARUT / 20254283;
- alamat: JL. CIMANUK NO. 285;
- kota: Kab. Garut;
- provinsi: Prov. Jawa Barat;
- telepon: 02622541479;
- email: smkn12garut@gmail.com.

Field workbook yang belum punya tempat canonical pada model School OS tidak dipaksakan ke kolom lain.

### PTK

- **103 PTK** masuk sebagai direktori Guru & Tenaga Kependidikan;
- komposisi sumber: 80 Guru, 22 Tenaga Kependidikan, 1 Kepala Sekolah;
- **96** memiliki NIP dan **7** tidak memiliki NIP;
- setiap PTK mendapat `User` tenant-scoped + `TeacherProfile`;
- **0 Auth/login credential** dibuat untuk PTK;
- email sintetis tidak dibuat;
- NIK/NUPTK/tanggal lahir dan field sensitif lain yang belum memiliki field canonical tidak disimpan ke kolom yang salah.

### Organisasi dan penugasan

- **4 Wakasek**: Kurikulum, Kesiswaan, Sarpras, Humas/Hubin;
- **1 Kepala Sekolah**;
- **7 assignment Kepala Program/Konsentrasi** untuk 7 kode A–G. Jumlah assignment 7 berasal dari 6 kepala program karena Program Agribisnis Tanaman menaungi dua konsentrasi A dan F;
- **22 assignment Tenaga Kependidikan**;
- **13 assignment tugas struktural lain** yang memang eksplisit di profil;
- total assignment bertanda sumber import: **43**.

Assignment generik seperti `Guru wali`, `Wali kelas`, dan `Pembina Ekstrakurikuler` tanpa nama unit tidak dipaksakan menjadi organisasi palsu. Wali kelas ditulis melalui relasi native `ClassRoom.homeroomTeacherId`.

## Mapping resmi A–G

Mapping diambil dari sheet **Rombongan Belajar** melalui kolom kurikulum dan konsentrasi, bukan dari tebakan internet:

| Kode | Program Keahlian | Konsentrasi/Department School OS |
| --- | --- | --- |
| A | Agribisnis Tanaman | Agribisnis Tanaman Pangan dan Hortikultura |
| B | Teknik Otomotif | Teknik Sepeda Motor |
| C | Desain Komunikasi Visual | Desain Komunikasi Visual |
| D | Pemasaran | Bisnis Retail |
| E | Akuntansi dan Keuangan Lembaga | Layanan Perbankan Syariah |
| F | Agribisnis Tanaman | Agribisnis Perbenihan Tanaman |
| G | Agribisnis Perikanan | Agribisnis Perikanan Air Tawar |

Karena model `Department` saat ini satu tingkat, School OS menyimpan **7 konsentrasi** sebagai Department dengan code A–G. Parent Program Keahlian dicatat di dokumentasi/handoff ini.

### Rombel dan siswa setelah mapping

Seluruh **50 rombel** pada tahun ajaran aktif 2026/2027 GANJIL sekarang memiliki Department dan wali kelas.

Distribusi production:

| Kode | Konsentrasi | Rombel | Siswa |
| --- | --- | ---: | ---: |
| A | Agribisnis Tanaman Pangan dan Hortikultura | 9 | 240 |
| B | Teknik Sepeda Motor | 12 | 383 |
| C | Desain Komunikasi Visual | 9 | 289 |
| D | Bisnis Retail | 7 | 240 |
| E | Layanan Perbankan Syariah | 7 | 222 |
| F | Agribisnis Perbenihan Tanaman | 3 | 75 |
| G | Agribisnis Perikanan Air Tawar | 3 | 90 |
| **Total** |  | **50** | **1.539** |

Jumlah siswa tetap berasal dari database detail yang sebelumnya diimpor, bukan dari tabel agregat workbook profil.

## Sarpras

### Prasarana

- **75 FacilityRoom** diimpor;
- kode internal deterministik menggunakan pola `DAP-PRAS-###`;
- nama, tipe, dan keterangan/ukuran sumber dipertahankan.

### Sarana

- **816 AssetItem record** diimpor;
- total kuantitas: **2.512 unit**;
- kondisi:
  - GOOD/laik: **1.464 unit** pada 468 record;
  - DAMAGED/tidak laik: **1.048 unit** pada 348 record;
- category canonical: `SARANA-DAPODIK`;
- acquisition source: `Profil Dapodik 2026-09-14`;
- setiap row workbook tetap menjadi satu record agregat dengan quantity, bukan dipalsukan menjadi ribuan item serial individual.

Ada **17 asset record** yang sengaja tidak diberi `roomId` karena nama lokasi sumber menunjuk nama prasarana yang muncul lebih dari sekali. Nama lokasi tetap disimpan pada notes. Jangan menebak ruang mana yang benar sebelum ada pembeda authoritative.

## Data yang sengaja tidak dipakai untuk overwrite

- Sheet **Peserta Didik** hanya berisi agregat dan jumlahnya berbeda dari database detail terbaru. Baseline 1.539 siswa production dipertahankan.
- Sheet **Blockgrant** adalah riwayat bantuan, sementara School OS belum memiliki model canonical khusus blockgrant. Data ini tidak dipaksakan ke tabel lain.
- Field PTK yang belum memiliki field canonical (mis. NUPTK, NIK, tempat/tanggal lahir, detail pendidikan/sertifikasi, status kepegawaian lengkap) tidak dimasukkan ke field semantik yang salah. Sebagian status operasional Tenaga Kependidikan disimpan pada assignment resmi yang relevan.
- Profil sekolah seperti fax, rekening/bank, koordinat, website sumber, dan metadata lain yang belum memiliki field School canonical tidak dipaksakan.

## Verification

Dry-run pertama menemukan matcher Kepala Sekolah terlalu longgar; transaksi otomatis rollback sebelum mutation. Matcher diperbaiki dan dry-run kedua PASS seluruh assertion.

Production commit kemudian PASS:

- PTK / TeacherProfile: 103;
- Auth PTK: 0;
- Department: 7;
- rombel mapped + homeroom: 50/50;
- Wakasek: 4;
- staff assignments import: 43;
- prasarana: 75;
- sarana: 816 record / 2.512 unit;
- GOOD: 1.464 unit;
- DAMAGED: 1.048 unit;
- ambiguous room links intentionally null: 17;
- SMKN 12 Garut students: tetap 1.539;
- SMKN 1 Rongga students: tetap 21;
- SMPN 1 Gununghalu students: tetap 0;
- `saas-satu.service`: active;
- production backend/static pointer tetap `24cb787-panel-hardening`;
- `/school`: HTTP 200;
- `/auth/me`: HTTP 200.

Tidak ada deployment/restart aplikasi pada pekerjaan ini; perubahan hanya master data production.
