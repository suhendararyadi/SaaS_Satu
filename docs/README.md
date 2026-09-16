# Dokumentasi Sistem Informasi Sekolah (SaaS Multi-Tenant)

Selamat datang di pusat dokumentasi resmi **SaaS Sistem Informasi Sekolah**, sebuah platform manajemen sekolah multi-tenant modern yang dibangun di atas framework full-stack [Wasp](https://wasp.sh), React, Node.js, Prisma ORM, dan PostgreSQL dengan sistem antarmuka aktif **School OS (Apple HIG-inspired)** dan standar kualitas ketat **Anti-Slop**.

---

## 📚 Daftar Isi Dokumentasi

1. [**Konteks Proyek Aktif (`PROJECT_CONTEXT.md`)**](./PROJECT_CONTEXT.md)
   - Snapshot lintas chat/sesi yang harus dibaca sebelum melanjutkan School OS.
   - Mencatat worktree/branch aktif, pointer production terakhir, status seed demo, guardrails, dan pekerjaan berikutnya yang belum selesai.
   - Baseline tenant terbaru: [`RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md`](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md).
   - Baseline master data terbaru: [`RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md).
   - Detail PTK Dapodik terbaru: [`RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md`](./RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md).

2. [**Arsitektur & Fondasi Sistem (`ARCHITECTURE.md`)**](./ARCHITECTURE.md)
   - Spesifikasi stack teknologi (Wasp v0.25, React 19, Node.js 24, Prisma, PostgreSQL).
   - Arsitektur multi-tenant berbasis `schoolId` dan skema database relasional.
   - Sistem otentikasi, perizinan (*Auth Guards*), dan hierarki peran pengguna (*User Roles*).
   - Konfigurasi router, queries, dan actions terdistribusi (`*.wasp.ts`).

3. [**School OS — Apple HIG-inspired UI (`UI_UX_APPLE_HIG.md`)**](./UI_UX_APPLE_HIG.md)
   - Source of truth visual aktif untuk desktop dan mobile.
   - System typography, semantic colors, translucent sidebar/toolbar, grouped surfaces, tables, sheets, and touch targets.
   - Adaptasi dari Apple HIG dan prototipe `School OS.zip` tanpa menyalin data contoh ke production.
   - Nama komponen `M3*` dipertahankan sementara sebagai API compatibility layer.

4. [**School OS Demo Data (`DEMO_DATA.md`)**](./DEMO_DATA.md)
   - Runner synthetic seed/status/cleanup yang eksplisit, idempotent, dan reversible.
   - Marker data DEMO, safety contract, coverage dataset, serta catatan rollout production 10 September 2026.

5. [**Legacy Material 3 Reference (`DESIGN_SYSTEM_M3.md`)**](./DESIGN_SYSTEM_M3.md)
   - Referensi historis implementasi UI awal; bukan source of truth visual aktif.

6. [**Rencana Redesign UI/UX v2: Playful Academic (`UI_UX_REDESIGN_PLAN_V2.md`)**](./UI_UX_REDESIGN_PLAN_V2.md)
   - Referensi historis fase redesign sebelum School OS menjadi arah visual aktif.
   - Design tokens v2, role-based UX, app shell, dashboard, responsive/mobile, accessibility, dan roadmap sprint.
   - Phase 0: [`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md) dan [`WIREFRAMES_DASHBOARDS_V2.md`](./WIREFRAMES_DASHBOARDS_V2.md).
   - Implementasi aktual fase tersebut: [`UI_UX_REDESIGN_IMPLEMENTATION_V2.md`](./UI_UX_REDESIGN_IMPLEMENTATION_V2.md).

7. [**Pedoman Anti-Slop (`ANTI_SLOP_GUIDELINES.md`)**](./ANTI_SLOP_GUIDELINES.md)
   - Penerapan aturan Anti-Slop (R-01 s/d R-38).
   - Standar salinan bahasa Indonesia baku edukasi (Kemdikbudristek).
   - Standar aksesibilitas (kontras warna WCAG AA >= 4.5:1, target sentuh 44px).
   - Rekap temuan audit pasca pengerjaan dan solusinya.

8. [**Panduan Modul Aplikasi (`MODULES_GUIDE.md`)**](./MODULES_GUIDE.md)
   - **Modul 1: Dasbor & Master Data** (Tahun Ajaran, Rombel Kelas, Jurusan, Pengaturan Sekolah, Super Admin).
   - **Modul 2: Kepegawaian & Kesiswaan (CRUD Manual & CSV)** (Manajemen Guru & Tendik, Data Siswa, Proteksi Kuota).
   - **Modul 3: Pembelajaran LMS & Kurikulum Merdeka** (Silabus otomatis Fase A-F, Materi, Tugas, Agenda KBM, Presensi, CBT).
   - **Modul 4: E-PKL Terpadu** (Mitra DUDI, Plotting Penempatan, Presensi Geofencing, Jurnal Harian, Monitoring EWS).
   - **Modul 5: Tata Kelola & Supervisi** (Guru Piket, Wali Kelas, Waka Kurikulum).
   - **Modul 6: Laporan & Cetak Dokumen Kedinasan** (KOP surat resmi berjenjang, Print stylesheet).

9. [**Catatan Progres & Riwayat Pekerjaan (`DEVELOPMENT_LOG.md`)**](./DEVELOPMENT_LOG.md)
   - Kronologi lengkap setiap tahapan pengembangan dari awal hingga saat ini.
   - Detail keputusan teknis dan penyelesaian kendala implementasi.
   - Hasil pengujian otomatis per tahap, termasuk TypeScript, Wasp Unit Tests, dan riwayat E2E terdahulu bila tersedia.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Prasyarat
- **Node.js**: v24.14.1 atau lebih baru (sesuai baseline Wasp 0.25 proyek)
- **Wasp CLI**: `curl -sSL https://get.wasp.sh/installer.sh | sh`
- **Docker**: Opsional (untuk menjalankan database PostgreSQL lokal via Wasp)

### Menjalankan Lingkungan Lokal
```bash
# 1. Pindah ke direktori aplikasi
cd app

# 2. Jalankan database PostgreSQL lokal via Wasp
wasp start db

# 3. Jalankan migrasi database jika pertama kali
wasp db migrate-dev

# 4. (Opsional) Isi database dengan data awal sekolah SMKN 9 Garut & SMPN 1 Bandung
wasp db seed

# 5. Jalankan server aplikasi
wasp start
```
Aplikasi frontend akan aktif di `http://localhost:3000` dan backend server API di `http://localhost:3001`.

### Menjalankan Pengujian
```bash
# Menjalankan type check ketat TypeScript
cd app && npx tsc --noEmit

# Menjalankan client unit test suite
cd app && wasp test client --run

# Menjalankan pengujian E2E otomatis Playwright bila relevan
node scratch/test_crud_manual.mjs
```

Untuk pengujian visual/workflow dengan data sintetis, baca [`DEMO_DATA.md`](./DEMO_DATA.md) dan jangan menjalankan cleanup ad-hoc di database production.
