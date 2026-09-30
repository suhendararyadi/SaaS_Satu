# Release — P7 Profile / Account UX Cleanup

**Date:** 30 September 2026 (Asia/Jakarta)  
**Source commit:** `328c47dca40a8de0b2b91b5c78d04e62814596f0`  
**Static release:** `328c47d-p7-profile-cleanup`  
**Production:** `https://sekolah.suhendararyadi.com`

## Scope

P7 removes the remaining legacy operational links that sent school users through the SaaS `/account` route before redirecting to School Profile.

Production UI now uses:

- Student mobile bottom navigation: `Profil → /school/profile`;
- DUDI/default operational mobile navigation: `Profil Saya → /school/profile`;
- Student dashboard no-class empty state: `Buka Profil → /school/profile`;
- School page-title metadata uses `/school/profile` for the operational profile.

The SaaS route `/account` remains intentionally available for legitimate account/subscription flows, including non-school SaaS administrators and school admins with SaaS account capability.

## Runtime impact

This is a frontend-only release.

- Backend remains `/home/ubuntu/deployments/SaaS_Satu/releases/19acc6e-p6-super-admin`.
- Static is `/var/www/saas-satu/releases/328c47d-p7-profile-cleanup`.
- Static rollback is `/var/www/saas-satu/releases/19acc6e-p6-super-admin`.
- No schema migration or production database write was required.
- `saas-satu.service` remained active; the static-only deployment did not restart or switch the backend.
- Staging `af4bf88-ews-monitoring` was not promoted.

## Verification

- `git diff --check`: PASS.
- focused profile-routing / shell regression: **9/9 PASS**;
- full Vitest regression: **205/205 PASS across 38 files**;
- Wasp build: PASS;
- Prisma client generation from generated Wasp schema path during Wasp build: PASS;
- Vite SSR build: PASS;
- Vite client build with `REACT_APP_API_URL=https://sekolah.suhendararyadi.com`: PASS;
- bounded `school_os_deploy_static_preflight`: PASS;
- bounded `school_os_deploy_static`: PASS;
- repeated bounded static deploy: **idempotent true**;
- public `/school`: HTTP 200;
- public `/school/profile`: HTTP 200;
- public `/auth/me`: HTTP 200;
- unauthenticated admin dashboard operation: HTTP 401;
- backend pointer after rollout: unchanged at `19acc6e-p6-super-admin`.

## Known nonblocking debt

Dependency installation continues to report existing npm vulnerability/deprecation warnings. No dependency upgrade was included in this UX-only release because that would expand scope and require separate compatibility work.
