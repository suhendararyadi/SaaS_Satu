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

---

## 8 September 2026: Phase 0 UX Audit dan Dashboard Wireframes v2

Phase 0 redesign UI/UX selesai pada level dokumentasi dan belum mengubah runtime aplikasi.

Hasil utama:

- audit `SchoolLayout`, `SchoolDashboardPage`, navigation drawer, top app bar, design tokens, routes, serta pola halaman utama;
- ditemukan gap utama bahwa dashboard v1 memakai komposisi administratif yang hampir sama untuk semua role;
- ditetapkan dashboard composition terpisah untuk Siswa, Guru, dan Admin Sekolah;
- ditetapkan mobile primary navigation berbeda dari desktop drawer;
- navigation guru akan mempertimbangkan assignment, bukan role saja;
- ditetapkan kebutuhan dashboard DTO server-side agar frontend tidak meminta mega-DTO atau membuat metric contoh;
- dibuat low-fidelity wireframe desktop dan mobile untuk tiga dashboard utama;
- state loading, empty, error, missing relationship, dan account menu ikut didefinisikan;
- authorization dan tenant isolation tetap server-side dan tidak boleh digantikan oleh navigation visibility.

Dokumen hasil:

- [`UX_AUDIT_PHASE0_V2.md`](./UX_AUDIT_PHASE0_V2.md)
- [`WIREFRAMES_DASHBOARDS_V2.md`](./WIREFRAMES_DASHBOARDS_V2.md)

Langkah berikutnya: **Sprint UI-01, semantic design tokens dan app-shell contract**, belum implementasi massal halaman.

---

## 8 September 2026: Implementasi UI/UX Redesign v2

Redesign **Playful Academic v2** telah diimplementasikan di branch `redesign/ui-v2` dengan fokus role-first UX, semantic design tokens, mobile bottom navigation, data honesty, dan penyelarasan kontrol UI terhadap authorization server-side.

Hasil utama:

- semantic token Academic Indigo, Learning Teal, Creative Amber, dan Playful Coral;
- role-aware app shell dan assignment-aware navigation guru;
- dashboard terpisah untuk Siswa, Guru, Admin Sekolah/Super Admin, dan Pembimbing DUDI;
- dashboard DTO server-side scoped berdasarkan `schoolId` dan relationship;
- CRUD administratif disembunyikan dari role yang hanya memiliki read access;
- LMS manager UI mengikuti guru pengampu sebenarnya dan CBT submit hanya tersedia untuk siswa;
- PKL jurnal/presensi diselaraskan dengan role dan relationship;
- default nilai jurnal buatan `85` dihapus;
- halaman settings template yang nonfungsional diganti honest empty state;
- landing dan auth diperbarui dengan copy Bahasa Indonesia dan tanpa fake metrics/testimonials;
- template CSV memakai data yang eksplisit sebagai contoh.

Quality gate source:

- `wasp compile`: PASS, 0 TypeScript error;
- `wasp test client --run`: **67/67 tests PASS** pada 4 test files;
- Wasp production build: PASS;
- Vite SSR/client build: PASS;
- generated server bundle + Prisma Client 5.19.1: PASS;
- client domain scan: domain produksi ditemukan, port lama 8443/8444 tidak ditemukan;
- Anti-Slop hard-gate scan: tidak ada em dash UI, filler Lorem ipsum, fake metric marker, decorative emoji baru, atau whitespace error;
- contrast check token utama: seluruh pasangan yang diuji PASS WCAG AA untuk normal text;
- database schema/migrations: **tidak berubah**.

Known nonblocking debt:

- runtime audit setelah prune masih melaporkan 2 moderate vulnerabilities, 0 high/critical;
- warning alias Prisma browser dan Analytics Dashboard chunk >500 KB masih perlu optimasi terpisah.

Implementation report: [`UI_UX_REDESIGN_IMPLEMENTATION_V2.md`](./UI_UX_REDESIGN_IMPLEMENTATION_V2.md).

---

## 8 September 2026: Production Rollout UI/UX v2

Redesign v2 dipromosikan ke `https://sekolah.suhendararyadi.com` menggunakan immutable release.

Release record:

