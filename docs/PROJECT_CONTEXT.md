# School OS — Persistent Project Context

Last updated: **15 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah snapshot lintas-sesi untuk melanjutkan pengembangan School OS. Jika isi dokumen bertentangan dengan runtime aktual, verifikasi runtime/repository terlebih dahulu lalu perbarui snapshot ini.

## 1. Source tree aktif

- Repository baseline: `/home/ubuntu/projects/SaaS_Satu`
- Worktree aktif School OS: `/home/ubuntu/projects/SaaS_Satu-hardening`
- Branch: `redesign/apple-hig`
- Source CMS foundation: `5869a68` — `feat(website): add tenant-isolated school CMS`
- Public-data safety + starter seed: `f382ad3` — `refine(website): protect public data and add starter seed`
- Editorial review UI + deploy hardening: `9735dd2` — `refine(website): complete review flow and deploy checks`
- Website Sekolah Phase 2: `ba863b9` — `feat(website): deliver phase 2 publishing experience`
- Sitemap API signature fix: `5b16861` — `fix(website): align sitemap api signature`
- Route-specific social metadata polish: `f142e94` — `fix(website): prefer school social metadata`
- School OS Spotlight runtime: `4e50fd5` — `feat(school): add Spotlight search`
- Spotlight interaction regression tests: `3188ae8` — `test(school): cover Spotlight interactions`
- Spotlight HIG focus refinement: `0699046` — `refine(school): polish Spotlight HIG focus state`
- Apple-style search field refinement: `5f20bdc` — `refine(school): align Spotlight search field with Apple HIG`
- Inner input chrome fix: `5eb8b87` — `fix(school): remove Spotlight inner input chrome`
- Dapodik-aligned student database: `783ff2c` — `feat(school): build Dapodik student database`
- Student detail AcademicYear runtime fix: `2c07ede` — `fix(school): correct student detail academic year`
- School-level feature adaptation: `128ef87` — `feat(school): adapt features by school level`
- Daily student attendance + homeroom scope: `985df7e` / `0a5ecc5`
- Modular Wakasek panels: `618703b`
- Organization assignment center: `edd4bc4`
- Integrated follow-up workflow: `05db875`
- Sarpras inventory & maintenance: `32c7fc9`
- Kesiswaan Terpadu: `e64d1ff`
- Notification center: `fbd7fd3`
- EWS lintas modul generasi kedua: `27d1b34`
- Current production/source head at this snapshot: `24cb787` — `fix(school): harden non-admin panels`
- `.agent/` adalah artefak workflow lokal yang tidak dilacak Git; jangan dibersihkan hanya untuk merapikan status.

Gunakan worktree `SaaS_Satu-hardening` untuk pengembangan School OS kecuali ada keputusan eksplisit untuk merge/rebase/promote ke branch lain.

## 2. Design contract aktif

Design system aktif adalah **School OS — Apple HIG-inspired**, bukan Material 3. Source of truth visual: [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md).

Nama folder/komponen `components/m3/` dan API `M3*` tetap dipakai sebagai compatibility layer; nama tersebut bukan authority desain Material 3.

Kontrak shell yang harus dipertahankan:

- sidebar desktop macOS-like dengan school identity row, restrained icon tiles, near-black labels, thin separators, dan grouped surfaces;
- toggle sidebar berupa split-panel glyph di header sidebar;
- account trigger top bar hanya avatar/inisial bulat; footer akun sidebar School tidak digunakan;
- sidebar search `Cari menu` memfilter hanya menu yang memang diizinkan untuk role aktif;
- global **School OS Spotlight** dibuka melalui `Cmd+K` / `Ctrl+K` atau tombol `Cari` di top bar; menu dicari hanya dari navigation items role aktif, sedangkan data sekolah dicari server-side dengan tenant/role scope yang eksplisit;
- auth `/login` dan `/signup` memakai centered translucent auth surface dengan wallpaper SVG original proyek, bukan aset Apple proprietary;
- Super Admin `/admin` memakai HIG shell yang sama dan tetap hanya untuk `user.isAdmin === true`;
- tema School + Super Admin memakai localStorage key `theme` dan sinkron class `dark` pada `html` + `body`;
- dashboard Admin School hanya memakai 4 KPI utama: `Siswa`, `Guru & Tendik`, `Rombel`, `Kehadiran hari ini`;
- `Kehadiran per rombel` memilih maksimal 5 rombel berpersentase hadir terendah lalu menampilkannya dari yang lebih tinggi ke lebih rendah; tiga lane atas biru, lane kedua terbawah jingga, terbawah merah, data kosong netral;
- `Perlu keputusan Anda` memakai icon tile Apple-like dan item `Buka pusat monitoring PKL` berada pada list-row yang sama tetapi tidak menambah badge keputusan;
- `/school/ews` adalah hub Early Warning System; `/school/pkl/monitoring` memakai grouped/list layout Apple HIG-inspired;
- `M3Dialog` sudah diperbaiki agar controlled input tidak kehilangan fokus/caret saat parent re-render.

