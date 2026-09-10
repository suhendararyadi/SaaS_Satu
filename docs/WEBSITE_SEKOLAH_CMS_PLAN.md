# Website Sekolah CMS — Product, Architecture & Implementation Status

Last updated: **10 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah contract produk/arsitektur modul **Website Sekolah** di School OS. Status penting: **CMS foundation sudah aktif di production**. Bagian yang belum tersedia harus diperlakukan sebagai roadmap, bukan placeholder UI.

## 1. Tujuan produk

Website Sekolah adalah CMS multi-tenant agar setiap sekolah dapat mengelola situs publik dari School OS tanpa mengedit source code.

Prinsip utama:

- satu sekolah = satu website publik tenant-scoped;
- public data hanya yang eksplisit aman;
- tidak ada arbitrary HTML/JavaScript editor;
- draft, review, schedule, publish, archive adalah state eksplisit;
- public site ringan, responsive, accessible, SEO-ready;
- admin memakai satu entry point besar **Website Sekolah**, bukan banyak menu sidebar;
- admin CMS tetap mengikuti Apple HIG-inspired School OS, sedangkan public site memakai preset sekolah yang terkontrol.

## 2. Status production saat ini

**LIVE** pada 10 September 2026.

Admin:

- sidebar: `PUBLIKASI → Website Sekolah`
- `/school/website`
- preview authenticated: `/school/website/preview`

Public:

- `/site/:schoolSlug`
- `/site/:schoolSlug/:pageSlug`
- `/site/:schoolSlug/berita`
- `/site/:schoolSlug/berita/:postSlug`
- `/site/:schoolSlug/agenda`
- `/site/:schoolSlug/pengumuman`

SMKN 1 RONGGA:

`https://sekolah.suhendararyadi.com/site/smkn-1-rongga`

Production starter content:

- `Profil Sekolah` — PUBLISHED
- `Website Sekolah Mulai Tersedia` — PUBLISHED
- Header nav: Profil, Berita, Agenda, Pengumuman
- Website status: PUBLISHED
- `robotsIndex=false` / `noindex,nofollow` selama tahap verifikasi konten awal.

## 3. Information architecture admin

Workspace menggunakan secondary navigation:

1. **Ringkasan**
2. **Halaman**
3. **Berita**
4. **Agenda & Pengumuman**
5. **Galeri & Media**
6. **Navigasi**
7. **Identitas & SEO**

Ringkasan menampilkan status website, URL publik, jumlah konten terbit, draft/review, scheduled, kesiapan SEO, serta shortcut pembuatan konten/preview.

Halaman menangani konten statis seperti Profil, Visi & Misi, Sejarah, Fasilitas, Program Keahlian, TEFA, Hubin, Ekstrakurikuler, Kontak, dan halaman custom.

Berita menangani judul, slug, excerpt, structured body blocks, cover HTTPS, kategori, status editorial, jadwal publikasi, dan SEO metadata.

Agenda menangani waktu mulai/selesai, lokasi, ringkasan, body, dan status editorial. Pengumuman memiliki prioritas serta masa tayang.

Galeri & Media saat ini menggunakan explicit public HTTPS image entry dengan alt text wajib. Tidak ada blob DB atau implicit publishing file tenant.

Navigasi hanya dapat menuju halaman tenant yang sama, route publik resmi (`berita`, `agenda`, `pengumuman`), atau HTTPS external link.

Identitas & SEO mengelola site title, tagline, hero, email/telepon publik, default SEO title/description, theme preset, dan robots indexing toggle.

## 4. Editorial workflow

Status aktif:

- `DRAFT`
- `IN_REVIEW`
- `SCHEDULED`
- `PUBLISHED`
- `ARCHIVED`

Workflow UI:

`Draft → Kirim review → Terbitkan / Jadwalkan → Arsipkan`

Aturan:

- Save editor tidak otomatis publish.
- Action `Kirim review` hanya tampil untuk Draft.
- Scheduled content baru dianggap public ketika `scheduledAt <= now`.
- Future-scheduled content tetap private.
- `publishedAt` dipertahankan sebagai histori publikasi.
- Konten yang pernah/masih public tidak boleh di-hard-delete melalui flow normal; gunakan archive.

## 5. Data model production

Migration:

`20260910194000_add_school_website_cms`

Model utama:

### `SchoolSite`

Satu record per sekolah, membawa `schoolId`, publication status, identity/hero/SEO fields, preset tema, robotsIndex, dan timestamps.

### `SchoolSiteContent`

Satu content model dengan discriminator type:

- `PAGE`
- `NEWS`
- `EVENT`
- `ANNOUNCEMENT`

Membawa tenant `schoolId`, title, slug, excerpt, validated `contentBlocks`, optional cover/category/event fields, priority, status, scheduled/published timestamps, SEO fields, dan author/update references.

Slug unik bersifat tenant + content-type scoped.

### `SchoolSiteNavItem`

Membawa `schoolId`, location (`HEADER`/`FOOTER`), label, type (`PAGE`/`ROUTE`/`EXTERNAL`), destination, order, visibility.

### `SchoolSiteMedia`

Membawa tenant ownership metadata untuk explicit public HTTPS image: URL, alt text, caption, dimensions, creator, timestamps.

Revision/audit snapshot yang lebih lengkap belum menjadi model tersendiri dan tetap roadmap.

## 6. Content block contract

Body tidak menyimpan arbitrary HTML/script. Input teks diubah server-side menjadi allowlisted block JSON.

Block aktif minimum mencakup paragraph, heading, quote, dan callout. Renderer tidak menjalankan custom script, iframe bebas, inline JS, atau custom CSS dari editor.

Future enhancement dapat menambah image/gallery/CTA/video provider allowlist setelah schema + validator + renderer diuji.

## 7. Authorization & tenant isolation

MVP admin CMS memakai existing `requireSchoolAdmin` dan `schoolId` current user.

- Admin Sekolah dapat mengelola website tenant sendiri.
- Platform Super Admin tidak mendapat bypass tenant generik dari CMS.
- Guru tidak otomatis mendapat publish right.
- Siswa dan Pembimbing DUDI tidak mendapat admin CMS.
- UI visibility bukan security boundary; seluruh mutation/query private tetap server-enforced.

Public query tidak memerlukan login, tetapi hanya mengembalikan site `PUBLISHED` dan content yang benar-benar public.

## 8. Public data boundary

Public website **tidak boleh otomatis mengekspos**:

- siswa / NIS / NISN;
- presensi;
- nilai;
- EWS;
- jurnal PKL;
- email/telepon personal guru/siswa;
- data Dapodik internal;
- attention/decision dashboard.

Safe existing school data dapat digunakan hanya bila memang publik: nama sekolah, logo, alamat sekolah, kontak publik, nama program keahlian.

Record QA dengan marker `[DEMO]` atau code `DEMO-` difilter dari public site dan preview. Verification production membuktikan public SMKN 1 RONGGA hanya mengembalikan program nyata `RPL` dan tidak mengandung marker DEMO.

## 9. Public rendering & theme

Preset aktif:

- `Clean School`
- `Editorial`
- `Campus`

Public site tidak harus terlihat seperti macOS. Prioritasnya adalah identitas sekolah, readability, performance, responsiveness, dan accessibility.

Empty section tidak dirender sebagai placeholder produksi. Berita/agenda/pengumuman yang kosong menggunakan honest empty state pada index page.

## 10. SEO, performance, accessibility

Sudah tersedia:

- per-page title/meta dasar;
- robots `index,follow` / `noindex,nofollow` berdasarkan site setting;
- lazy-loaded gallery images;
- alt text wajib untuk media entry;
- responsive header/mobile menu;
- public route tidak membutuhkan admin CMS bundle;
- desktop/iPhone browser smoke tanpa horizontal overflow dan tanpa console/request error.