- runtime commit: `5c500c4a293d29b91a5c24a58f099cb050dee46b`;
- release: `5c500c4-ui-v2`;
- backup database sebelum cutover: `saas_satu_staging-20260908T022443Z.sql.gz`, gzip PASS, mode 600;
- schema/migration database tidak berubah;
- pre-cutover runtime smoke di port 3102: PASS;
- cutover app/static symlink: PASS;
- backend baru berjalan dari release v2 pada port 3101;
- public `/`, `/login`, `/school`: HTTP 200;
- `/auth/me`: HTTP 200;
- endpoint dashboard siswa, guru, admin, dan mentor terdaftar dan fail-closed untuk request unauthenticated (HTTP 401);
- CORS same-origin dan security headers tetap aktif;
- live static memuat asset v2 dengan Academic Indigo dan Inter.

Rollback target tetap tersedia: `830008e-hardening`.

---

## 9 September 2026: School OS — Apple HIG-inspired UI

SaaS Satu memigrasikan lapisan visual aktif dari Playful Academic v2 ke **School OS**, berdasarkan Apple Human Interface Guidelines dan prototipe `School OS.zip` yang diberikan pemilik produk.

Keputusan utama:

- implementasi dimulai dari baseline backend hotfix `678181a`, sehingga source v3 yang sebelumnya ditolak tidak terbawa;
- desktop mengikuti pola macOS-like: sidebar 240px translucent, toolbar 58px, controls compact, grouped surfaces, subtle separators, dan data tables tetap dense;
- mobile mengikuti pola iOS-like: touch target >= 44px untuk aksi utama, bottom navigation, safe-area support, dan dialog kontekstual sebagai bottom sheet;
- font menggunakan system stack, tanpa membundel atau mendistribusikan font Apple;
- warna aktif bersifat semantik: system blue, green, orange, red, grouped background, label, dan separator;
- Material Symbols dipertahankan hanya sebagai web icon fallback dengan default outlined;
- nama source component `M3*` dipertahankan sebagai compatibility layer untuk menghindari refactor berisiko;
- role dashboards, tenant isolation, authorization matrix, data honesty, dan server DTO tidak diubah;
- database schema/migration tidak berubah.

Quality gate awal:

- Wasp/TypeScript compilation: PASS;
- client tests: **67/67 PASS** pada 4 test files;
- `git diff --check`: PASS.

Source of truth: [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md).

---

## 9 September 2026: Production Rollout School OS — Apple HIG

Implementasi antarmuka **School OS** yang mengadaptasi Apple Human Interface Guidelines dipromosikan ke production secara static-only.

Release record:

- source commit: `818d1c7a89dc64b81b5cfdc78a52cd1211136146`;
- branch implementasi: `redesign/apple-hig`;
- static release: `/var/www/saas-satu/releases/818d1c7-school-os-hig`;
- rollback static tetap tersedia: `/var/www/saas-satu/releases/6d23051-school-render-fix`;
- backend tetap: `/home/ubuntu/deployments/SaaS_Satu/releases/678181a-dashboard-fix`;
- database schema/migration dan backend authorization tidak berubah;
- Wasp/TypeScript compile: PASS;
- Wasp client tests: **67/67 PASS** pada 4 test files;
- Wasp production build: PASS;
- Vite SSR/client production build: PASS;
- semantic primary web blue `#0071E3` dan semantic success/warning/error diuji dengan pasangan foreground utama dan memenuhi WCAG AA >= 4.5:1;
- public `/`, `/login`, `/school`, CSS, dan JS release: HTTP 200;
- HSTS, nosniff, SAMEORIGIN, dan referrer policy tetap aktif;
- empat dashboard endpoint menolak request unauthenticated dengan HTTP 401;
- tidak ditemukan HTTP 5xx pada window 3 menit setelah cutover;
- Nginx dan `saas-satu.service` tetap active; backend tidak direstart pada rollout ini.

Source of truth visual aktif: [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md). Nama internal komponen `M3*` dipertahankan sementara hanya sebagai compatibility API, bukan sebagai design-system authority.

---

## 9 September 2026: School OS final refinement

Refinement visual final dilakukan setelah review langsung pada dashboard production.

Perubahan utama:

- sidebar menu beralih dari icon-first menjadi dot-marker navigation;
- header besar Admin Sekolah di Beranda dihapus; konteks sekolah/tahun ajaran dipindahkan ke top toolbar;
- dashboard Admin, Student, Teacher, dan DUDI Mentor dirombak menjadi stat strip + grouped panels ala macOS dengan data nyata;
- Admin memperoleh statistik real untuk siswa, guru, rombel, LMS, mitra DUDI, dan PKL aktif;
- Wali Kelas, Waka Kurikulum, dan Monitoring EWS mengikuti stat-card School OS yang sama;
- breadcrumb redundan dihapus pada halaman school/PKL/governance/reports;
- warna hard-coded module/status dinormalisasi ke semantic School OS palette;
- default data contoh kepala sekolah, NIP, nomor surat, dan tujuan surat di Reports dihapus;
- `getSchoolInfo` hanya ditambah field read-only `activeAcademicYear` untuk konteks toolbar; schema dan authorization tidak berubah.

Quality gate sebelum release:

- Wasp/TypeScript compile: PASS;
- Wasp client tests: **67/67 PASS**;
- `git diff --check`: PASS;
- database schema diff: NONE.

---

## 9 September 2026: Dashboard Admin — Kehadiran & Keputusan

Refinement School OS pada Beranda Admin mengganti panel kapasitas siswa dengan dua konteks operasional yang lebih relevan:

- **Kehadiran** menampilkan persentase dan rincian HADIR/SAKIT/IZIN/ALPA berdasarkan record presensi LMS tenant pada hari berjalan (zona waktu Asia/Jakarta). Jika belum ada record, dashboard menampilkan state kosong dan tidak mengarang angka 0%;
- **Perlu Keputusan Anda** menggunakan daftar attention server-side yang sudah tenant-scoped untuk menampilkan kondisi yang memerlukan keputusan atau tindak lanjut administrator;
- `getSchoolAdminDashboardData` menambahkan agregat read-only dari `LmsAttendanceSession` dan `LmsAttendanceRecord` tanpa perubahan schema database atau authorization.

Quality gate sebelum release: Wasp/TypeScript compile PASS, client tests **67/67 PASS**, dan `git diff --check` PASS.

---

## 9 September 2026: School OS refinement — sidebar icons & grouped states

Final visual refinement setelah review produksi:

- sidebar desktop kembali memakai ikon navigasi, tetapi menggunakan Lucide stroke icons dengan ukuran/bobot restrained untuk mendekati karakter SF Symbols/macOS;
- dot biru di identitas sekolah pada header sidebar dihapus;
- aksi `Ganti Sekolah` di top bar diubah menjadi toolbar-style text action agar sejajar dengan kontrol macOS lain;
- `M3EmptyState` diubah menjadi grouped-row state yang lebih ringan, tanpa icon tile Material;
- `M3Banner` diubah menjadi compact inline notice dengan semantic tint tipis, border halus, dan text-style actions;
- empty state `Belum ada rombel kelas` sekarang memakai grouped School OS state;
- halaman `Organisasi Sekolah` dirombak dari tonal banner + card grid + ring biru menjadi grouped list ala macOS, dengan unit aktif, metadata ringkas, dan aksi `Beralih` di sisi kanan;
- perubahan hanya pada frontend/shared visual components dan tests; backend, authorization, tenant scoping, schema, dan migration tidak berubah.

Quality gate: Wasp/TypeScript compile PASS, client tests 67/67 PASS, `git diff --check` PASS.

## 2026-09-10 — School OS demo dataset

Added `app/scripts/school-os-demo-data.mjs`, an explicit operator-only seed/status/cleanup runner for SMKN 1 RONGGA. The runner uses `[DEMO]`, `DEMO-`, and `@schoolos-demo.invalid` markers, reuses existing school/year data without overwriting it, supports transactional dry-run, is idempotent, and requires an exact token before cleanup. It is intentionally not added to Wasp's default `db.seeds` list.

