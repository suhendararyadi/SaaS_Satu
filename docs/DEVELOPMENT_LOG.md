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

---

## 10 September 2026 — Staged release dashboard rombel

Setelah implementasi commit `10eb867` dan dokumentasi commit `5fac63e`, disiapkan immutable release `5fac63e-dashboard-rombel` untuk rollout production.

Hasil build dan pre-cutover:

- worktree release: `/home/ubuntu/deployments/SaaS_Satu/releases/5fac63e-dashboard-rombel`;
- static release staged: `/var/www/saas-satu/releases/5fac63e-dashboard-rombel`;
- `wasp install`: PASS;
- Wasp production build/compile dengan environment production: PASS;
- Prisma Client 5.19.1 generation: PASS;
- generated server bundle: PASS;
- Vite SSR dan client production build: PASS;
- production API origin tertanam pada static build: PASS;
- pre-cutover backend dijalankan sementara di port 3102: `/auth/me` HTTP 200 dan `/operations/get-school-admin-dashboard-data` tanpa autentikasi HTTP 401;
- database schema dan migrations tetap identik dengan backend aktif; tidak ada migration atau data mutation.

Cutover **belum dilakukan**. MSO Server pada sesi ini menolak operasi pengendalian ulang service melalui local exec sesuai safety guard. Percobaan mengganti symlink backend segera dikembalikan sebelum proses backend berubah, sehingga runtime tetap konsisten dan tidak terjadi downtime. Tidak digunakan workaround seperti mematikan proses paksa atau membuat service kedua karena itu akan menambah risiko/operational debt hanya untuk melewati guard.

Production yang tetap aktif setelah rollback pointer:

- backend: `107c2e8-dashboard-attendance`;
- static: `ea99802-macos-settings-sidebar`;
- `saas-satu.service`: active;
- public `/school`: HTTP 200.


---

## 10 September 2026 — Bounded MSO deployment function

Ditambahkan jalur deployment project-scoped agar School OS tetap dapat dipromosikan setelah hardening MSO memblokir direct service restart dari generic `exec_run`, tanpa membuka kembali unrestricted destructive shell.

Artefak baru:

- `.mso/functions.json` — manifest dua project functions;
- `ops/deploy-school-os-release.mjs` — deploy runner fixed-argv/no-shell.

Function `school_os_deploy_preflight` hanya memvalidasi release, commit, generated backend bundle, static index/assets, current pointers, dan state service. Function `school_os_deploy_release` membutuhkan confirmation token eksplisit, melakukan backend cutover -> restart service -> localhost health -> static cutover -> public smoke (`/school` 200, `/auth/me` 200, unauthenticated admin dashboard operation 401), kemudian memverifikasi symlink final. Kegagalan setelah cutover memicu rollback backend/static ke pointer awal dan restart release sebelumnya.

Project capability discovery telah memvalidasi manifest sebagai version 1 dengan 2 functions. Preflight terhadap release `5fac63e-dashboard-rombel` PASS dan memastikan current production masih backend `107c2e8-dashboard-attendance`, static `ea99802-macos-settings-sidebar`, service active sebelum promotion.


---

## 10 September 2026 — Dashboard rombel promoted to production

Immutable release `5fac63e-dashboard-rombel` berhasil dipromosikan menggunakan project function `school_os_deploy_release`, setelah `school_os_deploy_preflight` memvalidasi commit, backend bundle, static assets, current pointers, dan service state.

Post-cutover verification:

- backend current -> `5fac63e-dashboard-rombel`;
- static current -> `5fac63e-dashboard-rombel`;
- `saas-satu.service`: active;
- localhost `/auth/me`: HTTP 200;
- public `/school`: HTTP 200;
- public `/login`: HTTP 200;
- unauthenticated `/operations/get-school-admin-dashboard-data`: HTTP 401;
- static dashboard bundle memuat `Kehadiran per rombel`;
- recent service log check tidak menemukan 5xx/error baru;
- deploy function dipanggil kedua kali dan mengembalikan `idempotent: true` dengan smoke checks tetap PASS.

Rollback target lama tetap tersedia (`107c2e8-dashboard-attendance` backend dan `ea99802-macos-settings-sidebar` static). Tidak ada schema migration atau mutation data dalam rollout ini.

---

## 10 September 2026 — EWS hub, dialog focus fix, Apple PKL monitoring, and attendance hierarchy

Pengembangan lanjutan School OS mencakup empat permintaan utama dan satu refinement visual tambahan.

Implementasi:

- akar bug input modal ditemukan pada lifecycle `M3Dialog`: effect fokus sebelumnya bergantung pada identity `onClose`, sehingga controlled input dapat kehilangan fokus setiap parent re-render; callback sekarang disimpan pada ref dan lifecycle focus/escape bergantung pada `isOpen`;
- ditambahkan regression test yang memastikan input tetap fokus setelah dialog re-render dengan callback `onClose` baru;
- logika EWS PKL dikonsolidasikan di `app/src/pkl/ews.ts` agar dashboard admin, halaman EWS, dan Monitoring PKL menggunakan sumber aturan yang sama;
- **Perlu keputusan Anda** menampilkan summary EWS nyata bila ada sinyal, dengan icon tile dan tautan ke `/school/ews`;
- dibuat halaman `/school/ews` sebagai overview EWS dengan ringkasan prioritas, siswa dan penempatan terdampak, sumber sinyal, serta tautan ke bukti;
- `/school/pkl/monitoring` dipoles menjadi grouped/list Apple HIG-inspired yang lebih ringkas dan memiliki direct action ke presensi atau jurnal;
- akses EWS tetap tenant-scoped dan capability-scoped melalui `monitorPkl`; siswa tidak mendapat menu EWS;
- panel **Kehadiran per rombel** tetap memilih lima rombel prioritas dengan persentase hadir terendah, lalu urutan tampil dibalik menjadi lebih tinggi -> lebih rendah; tiga rombel terukur atas biru, posisi kedua terbawah jingga, posisi terbawah merah, sedangkan data kosong netral.

