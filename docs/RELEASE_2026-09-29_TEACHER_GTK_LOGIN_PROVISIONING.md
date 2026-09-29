# Release — Teacher/GTK Login Provisioning

Date: **29 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Runtime

Runtime commit: `3bd5515cdebdba7a63d60cf282a2cca0cf28a36d`

Production release: `3bd5515-teacher-login-provisioning`

Backend/static pointers:

- `/home/ubuntu/deployments/SaaS_Satu/releases/3bd5515-teacher-login-provisioning`
- `/var/www/saas-satu/releases/3bd5515-teacher-login-provisioning`

Rollback backend: `c7814f5-lms-teaching-session-gen1`
Rollback static: `c3297df-sidebar-color-polish`

## Purpose

Provide a first-class Admin flow for creating and managing School OS login identities for existing Guru/GTK records without direct SQL or manual Auth-table manipulation.

## Admin flow

Open:

`Admin → Guru & Tendik → Detail Guru`

The detail page now includes an **Akun Login** card with:

- status: Aktif / Belum dibuat;
- login email when available;
- **Buat Akun Login**;
- **Reset Password**;
- **Cabut Akun Login**.

Temporary passwords are returned only at creation/reset time and are never stored in documentation.

## Backend operations

New authenticated Wasp operations:

- `provisionTeacherLogin` → `POST /operations/provision-teacher-login`;
- `resetTeacherLoginPassword` → `POST /operations/reset-teacher-login-password`;
- `revokeTeacherLogin` → `POST /operations/revoke-teacher-login`.

Rules:

- caller must pass `requireSchoolAdmin`;
- target must belong to the same school tenant;
- target must have primary role `TEACHER`;
- `SCHOOL_ADMIN` target is deliberately excluded from this provisioning path;
- duplicate Auth provisioning is rejected;
- Wasp Auth utilities hash passwords;
- reset invalidates existing sessions;
- revoke deletes Auth but preserves User, TeacherProfile, school assignments, LMS, attendance and PKL relations.

## Login identity policy

When provisioning:

1. existing official teacher email is preferred when it is not already an Auth identity;
2. otherwise NIP/username/id is used on the `@staff.schoolos.invalid` domain;
3. identity collisions fall back to an id-suffixed staff-domain address.

## Verification

Quality gates completed before and after production rollout:

- Teacher login policy unit tests: **3/3 PASS**;
- production-clone real DB lifecycle UAT: **10/10 PASS**;
- full School OS regression: **194/194 PASS across 36 test files**;
- Wasp 0.25 build: PASS;
- generated server TypeScript/Rollup bundle: PASS;
- Vite production SSR build: PASS;
- Vite production client build: PASS;
- immutable release preflight: PASS;
- production deploy: PASS;
- repeat deploy: `idempotent=true`;
- unauthenticated provision/reset/revoke operations: **401**;
- `/school`, `/school/teachers`, `/school/lms/teaching`: **HTTP 200**;
- recent service error scan: clean;
- service: active.

The UAT explicitly verified Wasp password hashing, duplicate protection, ordinary-teacher denial, cross-tenant denial, SCHOOL_ADMIN target exclusion, staff-domain fallback, reset hash replacement, active-session invalidation, revoke preservation of teacher profile, idempotent revoke, and reset-without-login rejection.

## Production data integrity

Immediately after deployment:

- authoritative real students remain **1,539**;
- total TEACHER users in SMKN 12 Garut: **109**;
- TEACHER Auth identities: **0** before any explicit Admin provisioning;
- target demo teacher exists exactly once.

No teacher login was auto-created as part of deployment.

An automated post-deploy attempt to provision the demo teacher was intentionally stopped by the execution safety layer because it would generate/handle a temporary credential. No direct Auth SQL fallback was used. Integrity verification confirmed **0 partial Auth and 0 demo sessions**. The new Admin panel is the supported path for provisioning that demo account.

## Backup

Pre-release production backup:

`/home/ubuntu/backups/SaaS_Satu/pre-teacher-login-provisioning-20260929-014443.dump`

- size: 1,666,980 bytes;
- mode: 600;
- owner: ubuntu;
- SHA-256: `aec6a86879256d56faaadc4a71a51c5132315461bdc82d9a46987a1f47e068ef`.

## Database

No Prisma schema change and no migration were required.
