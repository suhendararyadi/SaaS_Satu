# School OS — Persistent Project Context

Last updated: **11 September 2026 (Asia/Jakarta)**.

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

Production sudah memakai unified Spotlight release:

- **backend current**: `/home/ubuntu/deployments/SaaS_Satu/releases/4e50fd5-school-spotlight`
- **static current**: `/var/www/saas-satu/releases/4e50fd5-school-spotlight`
- runtime source commit: `4e50fd56e44acc95077a7695990efb34ec6299b7`
- previous backend rollback: `/home/ubuntu/deployments/SaaS_Satu/releases/5b16861-website-phase2`
- previous static rollback: `/var/www/saas-satu/releases/f142e94-website-phase2-meta`
- `saas-satu.service`: active
- `/school`: HTTP 200
- `/school/website`: HTTP 200
- `/login`: HTTP 200
- `/admin`: HTTP 200 shell route
- `/auth/me`: HTTP 200 anonymous smoke
- unauthenticated Spotlight operation: HTTP 401
- recent `/auth/me` / Spotlight operation 500 count pada verification window: 0

Spotlight full-stack cutover memakai bounded release promotion setelah full preflight dan blue-green startup pada port 3102. Tidak ada schema migration atau seed pada rollout Spotlight.

## 3.1 School OS Spotlight Search — LIVE

Entry point:

- keyboard: `Cmd+K` pada macOS, `Ctrl+K` pada Windows/Linux;
- top bar: tombol `Cari` dengan search glyph; mobile tetap icon-first;
- modal menggunakan command-palette material yang ringan, keyboard-first, dan responsive.

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
- [`DEMO_DATA.md`](./DEMO_DATA.md) — demo seed safety
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — historical development chronology
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture/security boundaries
- [`ANTI_SLOP_GUIDELINES.md`](./ANTI_SLOP_GUIDELINES.md) — UI/copy quality guardrails