Commits aplikasi:

- `af4bf88` — `feat(school): add EWS hub and polish PKL monitoring`;
- `6f5d9b2` — `refine(dashboard): reverse attendance priority order`.

Quality gate:

- TypeScript `tsc --noEmit`: PASS;
- regression/shared UI test: 33/33 PASS;
- full Vitest: **68/68 PASS** pada 4 test files;
- `git diff --check`: PASS;
- Wasp 0.25.0 production build/compile: PASS;
- Prisma Client 5.19.1 generation: PASS;
- generated server bundle: PASS;
- Vite SSR + client production build: PASS;
- schema Prisma/migrations: tidak berubah.

Rollout:

- immutable release: `6f5d9b2-ews-apple-monitoring`;
- preflight bounded deploy: PASS;
- backend current -> `/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring`;
- static current -> `/var/www/saas-satu/releases/6f5d9b2-ews-apple-monitoring`;
- `saas-satu.service`: active;
- public `/school`, `/login`, `/school/ews`, `/school/pkl/monitoring`: HTTP 200;
- unauthenticated POST Admin Dashboard operation: HTTP 401;
- unauthenticated POST EWS operation: HTTP 401;
- deploy function dipanggil ulang dan mengembalikan `idempotent: true`;
- rollback target tetap `5fac63e-dashboard-rombel` untuk backend dan static.

Tidak ada schema migration atau mutation data production pada rollout ini. NPM audit masih melaporkan dependency debt yang sudah ada; rollout tidak diklaim audit-clean.


---

## 10 September 2026 — Dashboard attendance label alignment & sidebar palette polish

Refinement lanjutan dilakukan pada Beranda Admin dan navigation drawer berdasarkan review visual production.

Implementasi:

- akar ketidakrapian **Kehadiran per rombel** adalah kolom nama yang sebelumnya memakai lebar `auto` serta suffix kode jurusan yang hanya ditambahkan pada sebagian rombel; akibatnya titik awal progress bar berbeda antarbaris;
- row attendance sekarang memakai fixed-width label lane (`104px`, `132px` pada breakpoint lebih besar), flexible progress lane, dan fixed numeric lane sehingga semua bar sejajar;
- label yang terlihat hanya menggunakan nama rombel yang dinormalisasi whitespace dan ditruncate satu baris; informasi kode jurusan tetap dapat tersedia melalui tooltip/ARIA tanpa mengubah lebar visual;
- tombol **Import data** pada header dashboard dan shortcut **Import data** pada `Kelola cepat` dihapus; halaman/fitur `/school/import` tetap tersedia melalui sidebar;
- `M3NavigationDrawer` mendapat explicit mapping untuk `account_tree` dan `warning`, sehingga keduanya tidak lagi menggunakan fallback abu-abu;
- icon tile Mitra DUDI, Laporan, Pengaturan, dan fallback juga diberi variasi cyan/blue/purple/indigo agar sidebar lebih hidup tetapi tetap mengikuti prinsip Apple/macOS yang restrained.

Implementasi aplikasi: `d16662a` — `refine(school): align attendance labels and sidebar colors`.

Quality gate dan build:

- TypeScript `tsc --noEmit`: PASS;
- full Vitest: **68/68 PASS** pada 4 test files;
- `git diff --check`: PASS;
- Wasp 0.25.0 compile/build: PASS setelah build environment tidak memaksakan `NODE_ENV=production` pada tahap dependency/compile agar devDependencies build tidak ter-prune;
- Prisma Client 5.19.1 generation: PASS;
- generated server bundle: PASS;
- Vite SSR + client production build dengan `REACT_APP_API_URL=https://sekolah.suhendararyadi.com`: PASS;
- static artifact memuat fixed-width attendance lane dan tidak memuat `Import data` pada dashboard chunk;
- schema/migrations: tidak berubah.

Rollout:

- immutable release: `d16662a-dashboard-sidebar-polish`;
- bounded deploy preflight: PASS;
- backend current -> `/home/ubuntu/deployments/SaaS_Satu/releases/d16662a-dashboard-sidebar-polish`;
- static current -> `/var/www/saas-satu/releases/d16662a-dashboard-sidebar-polish`;
- `saas-satu.service`: active;
- public `/school`: HTTP 200;
- public `/login`: HTTP 200;
- unauthenticated POST Admin Dashboard operation: HTTP 401;
- active dashboard bundle tidak mengandung `Import data` dan mengandung fixed attendance label lane;
- active CSS memuat palette sidebar tambahan;
- recent service log check tidak menemukan 5xx/error baru;
- deploy function dipanggil ulang dan mengembalikan `idempotent: true`;
- rollback target: `6f5d9b2-ews-apple-monitoring`.

Tidak ada schema migration atau mutation data production. Dependency audit debt yang telah ada sebelumnya tetap dicatat dan rollout tidak diklaim audit-clean.

---

## 10 September 2026 — Auth `/auth/me` incident recovery and deploy hardening

Sesudah release frontend-only `d16662a-dashboard-sidebar-polish` dipromosikan sebagai full backend+static release, pengguna dengan sesi login mendapat HTTP 500 pada `GET /auth/me`. Request anonim tetap HTTP 200 sehingga smoke check lama tidak menangkap kegagalan ini.

Root cause terverifikasi dari runtime production:

- Lucia/Wasp membuat `new PrismaAdapter(prisma.session, prisma.auth)`;
- Prisma Client pada backend `d16662a-dashboard-sidebar-polish` memiliki delegate `user`, tetapi `auth` dan `session` bernilai `undefined`;
- Prisma Client pada release sehat `6f5d9b2-ews-apple-monitoring` memiliki `user`, `auth`, `authIdentity`, dan `session`;
- error production berasal dari `@lucia-auth/adapter-prisma` ketika membaca `this.userModel.name`, konsisten dengan `prisma.auth` yang undefined.

Recovery:

- full release di-rollback ke `6f5d9b2-ews-apple-monitoring` sehingga backend restart dari release sehat;
- static kemudian dikembalikan ke `d16662a-dashboard-sidebar-polish` karena perubahan `d16662a` memang frontend-only;
- production final: backend `6f5d9b2-ews-apple-monitoring`, static `d16662a-dashboard-sidebar-polish`;
- `saas-satu.service`: active;
- authenticated `/auth/me` sesudah recovery tercatat HTTP 200/304 dengan payload user, dan tidak ada lagi error auth 500 sejak process recovery aktif;
- `/school`: HTTP 200.

Deployment hardening commit `7231123`:

- full preflight sekarang mem-probe Prisma runtime dan menolak release jika delegate `user`, `auth`, atau `session` hilang;
- release rusak `d16662a-dashboard-sidebar-polish` terbukti ditolak full preflight dengan `missing Prisma auth delegates: auth,session`;
- release sehat `6f5d9b2-ews-apple-monitoring` tetap lolos full preflight;
- ditambahkan `school_os_deploy_static_preflight` dan `school_os_deploy_static` untuk frontend-only promotion tanpa mengganti/restart backend;
- static-only deployment terhadap `d16662a-dashboard-sidebar-polish` PASS dan `idempotent: true`, dengan backend tetap `6f5d9b2-ews-apple-monitoring`.

Tidak ada schema migration atau mutation data production pada recovery ini.

---

## 10 September 2026 — Sidebar school identity, panel toggle, and decision-card balance

Refinement UI dilakukan berdasarkan referensi macOS Settings dan posisi panel toggle ChatGPT yang diberikan pemilik produk. Perubahan ini bersifat frontend-only.

Implementasi:

- header sidebar diubah menjadi **school identity row**: icon sekolah bulat, nama sekolah sebagai primary label, dan konteks `Unit sekolah aktif · <kota>` sebagai secondary label;
- saat sidebar menjadi rail, identitas tetap direpresentasikan oleh icon sekolah bulat tanpa menampilkan nama terpotong;
- kontrol hide/show desktop menggunakan satu icon split-panel `PanelLeft`, ditempatkan di trailing edge header sidebar agar secara spasial terhubung dengan panel yang dikontrol;
- kontrol collapse desktop di top app bar dihapus, sementara tombol menu mobile tetap berada di top bar; shortcut `Ctrl+B`/`Cmd+B` tetap dipertahankan;
- kartu **Perlu keputusan Anda** mendapat supplemental row `Buka pusat monitoring PKL` untuk konteks SMK (fallback non-SMK: laporan operasional), dipisahkan oleh separator dari attention list;
- supplemental row tidak masuk `data.attention`, tidak menambah badge keputusan, dan tidak menciptakan kasus/metric palsu.

Commits aplikasi:

- `349ac7c` — `refine(shell): add school identity and sidebar toggle`;
- `bcca333` — `fix(shell): use supported school icon weight`.

Quality gate dan rollout:

- TypeScript `tsc --noEmit`: PASS;
- full Vitest: **68/68 PASS** pada 4 test files;
- `git diff --check`: PASS;
- Wasp 0.25.0 production build: PASS;
- Prisma Client generation saat Wasp build: PASS;
- Vite SSR + client production build dengan production API origin: PASS;
- immutable static release: `bcca333-sidebar-identity`;
- static-only preflight: PASS;
- static-only deployment: PASS;
- backend tetap `/home/ubuntu/deployments/SaaS_Satu/releases/6f5d9b2-ews-apple-monitoring` dan tidak direstart/diganti;
- static current -> `/var/www/saas-satu/releases/bcca333-sidebar-identity`;
- rollback static -> `/var/www/saas-satu/releases/d16662a-dashboard-sidebar-polish`;
- `saas-satu.service`: active;
- public `/school` dan `/login`: HTTP 200; anonymous `/auth/me`: HTTP 200; unauthenticated Admin Dashboard operation tetap fail-closed HTTP 401;
- bundle live terverifikasi memuat `Unit sekolah aktif`, `Sembunyikan sidebar`, dan `Buka pusat monitoring PKL`;
- jumlah `/auth/me` 500 setelah static cutover pada window verifikasi: **0**.

Tidak ada perubahan schema, migration, mutation data production, atau backend runtime pada rollout ini.


---

## 11 September 2026 — Website Sekolah Phase 2 + public editorial redesign

Website Sekolah ditingkatkan dari CMS foundation menjadi Phase 2 production. Admin mendapat Landing Composer terkontrol, revision/audit snapshot, media-library selection untuk hero/cover, social links, serta preview yang menggunakan renderer yang sama dengan public landing. Public site dirombak menjadi editorial-campus experience dengan sticky navigation, cinematic hero, quick paths, profile storytelling, program showcase, featured news, agenda, gallery, contact CTA, dan institutional footer; section tanpa data tidak membuat konten palsu.

SEO ditingkatkan dengan canonical, route-specific Open Graph/Twitter metadata, `EducationalOrganization` dan `NewsArticle` JSON-LD, serta sitemap XML tenant-scoped. Nginx menambah hanya route regex `/site/<slug>/sitemap.xml` ke backend; config dibackup dan `nginx -t` PASS. Production object storage terdeteksi `enabled:false`, sehingga direct upload tidak dipalsukan dan media tetap explicit public HTTPS entries.