Production seeding was preceded by a fresh verified database backup. A full dry-run rolled back to zero demo records, the persisted seed was run twice with unchanged counts, and cleanup was verified in rollback-only mode. Seeded coverage includes school master data, class rooms, teachers/students, DUDI/PKL, LMS content, submissions, attendance, CBT results, Waka/Wali/Piket workflows, reports, and deliberate attention/EWS cases.


---

## 10 September 2026 — Persistent project context snapshot

Untuk memastikan kelanjutan School OS tidak kehilangan konteks ketika percakapan ChatGPT mencapai batas panjang, ditambahkan snapshot lintas sesi `docs/PROJECT_CONTEXT.md` dan petunjuk startup di `AGENTS.md`.

Snapshot mencatat:

- worktree aktif `/home/ubuntu/projects/SaaS_Satu-hardening`, branch `redesign/apple-hig`, HEAD `edafa20`;
- pointer production yang diverifikasi pada 10 September 2026: static `ea99802-macos-settings-sidebar`, backend `107c2e8-dashboard-attendance`, service active/running;
- kontrak visual aktif School OS dan penegasan bahwa nama `M3*` hanyalah compatibility layer;
- status lengkap seed DEMO production SMKN 1 RONGGA, backup, idempotency, cleanup dry-run, coverage, dan verification snapshot;
- pekerjaan yang sengaja belum dilakukan: login uji Guru, Siswa, dan Pembimbing DUDI melalui flow autentikasi resmi;
- guardrails agar sesi berikutnya tidak mengubah production data, schema, authorization, atau tenant isolation tanpa kebutuhan eksplisit.

`docs/UI_UX_APPLE_HIG.md` juga diperbarui agar tidak lagi menyebut eksperimen dot-only sidebar sebagai kontrak final. Kontrak terbaru memakai restrained stroke icons, near-black labels, macOS-style sidebar toggle, dan komposisi navigation drawer yang mengambil inspirasi dari macOS Settings/Finder.

Tidak ada perubahan runtime application, schema database, seed execution, service restart, atau deployment dalam pekerjaan dokumentasi ini.

---

## 10 September 2026 — Admin Dashboard: 5 Rombel Prioritas & Decision Icons

Refinement Beranda Admin dilakukan berdasarkan referensi visual School OS/macOS yang diberikan pemilik produk.

Perubahan utama:

- panel **Kehadiran** diubah menjadi **Kehadiran per rombel** dengan maksimal lima bar progres;
- sumber data tetap `LmsAttendanceSession`/`LmsAttendanceRecord` tenant-scoped pada hari berjalan zona waktu Asia/Jakarta;
- pemilihan lima rombel menggunakan persentase hadir terendah, bukan random sampling dan bukan jumlah ketidakhadiran mentah, agar perbandingan lebih adil terhadap perbedaan ukuran rombel dan jumlah sesi;
- jika nilai persentase sama, jumlah ketidakhadiran menjadi tie-breaker; rombel tanpa record presensi ditempatkan setelah rombel terukur dan tidak dianggap memiliki kehadiran 0%;
- nilai persentase per rombel ditampilkan satu desimal dengan locale Indonesia; rombel yang memiliki `ALPA` diberi aksen merah;
- panel **Perlu keputusan Anda** sekarang memakai icon tile kontekstual bergaya macOS/Lucide untuk tahun ajaran, siswa tanpa rombel, guru tanpa ruang mapel, dan fallback attention lain;
- data contoh pada screenshot seperti BK/SPP/Dapodik tidak disalin ke runtime karena backend hanya menampilkan kondisi nyata yang tersedia.

Implementasi: commit `10eb867` (`refine(dashboard): prioritize class attendance and decision icons`).

Quality gate source tree:

- TypeScript `node_modules/.bin/tsc --noEmit`: PASS;
- Vitest `NODE_ENV=test node_modules/.bin/vitest run`: **67/67 PASS** pada 4 test files;
- `git diff --check`: PASS;
- database schema/migration: tidak berubah;
- percobaan tambahan `wasp compile` tidak dijadikan bukti kelulusan karena environment dev lokal tidak memiliki kredensial database Wasp dan sempat menghasilkan SDK parsial; `.wasp/out` kemudian dipulihkan dari backend release aktif dan dependency development dipulihkan dari lockfile;
- belum ada deployment/restart production pada tahap ini.
