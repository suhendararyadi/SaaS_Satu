# Website Sekolah CMS — Product & Architecture Plan

Last updated: **10 September 2026 (Asia/Jakarta)**.

Dokumen ini adalah rancangan production-ready untuk modul besar **Website Sekolah** di School OS. Modul ini belum dianggap aktif hanya karena dokumen ini ada. Implementasi harus dilakukan bertahap, dengan schema migration, authorization, public rendering, dan deployment yang diverifikasi sebelum menu publikasi dinyatakan siap digunakan.

## 1. Tujuan produk

Website Sekolah harus menjadi CMS multi-tenant yang memungkinkan setiap sekolah mengelola situs publiknya dari School OS tanpa perlu mengedit source code. Modul harus cukup sederhana untuk operator sekolah, tetapi memiliki workflow editorial, SEO, media, aksesibilitas, dan keamanan yang layak untuk production.

Prinsip utama:

- satu sekolah = satu website publik yang terisolasi tenant;
- konten publik tidak boleh mengambil data sensitif siswa/guru secara otomatis;
- editor tidak menulis HTML/JavaScript bebas;
- draft, preview, publish, schedule, archive adalah state yang eksplisit;
- halaman publik ringan, mobile-first, SEO-friendly, dan accessible;
- admin School OS tidak dibanjiri banyak menu CMS; gunakan satu entry point besar **Website Sekolah**;
- desain admin tetap Apple HIG-inspired School OS, sedangkan desain situs publik menggunakan theme/preset sekolah yang aman dan konsisten.

## 2. Information architecture admin

Sidebar School OS menambah satu section:

**PUBLIKASI**

- **Website Sekolah** → `/school/website`

Jangan membuat tujuh item CMS langsung di sidebar utama. Setelah masuk ke Website Sekolah, gunakan secondary navigation/segmented tabs di dalam modul:

1. **Ringkasan**
2. **Halaman**
3. **Berita**
4. **Agenda & Pengumuman**
5. **Galeri & Media**
6. **Navigasi**
7. **Identitas & SEO**
8. **Pengaturan Publikasi**

### Ringkasan

Menampilkan status website, URL publik, terakhir dipublikasikan, jumlah draft, konten terjadwal, konten yang perlu review, shortcut `Buat berita`, `Buat halaman`, `Pratinjau`, dan `Buka website`.

Tidak boleh menampilkan angka palsu. Jika modul belum diinisialisasi, gunakan setup state yang eksplisit.

### Halaman

Untuk konten statis seperti:

- Profil Sekolah;
- Visi & Misi;
- Sejarah;
- Program Keahlian/Jurusan;
- Fasilitas;
- Teaching Factory;
- Hubungan Industri;
- Ekstrakurikuler;
- Kontak;
- halaman khusus lain yang dibuat sekolah.

### Berita

Konten dinamis dengan cover image, kategori, author, excerpt, body blocks, status editorial, tanggal publikasi, scheduled publication, dan SEO metadata.

### Agenda & Pengumuman

Agenda memiliki waktu mulai/selesai, lokasi, deskripsi, dan optional cover. Pengumuman memiliki masa tayang mulai/berakhir dan prioritas. Pengumuman yang kedaluwarsa tidak perlu dihapus; cukup tidak lagi ditampilkan publik.

### Galeri & Media

Satu library media sekolah untuk gambar yang dipakai halaman, berita, hero, agenda, dan galeri. Setiap gambar wajib mendukung alt text; caption opsional. Upload harus memakai jalur object storage/file upload resmi yang sudah ada, bukan menyimpan blob di database.

### Navigasi

Admin menyusun menu header/footer dari halaman internal, berita/agenda index, atau external link. Batasi kedalaman menu agar navigasi publik tetap sederhana.

### Identitas & SEO

Mengelola:

- site title;
- tagline;
- logo/favicon;
- hero headline/subheadline;
- alamat/kontak publik;
- social links;
- default SEO title/description;
- Open Graph image;
- indexing toggle untuk fase staging.

### Pengaturan Publikasi

Mengelola status website (`DRAFT` / `PUBLISHED`), preview, domain/path publik, theme preset, publication policy, dan optional custom domain pada fase lanjutan.

## 3. Rancangan public site

### URL fase awal

Gunakan namespace yang tidak berbenturan dengan School OS:

- `/site/:schoolSlug`
- `/site/:schoolSlug/berita`
- `/site/:schoolSlug/berita/:postSlug`
- `/site/:schoolSlug/agenda`
- `/site/:schoolSlug/pengumuman`
- `/site/:schoolSlug/:pageSlug`

Contoh:

`https://sekolah.suhendararyadi.com/site/smkn-1-rongga`

Custom domain seperti `www.smkn1rongga.sch.id` dapat ditambahkan kemudian melalui mapping domain yang tervalidasi. Jangan menjadikan custom domain sebagai dependency MVP.

### Struktur landing page default

Landing page menggunakan block/preset yang dapat diaktifkan/nonaktifkan:

1. Header + navigasi
2. Hero sekolah
3. Pengumuman penting
4. Sambutan / profil singkat
5. Program keahlian / jurusan
6. Berita terbaru
7. Agenda terdekat
8. Prestasi / highlight
9. Galeri
10. CTA PPDB / kontak sesuai kebutuhan sekolah
11. Footer dengan alamat, kontak, social link, dan navigasi sekunder

Tidak semua section harus muncul jika datanya kosong. Empty section harus dihilangkan dari public site, bukan menampilkan placeholder produksi.

## 4. Editorial workflow

Gunakan state yang jelas untuk konten:

- `DRAFT`
- `IN_REVIEW`
- `SCHEDULED`
- `PUBLISHED`
- `ARCHIVED`

Workflow minimum:

`Draft → Preview → Publish`

Workflow lanjutan:

`Draft → Review → Scheduled/Published → Archive`

Best practice:

- `publishedAt` hanya terisi ketika benar-benar publik;
- scheduled content memiliki `scheduledAt` dan worker/job yang fail-safe;
- publish action harus idempotent;
- konten yang diedit setelah publish tidak langsung mengganti publik jika sekolah memilih workflow review;
- simpan revision/audit trail minimal untuk mengetahui siapa yang mengubah/publish.

## 5. Data model yang direkomendasikan

Gunakan relasi tenant eksplisit `schoolId` pada semua record CMS dan composite uniqueness untuk slug.

### `SchoolSite`

Satu record per sekolah:

- `id`
- `schoolId` unique
- `status`
- `siteTitle`
- `tagline`
- `heroTitle`
- `heroSubtitle`
- `heroMediaId?`
- `defaultSeoTitle?`
- `defaultSeoDescription?`
- `ogMediaId?`
- `themePreset`
- `robotsIndex` boolean
- `publishedAt?`
- `createdAt`, `updatedAt`

### `SchoolSitePage`

- `id`
- `schoolId`
- `title`
- `slug`
- `excerpt?`
- `contentBlocks Json`
- `status`
- `showInNavigation`
- `navigationLabel?`
- `navigationOrder?`
- `seoTitle?`
- `seoDescription?`
- `publishedAt?`
- `scheduledAt?`
- `createdById`
- `updatedById`
- timestamps
- `@@unique([schoolId, slug])`

### `SchoolNewsPost`

- `id`
- `schoolId`
- `title`
- `slug`
- `excerpt`
- `contentBlocks Json`
- `coverMediaId?`
- `category?`
- `status`
- `authorId`
- `publishedAt?`
- `scheduledAt?`
- SEO fields
- timestamps
- `@@unique([schoolId, slug])`

### `SchoolEvent`

- `id`
- `schoolId`
- `title`
- `slug`
- `summary?`
- `contentBlocks Json`
- `startsAt`
- `endsAt?`
- `location?`
- `coverMediaId?`
- `status`
- `publishedAt?`
- timestamps
- `@@unique([schoolId, slug])`

### `SchoolAnnouncement`

- `id`
- `schoolId`
- `title`
- `contentBlocks Json`
- `priority`
- `startsAt?`
- `endsAt?`
- `status`
- timestamps

### `SchoolSiteMedia`

Jangan mengubah file upload menjadi storage CMS khusus. Bungkus file yang sudah diupload dengan metadata tenant:

- `id`
- `schoolId`
- `fileId` unique
- `altText`
- `caption?`
- `width?`, `height?`
- `createdById`
- timestamps

Sebelum file ditautkan, server wajib memverifikasi pemilik file berada pada `schoolId` yang sama. Jika pipeline image variants ditambahkan, hasil turunan dapat disimpan sebagai metadata/keys terpisah.

### `SchoolSiteNavItem`

- `id`
- `schoolId`
- `location` (`HEADER` / `FOOTER`)
- `label`
- `type` (`PAGE` / `ROUTE` / `EXTERNAL`)
- `pageId?`
- `href?`
- `order`
- `isVisible`

Batasi satu level dropdown pada MVP; jangan membangun recursive menu tree tanpa kebutuhan nyata.

### `SchoolSiteRevision` (fase 2)

Untuk audit/recovery konten:

- `id`
- `schoolId`
- `resourceType`
- `resourceId`
- `snapshot Json`
- `createdById`
- `createdAt`

## 6. Content block contract

Jangan menyimpan arbitrary HTML/script. `contentBlocks` adalah JSON yang divalidasi Zod/server dengan allowlist block:

- `richText`
- `heading`
- `image`
- `gallery`
- `quote`
- `callout`
- `button/cta`
- `divider`
- `videoEmbed` hanya dari provider allowlist
- `stats` untuk data editorial, bukan data siswa internal

Rich text disanitasi dan tidak boleh menyimpan `<script>`, inline JS, arbitrary iframe, atau custom CSS.

## 7. Authorization

### Admin Sekolah

MVP: memiliki permission create/edit/publish/archive website sekolahnya sendiri.

### Super Admin platform

Boleh mengakses tenant hanya melalui konteks sekolah aktif dan existing platform authorization. Jangan membuat bypass tenant untuk CMS.

