# Panduan Modul Antarmuka & Fungsionalitas Sekolah

Dokumen ini menjelaskan alur kerja, fungsionalitas, serta aturan bisnis untuk setiap modul yang ada pada aplikasi SaaS Sistem Informasi Sekolah.

---

## Modul 1: Dasbor & Master Data (`/school/*`)

### 1.1 Dasbor Sekolah (`/school`)
- **Tujuan**: Memberikan ringkasan instan kondisi akademik dan administrasi sekolah.
- **Komponen Utama**:
  - **Banner Ringkasan**: Keterangan identitas sekolah, jenjang aktif, dan status paket.
  - **Indikator Kuota Siswa**: Memantau kapasitas siswa terdaftar terhadap batas kuota langganan (`studentQuota`).
  - **Panduan Awal Sekolah**: Langkah terpandu bagi admin baru untuk mengonfigurasi tahun ajaran, jurusan, kelas rombel, hingga data siswa.
  - **Kartu Metrik Cepat**: Total rombel, total guru, total siswa, dan mapel LMS aktif.

### 1.2 Kelas & Rombel (`/school/classes`)
- **Tujuan**: Mengelola rombongan belajar (rombel) dan penugasan wali kelas.
- **Fitur**:
  - Filter interaktif berdasarkan tingkat (Grade Level) dan Jurusan.
  - Tambah/Edit Rombel via modal dialog Material 3 (`M3Dialog`).
  - Penugasan Wali Kelas dari daftar guru terdaftar.
  - Proteksi Hapus: Rombel yang masih memiliki siswa aktif tidak dapat dihapus sebelum siswa dimutasi.

### 1.3 Tahun Ajaran & Semester (`/school/academic-years`)
- **Tujuan**: Mengatur periode tahun pelajaran aktif di sekolah.
- **Fitur**:
  - Penambahan periode (misal: "2026/2027" Ganjil / Genap).
  - Penetapan Tahun Ajaran Aktif (hanya 1 tahun ajaran yang dapat aktif pada satu waktu).

### 1.4 Jurusan & Keahlian (`/school/departments`)
- **Tujuan**: Mengelola program keahlian (khusus jenjang SMK dan SMA peminatan).
- **Fitur**: Kode jurusan (misal: "RPL", "TKJ", "MIPA"), nama kompetensi, dan daftar kelas terhubung.

### 1.5 Pengaturan Identitas & KOP Sekolah (`/school/settings`)
- **Tujuan**: Konfigurasi identitas resmi sekolah untuk dokumen kedinasan.
- **Fitur**:
  - Nama resmi sekolah, NPSN, jenjang (`SD`, `SMP`, `SMA_SMK`).
  - Alamat lengkap, kontak telepon, email, dan logo resmi (KOP surat).

### 1.6 Organisasi Sekolah Super Admin (`/school/admin/schools`)
- **Tujuan**: Panel platform admin global untuk mengelola multi-tenant.
- **Fitur**:
  - Daftar seluruh sekolah terdaftar di Indonesia.
  - Manajemen batas kuota siswa (`studentQuota`) per sekolah.
  - Pengalihan tenant aktif (*tenant switcher*) untuk supervisi langsung.

### 1.7 Impor Data Massal CSV (`/school/import`)
- **Tujuan**: Mempercepat migrasi data dari format Dapodik atau file Excel sekolah.
- **Fitur**:
  - Tab navigasi untuk Siswa, Guru, dan Mitra Industri (DUDI).
  - Parser cerdas (*auto-detection column headers*): mengenali variasi nama kolom seperti "nama", "namasiswa", "nis", "nisn", "gender", "kelas", "rombel", "nip", "gelar", dll.
  - Proteksi kuota siswa saat impor massal.

---

## Modul 2: Kepegawaian & Kesiswaan (CRUD Manual & CSV)

Selain impor massal, kedua modul ini dilengkapi operasi **CRUD manual real-time**:

