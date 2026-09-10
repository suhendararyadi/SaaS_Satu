# School OS — Persistent Project Context

Last updated: **10 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah snapshot lintas-sesi untuk melanjutkan pengembangan School OS. Jika isi dokumen bertentangan dengan runtime aktual, verifikasi runtime/repository terlebih dahulu lalu perbarui snapshot ini.

## 1. Source tree aktif

- Repository baseline: `/home/ubuntu/projects/SaaS_Satu`
- Worktree aktif School OS: `/home/ubuntu/projects/SaaS_Satu-hardening`
- Branch: `redesign/apple-hig`
- Source CMS foundation: `5869a68` — `feat(website): add tenant-isolated school CMS`
- Public-data safety + starter seed: `f382ad3` — `refine(website): protect public data and add starter seed`
- Editorial review UI + deploy hardening: `9735dd2` — `refine(website): complete review flow and deploy checks`
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

Production sengaja memakai split release karena refinement terakhir hanya frontend:

- **backend current**: `/home/ubuntu/deployments/SaaS_Satu/releases/f382ad3-school-website-cms-safe`
- **static current**: `/var/www/saas-satu/releases/9735dd2-website-review-flow`
- backend source commit: `f382ad389f71da4251d47e38456533ee6440c267`
- static source commit: `9735dd2f4a720a2374cdd8b5ee53f56b602bc6f4`
- `saas-satu.service`: active
- `/school`: HTTP 200
- `/school/website`: HTTP 200
- `/login`: HTTP 200
- `/admin`: HTTP 200 shell route
- `/auth/me`: HTTP 200 anonymous smoke
- unauthenticated admin dashboard operation: HTTP 401
- unauthenticated Website Sekolah admin operation: HTTP 401
- recent CMS/auth 500 count pada final verification window: 0

Static deployment `9735dd2-website-review-flow` dipanggil ulang dan menghasilkan `idempotent: true`; backend tetap tidak berubah/restart pada rollout tersebut.

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
- Identitas & SEO

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

Model CMS production menggunakan tenant key `schoolId` dan meliputi `SchoolSite`, `SchoolSiteContent`, `SchoolSiteNavItem`, dan `SchoolSiteMedia`.

Guardrails yang sudah diterapkan dan diverifikasi:

- admin mutation/query memakai tenant context server-side;
- draft dan future-scheduled content tidak dikembalikan public query;
- test production menunjukkan draft/future-scheduled QA menghasilkan HTTP 404 public;
- arbitrary HTML/JavaScript tidak disimpan; body diubah menjadi allowlisted structured content blocks;
- external navigation link wajib HTTPS;
- public site tidak otomatis mengambil siswa, NIS/NISN, nilai, presensi, EWS, jurnal PKL, atau data internal lain;
- department/program dengan marker QA `[DEMO]` atau code `DEMO-` difilter dari public site dan preview;
- final public response untuk SMKN 1 RONGGA hanya menampilkan program nyata `RPL`, bukan jurusan seed QA;
- media admin saat ini berupa explicit public HTTPS image entry dengan alt text wajib; tidak ada file tenant internal yang otomatis dipublikasikan.

Public browser verification setelah rollout:

- desktop 1440×900: HTTP 200, horizontal overflow = no, DEMO marker = no, console errors = 0, request failures = 0;
- viewport iPhone 390×844: HTTP 200, horizontal overflow = no, DEMO marker = no, console errors = 0, request failures = 0;
- landing, Profil, daftar/detail Berita, Agenda, dan Pengumuman telah diuji responsive sebelumnya dan semuanya HTTP 200.

## 6. Database migration & backups CMS

Migration CMS production:

`20260910194000_add_school_website_cms`

Migration bersifat additive dan sudah applied. Prisma production status setelah deploy: **Database schema is up to date**.

Jangan menjalankan migration ini ulang secara manual.

Backup penting:

- pra-migration: `/var/backups/saas-satu/saas_satu_staging-20260910T124315Z.sql.gz`
- pasca-migration, sebelum starter content: `/var/backups/saas-satu/saas_satu_staging-20260910T132421Z-pre-website-seed.sql.gz`

Keduanya diverifikasi gzip PASS dan mode `600` root-only.

## 7. Quality gate CMS terakhir

CMS foundation/refinement telah melewati:

- Prisma schema validate: PASS
- Prisma Client generate: PASS
- TypeScript: PASS
- Vitest: **75/75 PASS** pada 6 test files
- Wasp 0.25.0 production build: PASS
- Vite SSR build: PASS
- Vite client build: PASS
- backend bundle: PASS
- Prisma auth delegates (`user`, `auth`, `session`): PASS pada backend production sehat
- live static marker `Kirim review`: PASS
- public browser responsive smoke: PASS

NPM audit tetap melaporkan dependency debt existing; rollout CMS tidak diklaim audit-clean dan dependency upgrade besar harus dilakukan sebagai pekerjaan terpisah dengan regression testing.

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

Phase CMS yang aktif sudah mencakup foundation + sebagian besar editorial operations. Pekerjaan lanjutan yang masih layak dipisahkan:

- revision/audit history yang lebih lengkap per content;
- object-storage upload + image variants WebP/AVIF dan ownership verification yang terintegrasi;
- sitemap.xml + structured data `EducationalOrganization`, `NewsArticle`, `Event`;
- canonical/OG metadata yang lebih lengkap;
- custom domain verification;
- optional AUTHOR/EDITOR workflow untuk guru tertentu;
- analytics publik yang privacy-safe;
- cache/CDN tuning.

Jangan menambah fitur tersebut sebagai placeholder visual sebelum persistence/authorization/verification nyata tersedia.

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
- [`RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md`](./RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md) — release record CMS production
- [`DEMO_DATA.md`](./DEMO_DATA.md) — demo seed safety
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — historical development chronology
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture/security boundaries
- [`ANTI_SLOP_GUIDELINES.md`](./ANTI_SLOP_GUIDELINES.md) — UI/copy quality guardrails
