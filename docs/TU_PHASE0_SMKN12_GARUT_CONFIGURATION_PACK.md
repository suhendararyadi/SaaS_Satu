# School OS TU — Phase 0 Configuration Pack

**Tenant:** SMKN 12 GARUT  
**Status:** Discovery baseline — belum mengaktifkan Modul TU di runtime  
**Tanggal audit:** 23 September 2026  
**Sumber:** database School OS production (read-only audit) + blueprint `PLAN_TATA_USAHA_MODULE.md`

> Dokumen ini hanya mengisi fakta yang sudah tersedia di School OS. Format surat, pola nomor, kode klasifikasi, kewenangan tanda tangan, dan alur paraf yang belum memiliki bukti sekolah ditandai `PENDING_SCHOOL_CONFIRMATION`.

## 1. Identitas tenant yang sudah terverifikasi

| Field | Nilai | Status |
|---|---|---|
| Nama sekolah | SMKN 12 GARUT | `VERIFIED_FROM_SCHOOL_OS` |
| NPSN | 20254283 | `VERIFIED_FROM_SCHOOL_OS` |
| Jenjang | SMA/SMK | `VERIFIED_FROM_SCHOOL_OS` |
| Alamat | JL. CIMANUK NO. 285 | `VERIFIED_FROM_SCHOOL_OS` |
| Kabupaten/Kota | Kab. Garut | `VERIFIED_FROM_SCHOOL_OS` |
| Provinsi | Prov. Jawa Barat | `VERIFIED_FROM_SCHOOL_OS` |
| Telepon | 02622541479 | `VERIFIED_FROM_SCHOOL_OS` |
| Email sekolah | smkn12garut@gmail.com | `VERIFIED_FROM_SCHOOL_OS` |
| Logo sekolah | belum tersimpan di field `School.logoUrl` | `NEEDS_ASSET` |
| Tahun ajaran aktif | 2026/2027 | `VERIFIED_FROM_SCHOOL_OS` |
| Semester aktif | GANJIL | `VERIFIED_FROM_SCHOOL_OS` |

### Readiness master data

| Master data | Kondisi saat audit |
|---|---:|
| Siswa | 1.539 |
| Rombel | 50 |
| Program/konsentrasi | 7 |
| Guru/Admin sekolah | 104 akun master |
| School Admin | 1 |
| Wakasek | 4 penugasan |
| Kepala Sekolah | 1 penugasan aktif |
| Tenaga Administrasi terdeteksi | 22 penugasan aktif |

Master data ini **tidak boleh disalin ke tabel TU**. Document variable resolver harus membaca sumber aslinya.

## 2. Program/konsentrasi yang tersedia untuk resolver dokumen

- Agribisnis Perbenihan Tanaman;
- Agribisnis Perikanan Air Tawar;
- Agribisnis Tanaman Pangan dan Hortikultura;
- Bisnis Retail;
- Desain Komunikasi Visual;
- Layanan Perbankan Syariah;
- Teknik Sepeda Motor.

Kode departemen School OS saat ini bersifat internal (`A`–`G`) dan **belum boleh dianggap sebagai kode klasifikasi surat**.

## 3. Struktur organisasi yang dapat dijadikan candidate resolver

### Kepala Sekolah

School OS memiliki satu `PRINCIPAL` aktif:

- **Heryatno** — `Kepala Sekolah`, unit `Pimpinan Sekolah`;
- TeacherProfile memiliki NIP dan NUPTK terisi.

Status untuk Modul TU:

- candidate signer identity: `READY_AS_CANDIDATE`;
- kewenangan tanda tangan per jenis naskah: `PENDING_SCHOOL_CONFIRMATION`;
- specimen/tanda tangan/TTE: `NOT_CONFIGURED`.

### Wakasek

Penugasan aktif yang tersedia:

| Bidang | Nama | Status candidate reviewer/signer |
|---|---|---|
| Kurikulum | Dian Damayanti | `READY_AS_CANDIDATE`; authority `PENDING` |
| Kesiswaan | Susanti | `READY_AS_CANDIDATE`; authority `PENDING` |
| Sarpras | Adeng Firmansyah | `READY_AS_CANDIDATE`; authority `PENDING` |
| Humas/Hubin | Didda Ramdhany Kusumah | `READY_AS_CANDIDATE`; authority `PENDING` |