### 2.1 Guru & Tenaga Kependidikan (`/school/teachers`)
- **Tambah Guru (`createTeacher`)**:
  - Input: Nama Lengkap (wajib), Gelar Akademik, NIP, Email, Nomor Telepon/WhatsApp, Peran Akun (`TEACHER` / `SCHOOL_ADMIN`), dan Switch penugasan Waka Kurikulum.
  - Validasi keunikan NIP dan email dalam lingkup sekolah.
- **Edit Guru (`updateTeacher`)**:
  - Memperbarui profil, kontak, serta promosi/penyesuaian peran.
- **Hapus Guru (`deleteTeacher`)**:
  - **Proteksi Akun Sendiri**: Mencegah admin menghapus akunnya sendiri.
  - **Proteksi KBM**: Mencegah penghapusan jika guru masih aktif mengampu mata pelajaran di LMS.
  - **Pembersihan Otomatis**: Otomatis melepaskan jabatan wali kelas pada rombel aktif, melepaskan pembimbing PKL, dan membersihkan laporan piket harian.

### 2.2 Data Siswa (`/school/students`)
- **Tambah Siswa (`createStudent`)**:
  - Input: Nama Lengkap Siswa (wajib), NIS, NISN, Jenis Kelamin (L/P), Pilihan Rombel Kelas, dan Email.
  - **Proteksi Kuota**: Jika jumlah siswa aktif telah mencapai batas paket (`studentQuota`), pembuatan siswa ditolak dengan pesan edukatif untuk upgrade paket.
- **Edit Siswa (`updateStudent`)**:
  - Memperbarui biodata siswa, mutasi pindah kelas rombel, serta status keaktifan (`ACTIVE`, `SUSPENDED`, `GRADUATED`).
- **Hapus Siswa (`deleteStudent`)**:
  - **Proteksi PKL**: Siswa yang sedang menjalani penempatan PKL aktif di mitra industri tidak dapat dihapus sebelum status penempatannya diselesaikan.
  - **Pembersihan Otomatis**: Menghapus riwayat absensi LMS dan tugas siswa secara aman sebelum akun pengguna dihapus.

---

## Modul 3: Pembelajaran LMS & Kurikulum Merdeka (`/school/lms/*`)

### 3.1 Ruang Mata Pelajaran (`/school/lms/courses`)
- **Generator Kurikulum Merdeka Instan**:
  - Tombol aksi "+ Paket Kurikulum Merdeka" mendeteksi jenjang sekolah secara otomatis:
    - **Fase A/B/C (SD)**: Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, IPAS, Seni Budaya, PJOK, Bahasa Inggris.
    - **Fase D (SMP)**: Bahasa Indonesia, Bahasa Inggris, Matematika, IPA, IPS, Informatika, Pendidikan Pancasila, PJOK, Seni Budaya, Prakarya, PAI/Agama.
    - **Fase E/F (SMA/SMK)**: Mata pelajaran umum + kejuruan/pilihan.
  - Menghasilkan daftar mata pelajaran lengkap tanpa perlu mengetik manual satu per satu.
- **Filter & Pencarian**: Filter cepat berdasarkan rombel kelas dan pencarian nama mapel atau guru pengampu.

### 3.2 Detail Ruang Mapel KBM (`/school/lms/courses/:courseId`)
Halaman detail mata pelajaran menyediakan 5 tab terpadu:
1. **Materi Pembelajaran**: Berbagi dokumen referensi, modul PDF, dan tautan video pembelajaran.
2. **Tugas & Pengumpulan**: Membuat tugas rumah dengan petunjuk instruksi, batas waktu pengumpulan (*deadline*), dan evaluasi penilaian siswa.
3. **Agenda KBM Mengajar**: Catatan jurnal harian mengajar guru (pertemuan ke-berapa, jam pelajaran, ringkasan materi yang diajarkan).
4. **Presensi Siswa**: Catatan kehadiran per pertemuan (Hadir, Sakit, Izin, Alpa) dengan ringkasan persentase kehadiran kelas.
5. **Ujian CBT & Evaluasi**: Bank soal daring (Pilihan Ganda & Esai) dengan sistem pengacakan soal (*randomized*).

