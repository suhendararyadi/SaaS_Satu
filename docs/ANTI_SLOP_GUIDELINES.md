# Pedoman Kualitas & Anti-Slop (R-01 s/d R-38)

Proyek ini menerapkan standar **Anti-Slop Guidelines** untuk memastikan perangkat lunak bebas dari artefak generik buatan AI, salinan robotik, dekorasi visual tanpa fungsi, serta inkonsistensi antarmuka.

---

## 1. Aturan Inti Anti-Slop

### Blok 1: Gerbang Wajib (Hard Gate)
- **R-01 & R-02 (Copywriting Alami & Bebas Placeholder Robotik)**:
  - Dilarang keras menggunakan placeholder dropdown berbentuk pseudo tanda hubung seperti `-- Pilih Rombel --` atau `-- Semua Tingkat --`.
  - Gunakan frasa alami: `"Pilih Rombel Kelas"`, `"Semua Tingkat"`, `"Tanpa Jurusan / Umum (Fase E)"`.
  - Istilah harus baku dan sesuai standar pendidikan nasional (Kemdikbudristek): Rombel, KBM, Presensi, DUDI, CBT, Waka Kurikulum, PTK, Dapodik.
- **R-03 (Target Sentuh & Responsivitas Layar Ponsel)**:
  - Setiap elemen interaktif (tombol, chip aksi) wajib memiliki target sentuh minimum 44px (`min-h-[44px]` dan `touch-manipulation`).
  - Seluruh tabel data wajib dibungkus kontainer ber-overflow horizontal (`overflow-x-auto`) untuk mencegah tata letak pecah di layar kecil.
- **R-04 (Satu Sistem Ikon Tunggal)**:
  - Dilarang mencampuradukkan pustaka ikon (misal: Lucide + FontAwesome + Material).
  - 100% antarmuka sekolah menggunakan **Google Material Symbols Rounded** melalui komponen `M3Icon`.
- **R-25 (Kontras Warna Standar Aksesibilitas WCAG AA)**:
  - Rasio kontras teks terhadap latar belakang wajib memenuhi standar WCAG AA (minimal **4.5:1** untuk teks reguler, **3:1** untuk teks besar).
  - Dilarang menggunakan teks abu-abu pudar seperti `text-slate-400` di atas latar putih. Diganti menjadi `text-md-on-surface` atau `text-md-on-surface-variant`.
- **R-27 (Kelengkapan 3 Status UI)**:
  - Setiap halaman wajib memiliki status **Loading** (`M3CircularProgress`), status **Kosong/Empty State** yang ramah dilengkapi tombol aksi langsung, dan status **Error** tertangani.

### Blok 2: Gerbang Fungsional (Purpose-Gate)
- **R-06 (Bebas Elemen AI Generik)**:
  - Dilarang memasang ikon kilauan (*sparkles* / `auto_awesome`) atau animasi pendar tanpa fungsi nyata.
- **R-08 (Bebas Repetisi Panah Tombol)**:
  - Dilarang mengulang ikon panah seragam `ArrowRight` di setiap kartu atau tombol. Gunakan teks tindakan yang spesifik (misal: "Lihat Detail", "Buka Ruang Kelas").
- **R-09 (Badge Berarti Nyata)**:
  - Dilarang menampilkan badge promosi atau kebocoran teknis seperti `"M3 Material"` di header antarmuka. Badge hanya digunakan untuk status riil (misal: `HADIR`, `TERLAMBAT`, `Tingkat 7`).
- **R-16 (Kebersihan Komentar Kode)**:
  - Komentar kode tidak boleh menggunakan jargon klise AI seperti *"robust"*, *"elegantly handles"*, atau *"cutting-edge"*. Komentar murni menjelaskan keputusan arsitektur yang penting.

---

## 2. Resolusi Temuan Audit (18/18 Findings Resolved)

Audit pasca pengerjaan menyeluruh (*Mode 2: After*) telah membersihkan 18 isu kualitas di seluruh modul:

| No | Aturan | File Target | Masalah Semula | Solusi & Hasil Perbaikan |
| :--- | :--- | :--- | :--- | :--- |
| **#01** | **R-02** | `ClassRoomsPage.tsx` | Placeholder pseudo `-- Label --` | Diperbaiki menjadi teks natural: `"Tanpa Jurusan / Umum (Fase E)"` & `"Belum Ditentukan"` |
| **#02** | **R-02** | `PlacementsPage.tsx` | Placeholder tanda hubung `-- ... --` | Diganti label bersih: `"Pilih Siswa yang Belum Plotting"`, `"Pilih Perusahaan Mitra"`, `"Tanpa Pembimbing"` |
| **#03** | **R-02** | `LmsCoursesPage.tsx` | Placeholder tanda hubung `-- ... --` | Diganti label bersih: `"Pilih Rombel Kelas"` dan `"Pilih Guru Pengampu"` |
| **#04** | **R-25** | `ReportsPage.tsx` | Teks `text-slate-400` di latar putih | Dinaikkan ke `text-slate-600 font-medium` (kontras WCAG AA >= 4.5:1) |
| **#05** | **R-03** | `M3Button.tsx` | Ukuran tombol kecil < 44px sentuh | Ditambahkan jaminan area sentuh minimum 44px (`touch-manipulation`, `min-h-[44px]`) |
| **#06** | **R-27** | `SchoolDashboardPage.tsx` | Tampilan metrik 0 polos | Ditambahkan modul panduan langkah awal konfigurasi sekolah dengan tautan langsung |
| **#07** | **R-04** | `SchoolLayout.tsx` | Sparkle `auto_awesome` pada pendaftaran | Diganti icon relevan fungsional: `school` |
| **#08** | **R-09** | `SchoolLayout.tsx` | Badge dekoratif `"M3 Material"` di Top Bar | Dihapus sepenuhnya dari header top app bar |
| **#09** | **R-04** | `SchoolDashboardPage.tsx` | Lucide `Sparkles` di badge tenant | Diganti token Material Symbols `apartment` / `domain` via `M3Icon` |
| **#10** | **R-08** | `SchoolDashboardPage.tsx` | Panah seragam `ArrowRight` di kartu | Dihapus dekorasi panah berulang, diganti aksi teks spesifik |
| **#11** | **R-04** | `SchoolSettingsPage.tsx` | Lucide icon imports | Migrasi 100% ke Google Material Symbols Rounded (`M3Icon`) |
| **#12** | **R-04** | `AllSchoolsPage.tsx` | `Sparkles` di badge Super Admin | Diganti icon semantik `admin_panel_settings` |
| **#13** | **R-04** | `CsvImportPage.tsx` | Lucide icon imports pada tabs | Migrasi ke `M3Icon` (`groups`, `badge`, `apartment`, `cloud_upload`) |
| **#14** | **R-04** | Master Data (`Students`, `Teachers`, dll.) | Lucide icon imports | Migrasi 100% ke Google Material Symbols Rounded (`M3Icon`) |
| **#15** | **R-04** | Modul E-PKL (5 halaman) | Lucide icon imports | Migrasi 100% ke Google Material Symbols Rounded (`M3Icon`) |
| **#16** | **R-04** | Tata Kelola (Piket, Wali Kelas, Waka) | Lucide icon imports | Migrasi 100% ke Google Material Symbols Rounded (`M3Icon`) |
| **#17** | **R-04** | LMS & KBM (`LmsCourses`, `LmsCourseDetail`) | Lucide icon imports | Migrasi 100% ke Google Material Symbols Rounded (`M3Icon`) |
| **#18** | **R-16** | `csvParser.ts` | Komentar kode AI buzzword ("Robust") | Dibersihkan menjadi deskripsi teknis lugas sesuai `antislop-code` |

---

## 3. Kamus Pembersihan Salinan (De-Buzzwording Guide)

Berikut daftar pembersihan frasa bertele-tele dan kebocoran framework:

| Sebelum (Bertele-tele / Buzzword) | Sesudah (Lugas & Alami) |
| :--- | :--- |
| *"Pusat Kendali Terpadu Manajemen Akademik, LMS Kelas, dan Supervisi Tata Kelola Sekolah berbasis Google Material 3"* | **"Kelola data akademik, pembelajaran kelas, dan administrasi sekolah."** |
| *"Kapasitas Kuota Siswa Sekolah"* | **"Kuota Siswa Terdaftar"** |
| *"Pusat Export Dokumen Resmi Sekolah Ber-KOP Resmi"* | **"Cetak Dokumen & Laporan Sekolah"** |
| *"Presensi Siswa PKL (PWA)"* & *"validasi geofencing"* | **"Presensi Lokasi Siswa PKL"** (*"sesuai radius lokasi mitra DUDI"*) |
| *"Early Warning System (EWS) & Monitoring PKL"* | **"Monitoring & Deteksi Dini PKL"** |
| *"12 Mata pelajaran standar Kurikulum Merdeka Fase D berhasil digenerate"* | **"12 mata pelajaran standar Kurikulum Merdeka Fase D siap digunakan untuk kegiatan KBM."** |
| *"Data Master Pendidik & Tenaga Kependidikan (PTK)"* | **"Guru & Tenaga Kependidikan"** |
| *"Data Master Peserta Didik (Siswa)"* | **"Data Siswa"** |
| *"Manajemen Rombongan Belajar (Kelas)"* | **"Kelas & Rombel"** |