Mereka **tidak otomatis menjadi approver/signatory**. Template/workflow harus menentukan kewenangan berdasarkan keputusan sekolah.

## 4. Tenaga Administrasi / calon operator TU

Audit menemukan **22 user master** dengan penugasan aktif bertitel `Tenaga Administrasi Sekolah` pada unit `Tenaga Kependidikan`.

Kondisi saat audit:

- primary role seluruhnya: `TEACHER`;
- Auth/login yang terdeteksi: **0/22**;
- assignment khusus `TATA_USAHA`: belum ada;
- assignment `HEAD_OF_ADMINISTRATION` / Kepala TU: belum ada;
- pembagian tugas administrasi per orang: belum tercatat secara terstruktur.

### Keputusan Phase 0

1. Jangan menjadikan 22 orang tersebut `SCHOOL_ADMIN` hanya agar dapat membuka modul TU.
2. Tambahkan capability/assignment TU pada Phase 1.
3. Provision login hanya untuk personel yang benar-benar akan memakai aplikasi.
4. Penetapan Kepala TU wajib berdasarkan konfirmasi sekolah/SK penugasan, bukan inferensi dari daftar tenaga administrasi.
5. Existing primary role `TEACHER` perlu ditinjau pada implementation design; tidak boleh memberi hak mengajar hanya karena user adalah tendik.

## 5. Data governance finding

Ditemukan satu duplikasi assignment aktif pada struktur organisasi:

- Kepala Program Keahlian Agribisnis Tanaman tercatat dua kali untuk orang/judul/unit yang sama.

Status: `NON_BLOCKING_DATA_QUALITY_FINDING`.

Sebelum resolver jabatan TU digunakan production-wide, struktur/penugasan sebaiknya melewati deduplication audit sehingga template tidak mendapatkan candidate jabatan ganda.

## 6. Administrative Rules Profile — baseline

Profile berikut **belum dikunci** dan menjadi input wajib sebelum penerbitan surat production.

| Konfigurasi | Status | Bukti yang dibutuhkan |
|---|---|---|
| Kop surat final | `PENDING_SCHOOL_CONFIRMATION` | contoh surat resmi terbaru / file kop |
| Logo yang digunakan pada kop | `NEEDS_ASSET` | file/logo resmi sekolah |
| Nama instansi induk pada kop | `PENDING_SCHOOL_CONFIRMATION` | contoh surat resmi terbaru |
| Baris alamat/kontak kop | `PARTIAL` | konfirmasi layout resmi |
| Font/ukuran tata naskah | `PENDING_SCHOOL_CONFIRMATION` | contoh surat / aturan instansi |
| Format tanggal/tempat | `PENDING_SCHOOL_CONFIRMATION` | contoh surat |
| Format nomor surat | `PENDING_SCHOOL_CONFIRMATION` | register/contoh surat keluar |
| Reset sequence | `PENDING_SCHOOL_CONFIRMATION` | buku agenda/register |
| Kode klasifikasi | `PENDING_SCHOOL_CONFIRMATION` | daftar klasifikasi resmi sekolah/dinas |
| Kode unit | `PENDING_SCHOOL_CONFIRMATION` | pola nomor existing |
| Penggunaan bulan Romawi | `PENDING_SCHOOL_CONFIRMATION` | contoh nomor existing |
| Sifat surat | `PENDING_SCHOOL_CONFIRMATION` | contoh tata naskah |
| Klasifikasi keamanan | `PENDING_SCHOOL_CONFIRMATION` | aturan sekolah/instansi |
| Approval/paraf route | `PENDING_SCHOOL_CONFIRMATION` | SOP/praktik berjalan |
| Signer per template | `PENDING_SCHOOL_CONFIRMATION` | contoh surat + kewenangan |
| Penggunaan cap/stempel | `PENDING_SCHOOL_CONFIRMATION` | praktik/aturan sekolah |
| TTE tersertifikasi | `NOT_CONFIGURED` | penyedia/sistem resmi bila ada |
| QR verification School OS | `PLANNED` | keputusan sekolah sebelum go-live |
| Retention profile | `PENDING_ARCHIVE_RULES` | JRA/aturan arsip yang digunakan |

