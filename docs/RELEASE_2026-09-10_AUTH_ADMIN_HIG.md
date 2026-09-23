# Release 2026-09-10 — Auth Wallpaper & Super Admin HIG

## Scope

Frontend-only refinement for School OS authentication and platform administration.

Source commit: `ef167b55a85f4c2b1b97ea67c9298568220dbddd`  
Static release: `ef167b5-auth-admin-hig`  
Backend retained: `6f5d9b2-ews-apple-monitoring`

## Authentication

- Shared `AuthPageLayout` now uses an original lightweight vector landscape wallpaper from `app/public/school-os-auth-wallpaper.svg`.
- The asset is approximately 2 KB and is not copied from Apple/macOS or any photographic source.
- Login/Signup composition is inspired by a desktop sign-in screen: wallpaper background, centered circular School OS identity, translucent authentication surface, restrained shadows, and explicit focus states.
- `/signup` copy/hierarchy was aligned with `/login`.
- Existing Wasp login/signup form behavior and auth routing were not changed.

## Super Admin

- Legacy Open SaaS `Header`/`Sidebar` is no longer used by `DefaultLayout` for `/admin`.
- Super Admin now uses the School OS navigation drawer, translucent toolbar, account menu, theme action, and grouped content canvas.
- Navigation groups: Platform, Operasional, and Sekolah.
- `/admin` remains guarded by `user.isAdmin`.
- Root navigation matching was corrected so `/admin` does not stay highlighted on child routes.
- Dashboard overview was replaced with a compact real-data layout driven by existing `getDailyStats`:
  - tayangan hari ini;
  - pengguna;
  - pengguna berlangganan;
  - pendapatan/profit when available;
  - seven-day activity bars;
  - source list.
- Loading, error, and empty states are explicit. Missing metrics use `Belum ada` instead of fabricated values.
- The previous ApexCharts-heavy Admin overview is no longer imported by the active dashboard. Client Analytics dashboard chunk dropped from roughly 519 KB in the old template build to about 7.8 KB in this build.

## Verification

- source TypeScript: PASS;
- Vitest: 68/68 PASS across 4 files;
- `git diff --check`: PASS;
- anti-slop em-dash UI scan for touched files: PASS;
- schema/migration diff: NONE;
- Wasp 0.25.0 production build: PASS;
- Prisma Client generation during Wasp build: PASS;
- Vite SSR/client production build: PASS;
- static preflight: PASS;
- static-only promotion: PASS;
- `/login`: HTTP 200;
- `/signup`: HTTP 200;
- `/admin`: HTTP 200 shell;
- `/school`: HTTP 200;
- `/auth/me`: HTTP 200 anonymous smoke;
- `/school-os-auth-wallpaper.svg`: HTTP 200;
- recent `/auth/me` 500 count after rollout: 0;
- backend pointer remained `6f5d9b2-ews-apple-monitoring` and service was not replaced for this UI rollout.

## Rollback

Immediate static rollback target: `9ae05d3-login-superadmin`.

## Known nonblocking debt

The Wasp install/build still reports dependency audit findings already present in the project. This release is not described as audit-clean. Existing Vite/Prisma browser alias warning also remains nonblocking and is unrelated to this visual refinement.
