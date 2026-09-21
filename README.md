# SaaS Sistem Informasi Sekolah (Smart School Multi-Tenant)

[![Wasp Framework](https://img.shields.io/badge/Wasp-v0.25.0-F9A03F.svg)](https://wasp.sh)
[![School OS](https://img.shields.io/badge/UI-School%20OS%20%7C%20HIG--inspired-007AFF.svg)](./docs/UI_UX_APPLE_HIG.md)
[![Anti-Slop](https://img.shields.io/badge/Quality-Anti--Slop%20Verified-blue.svg)](./docs/ANTI_SLOP_GUIDELINES.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Passed-3178C6.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Unit-67%2F67%20Passing-brightgreen.svg)](#pengujian--verifikasi-kualitas)

Platform Software-as-a-Service (SaaS) manajemen sekolah modern multi-tenant yang dibangun di atas framework full-stack **[Wasp](https://wasp.sh)**, **React 19**, **Node.js 24**, **Prisma ORM**, dan **PostgreSQL**. Menggunakan **School OS**, sistem antarmuka web yang diadaptasi dari Apple Human Interface Guidelines dan prototipe School OS, serta menerapkan standar kualitas tinggi **Anti-Slop (R-01 s/d R-38)**.

> Untuk melanjutkan pekerjaan lintas chat/sesi, baca terlebih dahulu [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md). Dokumen tersebut mencatat worktree/branch aktif, pointer production terakhir, status demo dataset, guardrails, dan pekerjaan berikutnya yang belum selesai.

---

## 🌟 Modul & Fitur Utama

1. **Master Data & Fondasi Akademik (`/school/*`)**:
   - Dasbor sekolah terpadu dengan pemantauan data akademik operasional.
   - Manajemen Kelas & Rombongan Belajar (Rombel) dengan penugasan wali kelas.
   - Manajemen Tahun Ajaran dan penetapan semester aktif.
   - Pengaturan identitas sekolah berjenjang (SD, SMP, SMA, SMK) untuk KOP surat resmi.
   - Panel Super Admin Platform untuk manajemen multi-tenant sekolah dan alokasi kuota.
   - Impor massal data dari Dapodik / Excel via CSV parser.
2. **Kepegawaian & Kesiswaan (CRUD Manual & Massal)**:
   - Manajemen Guru & Tendik (Create, Read, Update, Delete) dengan proteksi jadwal mengajar LMS dan penugasan Waka Kurikulum.
   - Manajemen Peserta Didik (Siswa) dengan pengamanan kapasitas kuota paket sekolah dan proteksi penempatan PKL aktif.
3. **Pembelajaran LMS & Kurikulum Merdeka (`/school/lms/*`)**:
   - Generator paket silabus Kurikulum Merdeka otomatis (Fase A hingga Fase F).
   - Ruang kelas mata pelajaran dengan materi, tugas & penilaian, agenda KBM, presensi, dan CBT.
4. **E-PKL Terpadu (`/school/pkl/*`)**:
   - Direktori Perusahaan Mitra (DUDI) dengan batas kuota dan titik koordinat GPS.
   - Plotting penempatan siswa bersama guru pembimbing dan instruktur industri.
   - Presensi kehadiran berbasis radius lokasi GPS di perangkat ponsel.
   - Jurnal harian siswa dengan validasi dan umpan balik pembimbing.
   - *Early Warning System (EWS)* untuk deteksi dini kondisi PKL yang perlu perhatian.
5. **Tata Kelola & Supervisi Kedinasan (`/school/governance/*`)**:
   - Laporan Guru Piket harian.
   - Dasbor Wali Kelas untuk pemantauan siswa rombel.
   - Dasbor Waka Kurikulum untuk monitoring kegiatan akademik.
6. **Laporan & Cetak Dokumen Kedinasan (`/school/reports`)**:
   - Standar KOP surat resmi kedinasan dengan logo dinas / Tut Wuri Handayani.
   - Format cetak ramah browser (`@media print`) dan ekspor PDF siap kirim.

---

## 📖 Dokumentasi Lengkap Proyek

Dokumentasi terperinci tersedia di folder [`docs/`](./docs):

- 🧭 [**Konteks Proyek Aktif (`docs/PROJECT_CONTEXT.md`)**](./docs/PROJECT_CONTEXT.md)
- 🏛️ [**Arsitektur & Desain Sistem (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md)
- 🧭 [**School OS DESIGN.md — cross-agent visual source of truth**](./DESIGN.md)
- 🍎 [**School OS — Apple HIG-inspired implementation reference (`docs/UI_UX_APPLE_HIG.md`)**](./docs/UI_UX_APPLE_HIG.md)
- 🧪 [**School OS Demo Data (`docs/DEMO_DATA.md`)**](./docs/DEMO_DATA.md)
- 🎨 [**Legacy Material 3/API compatibility reference (`docs/DESIGN_SYSTEM_M3.md`)**](./docs/DESIGN_SYSTEM_M3.md)
- ✨ [**Rencana Redesign UI/UX v2 — Playful Academic (`docs/UI_UX_REDESIGN_PLAN_V2.md`)**](./docs/UI_UX_REDESIGN_PLAN_V2.md)
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

# Memuat data sampel default proyek
wasp db seed

# Menjalankan server aplikasi
wasp start
```
Aplikasi web lokal dapat diakses melalui browser di `http://localhost:3000`.

Untuk dataset sintetis School OS yang reversible/idempotent, jangan memakai `wasp db seed`; baca [`docs/DEMO_DATA.md`](./docs/DEMO_DATA.md) dan gunakan runner operator-only yang didokumentasikan di sana.

---

## 🧪 Pengujian & Verifikasi Kualitas

```bash
# 1. Pengecekan tipe data TypeScript ketat
cd app && npx tsc --noEmit

# 2. Uji komponen klien Wasp
cd app && wasp test client --run

# 3. Pengujian E2E Playwright bila relevan dengan perubahan
node scratch/test_crud_manual.mjs

# 4. Pemeriksaan whitespace/patch sebelum commit
cd .. && git diff --check
```

Baseline client test suite terakhir yang tercatat pada rollout School OS: **67/67 PASS**. Jalankan ulang quality gate yang relevan sebelum menganggap perubahan baru tervalidasi.

---

## 🔐 Integrasi Opsional & Deployment

Deployment produksi menggunakan prinsip **fail-closed**. Payment, analytics, dan file upload tidak dianggap aktif hanya karena environment variable kredensial terisi; masing-masing harus diaktifkan secara eksplisit dengan `PAYMENTS_ENABLED=true`, `ANALYTICS_ENABLED=true`, atau `FILE_UPLOADS_ENABLED=true`.

Domain deployment School OS: `https://sekolah.suhendararyadi.com`. Backend dijalankan sebagai service systemd di belakang Nginx dan hanya diakses melalui reverse proxy. Migration production dijalankan dengan `prisma migrate deploy`, bukan `migrate dev`.

Quality gate sebelum release: Prisma validate → TypeScript/Wasp compile → unit test → migration/schema check → production build → E2E/smoke sesuai dampak → runtime health check. Backup database wajib dibuat sebelum operasi production yang mengubah data atau schema.

---

## 📂 Struktur Direktori Proyek

```text
SaaS_Satu/
├── app/                      # Aplikasi web full-stack utama (Wasp + React + Node.js)
│   ├── main.wasp.ts          # Entrypoint spesifikasi deklaratif Wasp
│   ├── schema.prisma         # Skema database Prisma ORM
│   ├── scripts/              # Operator scripts, termasuk School OS demo-data runner
│   └── src/
│       ├── client/           # Shared UI; nama M3* dipertahankan sebagai compatibility API
│       │   └── components/m3 # Implementasi visual aktif mengikuti School OS
│       ├── school/           # Modul master data, CRUD guru & siswa, dashboard sekolah
│       ├── lms/              # Modul LMS Kurikulum Merdeka & KBM
│       ├── pkl/              # Modul E-PKL Terpadu & monitoring EWS
│       ├── governance/       # Modul tata kelola (Piket, Wali Kelas, Waka)
│       └── reports/          # Modul laporan & cetak dokumen resmi
├── docs/                     # Dokumentasi dan persistent project context
├── anti-slop/                # Katalog temuan audit Anti-Slop
└── e2e-tests/                # Pengujian otomatis Playwright
```