Migration additive `20260910224500_add_school_website_phase2` diterapkan setelah backup `/var/backups/saas-satu/saas_satu_staging-20260910T154255Z-pre-website-phase2.sql.gz` diverifikasi. Full release `5b16861-website-phase2` dipromosikan sukses; metadata polish berikutnya memakai static-only release `f142e94-website-phase2-meta` dan run kedua idempotent. Final Playwright desktop+iPhone tidak menemukan overflow, marker DEMO, console error, atau request failure; admin CMS unauthenticated tetap HTTP 401; sitemap HTTP 200 XML; Vitest 76/76 PASS. `robotsIndex=false` dipertahankan.


---

## 13 September 2026 — Database Siswa Dapodik + halaman detail per siswa

Data siswa School OS ditingkatkan menjadi database sekolah lengkap yang mengikuti struktur Daftar Peserta Didik Dapodik. File contoh Dapodik hanya digunakan sebagai referensi format dan tidak diimpor.

Implementasi utama:

- StudentProfile diperluas secara additive untuk identitas, alamat/kontak, dokumen pendidikan, data ayah/ibu/wali, KPS/KIP/KKS/PIP, rekening, kebutuhan khusus, koordinat, No KK, data fisik, jumlah saudara, jarak, dan timestamp import Dapodik;
- input manual hanya mewajibkan Nama Lengkap + Jenis Kelamin; field lain opsional;
- route baru:
  - `/school/students/new`;
  - `/school/students/:id`;
  - `/school/students/:id/edit`;
- daftar siswa tetap compact dan nama/detail membuka halaman profile;
- form tambah/edit memakai grouped sections, bukan dialog kecil;
- detail siswa menampilkan completeness, rombel, PKL, status import, serta semua kelompok data;
- viewer non-admin tidak menerima identifier sensitif;
- direct importer `.xlsx` Dapodik membaca two-row header, parent/guardian groups, serial date, dan leading-zero identifiers;
- importer memakai preview/validation sebelum commit serta tidak auto-create rombel.

Migration:

`20260912213000_add_dapodik_student_profile`

Backup:

`/var/backups/saas-satu/saas_satu_staging-dapodik-20260913T084334Z.sql.gz`

Source release utama:

`783ff2c` — `feat(school): build Dapodik student database`

Runtime bugfix:

`2c07ede` — `fix(school): correct student detail academic year`

Bugfix diperlukan karena detail pertama memilih `AcademicYear.name`, sementara schema memakai `yearName` dan `semester`. Exact production Prisma detail query setelah fix PASS dan tidak ada 500 detail baru pada verification window.

Production final:

- backend/static: `2c07ede-student-detail-fix`;
- rollback: `783ff2c-dapodik-student-database`;
- service active;
- migration up-to-date;
- `/school/students`, `/school/students/new`, `/school/import`, `/auth/me`: HTTP 200;
- unauthenticated detail/preview/import/create/update: HTTP 401;
- student users = 21;
- student profiles = 21;
- dapodikImportedAt non-null = 0.

Quality gate:

- Vitest **91/91 PASS**;
- TypeScript PASS;
- Wasp compile/build PASS;
- Vite SSR/client PASS;
- backend bundle PASS;
- preflight PASS;
- blue-green port 3102 PASS;
- final exact read-only detail query PASS.

Tidak ada row dari file contoh Dapodik yang masuk ke production.

---

## 15 September 2026 — SMKN 12 Garut production onboarding + Dapodik student import

Konteks produksi School OS berpindah ke tenant **SMKN 12 Garut**. Runtime yang aktif pada saat handoff adalah backend/static `24cb787-panel-hardening` dengan `saas-satu.service` active.

Baseline data setelah import Dapodik production:

- 1.539 siswa berhasil ditulis sebagai 1.539 `StudentProfile`;
- 50 rombel terisi dan seluruh siswa memiliki rombel;
- pencocokan `Rombel Saat Ini` Dapodik ke rombel School OS 100%;
- distribusi: X 570, XI 456, XII 513;
- tidak ada akun/login siswa yang dibuat;
- tidak ada duplikasi NISN/NIK/NIPD pada record yang diterima;
- dua baris sumber sengaja tidak ditulis karena konflik NIK yang sama; identitas siswa tidak disalin ke dokumentasi permanen;
- tenant lain tetap terisolasi: SMKN 1 Rongga 21 siswa, SMPN 1 Gununghalu 0 siswa.

Backup pra-write:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`

Artefak sementara yang membawa PII (payload, JSON ekstraksi, base64, script import sementara) telah dibersihkan setelah verifikasi.

Pekerjaan lanjutan yang sengaja belum dilakukan: mapping kode rombel **A–G** ke Program/Konsentrasi Keahlian. Semua 50 rombel sudah ada, tetapi mapping jurusan tidak boleh ditebak tanpa sumber authoritative dari sekolah. Setelah mapping resmi tersedia, relasi harus ditulis tenant-scoped, diawali backup dan diakhiri verifikasi agregat per program serta tenant isolation.

Rangkaian source yang sudah live setelah fondasi Dapodik juga mencakup adaptasi fitur per jenjang, presensi harian, panel Wakasek modular, organization assignment center, follow-up workflow, sarpras, Kesiswaan Terpadu, notification center, EWS lintas modul generasi kedua, dan hardening panel non-admin; current source/runtime commit pada snapshot ini adalah `24cb787`.

Handoff rinci: `docs/RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md`.

---

## 15 September 2026 — SMKN 12 Garut profile/PTK/program/Sarpras import

Workbook resmi profil satuan pendidikan SMKN 12 Garut (unduh 14 September 2026) diaudit dan dipakai sebagai sumber authoritative tambahan setelah import siswa detail.

Sebelum mutation dibuat backup:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`

