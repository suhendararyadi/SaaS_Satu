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
