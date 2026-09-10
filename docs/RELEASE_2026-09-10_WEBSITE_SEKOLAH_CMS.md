# Release — Website Sekolah CMS

Date: **10 September 2026 (Asia/Jakarta)**

## Summary

Website Sekolah CMS selesai dipromosikan ke production sebagai modul multi-tenant untuk publikasi website resmi sekolah dari School OS.

Admin entry point:

- `PUBLIKASI → Website Sekolah`
- `/school/website`
- `/school/website/preview`

Public site SMKN 1 RONGGA:

`https://sekolah.suhendararyadi.com/site/smkn-1-rongga`

## Source commits

- `5869a68` — `feat(website): add tenant-isolated school CMS`
- `f382ad3` — `refine(website): protect public data and add starter seed`
- `9735dd2` — `refine(website): complete review flow and deploy checks`

## Production releases

Final production split:

- backend: `f382ad3-school-website-cms-safe`
- static: `9735dd2-website-review-flow`

Backend commit:

`f382ad389f71da4251d47e38456533ee6440c267`

Static commit:

`9735dd2f4a720a2374cdd8b5ee53f56b602bc6f4`

Static split dilakukan sengaja karena commit `9735dd2` hanya menambah UI editorial review dan hardening operator deployment script; backend business operation CMS tetap berasal dari release `f382ad3` yang sudah sehat.

## Schema & migration

Migration production:

`20260910194000_add_school_website_cms`

Migration additive menambahkan persistence untuk:

- `SchoolSite`
- `SchoolSiteContent`
- `SchoolSiteNavItem`
- `SchoolSiteMedia`
- CMS enums/indexes/foreign keys yang diperlukan.

Migration applied sukses dan Prisma melaporkan database schema up to date.

## Database backups

Pra-migration:

`/var/backups/saas-satu/saas_satu_staging-20260910T124315Z.sql.gz`

Pasca-migration, sebelum starter content:

`/var/backups/saas-satu/saas_satu_staging-20260910T132421Z-pre-website-seed.sql.gz`

Kedua backup diverifikasi gzip PASS dan permission mode `600` root-only.

## Admin CMS capabilities

Workspace Website Sekolah menyediakan:

- Ringkasan
- Halaman
- Berita
- Agenda
- Pengumuman
- Galeri & Media
- Navigasi
- Identitas & SEO
- Preview
- Publish / unpublish website
- Schedule content
- Archive content
- Editorial status `DRAFT`, `IN_REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- action `Kirim review` untuk Draft.

Save editor tidak otomatis publish.

## Public routes

- `/site/:schoolSlug`
- `/site/:schoolSlug/:pageSlug`
- `/site/:schoolSlug/berita`
- `/site/:schoolSlug/berita/:postSlug`
- `/site/:schoolSlug/agenda`
- `/site/:schoolSlug/pengumuman`

## Starter content

Operator runner:

`app/scripts/school-website-starter-data.mjs`

Starter production SMKN 1 RONGGA membuat data minimum yang faktual:

- Site title: `SMKN 1 RONGGA`
- Halaman `Profil Sekolah`
- Berita `Website Sekolah Mulai Tersedia`
- Header nav Profil / Berita / Agenda / Pengumuman
- Site status `PUBLISHED`
- `robotsIndex=false`

Runner tidak membuat agenda, pengumuman, prestasi, alamat/kontak, atau informasi lain yang belum diketahui.

Run kedua menghasilkan `created=false` pada seluruh starter resources dan `navItems=0`, sehingga idempotency terverifikasi.

## Security & privacy controls

- seluruh admin CMS query/mutation tenant-scoped melalui `schoolId` dan existing school-admin guard;
- admin operation tanpa login menghasilkan HTTP 401;
- public query hanya mengembalikan site `PUBLISHED` dan content public;
- Draft menghasilkan public HTTP 404;
- future-scheduled content menghasilkan public HTTP 404;
- arbitrary HTML/JavaScript tidak disimpan; body menggunakan validated structured blocks;
- external navigation hanya menerima HTTPS;
- public site tidak otomatis mengekspos siswa, NIS/NISN, nilai, presensi, EWS, jurnal PKL, atau data internal lainnya;
- department/program seed QA dengan marker `[DEMO]` atau `DEMO-` difilter dari public payload dan preview;
- production public response SMKN 1 RONGGA terverifikasi hanya membawa program nyata `RPL`.

## Public verification

Public API verification:

- site status: `PUBLISHED`
- robots: `noindex,nofollow`
- Profil: PUBLISHED
- starter News: PUBLISHED
- nav resolution: PASS
- DEMO marker: NONE

Browser Playwright verification:

Desktop `1440×900`:

- landing HTTP 200
- horizontal overflow: no
- DEMO marker: no
- console errors: 0
- request failures: 0

Viewport iPhone `390×844`:

- landing HTTP 200
- horizontal overflow: no
- DEMO marker: no
- console errors: 0
- request failures: 0

Landing, Profil, Berita index/detail, Agenda, dan Pengumuman juga telah melewati responsive route smoke.

## Quality gates

- Prisma schema validate: PASS
- Prisma Client generate: PASS
- TypeScript: PASS
- Vitest: **75/75 PASS** pada 6 files
- Wasp 0.25.0 build: PASS
- Vite SSR build: PASS
- Vite client build: PASS
- backend bundle: PASS
- live static `Kirim review` marker: PASS
- `/school`: HTTP 200
- `/school/website`: HTTP 200
- `/site/smkn-1-rongga`: HTTP 200
- `/login`: HTTP 200
- `/admin`: HTTP 200 shell route
- `/auth/me`: HTTP 200 anonymous smoke
- recent CMS/auth 500 during final verification: 0
- static deployment second run: `idempotent: true`

Dependency audit debt yang sudah ada tetap dicatat; release ini tidak diklaim `npm audit` clean.

## Deployment incident & hardening

Satu percobaan final backend cutover sempat gagal start karena staged runtime dependency tree kehilangan package `lucia`. Bounded deployment function melakukan rollback otomatis:

- static restored;
- backend restored;
- backend lama kembali healthy.

Setelah runtime tree diperbaiki, backend final diuji blue-green pada port 3102 lalu cutover kedua berhasil.

`ops/deploy-school-os-release.mjs` kemudian diperketat. Full preflight sekarang memeriksa runtime packages:

- `lucia`
- `@lucia-auth/adapter-prisma`
- `pg-boss`

serta Prisma auth delegates:

- `user`
- `auth`
- `session`

Historical bad release `d16662a-dashboard-sidebar-polish` diuji terhadap hardened preflight dan ditolak dengan `missing Prisma auth delegates: auth,session`.

Frontend-only refinement wajib menggunakan static-only deployment sehingga backend sehat tidak ikut dipromosikan/restart.

## Rollback

Backend rollback reference tetap tersedia pada CMS release sebelumnya:

`5869a68-school-website-cms`

Static rollback sebelum review-flow:

`f382ad3-school-website-cms-safe`

Backup database tersedia seperti tercantum di atas. Migration CMS bersifat additive sehingga backend CMS previous release tetap kompatibel dengan tabel yang sudah ada.

## Remaining roadmap

Pekerjaan lanjutan dipisahkan dari release ini:

- revision/audit history CMS;
- object-storage upload + ownership check + WebP/AVIF variants;
- canonical/OG metadata, sitemap.xml, structured data;
- custom domain verification;
- granular AUTHOR/EDITOR permission;
- public analytics yang privacy-safe;
- CDN/cache tuning.

Tidak boleh dibuat sebagai placeholder UI sebelum backend/persistence/authorization nyata tersedia.