### Guru

Fase lanjutan dapat diberi role editorial seperti `AUTHOR` atau `EDITOR`, tetapi jangan otomatis memberi semua guru hak publish.

### Siswa / Pembimbing DUDI

Tidak memiliki akses admin CMS secara default.

Semua query/action mutasi harus memverifikasi `schoolId` server-side. Menyembunyikan menu di frontend bukan security boundary.

## 8. Public data boundary

Website publik **tidak boleh** otomatis mengekspos:

- daftar siswa;
- NIS/NISN;
- presensi;
- nilai;
- EWS;
- jurnal PKL;
- nomor telepon/email personal guru/siswa;
- data internal Dapodik;
- decision/attention dashboard.

Data existing yang aman untuk digunakan hanya setelah dipilih secara eksplisit, misalnya nama sekolah, logo, alamat sekolah, email/telepon publik, dan nama program keahlian. Profil staf/guru publik harus menjadi fitur opt-in dengan field publik terpisah, bukan membaca semua user tenant.

## 9. SEO, performance, dan accessibility

- SSR/public rendering untuk halaman yang perlu diindeks.
- Unique `<title>` dan meta description per page/post.
- canonical URL.
- Open Graph/Twitter metadata.
- sitemap.xml per school site.
- robots.txt / indexing toggle pada site draft.
- structured data `EducationalOrganization`, `NewsArticle`, `Event` bila valid.
- images memiliki intrinsic dimensions dan lazy loading di bawah fold.
- generate WebP/AVIF variants pada fase media pipeline; jangan melayani foto asli multi-megabyte tanpa optimasi.
- alt text wajib untuk gambar editorial bermakna.
- keyboard navigation, visible focus, semantic heading order, contrast minimum WCAG AA.
- public landing tidak boleh mengunduh bundle admin School OS.

## 10. Theme strategy

Jangan memberikan arbitrary CSS editor. Berikan preset terkontrol, misalnya:

- `Clean School`
- `Editorial`
- `Campus`

Setiap preset menggunakan token untuk typography, radius, spacing, dan warna aksen. Sekolah dapat memilih logo, hero image, dan primary accent dari pilihan aman, tetapi layout tetap responsive dan accessible.

Admin CMS tetap menggunakan Apple HIG-inspired School OS. Public website tidak harus meniru macOS; prioritasnya adalah identitas sekolah, readability, dan performa.

## 11. Preview & publication safety

Preview draft harus memakai URL bertoken/authorized session dan **tidak** dapat diindeks search engine.

Publish action:

1. validasi content schema;
2. validasi slug unik tenant;
3. validasi media ownership;
4. validasi required SEO/basic identity;
5. persist publication state;
6. invalidate public cache;
7. return public URL.

Archive tidak menghapus record. Delete hard hanya untuk draft yang belum pernah published atau melalui admin confirmation yang eksplisit.

## 12. Recommended delivery phases

### Phase 1 — CMS foundation

Schema + migration, authorization helpers, Website Sekolah admin hub, Site identity/settings, Halaman CRUD, Berita CRUD, draft/preview/publish, satu public landing route, public page/news rendering.

Ini adalah minimum yang sudah memberi nilai nyata dan tidak terasa seperti placeholder.

### Phase 2 — editorial operations

Agenda, Pengumuman, Media Library wrapper, navigation editor, scheduled publication, revision history, sitemap/structured data.

### Phase 3 — advanced publishing

Gallery composition, custom domain verification, image variants pipeline, analytics, author/editor workflow, reusable section presets, cache/CDN tuning.

## 13. Acceptance criteria Phase 1

Phase 1 baru boleh disebut selesai jika:

- Admin Sekolah dapat membuka `/school/website`;
- dapat membuat/edit Halaman dan Berita sebagai draft;
- draft tidak dapat diakses publik tanpa preview authorization;
- publish membuat konten tersedia di URL publik school slug;
- slug unik per tenant dan tidak cross-school;
- user tenant lain tidak dapat membaca draft atau mengubah konten sekolah lain;
- public site tidak menampilkan data sensitif internal;
- halaman publik responsive, keyboard accessible, dan metadata SEO terisi;
- no arbitrary HTML/script injection;
- migration/rollback plan terdokumentasi;
- automated tests mencakup tenant isolation, draft/published boundary, slug uniqueness, dan publish authorization;
- production rollout memiliki backup DB sebelum migration dan smoke test public/admin setelah cutover.

## 14. Keputusan implementasi saat dokumen ini dibuat

Pada 10 September 2026 schema aktif hanya memiliki identitas dasar `School` (`name`, `slug`, `npsn`, `address`, `city`, `province`, `phone`, `email`, `logoUrl`, dll.) dan belum memiliki model CMS page/news/gallery/event.

Karena itu **jangan** menambahkan menu Website Sekolah yang terlihat fully functional sebelum Phase 1 memiliki persistence dan public rendering nyata. Lebih baik mengaktifkan satu entry point CMS setelah fondasi Phase 1 lolos test daripada mengirim banyak tombol yang hanya placeholder.
