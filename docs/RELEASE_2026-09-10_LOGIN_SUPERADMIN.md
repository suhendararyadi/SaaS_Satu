# School OS — Login Apple HIG & Super Admin Navigation

Date: 10 September 2026 (Asia/Jakarta)

## Scope

Frontend-only refinement untuk menyelaraskan halaman autentikasi dengan kontrak visual School OS dan mengembalikan jalur navigasi ke dashboard platform Super Admin.

## Login refinement

Shared `AuthPageLayout` tidak lagi memakai split-screen marketing layout. Auth shell sekarang menggunakan komposisi centered sign-in surface yang lebih dekat dengan aplikasi macOS:

- grouped background `#F5F5F7` pada light mode dan black environment pada dark mode;
- compact School OS identity di header dengan circular school glyph;
- single centered authentication surface dengan radius 22px, border tipis, translucent surface, dan shadow restrained;
- system-blue primary school glyph;
- typography lebih compact dan menggunakan hierarchy School OS;
- login copy menjadi `Masuk ke School OS` dan menggunakan istilah `kata sandi`;
- link reset password dan signup ditempatkan sebagai secondary actions di bawah form;
- shared layout ini juga menjadi visual baseline untuk auth screens lain yang memakai `AuthPageLayout`.

Tidak ada perubahan pada provider autentikasi, session, password policy, atau backend auth.

## Super Admin navigation

Route platform dashboard tetap `/admin` dan existing access contract masih mensyaratkan `user.isAdmin`.

Untuk menghindari dead link atau pelebaran authorization, link `Dashboard Super Admin` hanya dirender untuk `user.isAdmin === true` pada:

- section `SUPER ADMIN` di sidebar School OS;
- dropdown akun School OS.

`Organisasi Sekolah` tetap tersedia di section Super Admin sesuai capability School OS yang sudah ada. Perubahan ini tidak mengubah server-side authorization atau operasi analytics/admin.

## Implementation and rollout

- source commit: `9ae05d3b08c326b140cefa467e885b656188fb80`;
- static release: `9ae05d3-login-superadmin`;
- backend tetap: `6f5d9b2-ews-apple-monitoring`;
- rollback static: `76395d0-decision-row`;
- TypeScript: PASS;
- Vitest: 68/68 PASS;
- Wasp 0.25.0 build: PASS;
- Vite SSR/client production build: PASS;
- static-only preflight: PASS;
- static-only deploy: PASS;
- public `/login`: HTTP 200;
- public `/school`: HTTP 200;
- public `/admin`: HTTP 200 untuk shell route;
- public `/auth/me`: HTTP 200;
- recent `/auth/me` 500 count pada window verifikasi: 0;
- live bundle memuat marker `Masuk ke School OS` dan `Dashboard Super Admin`.

Tidak ada schema migration, database mutation, backend cutover, atau service restart pada refinement ini.
