# SaaS Sistem Informasi Sekolah (Smart School Multi-Tenant)

[![Wasp Framework](https://img.shields.io/badge/Wasp-v0.25.0-F9A03F.svg)](https://wasp.sh)
[![Google Material 3](https://img.shields.io/badge/Design%20System-Google%20Material%203-12512E.svg)](https://m3.material.io)
[![Anti-Slop](https://img.shields.io/badge/Quality-Anti--Slop%20Verified-blue.svg)](./docs/ANTI_SLOP_GUIDELINES.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Passed-3178C6.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Unit-67%2F67%20Passing-brightgreen.svg)](#pengujian)

Platform Software-as-a-Service (SaaS) manajemen sekolah modern multi-tenant yang dibangun di atas framework full-stack **[Wasp](https://wasp.sh)**, **React 19**, **Node.js 24**, **Prisma ORM**, dan **PostgreSQL**. Mengusung sistem desain **Google Material 3 (Material You)** serta menerapkan standar kualitas tinggi **Anti-Slop (R-01 s/d R-38)**.

---

## 🌟 Modul & Fitur Utama

1. **Master Data & Fondasi Akademik (`/school/*`)**:
   - Dasbor sekolah terpadu dengan pemantauan kuota siswa (`studentQuota`).
   - Manajemen Kelas & Rombongan Belajar (Rombel) dengan penugasan wali kelas.
   - Manajemen Tahun Ajaran dan penetapan semester aktif.
   - Pengaturan identitas sekolah berjenjang (SD, SMP, SMA, SMK) untuk KOP surat resmi.
   - Panel Super Admin Platform untuk manajemen multi-tenant sekolah dan alokasi kuota.
   - Impor massal data dari Dapodik / Excel via CSV parser cerdas.
2. **Kepegawaian & Kesiswaan (CRUD Manual & Massal)**:
   - Manajemen Guru & Tendik (Create, Read, Update, Delete) dengan proteksi jadwal mengajar LMS dan switch penugasan Waka Kurikulum.
   - Manajemen Peserta Didik (Siswa) dengan pengamanan kapasitas kuota paket sekolah dan proteksi penempatan PKL aktif.
3. **Pembelajaran LMS & Kurikulum Merdeka (`/school/lms/*`)**:
   - Generator paket silabus Kurikulum Merdeka otomatis (Fase A hingga Fase F).
   - Ruang kelas mata pelajaran dengan 5 sub-modul terpadu: Materi Pembelajaran, Tugas & Penilaian, Agenda Mengajar KBM, Presensi Siswa, dan Ujian Online CBT.
4. **E-PKL Terpadu (`/school/pkl/*`)**:
   - Direktori Perusahaan Mitra (DUDI) dengan batas kuota dan titik koordinat GPS.
   - Plotting penempatan siswa bersama guru pembimbing dan instruktur industri.
   - Presensi kehadiran berbasis radius lokasi GPS di perangkat ponsel.
   - Jurnal harian siswa (logbook) dengan validasi dan umpan balik pembimbing.
   - *Early Warning System (EWS)* untuk deteksi dini ketidakhadiran siswa PKL.
5. **Tata Kelola & Supervisi Kedinasan (`/school/governance/*`)**:
   - Laporan Guru Piket harian (keterlambatan, dispensasi, ketertiban).
   - Dasbor Wali Kelas untuk pemantauan menyeluruh siswa rombel.
   - Dasbor Waka Kurikulum untuk monitoring kepatuhan agenda mengajar guru.
6. **Laporan & Cetak Dokumen Kedinasan (`/school/reports`)**:
   - Standar KOP surat resmi kedinasan dengan logo dinas / Tut Wuri Handayani.
   - Format cetak ramah browser (`@media print`) dan ekspor PDF siap kirim.

---

## 📖 Dokumentasi Lengkap Proyek

Dokumentasi terperinci untuk arsitektur, panduan modul, desain sistem, dan catatan progres tersedia di folder [`docs/`](./docs):

- 🏛️ [**Arsitektur & Desain Sistem (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md)
- 🎨 [**Sistem Desain Google Material 3 (`docs/DESIGN_SYSTEM_M3.md`)**](./docs/DESIGN_SYSTEM_M3.md)
- 🛡️ [**Pedoman Kualitas Anti-Slop (`docs/ANTI_SLOP_GUIDELINES.md`)**](./docs/ANTI_SLOP_GUIDELINES.md)
- 📱 [**Panduan Alur & Modul Antarmuka (`docs/MODULES_GUIDE.md`)**](./docs/MODULES_GUIDE.md)
- 📝 [**Catatan Kronologis Perkembangan (`docs/DEVELOPMENT_LOG.md`)**](./docs/DEVELOPMENT_LOG.md)

---

## 🚀 Memulai Pengembangan Lokal

### Prasyarat
- Node.js **24.14.1 atau lebih baru** (sesuai Wasp 0.25)
- Wasp CLI: `curl -sSL https://get.wasp.sh/installer.sh | sh`

### Instalasi & Menjalankan Aplikasi
```bash
# Pindah ke folder aplikasi
cd app

# Menjalankan database lokal
wasp start db

# Migrasi skema database
wasp db migrate-dev

# Memuat data sampel sekolah (SMKN 9 Garut & SMPN 1 Bandung Juara)
wasp db seed

# Menjalankan server aplikasi
wasp start
```
Aplikasi web dapat diakses melalui browser di `http://localhost:3000`.

---

## 🧪 Pengujian & Verifikasi Kualitas

```bash
# 1. Pengecekan tipe data TypeScript ketat (0 errors)
cd app && npx tsc --noEmit

# 2. Uji komponen klien Wasp (60/60 lulus)
cd app && wasp test client --run

# 3. Pengujian otomatis E2E Playwright (CRUD Guru & Siswa)
node scratch/test_crud_manual.mjs
```

---

## 🔐 Integrasi Opsional & Deployment

Deployment produksi menggunakan prinsip **fail-closed**. Payment, analytics, dan file upload tidak dianggap aktif hanya karena environment variable kredensial terisi; masing-masing harus diaktifkan secara eksplisit dengan `PAYMENTS_ENABLED=true`, `ANALYTICS_ENABLED=true`, atau `FILE_UPLOADS_ENABLED=true`.

Domain deployment saat ini: `https://sekolah.suhendararyadi.com`. Backend dijalankan sebagai service systemd di belakang Nginx dan hanya diakses melalui reverse proxy. Migration production dijalankan dengan `prisma migrate deploy`, bukan `migrate dev`.

Quality gate sebelum release: Prisma validate → TypeScript strict → unit test → migration check → production build → E2E tenant isolation → runtime dependency audit.

---

## 📂 Struktur Direktori Proyek

```
SaaS_Satu/
├── app/                      # Aplikasi web full-stack utama (Wasp + React + Node.js)
│   ├── main.wasp.ts          # Entrypoint spesifikasi deklaratif Wasp
│   ├── schema.prisma         # Skema database Prisma ORM
│   └── src/
│       ├── client/           # Komponen UI M3, layout, dan gaya global
│       │   └── components/m3 # Pustaka komponen Google Material 3
│       ├── school/           # Modul master data, CRUD guru & siswa, dan impor CSV
│       ├── lms/              # Modul LMS Kurikulum Merdeka & KBM
│       ├── pkl/              # Modul E-PKL Terpadu & monitoring EWS
│       ├── governance/       # Modul tata kelola (Piket, Wali Kelas, Waka)
│       └── reports/          # Modul laporan & cetak dokumen resmi
├── docs/                     # Dokumentasi komprehensif sistem
├── anti-slop/                # Katalog temuan audit Anti-Slop
└── e2e-tests/                # Pengujian otomatis Playwright
```