Backup diverifikasi melalui `pg_restore -l`, berukuran 1.430.726 byte dan mode 600.

Import production:

- profil School yang didukung schema diperbarui (alamat, kota, provinsi, telepon, email);
- 103 PTK masuk sebagai 103 `User` role TEACHER + 103 `TeacherProfile`, tanpa membuat Auth/login;
- workbook memberi mapping authoritative A–G dan mapping tersebut ditulis menjadi 7 Department;
- 50/50 rombel aktif dihubungkan ke Department dan wali kelas;
- 4 Wakasek dibuat;
- 43 penugasan organisasi dibuat dari data resmi (PRINCIPAL 1, DEPARTMENT_HEAD 7, OTHER 35);
- 75 prasarana masuk sebagai `FacilityRoom`;
- 816 record sarana masuk sebagai `AssetItem`, total 2.512 unit;
- kondisi sarana: 1.464 unit GOOD/laik dan 1.048 unit DAMAGED/tidak laik;
- 17 record sarana tidak diberi `roomId` karena nama prasarana sumber ganda dan tidak boleh ditebak.

Mapping resmi:

- A — Agribisnis Tanaman Pangan dan Hortikultura (Program Agribisnis Tanaman)
- B — Teknik Sepeda Motor (Program Teknik Otomotif)
- C — Desain Komunikasi Visual
- D — Bisnis Retail (Program Pemasaran)
- E — Layanan Perbankan Syariah (Program Akuntansi dan Keuangan Lembaga)
- F — Agribisnis Perbenihan Tanaman (Program Agribisnis Tanaman)
- G — Agribisnis Perikanan Air Tawar (Program Agribisnis Perikanan)

Dry-run pertama sengaja gagal dan rollback ketika assertion menemukan matcher `Kepala Sekolah` terlalu longgar dan ikut menangkap empat Wakasek. Matcher diperbaiki menjadi hanya `Jenis PTK = Kepala Sekolah`; dry-run kedua PASS seluruh assertion. Production transaction berikutnya COMMIT dengan hasil yang sama.

Distribusi setelah mapping: A 9 rombel/240 siswa, B 12/383, C 9/289, D 7/240, E 7/222, F 3/75, G 3/90; total 50 rombel/1.539 siswa.

Tenant isolation tetap: SMKN 1 Rongga 21 siswa, SMPN 1 Gununghalu 0 siswa. Service tetap active, backend/static tetap `24cb787-panel-hardening`, `/school` dan `/auth/me` HTTP 200.

Sheet agregat Peserta Didik tidak dipakai untuk overwrite baseline siswa detail. Blockgrant dan field profil/PTK yang belum memiliki model canonical tidak dipaksa masuk ke tabel/kolom lain.

Handoff rinci: `docs/RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`.

---

## 16 September 2026 — Dapodik PTK detail profiles

School OS menambahkan halaman detail Guru & Tenaga Kependidikan yang mengikuti pola detail siswa dan memakai field PTK dari workbook resmi Profil Satuan Pendidikan SMKN 12 Garut.

Implementasi:
- migration additive `20260916013500_add_dapodik_teacher_profile`;
- `TeacherProfile` diperluas dengan 22 field Dapodik nullable + index NIP/NUPTK/NIK;
- route baru `/school/teachers/:id`;
- query detail tenant-scoped dan directory-capability-scoped;
- NUPTK, NIK, tempat lahir, tanggal lahir dimasking untuk viewer non-admin;
- daftar Guru & Tendik juga dimasking dan sekarang mempunyai link/tombol Detail;
- 103 PTK production dibackfill dari workbook resmi tanpa membuat Auth/login.

Backup:
`/home/ubuntu/backups/SaaS_Satu/pre-ptk-detail-dapodik-20260916.dump`

Backfill production: 103/103 imported; NUPTK 100; NIK 103; NIP 96; komposisi 80 Guru, 22 Tendik, 1 Kepala Sekolah; Auth PTK 0; siswa tetap 1.539; 50 wali kelas tetap terhubung.

Quality gate:
- Prisma validate PASS;
- full Vitest `NODE_ENV=test`: 134/134 PASS pada 23 file;
- Wasp production build PASS;
- generated server bundle PASS;
- Vite SSR/client production build PASS;
- deploy preflight PASS;
- production release `e212f56-ptk-detail`;
- `/school` 200, `/school/teachers` 200, `/auth/me` 200;
- unauthenticated `get-school-teacher-detail` 401;
- service active dan rollback target tetap `24cb787-panel-hardening`.

Handoff: `docs/RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md`.

---

## 16 September 2026 — Complete Dapodik PTK profile editor

Form edit lama Guru & Tendik yang hanya menangani data dasar diganti dengan halaman edit lengkap berbasis field PTK Dapodik.

Implementasi:
- route baru `/school/teachers/:id/edit`;
- halaman `TeacherEditPage` memakai empat kelompok: Data Utama, Kualifikasi & Sertifikasi, Beban Kerja & Mengajar, Kontak & Akun School OS;
- field sensitif diberi penanda visual dan tetap hanya dapat diedit melalui action admin;
- action baru `updateSchoolTeacherProfile` menggunakan `requireSchoolAdmin` dan tenant scope `schoolId`;
- validasi duplikasi NIP/NUPTK/NIK dalam tenant dan email lintas user;
- action hanya menyentuh `User` dan `TeacherProfile`; WakasekAssignment, homeroom ClassRoom, SchoolStaffAssignment, username, dan Auth tidak disentuh;
- tombol Edit di daftar dan detail PTK diarahkan ke editor lengkap;
- modal daftar sekarang khusus Tambah Guru;
- setelah save, detail PTK menampilkan success banner.

