# Release Note — Dashboard 4 KPI + Website Sekolah CMS Plan

Date: **10 September 2026 (Asia/Jakarta)**

## Dashboard School Admin

Baris statistik utama Admin Sekolah disederhanakan dari 4–6 kartu kontekstual menjadi **4 KPI tetap**:

1. **Siswa** — total siswa sekolah aktif, link ke `/school/students`.
2. **Guru & Tendik** — total guru/tendik sekolah aktif, link ke `/school/teachers`.
3. **Rombel** — total rombel sekolah aktif, link ke `/school/classes`.
4. **Kehadiran hari ini** — persentase kehadiran sekolah dari data presensi hari berjalan, dengan helper jumlah sesi; bila belum ada presensi, menampilkan state netral dan tidak menganggap 0%.

Pemilihan ini sengaja memisahkan KPI tingkat sekolah dari angka modul. LMS, DUDI, dan PKL tetap tersedia pada area operasional/quick access tetapi tidak lagi memenuhi stat strip utama.

Tidak ada perubahan DTO/backend untuk refinement ini; semua nilai menggunakan data `getSchoolAdminDashboardData` yang sudah tersedia.

## Website Sekolah CMS

Schema aktif belum memiliki model CMS untuk halaman, berita, agenda, pengumuman, galeri/media, navigation, atau publication state. Karena itu release ini **tidak** menambahkan menu CMS palsu/placeholder ke production.

Rancangan production-ready disimpan pada:

`docs/WEBSITE_SEKOLAH_CMS_PLAN.md`

Kontrak arah implementasi:

- satu entry sidebar **PUBLIKASI → Website Sekolah** setelah foundation nyata tersedia;
- secondary navigation di dalam modul: Ringkasan, Halaman, Berita, Agenda & Pengumuman, Galeri & Media, Navigasi, Identitas & SEO, Pengaturan Publikasi;
- public namespace fase awal `/site/:schoolSlug`;
- editorial states `DRAFT`, `IN_REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`;
- JSON content blocks ter-validasi, bukan arbitrary HTML/JavaScript;
- strict tenant isolation pada seluruh CMS record;
- public data boundary melarang data siswa, presensi, nilai, EWS, jurnal PKL, dan data internal lain terekspos otomatis;
- SSR/SEO, sitemap, structured data, accessibility, media optimization, preview, publish, scheduling, dan rollback masuk acceptance contract.

Phase 1 yang direkomendasikan sebelum menu diaktifkan: schema + migration, authorization helpers, admin CMS hub, Site identity/settings, Halaman CRUD, Berita CRUD, draft/preview/publish, dan public landing/page/news rendering.

## Verification

Source commit: `0679c2b` (`refine(dashboard): focus school KPIs and plan website CMS`).

Quality gates:

- AdminDashboard source contains exactly 4 `M3StatCard` instances: PASS;
- TypeScript: PASS;
- Vitest: **70/70 PASS** on 5 test files;
- `git diff --check`: PASS;
- schema/migration diff: NONE;
- Wasp 0.25 production build: PASS;
- Vite SSR/client build: PASS.

Production static release:

`0679c2b-dashboard-4kpi`

Backend intentionally remains:

`6f5d9b2-ews-apple-monitoring`

Post-cutover:

- service active;
- `/school`: HTTP 200;
- `/login`: HTTP 200;
- `/admin`: HTTP 200;
- `/auth/me`: HTTP 200;
- recent `/auth/me` 500: 0;
- live dashboard bundle contains `Kehadiran hari ini` marker;
- source AdminDashboard stat count = 4.

Rollback static target from this rollout:

`37754b3-theme-sidebar-search`
