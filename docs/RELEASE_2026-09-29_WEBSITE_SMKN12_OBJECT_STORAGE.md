# Release — Website SMKN 12 Garut + Object Storage

Date: **29 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Runtime

Runtime/source commit:

`4ee295bac1d0cf32c430855ee38558b239255197`

Production release:

`4ee295b-website-smkn12-media-proxy`

Live pointers:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/4ee295b-website-smkn12-media-proxy`
- static: `/var/www/saas-satu/releases/4ee295b-website-smkn12-media-proxy`
- application rollback: `7d69ded-website-smkn12-object-storage`

Public website:

`https://sekolah.suhendararyadi.com/site/smkn-12-garut`

## Tenant activation

SMKN 12 Garut Website Sekolah is initialized and published.

Production state after the idempotent seed:

- SchoolSite: **1**
- published content: **5**
- PAGE: **2**
- NEWS: **3**
- visible header navigation: **4**
- media library: **1** external official-source image
- object-backed permanent media rows: **0** immediately after activation; storage is ready for admin uploads

Initial content:

- Profil SMKN 12 Garut
- Sarana dan Lingkungan Belajar
- SPMB 2026/2027 di SMKN 12 Garut Berjalan Kondusif
- SMKN 12 Garut Melanjutkan Revitalisasi Sarana Pendidikan
- Penguatan Sarana Pendukung Pembelajaran di SMKN 12 Garut

Header navigation:

- Profil
- Berita
- Agenda
- Pengumuman

Agenda and Pengumuman indexes are active, but no fabricated item was inserted because no sufficiently authoritative current public item was available during activation.

Program/konsentrasi content remains driven from the School OS school master data through the existing Website renderer.

## Public-source basis

Initial factual profile/content was paraphrased from public sources, not copied verbatim:

- Kemendikdasmen identity: https://referensi.data.kemendikdasmen.go.id/tabs.php?npsn=20254283
- Kemendikdasmen school profile: https://referensi.data.kemendikdasmen.go.id/snpmb/site/sekolah?npsn=20254283
- SPMB 2026/2027: Pikiran Rakyat Garut, 17 July 2026
- Revitalisasi 2026: Suara Metro Indonesia, 16 July 2026
- Sarana pembelajaran: Pikiran Rakyat Garut, 6 February 2025

The hero/media URL uses an image served by the Kemendikdasmen school portal. Third-party news images were not copied into School OS object storage.

Official vision, mission, detailed history, and other claims not supported by authoritative sources were deliberately not invented. They remain editorial updates for when school documents are available.

## Object storage

School OS now has a private S3-compatible object-storage service using **Garage v2.4.1**.

Infrastructure:

- service: `garage.service`
- S3 API: loopback only, `127.0.0.1:3900`
- RPC: loopback only, `127.0.0.1:3901`
- admin API: loopback only, `127.0.0.1:3903`
- persistent data: `/var/lib/garage`
- bucket credentials: root-only configuration; never stored in Git

Production environment:

- `FILE_UPLOADS_ENABLED=true`
- custom S3 endpoint enabled
- path-style S3 addressing enabled

Environment backup before activation:

`/etc/saas-satu/staging.env.pre-website-object-storage-20260929-074514`

## Website media upload

Admin Website Sekolah now exposes **Upload Gambar**.

Policy:

- School Admin only
- JPEG, PNG, WebP
- maximum 5 MB
- alt text required
- object keys tenant-scoped under `website/<schoolId>/...`
- bucket remains private
- public image delivery is proxied through School OS:
  `/operations/site-media/:mediaId`
- immutable browser caching
- `X-Content-Type-Options: nosniff`
- deleting an object-backed media record also performs best-effort object cleanup

Manual URL-based media remains supported.

## Verification

Application:

- Website/media targeted tests: **10/10 PASS**
- full School OS regression: **204/204 PASS across 38 test files**
- Wasp build: **PASS**
- server bundle: **PASS**
- Vite SSR build: **PASS**
- Vite client build: **PASS**
- `git diff --check`: **PASS**
- immutable release preflight/deploy: **PASS**

Storage:

- S3 HeadBucket: **PASS**
- PutObject: **PASS**
- GetObject: **PASS**
- DeleteObject: **PASS**
- synthetic public object test: **HTTP 200 image/png**
- synthetic DB row and S3 object cleaned after the test
- unauthenticated upload: **401**
- nonexistent public media through backend proxy: **404 JSON**

Public website:

- home: **200**
- Profil: **200**
- Sarana: **200**
- Berita index: **200**
- seeded news detail routes: **200**
- sitemap: **200 application/xml**
- sitemap lists home, Profil, Sarana, news, Agenda and Pengumuman routes
- app service: **active**
- Garage service: **active**

Seed activation was executed twice with identical counts, confirming idempotency.

## Backup

Pre-activation production DB backup:

`/home/ubuntu/backups/SaaS_Satu/pre-website-smkn12-object-storage-20260929-075800.dump`

SHA-256:

`49ab1664b5c15f2a5f5bf2daffa3f7ecd279709c459d01acb385c2653f39d744`

## Deferred enhancements

Not blockers for P5 core:

- automatic WebP/AVIF derivative generation
- image transformation/CDN layer
- custom-domain verification
- optional AUTHOR/EDITOR publishing roles
- privacy-safe public analytics
- Event structured data
- advanced cache/CDN tuning
- replacement of temporary public-source profile copy with authoritative school-owned vision/mission/history when provided
