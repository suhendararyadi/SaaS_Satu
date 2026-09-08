# Catatan Perkembangan & Riwayat Pekerjaan (Development Log)

Dokumen ini mencatat secara kronologis setiap tahapan pekerjaan, keputusan teknis, pemecahan masalah, serta bukti verifikasi pada pengembangan SaaS Sistem Informasi Sekolah.

---

## Kronologi Pengembangan Proyek

### Tahap 1: Fondasi Arsitektur Multi-Tenant Sekolah
- **Inisiasi Proyek**: Dibangun di atas template Open SaaS dan framework Wasp (`v0.25.0`) dengan PostgreSQL dan Prisma ORM.
- **Skema Relasional Multi-Tenant**:
  - Merancang entitas `School` sebagai tenant master yang memiliki kuota siswa `studentQuota`, jenjang `level` (SD, SMP, SMA_SMK), serta relasi ke `User`, `Department`, `AcademicYear`, `ClassRoom`, `Company`, `Placement`, dan `LmsCourse`.
  - Menerapkan profil khusus pengguna `TeacherProfile` dan `StudentProfile`.
- **Auth Guards Multi-Tenant**: Mengimplementasikan `ensureSchoolUser`, `requireSchoolAdmin`, `requireTeacher`, `requireStudent`, dan `ensureSuperAdmin` di `app/src/school/authGuards.ts`.
- **Data Awal (Seeding)**: Membuat skrip benih data untuk pengujian institusi nyata: SMKN 9 Garut dan SMP Negeri 1 Bandung Juara.

---

### Tahap 2: Migrasi Menyeluruh ke Google Material 3 (Material You)
- **Katalog Komponen M3 Mandiri (`app/src/client/components/m3/`)**:
  - Mengembangkan komponen: `M3Button`, `M3Card`, `M3TextField`, `M3Select`, `M3Switch`, `M3Dialog`, `M3Badge`, `M3Chip`, `M3Banner`, `M3Table`, `M3Tabs`, `M3Progress`, `M3NavigationDrawer`, `M3TopAppBar`, `M3Divider`, dan `M3Icon`.
- **Penerapan Token Warna & Tipografi**:
  - Mengonfigurasi palet warna hijau edukasi (`md-primary`: `#12512E`, `md-surface`: `#F5FBF6`, dll.) di Tailwind CSS.
  - Memuat Google Material Symbols Rounded dan font keluarga Roboto secara global di `head.wasp.ts` dan `Main.css`.
- **Pembersihan Folder Eksperimen**: Menghapus direktori terpisah `m3-expressive-app` dan menyatukan seluruh komponen M3 ke dalam aplikasi utama `app/`.

---

### Tahap 3: Audit Kualitas & Penerapan Anti-Slop (R-01 s/d R-38)
- **Pelaksanaan Audit Mode 2 (Pasca Pengerjaan)**:
  - Mengaudit seluruh halaman panel sekolah berdasarkan pedoman Anti-Slop.
  - Mencatat temuan pada katalog audit `anti-slop/audit-001-2026-09-07.md`.
- **Penyelesaian 18/18 Temuan**:
  - Menghapus placeholder tanda hubung (`-- ... --`) pada dropdown di seluruh halaman (`ClassRoomsPage`, `PlacementsPage`, `LmsCoursesPage`).
  - Memperbaiki kontras teks WCAG AA pada `ReportsPage` (menaikkan dari `text-slate-400` ke `text-slate-600 font-medium`).
  - Menjamin target sentuh 44px (`min-h-[44px]` dan `touch-manipulation`) pada `M3Button`.
  - Mengganti seluruh ikon Lucide heterogen dengan Google Material Symbols Rounded (`M3Icon`).
  - Menghilangkan dekorasi kilauan AI (*sparkles* / `auto_awesome`).
  - Menghilangkan repetisi panah `ArrowRight` dan badge kebocoran teknis `"M3 Material"`.
  - Membersihkan komentar kode dari kata klise AI (*"robust"*, *"elegantly handles"*).

---

### Tahap 4: Polish & Penyederhanaan Salinan Antarmuka
- **Menghilangkan Jargon & Kebocoran Framework**:
  - Mengubah judul hero dasbor dari *"Pusat Kendali Terpadu Manajemen Akademik, LMS Kelas, dan Supervisi Tata Kelola Sekolah berbasis Google Material 3"* menjadi kalimat lugas: **"Kelola data akademik, pembelajaran kelas, dan administrasi sekolah."**
  - Mengganti istilah teknis seperti `"PWA"` dan `"geofencing"` pada modul presensi PKL menjadi frasa alami: **"Presensi Lokasi Siswa PKL"** (*"Pencatatan kehadiran siswa sesuai radius lokasi mitra DUDI"*).
  - Menyederhanakan judul seksi sidebar: *"Data Akademik"*, *"Pembelajaran LMS"*, *"E-PKL"*, *"Tata Kelola"*, *"Laporan"*, *"Pengaturan"*.
  - Menyelaraskan seluruh istilah dengan terminologi baku Kemdikbudristek (Rombel, KBM, Presensi, CBT, DUDI).