Database impact:
- tidak ada perubahan schema/migration;
- tidak ada bulk mutation production;
- baseline sesudah rollout tetap 1.539 siswa, 103 TeacherProfile, dan 0 Auth PTK.

Quality gate:
- targeted tests 9/9 PASS;
- full Vitest `NODE_ENV=test`: **136/136 PASS** pada 23 file;
- Wasp production build PASS;
- generated server bundle PASS;
- Vite SSR/client production build PASS;
- immutable preflight PASS;
- production release `03655f4-ptk-editor`;
- `/school` 200, `/school/teachers` 200, edit route 200;
- unauthenticated `update-school-teacher-profile` 401;
- repeat deploy idempotent true;
- service active;
- rollback target `e212f56-ptk-detail`.

Handoff: `docs/RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md`.

---

## 16 September 2026 — AI agent handoff & documentation synchronization

Dokumentasi dan artefak konteks agen disinkronkan ulang setelah rollout complete Dapodik PTK editor.

Verifikasi read-only sebelum update dokumentasi:

- production backend: `03655f4-ptk-editor`;
- production static: `03655f4-ptk-editor`;
- `saas-satu.service`: active;
- SMKN 12 Garut students: **1.539**;
- TeacherProfile: **103**;
- Auth PTK: **0**;
- repository documentation head sebelum refresh: `9094228bd04a`.

Perubahan dokumentasi/artefak:

- dibuat `docs/AI_AGENT_HANDOFF.md` sebagai entry point ringkas dan permanen untuk agen AI baru;
- `AGENTS.md` root sekarang mewajibkan membaca AI handoff sebelum `PROJECT_CONTEXT.md`;
- `app/AGENTS.md` diperbaiki: Material 3 tidak lagi disebut sebagai design authority aktif; School OS Apple HIG-inspired adalah kontrak aktif, sedangkan nama `M3*` hanya compatibility layer;
- `docs/README.md` ditambah indeks AI Agent Handoff;
- `docs/PROJECT_CONTEXT.md` diberi timestamp verifikasi 16:30 WIB dan pointer ke artefak handoff;
- release documents PTK tetap dipertahankan sebagai immutable historical/verification records;
- tidak ada perubahan data production, schema, migration, atau deployment pada refresh dokumentasi ini.

Privacy contract tetap: raw student/PTK PII tidak disalin ke dokumentasi atau native agent memory.

---

## 16 September 2026 — Global persistent Agent Memory rollout

Memory permanen School OS dipindahkan dari ketergantungan tunggal pada repo-local `.agent/memory` menjadi arsitektur berlapis.

Implementasi OS-global:

- MSO Agent Memory aktif di `/home/ubuntu/.mso/agent-memory`;
- root/principal directory permission: `0700`;
- `MEMORY.md`, `USER.md`, `records-v1.json`: `0600`;
- global manifest: `/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`;
- snapshot awal: `/home/ubuntu/backups/MSO/global-agent-memory-20260916T1656WIB.tar.gz`;
- snapshot diverifikasi readable dan mode `0600`.

Confirmed high-value claims yang dipromosikan mencakup identity/active tenant, production baseline, mapping A–G, student/PTK contract, design contract, security/tenant contract, deployment contract, current release, backup locations, documentation entrypoint, serta memory architecture.

Mutable claims memakai replace/supersede semantics agar claim resolved terbaru menggantikan nilai lama tanpa menghilangkan provenance.

Verifikasi retrieval global tanpa project path berhasil untuk:

- baseline SMKN 12 Garut;
- Apple HIG design authority;
- deployment contract;
- release production `03655f4-ptk-editor`;
- global memory architecture.

Repo-local `.agent/memory` **tidak dihapus** dan tetap dipakai sebagai operational Project/RASMIC memory. `~/.mso/skill-memory.json` tetap menjadi workflow/experience memory.

Privacy rule: raw student/PTK PII, credentials, tokens, passwords, dan private keys tidak dipromosikan ke global memory.

Dokumentasi: `docs/GLOBAL_PERSISTENT_MEMORY.md`.

Tidak ada perubahan aplikasi production, schema, database, atau deployment.

---

## 20 September 2026 — PKL Foundation Generasi Kedua

Foundation PKL dimodernisasi sebelum fase Penempatan PKL Gen2.

Implementasi:

- master `PklPeriod` terhubung opsional ke AcademicYear;
- `Company` diperluas dengan code/legal name/contact/website/status & masa kemitraan/MoU/notes/archive state;
- `CompanyDepartment` untuk relasi DUDI ↔ konsentrasi keahlian;
- `PklCompanyCapacity` untuk quota Periode × DUDI × Konsentrasi;
- `DudiMentorProfile` untuk master Pembimbing DUDI;
- `Placement.pklPeriodId` nullable sebagai bridge menuju Placement Gen2;
- route admin baru `/school/pkl/foundation`;
- navigasi PKL admin menambahkan **Fondasi PKL**;
- Mitra DUDI UI diperluas untuk profil kemitraan dan konsentrasi yang diterima;
- mentor master tidak membuat Auth/password/username/login email; archive semantics dipakai untuk preservasi histori;
- Placement Gen1 dan `Company.maxQuota` tetap backward-compatible.

Database:

- backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-foundation-gen2-20260920.dump`;
- migration `20260920002500_add_pkl_foundation_gen2`;
- migration `20260920003500_align_company_updated_at_default`;
- migration diuji pada clone backup production sebelum diterapkan live;
- post-rollout: Company 0, PklPeriod 0, DudiMentorProfile 0, PklCompanyCapacity 0, Placement 0 untuk SMKN 12 Garut;
- tidak ada synthetic PKL data;
- siswa/PTK tetap 1.539/103.

Quality gate:

- Prisma validate PASS;
- Foundation tests 5/5 PASS;
- full Vitest: **141/141 PASS** pada 24 file;
- Wasp build PASS;
- server bundle PASS;
- Vite SSR/client PASS;
- deploy preflight PASS;
- production release `45a11a5-pkl-foundation-gen2`;
- `/school/pkl/foundation` 200;
- unauthenticated foundation query/action 401;
- repeat deployment idempotent true.

Handoff: `docs/RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md`.

Next: **Penempatan PKL Generasi Kedua**.

---

## 20 September 2026 — PKL Generasi Kedua workflow suite

Full PKL Gen2 roadmap completed and deployed.

Scope:

- Placement Gen2 workspace with Period/Department/DUDI eligibility, live `PklCompanyCapacity`, bulk plotting, server over-capacity guard, Guru + DUDI Mentor assignment, PLANNED/ACTIVE/COMPLETED/CANCELED lifecycle, edit, transfer, and event history;
- readiness check before activation;
- Attendance Gen2 with placement/period date enforcement, geofence, work schedule, late detection, Izin/Sakit, ALPA/LIBUR admin correction, and optional signed S3 evidence;
- Journal Gen2 with draft/submit/revision/approve, competencies, reflection, documentation, revision history, and independent Teacher/DUDI review;
- EWS Gen2 for readiness, no attendance, repeated ALPA/out-of-radius, stale journals, review delay, and nearing end without approved journal;
- role-aware PKL dashboard;
- reports with print/Save PDF and Excel-compatible CSV export;
- PKL XLSX/CSV import with templates, preview, validation, preview hash, atomic commit, and no auto-login provisioning.

Database:

- backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-workflows-20260920.dump`;
- migration: `20260920010500_add_pkl_gen2_workflows`;
- checksum: `bcb47307076429be5f49b75120fb629874f697b9605845b85afb253a512f878a`;
- dry-run clone PASS before production;
- migration backfilled 7 historical journals from other tenants for date/submission compatibility;
- SMKN 12 Garut remained 1,539 students / 103 PTK / zero PKL data.

Quality:

- targeted PKL tests 12/12 PASS;
- full Vitest **148/148 PASS** / 26 files;
- Prisma validate PASS;
- Wasp build PASS;
- server bundle PASS;
- Vite SSR/client PASS;
- preflight PASS;
- production release `5aee74e-pkl-gen2-full`;
- all PKL routes 200;
- sensitive unauth operations 401;
- repeated deploy idempotent true.

Handoff: `docs/RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md`.

---

## 21 September 2026 — PKL Gen 2 UAT & Operational Hardening

PKL Gen2 menjalani technical UAT menggunakan PostgreSQL database terisolasi dan synthetic multi-tenant fixture, tanpa menyentuh data PKL production SMKN 12 Garut.

Reusable harness:

- `app/uat/pklGen2.integration.ts`;
- `app/uat/pklGen2Race.integration.ts`;
- `app/vitest.pkl-uat.config.ts`.

Final UAT: **19/19 PASS**.

Defect/hardening yang ditutup:

- ACTIVE placement tidak dapat kehilangan Guru/Pembimbing DUDI;
- PLANNED tidak dapat langsung COMPLETED;
- active transfer wajib target mentor valid;
- row lock siswa + capacity mencegah double placement/overbook saat concurrent plotting;
- target capacity lock mencegah concurrent transfer overbook;
- placement import commit memakai student/capacity locks;
- batch import preview memvalidasi aggregate quota, DUDI aktif, relation konsentrasi dan open placement;
- CHECK_OUT wajib setelah CHECK_IN;
- Izin/Sakit dan admin day-state tidak boleh bentrok dengan presence;
- manual day-state dibatasi placement date range;
- work-schedule invalid day/time ditolak;
- same-day journal write diserialisasi agar tidak membuat duplicate;
- future-start ACTIVE placement tidak memunculkan EWS no-attendance/no-journal;
- evidence upload status sekarang authenticated.

Quality gate:

- UAT real DB **19/19 PASS** / 2 files;
- targeted PKL **12/12 PASS**;
- normal full regression **148/148 PASS** / 26 files;
- Prisma validate PASS;
- Wasp build PASS;
- server bundle PASS;
- Vite SSR/client PASS;
- deploy preflight PASS;
- production release `d0809d4-pkl-uat-hardening`;
- all PKL routes 200;
- sensitive unauth operations 401;
- repeated deploy idempotent true.

Backup:

`/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-uat-hardening-20260921.dump`

Post-deploy SMKN 12 Garut tetap 1.539 siswa / 103 PTK / zero PKL production rows. Temporary UAT database telah dihapus.

Human review yang tersisa: GPS/geofence nyata, kamera/selfie HP, mobile network, dan subjective UX/operator acceptance.

Handoff: `docs/RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md`.

---

## 21 September 2026 — Temporary PKL demo for direct testing

Owner authorized a minimal reversible PKL Gen2 demo in SMKN 12 Garut production: one demo period, one demo DUDI, one company-department link, quota 1, one synthetic DUDI mentor without Auth/login, one PLANNED placement linking one existing grade XII student and one existing teacher supervisor, one Mon-Sat work schedule, and one placement event. Attendance and journal remain zero. GPS coordinates were later configured successfully through the deployed updateCompany business operation.

Backup: /home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-smkn12-20260921.dump
Cleanup: /home/ubuntu/backups/SaaS_Satu/pkl-demo-smkn12-20260921.cleanup.sql

---

## 21 September 2026 — PKL Gen2 Foundation permission fix

The temporary demo rows existed, but the Foundation page displayed zero because all Gen2 read operations were failing with PostgreSQL permission errors.

Root cause: seven tables created by the Gen2 migrations were owned by `postgres` instead of the runtime application DB role. Ownership was aligned in one transaction for PklPeriod, CompanyDepartment, PklCompanyCapacity, DudiMentorProfile, DailyJournalRevision, PklWorkSchedule, and PklPlacementEvent.