## 3. Production state saat ini

Domain: `https://sekolah.suhendararyadi.com`.

Production runtime pada snapshot 15 September 2026:

- **backend current**: `/home/ubuntu/deployments/SaaS_Satu/releases/24cb787-panel-hardening`
- **static current**: `/var/www/saas-satu/releases/24cb787-panel-hardening`
- runtime/source commit: `24cb787` — `fix(school): harden non-admin panels`
- `saas-satu.service`: **active**
- branch pengembangan aktif: `redesign/apple-hig`
- tenant operasional yang menjadi fokus lanjutan: **SMKN 12 Garut**
- detail baseline data tenant: [`RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md`](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md)
- baseline master data terbaru: [`RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md)

Fondasi **Dapodik Student Database** dari `783ff2c` + runtime fix `2c07ede` tetap menjadi kontrak model/import siswa. Migration Dapodik bersifat additive dan sudah applied.

Angka `student_users=21`, `student_profiles=21`, dan `dapodik_imported=0` yang dicatat pada release 13 September adalah **historical pre-import preservation proof** untuk tenant lama, bukan jumlah siswa production saat ini. Setelah onboarding SMKN 12 Garut, baseline production tenant aktif adalah **1.539 StudentProfile pada 50 rombel**, tanpa pembuatan akun/login siswa.

## 3.1 School OS Spotlight Search — LIVE

Entry point:

- keyboard: `Cmd+K` pada macOS, `Ctrl+K` pada Windows/Linux;
- top bar: tombol `Cari` dengan search glyph; mobile tetap icon-first;
- modal menggunakan command-palette material yang ringan, keyboard-first, dan responsive.
- Spotlight search field memakai Apple-style system fill: tinggi 40px mobile / 36px desktop, radius 10px, search icon 16px, placeholder `Cari di School OS`, clear affordance bulat kecil, dan focus halo sangat tipis pada wrapper. Wrapper adalah satu-satunya visual frame (`overflow-hidden`); elemen input internal dipaksa `border:0`, `border-radius:0`, `box-shadow:none`, `outline:0`, serta native WebKit search chrome disembunyikan.

Interaction contract:

- `Esc` menutup palette;
- `Arrow Up/Down` memindahkan pilihan;
- `Enter` membuka hasil aktif;
- menu difilter instan dari item navigation yang memang sudah diizinkan untuk role aktif;
- data search mulai setelah minimal 2 karakter dan memakai debounce sekitar 160 ms;
- recent destinations disimpan lokal pada browser di key `school_spotlight_recent_v1`; tidak disimpan di database;
- hasil Siswa/Guru/Rombel/DUDI dapat membuka list page dengan parameter `?spotlight=` sehingga daftar langsung terfilter; LMS membuka course detail langsung.

Server-side scope:

- `SCHOOL_ADMIN` / platform admin pada tenant aktif: siswa, guru/tendik, rombel, LMS, DUDI, penempatan PKL, dan konten Website Sekolah;
- `TEACHER`: siswa, rombel, LMS miliknya, dan PKL yang menjadi tanggung jawabnya;
- `STUDENT`: LMS untuk rombelnya dan PKL miliknya;
- `DUDI_MENTOR`: hanya penempatan PKL yang ditugaskan kepadanya.

Search operation selalu memanggil `ensureSchoolUser`, memakai `schoolId` tenant aktif, dan menerapkan assignment filter untuk Teacher/Student/DUDI Mentor. UI visibility bukan security boundary.

Quality gate Spotlight:

- dedicated policy tests: 5/5 PASS;
- dedicated interaction tests: 3/3 PASS;
- full suite setelah test baru: **84/84 PASS** pada 8 test files;
- TypeScript: PASS;
- Wasp production build: PASS;
- Vite SSR/client: PASS;
- backend bundle: PASS;
- full deploy preflight: PASS;
- blue-green backend startup port 3102: PASS;
- blue-green `/auth/me`: 200;
- blue-green unauthenticated Spotlight operation: 401;
- live unauthenticated Spotlight operation: 401;
- Website Sekolah/public sitemap regression smoke: PASS.

Authenticated browser smoke tidak dibuat dengan synthetic password/session; rollout sengaja tidak membuat atau memodifikasi credential production hanya untuk test. Authorization policy, compiled server operation, blue-green runtime, and unauthenticated boundary are covered automatically.


## 3.2 Database Siswa berbasis Dapodik — LIVE

School OS sekarang memakai struktur `StudentProfile` yang selaras dengan data **Daftar Peserta Didik Dapodik**. File contoh yang diberikan pemilik produk dipakai hanya untuk memahami struktur kolom dan **tidak pernah diimpor**.

### Halaman dan alur

- `/school/students` — daftar siswa ringkas, pencarian Nama / NIPD-NIS / NISN / NIK;
- `/school/students/new` — halaman Tambah Siswa lengkap;
- `/school/students/:id` — halaman detail per siswa;
- `/school/students/:id/edit` — halaman edit lengkap;
- `/school/import` — impor langsung file Dapodik `.xlsx` dengan preview dan validasi sebelum commit.

Dialog CRUD kecil tidak lagi menjadi surface utama untuk siswa karena dataset Dapodik terlalu besar. Form dibagi ke kelompok Data Utama, Alamat & Kontak, Dokumen/Riwayat Pendidikan, Ayah, Ibu, Wali, KPS/KIP/PIP, Rekening, dan Data Tambahan.

### Required vs optional

Untuk input manual, **hanya Nama Lengkap dan Jenis Kelamin yang wajib**. NIPD/NIS, NISN, NIK, rombel, tanggal lahir, alamat, data orang tua/wali, bantuan sosial, bank, koordinat, fisik, dan field Dapodik lain nullable/opsional dan dapat dilengkapi bertahap.

Existing student tidak diberi nilai sintetis. Field baru yang belum tersedia tampil sebagai `Belum diisi` sampai diisi manual atau melalui import Dapodik.

### Field model

`StudentProfile` menyimpan field terstruktur, bukan blob JSON:

- identitas: NIPD/NIS, NISN, JK, tempat/tanggal lahir, NIK, agama, status;
- alamat/kontak: alamat, RT/RW, dusun, desa/kelurahan, kecamatan, kode pos, jenis tinggal, transportasi, telepon/HP;
- dokumen/pendidikan: SKHUN, rombel saat ini, nomor ujian nasional, seri ijazah, sekolah asal, akta lahir;
- bantuan: KPS, KIP, KKS, PIP + alasan;
- ayah/ibu/wali: nama, tahun lahir, pendidikan, pekerjaan, penghasilan, NIK;
- rekening: bank, nomor rekening, nama pemilik;
- tambahan: kebutuhan khusus, anak ke-, koordinat, No KK, berat/tinggi/lingkar kepala, jumlah saudara, jarak rumah-sekolah;
- `dapodikImportedAt` menandai profile yang pernah ditulis lewat importer.

NIPD Dapodik tetap dipetakan ke `StudentProfile.nis` agar kompatibel dengan modul lama.

### Import Dapodik

Importer membaca file `.xlsx` secara langsung dan mengenali:

- metadata laporan di atas tabel;
- dua baris header;
- grouped columns `Data Ayah`, `Data Ibu`, `Data Wali`;
- Excel serial date;
- leading-zero identifier seperti NISN/NIK/No KK;
- maksimal 10 MB dan 5.000 siswa per proses.

Flow: **pilih file → parse → preview/validate → konfirmasi → import**. Preview tidak menulis database. Matching existing student menggunakan identitas terstruktur dan tidak auto-create rombel.

### Authorization & privacy

- create/edit/import: `requireSchoolAdmin`;
- detail/read directory: `requireSchoolDirectoryAccess`;
- semua query/mutation tenant-scoped dengan `schoolId`;
- class room yang dipilih diverifikasi milik tenant aktif;
- NIPD/NIS, NISN, NIK dicek uniqueness di sekolah;
- viewer non-admin tidak menerima identifier sensitif seperti NIK, NIK orang tua/wali, No KK, nomor rekening, akta lahir, KPS/KIP/KKS.

### Migration, backup, dan production proof

Migration additive:

`20260912213000_add_dapodik_student_profile`

Backup safety sebelum final verification:

`/var/backups/saas-satu/saas_satu_staging-dapodik-20260913T084334Z.sql.gz`

Backup diverifikasi `gzip -t`, mode 600, owner root.

Production data preservation:

- student users: **21**
- student profiles: **21**
- profile dengan `dapodikImportedAt != null`: **0**

Jadi tidak ada contoh Dapodik yang masuk ke database dan student existing tetap memiliki profile.

### Quality gate & rollout

- Vitest: **91/91 PASS** pada 11 test files;
- TypeScript: PASS;
- Wasp 0.25 production build: PASS;
- Prisma Client generation: PASS;
- Vite SSR/client: PASS;
- backend bundle: PASS;
- full preflight: PASS;
- blue-green startup port 3102: PASS;
- blue-green `/auth/me`: 200;
- blue-green unauthenticated detail operation: 401;
- exact read-only Prisma detail query dengan relasi rombel/tahun ajaran/PKL: PASS;
- final production release: `2c07ede-student-detail-fix`.

Pada rollout awal `783ff2c`, authenticated detail sempat 500 karena select salah memakai `AcademicYear.name`. Schema yang benar memakai `yearName` + `semester`. Bug tersebut diperbaiki di `2c07ede`; setelah cutover final, count `get-school-student-detail 500` pada verification window = **0**.


## 3.3 SMKN 12 Garut — Production student baseline (15 September 2026)

Konteks tenant aktif untuk kelanjutan pekerjaan adalah **SMKN 12 Garut**.

Hasil import Dapodik production:

- **1.539 siswa / 1.539 StudentProfile**;
- **50 rombel**;
- **0 siswa tanpa rombel**;
- **0 kegagalan import** pada baris yang diterima;
- **0 duplikasi NISN, NIK, dan NIPD/NIS** pada data yang diterima;
- **0 akun/login siswa dibuat**;
- matching `Rombel Saat Ini` Dapodik → rombel School OS: **100%**;
- distribusi tingkat: X **570**, XI **456**, XII **513**.

Dua baris sumber tidak ditulis karena konflik NIK yang sama. Identitas siswa sengaja **tidak disimpan** di dokumentasi permanen. Jangan memperbaiki konflik tersebut dengan tebakan atau nilai sintetis; tunggu data authoritative sekolah/Dapodik.

Tenant-isolation proof sesudah import:

- SMKN 12 Garut: **1.539** siswa;
- SMKN 1 Rongga: tetap **21** siswa;
- SMPN 1 Gununghalu: tetap **0** siswa.

Backup pra-write:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`

Payload/JSON/base64/script sementara yang memuat PII sudah dibersihkan dari VPS setelah verifikasi.

### Mapping A–G sudah authoritative dan LIVE

Workbook resmi profil satuan pendidikan tanggal 14 September 2026 menyediakan mapping melalui sheet **Rombongan Belajar**. Mapping sudah ditulis ke production:

- A → Agribisnis Tanaman Pangan dan Hortikultura (Program: Agribisnis Tanaman)
- B → Teknik Sepeda Motor (Program: Teknik Otomotif)
- C → Desain Komunikasi Visual
- D → Bisnis Retail (Program: Pemasaran)
- E → Layanan Perbankan Syariah (Program: Akuntansi dan Keuangan Lembaga)
- F → Agribisnis Perbenihan Tanaman (Program: Agribisnis Tanaman)
- G → Agribisnis Perikanan Air Tawar (Program: Agribisnis Perikanan)

Seluruh **50 rombel** sudah memiliki `departmentId` dan `homeroomTeacherId`. Distribusi siswa per kode: A 240, B 383, C 289, D 240, E 222, F 75, G 90; total tetap **1.539**.

Lihat baseline import lengkap: [`RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md).

## 3.4 SMKN 12 Garut — PTK, organisasi, dan Sarpras (15 September 2026)

Master data production terbaru:

- **103 PTK / TeacherProfile**: 80 Guru, 22 Tenaga Kependidikan, 1 Kepala Sekolah;
- **0 Auth/login PTK** dibuat;
- **4 Wakasek**;
- **43 SchoolStaffAssignment** hasil sumber profil resmi, termasuk 1 Kepala Sekolah, 7 assignment kepala program/konsentrasi, 22 Tenaga Kependidikan, dan 13 tugas struktural lain;
- **75 FacilityRoom**;
- **816 AssetItem / 2.512 unit sarana**;
- kondisi sarana: **1.464 GOOD/laik** dan **1.048 DAMAGED/tidak laik**;
- **17 record aset** sengaja belum dihubungkan ke `roomId` karena nama prasarana sumber ganda; lokasi asli tetap ada pada notes dan tidak boleh ditebak.

Backup sebelum import:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`

Sheet agregat Peserta Didik tidak dipakai untuk overwrite database detail. Sheet Blockgrant juga tidak dipaksakan karena belum ada model canonical. Field PTK yang belum memiliki field canonical (mis. NUPTK/NIK/tempat-tanggal lahir/detail sertifikasi) tidak dimasukkan ke kolom dengan makna yang salah.

## 4. Website Sekolah CMS — LIVE

Website Sekolah bukan lagi roadmap/placeholder. Modul sudah aktif dan memiliki persistence production.

Admin entry point:

- **PUBLIKASI → Website Sekolah**
- `/school/website`
- authenticated preview: `/school/website/preview`

Workspace admin memiliki:

- Ringkasan
- Halaman
- Berita
- Agenda & Pengumuman
- Galeri & Media
- Navigasi
- Landing Page
- Identitas & SEO
- Riwayat

Editorial states:

`DRAFT → IN_REVIEW → SCHEDULED / PUBLISHED → ARCHIVED`

UI final menyediakan action **Kirim review** untuk content berstatus Draft. Simpan konten tidak otomatis menerbitkan.

Public namespace aktif:

- `/site/:schoolSlug`
- `/site/:schoolSlug/:pageSlug`
- `/site/:schoolSlug/berita`
- `/site/:schoolSlug/berita/:postSlug`
- `/site/:schoolSlug/agenda`
- `/site/:schoolSlug/pengumuman`

Public site SMKN 1 RONGGA:

`https://sekolah.suhendararyadi.com/site/smkn-1-rongga`

Starter content production yang dibuat secara idempotent:

- Halaman `Profil Sekolah` — PUBLISHED
- Berita `Website Sekolah Mulai Tersedia` — PUBLISHED
- Header nav: Profil, Berita, Agenda, Pengumuman
- site status: PUBLISHED
- `robotsIndex=false`, sehingga output public tetap `noindex,nofollow` sampai konten sekolah siap untuk indexing.

Runner operator:

`app/scripts/school-website-starter-data.mjs`

Run kedua telah diverifikasi membuat 0 record baru (`created.site/profile/news=false`, `navItems=0`) sehingga seed starter idempotent.

## 5. CMS data/security boundaries

Model CMS production menggunakan tenant key `schoolId` dan meliputi `SchoolSite`, `SchoolSiteContent`, `SchoolSiteNavItem`, `SchoolSiteMedia`, serta `SchoolSiteRevision`. `SchoolSite.landingSections` menyimpan konfigurasi Landing Composer.

Guardrails yang sudah diterapkan dan diverifikasi:

- admin mutation/query memakai tenant context server-side;
- draft dan future-scheduled content tidak dikembalikan public query;
- test production menunjukkan draft/future-scheduled QA menghasilkan HTTP 404 public;
- arbitrary HTML/JavaScript tidak disimpan; body diubah menjadi allowlisted structured content blocks;
- external navigation link wajib HTTPS;
- public site tidak otomatis mengambil siswa, NIS/NISN, nilai, presensi, EWS, jurnal PKL, atau data internal lain;
- department/program dengan marker QA `[DEMO]` atau code `DEMO-` difilter dari public site dan preview;
- final public response untuk SMKN 1 RONGGA hanya menampilkan program nyata `RPL`, bukan jurusan seed QA;
- media admin saat ini berupa explicit public HTTPS image entry dengan alt text wajib; media library dapat dipilih untuk hero/cover. Direct object-storage upload belum diaktifkan karena deployment production melaporkan `enabled:false`; UI tidak menampilkan upload palsu.

Public browser verification setelah rollout:

- desktop 1440×900: HTTP 200, horizontal overflow = no, DEMO marker = no, console errors = 0, request failures = 0;
- viewport iPhone 390×844: HTTP 200, horizontal overflow = no, DEMO marker = no, console errors = 0, request failures = 0;
- landing, Profil, daftar/detail Berita, Agenda, dan Pengumuman telah diuji responsive sebelumnya dan semuanya HTTP 200.

## 6. Database migration & backups CMS

Migration production yang sudah applied:

- `20260910194000_add_school_website_cms` — CMS foundation
- `20260910224500_add_school_website_phase2` — `landingSections` + `SchoolSiteRevision`

Keduanya additive. Prisma production status setelah rollout Phase 2: **Database schema is up to date**. Jangan menjalankan migration tersebut ulang secara manual.

Backup penting:

- pra-CMS foundation: `/var/backups/saas-satu/saas_satu_staging-20260910T124315Z.sql.gz`
- pasca-foundation, sebelum starter content: `/var/backups/saas-satu/saas_satu_staging-20260910T132421Z-pre-website-seed.sql.gz`
- pra-Phase 2: `/var/backups/saas-satu/saas_satu_staging-20260910T154255Z-pre-website-phase2.sql.gz`

Backup Phase 2 diverifikasi `gzip -t` PASS dan tetap root-only. Nginx sebelum penambahan sitemap proxy juga dibackup ke `/etc/nginx/sites-available/sekolah.suhendararyadi.com.bak-20260910T222508Z-website-phase2`.

## 7. Quality gate CMS terakhir

Phase 2 final telah melewati:

- Prisma schema validate / generate: PASS
- TypeScript: PASS
- Vitest: **76/76 PASS** pada 6 test files (`NODE_ENV=test`)
- Wasp 0.25.0 production build: PASS dengan Node 24.14.1
- Vite SSR + client multi-environment build: PASS
- backend bundle: PASS
- full preflight: PASS, termasuk runtime packages + Prisma auth/CMS/revision delegates
- migration Phase 2: PASS
- full release cutover: PASS
- static metadata polish cutover: PASS dan second run `idempotent: true`
- sitemap public: HTTP 200, `application/xml`, invalid school 404
- unauthenticated Website Sekolah admin operation: HTTP 401
- Playwright desktop 1440×900 + iPhone 390×844: HTTP 200, overflow=false, DEMO=false, console errors=0, request failures=0
- landing metadata: route-specific title/canonical/Open Graph/Twitter + `EducationalOrganization` JSON-LD PASS
- news detail: `og:type=article` + `NewsArticle` JSON-LD PASS

NPM audit tetap melaporkan dependency debt existing (8 moderate, 5 high); rollout Phase 2 tidak diklaim audit-clean dan dependency upgrade besar harus dilakukan terpisah dengan regression testing.

## 8. Deployment contract & incident lesson

Bounded deployment tersedia melalui `.mso/functions.json` + `ops/deploy-school-os-release.mjs`:

- `school_os_deploy_preflight`
- `school_os_deploy_release`
- `school_os_deploy_static_preflight`
- `school_os_deploy_static`

Frontend-only change wajib memakai static-only path agar backend tidak ikut diganti/restart.

Full backend preflight sekarang memeriksa:

- generated server bundle;
- runtime packages utama termasuk `lucia`, `@lucia-auth/adapter-prisma`, dan `pg-boss`;
- Prisma Client delegates `user`, `auth`, dan `session`;
- release commit/static artifacts/current pointers/service state.

Historical incident: backend `d16662a-dashboard-sidebar-polish` memiliki Prisma runtime tanpa `auth` dan `session`, sehingga authenticated `/auth/me` menghasilkan 500 meskipun anonymous smoke 200. Release tersebut jangan dipromosikan sebagai backend. Hardened preflight terbaru telah diuji terhadap release itu dan menolaknya dengan `missing Prisma auth delegates: auth,session`.

Saat final CMS safety rollout, satu cutover `f382ad3` sempat gagal karena packaging runtime kehilangan `lucia`; rollback otomatis memulihkan backend/static lama. Release kemudian diperbaiki, diuji blue-green pada port 3102, dan cutover kedua berhasil. Runtime-package probe baru ditambahkan agar kelas kegagalan tersebut ditolak sebelum restart production.

## 9. Demo dataset School OS

Runner DEMO:

`app/scripts/school-os-demo-data.mjs`

Dokumentasi: [`DEMO_DATA.md`](./DEMO_DATA.md).

Seed QA SMKN 1 RONGGA masih ada dan ditandai `[DEMO]`, `DEMO-`, atau `@schoolos-demo.invalid`. Jangan menghapus dengan query ad-hoc. Cleanup nyata harus melalui runner dengan confirmation token setelah dry-run.

Login/password demo Guru, Siswa, dan Pembimbing DUDI **belum dibuat**. Jika dibutuhkan, buat melalui flow autentikasi resmi School OS, bukan insert hash/password langsung ke production DB.

## 10. Pekerjaan lanjutan Website Sekolah

Phase 2 sudah selesai/live untuk Landing Composer, revision/audit snapshot, social metadata, canonical, sitemap, `EducationalOrganization`/`NewsArticle` structured data, preview parity, serta public redesign. Pekerjaan lanjutan yang masih layak dipisahkan:

- konfigurasi object storage/CDN production agar direct image upload + image variants WebP/AVIF dapat diaktifkan dengan ownership verification;
- structured data `Event` untuk detail/agenda bila route detail agenda ditambahkan;
- custom domain verification;
- optional AUTHOR/EDITOR role untuk guru tertentu;
- analytics publik yang privacy-safe;
- cache/CDN tuning dan image transformation setelah storage tersedia.

Jangan menambah capability infra tersebut sebagai placeholder visual sebelum persistence/authorization/verification nyata tersedia.

## 11. Guardrails umum

- Tenant isolation dan authorization server-side tidak boleh diganti oleh UI visibility.
- Jangan membuat fake metrics/data contoh yang terlihat sebagai data nyata sekolah.
- Website publik tidak boleh mengekspos data internal secara otomatis.
- Auth/visual boleh terinspirasi platform, tetapi jangan menyalin SF Symbols, font, wallpaper, atau aset proprietary Apple.
- Theme key aktif adalah `theme`; jangan memperkenalkan kembali `color-theme` tanpa migrasi eksplisit.
- Backup DB wajib sebelum schema/data mutation production yang material.
- Pertahankan immutable release sebelumnya sebagai rollback target.
- Untuk perubahan frontend-only, gunakan static-only deploy.
- Jalankan TypeScript/tests/Wasp/Vite/smoke sesuai dampak sebelum promotion.

## 12. Dokumen utama

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — snapshot ini
- [`UI_UX_APPLE_HIG.md`](./UI_UX_APPLE_HIG.md) — visual contract
- [`WEBSITE_SEKOLAH_CMS_PLAN.md`](./WEBSITE_SEKOLAH_CMS_PLAN.md) — architecture/product contract + implementation status
- [`RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md`](./RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md) — release record CMS foundation
- [`RELEASE_2026-09-11_WEBSITE_SEKOLAH_PHASE2.md`](./RELEASE_2026-09-11_WEBSITE_SEKOLAH_PHASE2.md) — release record Phase 2 + public redesign
- [`RELEASE_2026-09-11_SCHOOL_SPOTLIGHT.md`](./RELEASE_2026-09-11_SCHOOL_SPOTLIGHT.md) — release record global Spotlight Search `Cmd/Ctrl+K`
- [`RELEASE_2026-09-13_DAPODIK_STUDENT_DATABASE.md`](./RELEASE_2026-09-13_DAPODIK_STUDENT_DATABASE.md) — release record database siswa Dapodik + detail per siswa
- [`RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md`](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md) — baseline production SMKN 12 Garut setelah import Dapodik nyata
- [`RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md`](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md) — import profil/PTK/program/Sarpras SMKN 12 Garut
- [`DEMO_DATA.md`](./DEMO_DATA.md) — demo seed safety
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — historical development chronology
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture/security boundaries
- [`ANTI_SLOP_GUIDELINES.md`](./ANTI_SLOP_GUIDELINES.md) — UI/copy quality guardrails