Belum selesai dan menjadi roadmap:

- canonical URL;
- Open Graph/Twitter metadata lengkap;
- sitemap.xml;
- structured data `EducationalOrganization`, `NewsArticle`, `Event`;
- image variants WebP/AVIF;
- CDN/cache tuning.

## 11. Publication safety

Preview draft hanya tersedia di authenticated School OS route dan tidak menjadi public content endpoint.

Public content gate:

- site harus `PUBLISHED`;
- content harus `PUBLISHED`, atau `SCHEDULED` dengan jadwal yang sudah tiba;
- pengumuman harus berada di display window aktif;
- tenant slug/content lookup harus cocok;
- DEMO program data disaring dari payload public.

Production boundary test telah membuat draft/future-scheduled QA sementara dan public API mengembalikan HTTP 404 untuk keduanya, lalu record QA dibersihkan.

## 12. Starter data contract

Runner:

`app/scripts/school-website-starter-data.mjs`

Starter hanya membuat data publik yang aman dan faktual jika belum ada:

- site identity dasar;
- satu Profil Sekolah;
- satu berita bahwa kanal Website Sekolah mulai tersedia;
- empat navigation item utama.

Tidak membuat agenda, prestasi, pengumuman, kontak, atau informasi lain yang tidak diketahui.

Run kedua telah diverifikasi idempotent: tidak membuat record baru dan tidak menimpa konten existing.

## 13. Delivery status

### Phase 1 — CMS foundation: **SELESAI / LIVE**

Mencakup schema + migration, tenant authorization, CMS hub, identity/settings, Halaman, Berita, draft/preview/publish, public landing/page/news routes, backup + production rollout.

### Phase 2 — editorial operations: **SEBAGIAN BESAR SELESAI / LIVE**

Sudah tersedia Agenda, Pengumuman, media metadata library, navigation editor, scheduled publication, review status/action.

Belum tersedia revision history khusus CMS dan object-storage image pipeline yang terintegrasi.

### Phase 3 — advanced publishing: **ROADMAP**

- object storage upload + ownership verification + variants;
- revision/audit history;
- sitemap/structured data/canonical/OG;
- custom domain verification;
- AUTHOR/EDITOR role granular;
- analytics publik privacy-safe;
- reusable section presets;
- cache/CDN tuning.

## 14. Acceptance verification production

Verified pada 10 September 2026:

- `/school/website` route tersedia;
- Halaman/Berita persistence aktif;
- draft dan future scheduled tidak public;
- published content tersedia di public URL;
- tenant key eksplisit pada CMS model;
- public payload tidak memuat internal student/attendance/EWS/PKL data;
- DEMO department filter aktif;
- no arbitrary HTML/script storage;
- migration additive applied dan status schema up-to-date;
- backup pra-migration tersedia;
- backup pasca-migration/pra-starter tersedia;
- TypeScript PASS;
- Vitest **75/75 PASS**;
- Wasp build PASS;
- Vite SSR/client PASS;
- browser desktop/iPhone PASS tanpa overflow/error;
- admin CMS operation tanpa login HTTP 401;
- deployment static review-flow idempotent PASS.

## 15. Deployment safety

Frontend-only CMS polish gunakan `school_os_deploy_static_preflight` → `school_os_deploy_static`.

Full-stack/backend change gunakan `school_os_deploy_preflight` → `school_os_deploy_release`.

Full preflight kini memvalidasi runtime dependency utama (`lucia`, adapter Prisma, `pg-boss`) serta Prisma delegates `user/auth/session` sebelum restart production. Ini adalah hardening setelah satu staged CMS release sempat gagal start karena runtime package `lucia` tidak tersedia; rollback otomatis bekerja dan production dipulihkan sebelum retry sukses.

Lihat release record lengkap: [`RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md`](./RELEASE_2026-09-10_WEBSITE_SEKOLAH_CMS.md).