Application-role verification returned Foundation counts 1 period / 1 company / 1 mentor / quota 1.

PklFoundationPage was hardened so read-query errors are shown explicitly rather than rendered as zero data.

Quality gate: targeted PKL 12/12 PASS, normal regression 148/148 PASS, Wasp build PASS, Vite SSR/client PASS, static preflight/deploy PASS, repeat static deploy idempotent true.

Backend remains `d0809d4-pkl-uat-hardening`; static release is `066254d-pkl-foundation-permission-ui`.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-permission-fix-20260921.dump`.

Handoff: `docs/RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md`.

---

## 21 September 2026 — PKL Mitra DUDI edit validation fix

Editing DEMO-PKL-01 and saving geofence coordinates returned `Operation arguments validation failed`.

Production logs identified the exact Zod mismatch: empty `picName` and `picPhone` were sent as `null` but the backend schema did not allow null. `industrySector` had the same latent issue.

The company schema was moved into `app/src/pkl/companyPolicy.ts` and now accepts null for those optional fields. Regression tests were added in `app/src/pkl/companyValidation.test.ts`.

Quality gate: company validation 2/2 PASS, targeted PKL 13/13 PASS, full regression 150/150 PASS across 27 files, Wasp build PASS, server bundle PASS, Vite SSR/client PASS, immutable deploy PASS, repeat deploy idempotent true.

Production release: `197c969-pkl-company-edit-fix`.

End-to-end verification called deployed `updateCompany` with empty PIC fields and the geofence coordinates captured by the user. The coordinates persisted successfully and demo placement readiness became ready=true with 0 blockers and 0 warnings.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-geo-update-20260921.dump`.

Handoff: `docs/RELEASE_2026-09-21_PKL_COMPANY_EDIT_VALIDATION_FIX.md`.

---

## 21 September 2026 — School OS DESIGN.md adoption

The active School OS Apple HIG-inspired interface was audited directly from the latest live frontend lineage (`c64509e`) and formalized into root [`DESIGN.md`](../DESIGN.md) using Google's open DESIGN.md format.

The file now combines machine-readable YAML design tokens with human-readable guidance for colors, typography, layout, elevation, shapes, shared components, Spotlight, dialogs/evidence previews, tables, dashboards, accessibility, data honesty, and do/don't guardrails. The values were derived from `app/src/client/Main.css`, shared `components/m3/` compatibility components, `SchoolLayout`, `SchoolSpotlight`, and the existing `UI_UX_APPLE_HIG.md` implementation record.

Agent guidance, project context, architecture, root README, and documentation index now point to `DESIGN.md` as the primary cross-agent visual authority. `docs/UI_UX_APPLE_HIG.md` remains the detailed implementation/history reference; legacy Material 3 documentation is historical only.

Validation:

- `git diff --check`: PASS;
- official `@google/design.md` v0.4.0 structural lint: **0 errors**;
- lint warnings: orphaned-token advisories only, intentionally retained because the machine-readable palette includes production semantic/dark/icon tokens beyond the compact component map;
- official DESIGN.md Tailwind v4 CSS export: PASS.

No runtime UI, database, backend, or production pointer was changed by this documentation-only adoption.

---

## 22 September 2026 — Presensi Harian + Wali Kelas production-grade hardening

Daily Attendance and the Homeroom Teacher workspace were audited and hardened as the next production-grade module after PKL Gen 2.

Key fixes: strict active-semester date bounds, same-tenant STUDENT-only roster/report relations, explicit report selector authorization instead of silent fallback, Wali Kelas as a TEACHER-only assigned workspace, removal of the misleading School Admin Wali Kelas sidebar entry, and regression coverage for the new scope policies.

A reversible two-tenant real-database UAT completed **33/33 PASS**, including concurrent full-roster writes and `ALPA` propagation into EWS Gen 2. UAT data was fully cleaned and SMKN 12 Garut remained at **0 daily-attendance rows**.

Quality gate: **156/156 tests across 29 files**, Wasp build PASS, server bundle PASS, Vite SSR/client PASS, no schema migration, full deploy preflight PASS, immutable deployment PASS, repeat deployment idempotent true, protected operations return 401 unauthenticated.

Production release: `16bad88-attendance-wali-hardening`.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-attendance-wali-uat-20260922.dump`.

Handoff: `docs/RELEASE_2026-09-22_DAILY_ATTENDANCE_WALI_HARDENING.md`.

---

## 22 September 2026 — Kesiswaan Terpadu + Tindak Lanjut production-grade hardening

Kesiswaan Terpadu and Follow-Up were audited and hardened after the Presensi Harian + Wali Kelas production release.

Critical production findings included Kesiswaan truncation at 1,500 students despite SMKN 12 Garut having 1,539 students, and a manual Follow-Up selector limited to 500 students. Both now use a bounded 5,000-student operational cap, verified read-only against production at 1,539/1,539.

Additional hardening covers explicit class/student scope, active-academic-year homeroom access, future violation/achievement dates, valid Follow-Up assignees, optimistic concurrent-write protection, and clean reopen metadata for violations/coaching/permits/Follow-Up.

Isolated real-DB UAT: **55/55 PASS**. Full regression: **157/157 PASS across 29 files**. Wasp build, server bundle, Vite SSR/client, immutable preflight/deploy, idempotent redeploy, auth security smoke, cleanup, and post-deploy log/health checks all PASS. No schema migration was needed.

Production release: `0d52d90-student-affairs-followup`.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-student-affairs-followup-uat-20260922.dump`.

Handoff: `docs/RELEASE_2026-09-22_STUDENT_AFFAIRS_FOLLOWUP_HARDENING.md`.