## 7. Register surat yang perlu dikonfirmasi

Engine mendukung beberapa register, tetapi Phase 0 belum menetapkan register legal sekolah. Minimal klarifikasi:

- register surat keluar umum;
- register surat masuk;
- apakah Surat Tugas memakai register yang sama atau terpisah;
- apakah SK memakai register khusus;
- apakah dokumen PKL memakai register umum atau unit Humas/Hubin;
- mekanisme agenda internal saat ini;
- perlakuan nomor yang batal/salah;
- penomoran per tahun kalender atau periode lain.

Sampai bukti tersedia, tidak ada pattern nomor yang boleh dijadikan default production.

## 8. Data variable yang siap digunakan pada Phase 1

### School resolver

Siap:

- nama sekolah;
- NPSN;
- alamat;
- kabupaten/kota;
- provinsi;
- telepon;
- email.

Pending:

- logo/kop resmi asset;
- nama instansi induk sesuai tata naskah.

### Student resolver

Siap dari `User` + `StudentProfile` + `ClassRoom` + `Department` + `AcademicYear`, dengan field-policy whitelist.

### Staff resolver

Siap dari `User` + `TeacherProfile` + assignment structures. NIK dan field sensitif tidak boleh menjadi template variable default.

### PKL resolver

Dapat menggunakan Company/Placement/PklPeriod setelah template PKL disetujui.

## 9. Starter template priority register

Semua item di bawah berstatus **`WAITING_REAL_SAMPLE`**, bukan template final.

| Priority | Candidate template | Primary data source | Proposed default reviewer | Signer authority |
|---:|---|---|---|---|
| P0 | Surat Keterangan Aktif Siswa | Student + Class + School | TU Coordinator | `PENDING` |
| P0 | Surat Keterangan Siswa | Student + Class + School | TU Coordinator | `PENDING` |
| P0 | Surat Tugas | Staff/Student + School | terkait konteks | `PENDING` |
| P0 | Surat Pengantar | target entity + School | TU Coordinator | `PENDING` |
| P0 | Surat Undangan | School + recipients | unit terkait | `PENDING` |
| P1 | Surat Pemberitahuan | School + recipients | unit terkait | `PENDING` |
| P1 | Surat Permohonan | School + destination | unit terkait | `PENDING` |
| P1 | Surat Rekomendasi | Student/Staff + School | unit terkait | `PENDING` |
| P1 | Surat Pengantar PKL | Student + Placement + Company | Humas/Hubin | `PENDING` |
| P1 | Surat Panggilan Orang Tua/Wali | Student + Guardian + School | Kesiswaan | `PENDING` |

Kolom reviewer di atas adalah **routing candidate berdasarkan domain**, bukan keputusan kewenangan legal.

## 10. Asset/intake yang masih diperlukan

Sebelum Phase 1 production implementation dikunci, perlu tersedia:

- contoh 10–20 surat terbaru yang sudah dianonimkan;
- screenshot/scan buku agenda surat keluar dan masuk;
- daftar kode klasifikasi yang benar-benar digunakan;
- file kop/logo resmi;
- SOP atau kebiasaan paraf/review;
- daftar pejabat yang boleh menandatangani tiap jenis dokumen;
- SK penugasan Kepala TU/operator bila ada;
- contoh disposisi surat masuk;
- aturan retensi/JRA yang dipakai;
- informasi apakah sekolah sudah memakai TTE/e-office/SRIKANDI atau layanan resmi lain.

## 11. Readiness verdict Phase 0

### Ready

- tenant identity;
- master data siswa;
- rombel/program;
- Kepala Sekolah candidate;
- empat Wakasek candidate;
- daftar tenaga administrasi candidate;
- data contact sekolah;
- tahun ajaran aktif;
- existing School OS authorization/audit patterns.

### Not ready to issue production letters

- official template samples;
- legal numbering profile;
- classification codes;
- Kepala TU assignment;
- approval/paraf matrix;
- signatory authority per template;
- official letterhead/logo asset;
- archive retention profile;
- TTE policy.

**Kesimpulan:** Phase 1 foundation dapat mulai dirancang, tetapi fitur `ISSUE` surat production harus tetap feature-gated sampai seluruh konfigurasi kritis di atas dikonfirmasi.
