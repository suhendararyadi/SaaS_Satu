# Release — Student Account as School Profile

Date: **23 September 2026**  
Production release: **`8a6d5c2-student-account-profile`**  
Runtime commit: **`8a6d5c2`**  
Rollback release: **`eada47c-student-mobile-selfie-nav`**

## Purpose

Replace the generic SaaS subscription/account experience on `/account` for School OS students with a read-only School OS student profile sourced from the existing school/student database.

Non-student account behavior remains unchanged.

## Student account behavior

When the authenticated user has role `STUDENT` and belongs to a school, `/account` now renders inside `SchoolLayout` and uses the same student mobile bottom navigation as the rest of School OS.

The page presents:

- student name and status;
- NIPD/NIS and NISN;
- school and NPSN;
- current class/rombel;
- department/concentration where applicable;
- academic year and semester;
- gender, birthplace/date, religion/faith field as stored by the school;
- previous school;
- address/contact summary;
- residence type and transportation;
- father, mother and guardian names;
- login email and username;
- Dapodik import/sync date when available.

The page is read-only and tells the student to contact the homeroom teacher or school administrator when the source data needs correction.

## Privacy and authorization

A dedicated `getMyStudentAccountProfile` query was added.

The query:

- requires authentication;
- requires role `STUDENT` and an active `schoolId`;
- always filters by the current authenticated user's own `id` and `schoolId`;
- accepts no target student id, preventing arbitrary student lookup through this endpoint;
- does not return NIK, family-card number, parent NIKs, bank account information, KIP/KPS numbers, home coordinates, or physical-measurement fields.

The existing administrator student-detail page remains separate and keeps its own authorization rules.

Generic SaaS subscription/credits/payment account content remains available only through the existing non-student branch. It is not rendered for School OS student accounts.

## Visual system

The student account page follows root `DESIGN.md`:

- School OS grouped surfaces;
- 16px cards;
- subtle borders and low shadows;
- system typography;
- project blue action/accent tokens;
- Lucide/M3 icon system;
- mobile bottom navigation inherited from `SchoolLayout`;
- no student mobile sidebar/hamburger regression.

## Verification

- `git diff --check`: PASS
- no Prisma schema/migration changes
- privacy select-list check: PASS
- Wasp compile/build: PASS
- full regression: **163/163 PASS across 30 files**
- generated server bundle: PASS
- Vite SSR build: PASS
- Vite client production build: PASS
- immutable release preflight: PASS
- production deploy: PASS
- repeat deploy: **idempotent=true**
- `/account`: 200
- `/school`: 200
- `/school/my-attendance`: 200
- unauthenticated `get-my-student-account-profile`: 401
- service: active
- recent service error scan: clean

Production integrity after deploy:

- SMKN 12 Garut students: **1,539**
- SMKN 12 Garut StudentProfile rows: **1,539**
- SMKN 12 Garut daily attendance: **0**
- SMKN 12 Garut Attendance 360 events: **0**

An attempted direct module-level read-only UAT from raw Node ESM could not run because the generated Wasp SDK uses resolver semantics not supported by that standalone invocation. This did not affect production. The compiled server, generated operation route, HTTP auth boundary, builds, regression tests, service health and data-integrity checks all passed.
