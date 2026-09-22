# Dokumentasi Sistem Informasi Sekolah (SaaS Multi-Tenant)

Selamat datang di pusat dokumentasi resmi **SaaS Sistem Informasi Sekolah**, sebuah platform manajemen sekolah multi-tenant modern yang dibangun di atas framework full-stack [Wasp](https://wasp.sh), React, Node.js, Prisma ORM, dan PostgreSQL dengan sistem antarmuka aktif **School OS (Apple HIG-inspired)** dan standar kualitas ketat **Anti-Slop**.

---

## 📚 Daftar Isi Dokumentasi

0. [**AI Agent Handoff (`AI_AGENT_HANDOFF.md`)**](./AI_AGENT_HANDOFF.md)
   - Snapshot ringkas dan terverifikasi untuk agen AI yang melanjutkan proyek.
   - Memuat release production aktif, baseline SMKN 12 Garut, kontrak Dapodik siswa/PTK, guardrail privacy, mapping A–G, deployment contract, backup penting, dan urutan dokumen yang harus dibaca.
   - Baca file ini **sebelum** `PROJECT_CONTEXT.md` saat memulai sesi/agen baru.

0.1. [**Global Persistent Memory (`GLOBAL_PERSISTENT_MEMORY.md`)**](./GLOBAL_PERSISTENT_MEMORY.md)
   - Arsitektur memory permanen VPS di luar folder proyek.
   - Menjelaskan `~/.mso/agent-memory`, Project/RASMIC memory `.agent/memory`, workflow memory, promotion policy, privacy, backup, dan recovery contract.

1. [**Konteks Proyek Aktif (`PROJECT_CONTEXT.md`)**](./PROJECT_CONTEXT.md)
   - Snapshot lintas chat/sesi yang harus dibaca sebelum melanjutkan School OS.
   - Mencatat worktree/branch aktif, pointer production terakhir, status seed demo, guardrails, dan pekerjaan berikutnya yang belum selesai.
   - Baseline tenant terbaru: [`RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md`](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md).
   - Baseline master data terbaru: [`RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md).
   - Detail PTK Dapodik terbaru: [`RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md`](./RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md).
   - Editor PTK Dapodik lengkap: [`RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md`](./RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md).
   - PKL Foundation Generasi Kedua: [`RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md`](./RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md).
   - PKL Generasi Kedua workflow lengkap: [`RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md`](./RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md).
   - PKL Gen 2 UAT & Operational Hardening: [`RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md`](./RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md).
   - PKL Gen2 Foundation permission fix: [`RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md`](./RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md).
   - PKL Mitra DUDI edit validation fix: [`RELEASE_2026-09-21_PKL_COMPANY_EDIT_VALIDATION_FIX.md`](./RELEASE_2026-09-21_PKL_COMPANY_EDIT_VALIDATION_FIX.md).
   - Presensi Harian + Wali Kelas production-grade hardening: [`RELEASE_2026-09-22_DAILY_ATTENDANCE_WALI_HARDENING.md`](./RELEASE_2026-09-22_DAILY_ATTENDANCE_WALI_HARDENING.md).

2. [**Arsitektur & Fondasi Sistem (`ARCHITECTURE.md`)**](./ARCHITECTURE.md)
   - Spesifikasi stack teknologi (Wasp v0.25, React 19, Node.js 24, Prisma, PostgreSQL).
   - Arsitektur multi-tenant berbasis `schoolId` dan skema database relasional.
   - Sistem otentikasi, perizinan (*Auth Guards*), dan hierarki peran pengguna (*User Roles*).
   - Konfigurasi router, queries, dan actions terdistribusi (`*.wasp.ts`).

3. [**School OS DESIGN.md — cross-agent visual source of truth**](../DESIGN.md)
   - Machine-readable tokens + human-readable design rules for coding/design agents.
   - Derived from the current production implementation.

4. [**School OS — Apple HIG-inspired implementation reference (`UI_UX_APPLE_HIG.md`)**](./UI_UX_APPLE_HIG.md)
   - Detail implementasi dan riwayat refinement HIG untuk desktop dan mobile.
   - System typography, semantic colors, translucent sidebar/toolbar, grouped surfaces, tables, sheets, and touch targets.
   - Adaptasi dari Apple HIG dan prototipe `School OS.zip` tanpa menyalin data contoh ke production.
   - Nama komponen `M3*` dipertahankan sementara sebagai API compatibility layer.

5. [**School OS Demo Data (`DEMO_DATA.md`)**](./DEMO_DATA.md)
   - Runner synthetic seed/status/cleanup yang eksplisit, idempotent, dan reversible.
   - Daftar akun demo SMKN 1 Rongga: [`DEMO_ACCOUNTS_SMKN1_RONGGA.md`](./DEMO_ACCOUNTS_SMKN1_RONGGA.md).
   - Marker data DEMO, safety contract, coverage dataset, serta catatan rollout production 10 September 2026.

6. [**Legacy Material 3 Reference (`DESIGN_SYSTEM_M3.md`)**](./DESIGN_SYSTEM_M3.md)
   - Referensi historis implementasi UI awal; bukan source of truth visual aktif.

7. [**Rencana Redesign UI/UX v2: Playful Academic (`UI_UX_REDESIGN_PLAN_V2.md`)**](./UI_UX_REDESIGN_PLAN_V2.md)
   - Referensi historis fase redesign sebelum School OS menjadi arah visual aktif.
   - Design tokens v2, role-based UX, app shell, dashboard, responsive/mobile, accessibility, dan roadmap sprint.
   - Phase 0: [`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md) dan [`WIREFRAMES_DASHBOARDS_V2.md`](./WIREFRAMES_DASHBOARDS_V2.md).
   - Implementasi aktual fase tersebut: [`UI_UX_REDESIGN_IMPLEMENTATION_V2.md`](./UI_UX_REDESIGN_IMPLEMENTATION_V2.md).

8. [**Pedoman Anti-Slop (`ANTI_SLOP_GUIDELINES.md`)**](./ANTI_SLOP_GUIDELINES.md)
   - Penerapan aturan Anti-Slop (R-01 s/d R-38).
   - Standar salinan bahasa Indonesia baku edukasi (Kemdikbudristek).
   - Standar aksesibilitas (kontras warna WCAG AA >= 4.5:1, target sentuh 44px).
   - Rekap temuan audit pasca pengerjaan dan solusinya.

9. [**Panduan Modul Aplikasi (`MODULES_GUIDE.md`)**](./MODULES_GUIDE.md)
   - **Modul 1: Dasbor & Master Data** (Tahun Ajaran, Rombel Kelas, Jurusan, Pengaturan Sekolah, Super Admin).
   - **Modul 2: Kepegawaian & Kesiswaan (CRUD Manual & CSV)** (Manajemen Guru & Tendik, Data Siswa, Proteksi Kuota).
   - **Modul 3: Pembelajaran LMS & Kurikulum Merdeka** (Silabus otomatis Fase A-F, Materi, Tugas, Agenda KBM, Presensi, CBT).
   - **Modul 4: E-PKL Terpadu** (PKL Foundation Gen2, Mitra DUDI, Periode PKL, Pembimbing DUDI, kapasitas per konsentrasi/periode, Plotting Penempatan, Presensi Geofencing, Jurnal Harian, Monitoring EWS).
   - **Modul 5: Tata Kelola & Supervisi** (Guru Piket, Wali Kelas, Waka Kurikulum).
   - **Modul 6: Laporan & Cetak Dokumen Kedinasan** (KOP surat resmi berjenjang, Print stylesheet).

10. [**Catatan Progres & Riwayat Pekerjaan (`DEVELOPMENT_LOG.md`)**](./DEVELOPMENT_LOG.md)
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

   - Kesiswaan Terpadu + Tindak Lanjut production-grade hardening: [`RELEASE_2026-09-22_STUDENT_AFFAIRS_FOLLOWUP_HARDENING.md`](./RELEASE_2026-09-22_STUDENT_AFFAIRS_FOLLOWUP_HARDENING.md).

   - Attendance 360 production release: [`RELEASE_2026-09-22_ATTENDANCE_360.md`](./RELEASE_2026-09-22_ATTENDANCE_360.md).
   - Attendance 360 implementation/source-of-truth plan: [`ATTENDANCE_360_IMPLEMENTATION_PLAN.md`](./ATTENDANCE_360_IMPLEMENTATION_PLAN.md).

   - Student mobile Attendance UI release: [`RELEASE_2026-09-23_STUDENT_MOBILE_ATTENDANCE_UI.md`](./RELEASE_2026-09-23_STUDENT_MOBILE_ATTENDANCE_UI.md).

   - Student mobile selfie/navigation refinement: [`RELEASE_2026-09-23_STUDENT_MOBILE_SELFIE_NAV_REFINEMENT.md`](./RELEASE_2026-09-23_STUDENT_MOBILE_SELFIE_NAV_REFINEMENT.md).