---

### Tahap 5: Implementasi CRUD Manual: Data Guru & Data Siswa
- **Backend Wasp Actions (`operations.ts` & `school.wasp.ts`)**:
  - `createTeacher` & `updateTeacher`: Validasi Zod, keunikan NIP dan Email, penugasan Waka Kurikulum.
  - `deleteTeacher`: Proteksi akun admin sendiri, proteksi dependensi mengajar di LMS (`teacherCourses`), pelepasan jabatan wali kelas dan pembimbing PKL, pembersihan laporan guru piket sebelum hapus.
  - `createStudent` & `updateStudent`: Validasi Zod, proteksi kuota siswa sekolah (`studentQuota`), penempatan rombel kelas.
  - `deleteStudent`: Proteksi siswa dalam status PKL aktif, pembersihan otomatis data presensi dan tugas LMS.
- **Frontend Antarmuka M3**:
  - Menambahkan tombol `+ Tambah Guru` dan `+ Tambah Siswa` di toolbar atas.
  - Menambahkan kolom `Aksi` pada tabel dengan tombol `Edit` (tonal) dan `Hapus` (destructive).
  - Mengintegrasikan modal `M3Dialog` Tambah/Edit dan modal `M3Dialog` Konfirmasi Hapus.

---

## Rekapitulasi Hasil Pengujian & Verifikasi

### 1. Uji Kompilasi TypeScript Strict
```bash
npx tsc --noEmit
# Output: Exit Code 0 (0 error di seluruh codebase)
```

### 2. Uji Komponen Wasp Client (Unit Test Suite)
```bash
wasp test client --run
# Output:
# ✓ src/client/components/m3/m3TypographyAndBanner.test.tsx (28 tests)
# ✓ src/client/components/m3/m3Components.test.tsx (32 tests)
# Tests: 60 passed (60 tests total)
```

### 3. Uji E2E Otomatis Playwright (`test_crud_manual.mjs`)
- **Guru**: Berhasil membuat guru baru `Drs. Ahmad Junaedi`, memperbarui gelar menjadi `M.Pd., Ph.D.`, dan menghapusnya dari tabel.
- **Siswa**: Berhasil membuat siswa baru `Rian Hidayat`, memilih rombel kelas, memperbarui nama, dan menghapusnya dari tabel.
- **Visual Capture**: 10 screenshot bukti antarmuka tersimpan di artefak sistem:
  - `crud_teachers_table_initial.png`
  - `crud_teacher_modal_create.png`
  - `crud_teacher_created_success.png`
  - `crud_teacher_modal_edit.png`
  - `crud_teacher_modal_delete.png`
  - `crud_students_table_initial.png`
  - `crud_student_modal_create.png`
  - `crud_student_created_success.png`
  - `crud_student_modal_edit.png`
  - `crud_student_modal_delete.png`

---

## 8 September 2026 — Penetapan UI/UX Redesign Plan v2

Ditetapkan arah redesign antarmuka **SaaS Satu Smart School v2** dengan design direction **Playful Academic** untuk lingkungan pendidikan tingkat menengah (SMP/SMA/SMK).

Keputusan utama:

- Material 3 / Material 3 Expressive tetap menjadi fondasi;
- karakter visual: educational, youthful, friendly, playful, modern, dan trustworthy;
- formula visual: 70% clean educational, 20% playful/expressive, 10% delightful interaction;
- role-based UX untuk Super Admin, Admin Sekolah, Guru, Siswa, dan DUDI Mentor;
- arah warna v2: Academic Indigo, Learning Teal, Creative Amber, dan Playful Coral;
- typography target: Inter;
- dashboard menggunakan pola **Bento Education** dengan fokus action-first dan data honesty;
- mobile siswa direncanakan menggunakan bottom navigation;
- redesign dilakukan melalui design tokens → core components → app shell/navigation → dashboard → modul;
- security hardening, server-side authorization, tenant isolation, dan prinsip fail-closed integrasi tidak boleh dilemahkan oleh redesign;
- setiap sprint wajib melewati TypeScript, relevant tests, responsive/accessibility check, E2E sesuai dampak, dan visual review sebelum deploy.

Dokumen source of truth untuk pekerjaan redesign berikutnya:

[`UI_UX_REDESIGN_PLAN_V2.md`](./UI_UX_REDESIGN_PLAN_V2.md)

Dokumen `DESIGN_SYSTEM_M3.md` tetap dipertahankan sebagai baseline implementasi UI v1 sampai migrasi design token v2 benar-benar dilakukan.