---

## Modul 4: E-PKL Terpadu (`/school/pkl/*`)

Modul komprehensif bagi SMK atau SMA vokasi untuk mengelola Praktik Kerja Lapangan:

### 4.1 Mitra Perusahaan DUDI (`/school/pkl/companies`)
- Direktori industri mitra dengan kuota tampung maksimal siswa.
- Penentuan titik koordinat kantor/pabrik (Latitude, Longitude) dan batas radius toleransi presensi dalam meter (misal: 100m).

### 4.2 Penempatan Siswa (`/school/pkl/placements`)
- Plotting penugasan siswa ke perusahaan mitra.
- Penugasan Guru Pembimbing Sekolah dan Instruktur Mentor dari industri.
- Penetapan tanggal mulai dan berakhirnya periode PKL.

### 4.3 Presensi Lokasi Siswa PKL (`/school/pkl/attendance`)
- Pencatatan kehadiran siswa langsung dari perangkat ponsel.
- Validasi jarak radius GPS terhadap titik kantor mitra DUDI untuk mencegah kecurangan absensi.

### 4.4 Jurnal Harian Logbook (`/school/pkl/journals`)
- Siswa mencatat aktivitas pekerjaan harian dan melampirkan foto dokumentasi.
- Guru pembimbing dan mentor industri memverifikasi dan memberikan umpan balik langsung.

### 4.5 Monitoring & Deteksi Dini (EWS) (`/school/pkl/monitoring`)
- *Early Warning System* untuk memantau siswa yang tidak hadir tanpa keterangan berturut-turut atau tidak mengisi jurnal harian selama lebih dari 3 hari.

---

## Modul 5: Tata Kelola & Supervisi Kedinasan (`/school/governance/*`)

### 5.1 Laporan Guru Piket (`/school/governance/piket`)
- Pencatatan ketertiban harian: rekap jumlah siswa terlambat, izin keluar/dispensasi kedinasan, dan catatan insiden sekolah.

### 5.2 Supervisi Wali Kelas (`/school/governance/wali-kelas`)
- Akses khusus bagi guru yang ditugaskan sebagai wali kelas untuk memantau seluruh profil siswa di kelasnya, rekap kehadiran, dan catatan khusus.

### 5.3 Supervisi Waka Kurikulum (`/school/governance/waka-kurikulum`)
- Dasbor pemantauan keterlaksanaan KBM seluruh sekolah.
- Menampilkan persentase kepatuhan guru dalam mengisi agenda mengajar harian (*compliance rate*), serta mendeteksi kelas yang belum terisi jadwal KBM.

---

## Modul 6: Laporan & Cetak Dokumen Kedinasan (`/school/reports`)

- **KOP Surat Kedinasan Standar**: Format KOP surat resmi Indonesia dengan logo dinas/Tut Wuri Handayani di sisi kiri, identitas lengkap sekolah di tengah, dan garis pemisah ganda tebal tipis.
- **Penyesuaian Jenjang Otomatis**: Redaksi identitas (misal: Pemerintah Daerah Provinsi untuk SMA/SMK, Pemerintah Kabupaten/Kota untuk SD/SMP).
- **Format Dokumen Siap Cetak**:
  - Surat Keterangan Aktif Siswa.
  - Surat Pengantar Penempatan PKL Siswa ke DUDI.
  - Laporan Rekapitulasi Presensi KBM Kelas.
  - Berita Acara Supervisi Pembelajaran Guru.
- **Fitur Cetak & Simpan PDF**: Menggunakan *print stylesheet* bawaan browser (`@media print`) yang menyembunyikan navigasi drawer dan top bar, menghasilkan cetakan dokumen yang bersih dan presisi.
