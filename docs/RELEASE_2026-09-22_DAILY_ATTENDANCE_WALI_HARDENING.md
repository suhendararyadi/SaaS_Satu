# Release 2026-09-22 — Presensi Harian + Wali Kelas Production-Grade Hardening

Status: **production / verified**  
Application commit: `16bad88`  
Production release: `16bad88-attendance-wali-hardening`

## Scope

This release hardens the School OS daily school attendance and homeroom-teacher workflow as one production-grade module. The production source lineage includes the latest PKL fixes and the root `DESIGN.md` visual authority.

Covered flows:

- School Admin daily attendance across active rombels;
- homeroom teacher attendance restricted to the teacher's assigned active rombel;
- full-roster daily write/edit behavior;
- tenant, role, class, student, date, and academic-semester boundaries;
- daily/month/semester reporting and individual student history;
- Wali Kelas personal workspace scope;
- downstream EWS Gen 2 attendance signals;
- repeated and concurrent full-roster writes.

## Production baseline

SMKN 12 Garut was inspected read-only before UAT:

- active academic year: `2026/2027 · GANJIL`;
- active rombels: **50**;
- active rombels with homeroom teacher: **50**;
- students: **1,539**;
- SchoolDailyAttendance rows before hardening UAT: **0**.

No genuine SMKN 12 Garut attendance row was created during automated UAT.

## Hardened behavior

### Attendance date integrity

Daily attendance can no longer be written merely because a date is not in the future. The server now requires the date to be inside the active semester range:

- GANJIL: 1 July through 31 December;
- GENAP: 1 January through 30 June;
- the `yearName` must be a valid consecutive `YYYY/YYYY` academic-year pair.

The UI date picker mirrors the active-semester lower/upper bounds, while the server remains authoritative.

### Tenant and roster integrity

Attendance rosters and reports now explicitly filter student relations by both:

- active `schoolId`;
- `role = STUDENT`.

This provides defense in depth if a malformed/cross-tenant relation ever exists in the database.

The existing full-roster contract remains enforced: every active student in the selected rombel must appear exactly once. Partial, duplicate, cross-class, future, inactive-year, and cross-tenant writes are rejected.

### Report selector integrity

An explicitly requested `classRoomId` or `studentId` outside the authorized collection now returns an authorization error. It no longer silently falls back to the first accessible class/student, avoiding misleading operator output.

### Wali Kelas workspace

`/school/governance/walikelas` is now explicitly a **personal workspace for a TEACHER who is assigned as homeroom teacher**.

School Admin continues to:

- manage homeroom assignments through **Struktur & Penugasan**;
- inspect school attendance through **Presensi Harian**.

The misleading School Admin sidebar entry for Wali Kelas was removed. Direct non-teacher navigation receives clear explanatory guidance instead of an arbitrary class workspace.

### EWS integration

Real-database UAT verified that an `ALPA` daily-attendance record appears as an `ATTENDANCE / ALPA` signal in EWS Gen 2 for the authorized homeroom-teacher scope.

## Real-database UAT

A temporary, isolated two-tenant UAT dataset was created after a production DB backup. It contained separate admins, homeroom teachers, ordinary teachers, active/inactive academic years, multiple rombels, students, an intentionally malformed cross-tenant class relation, and concurrent writers.

Result: **33/33 PASS**.

Verified cases include:

- admin active-rombel scope;
- homeroom-teacher own-rombel scope;
- ordinary teacher/student denial;
- cross-tenant read/write denial;
- same-tenant STUDENT-only roster filtering;
- full-roster atomic save;
- academic-year association;
- partial roster rejection;
- duplicate student rejection;
- cross-class student rejection;
- future-date rejection;
- out-of-semester rejection;
- inactive-year rejection;
- idempotent repeated save;
- concurrent full-roster save preserving one complete final snapshot and no duplicate rows;
- admin and wali report scope;
- explicit out-of-scope report selectors rejected;
- Wali Kelas workspace scope;
- EWS `ALPA` propagation;
- second UAT tenant remained untouched.

The temporary UAT tenants/users were deleted after verification. Post-cleanup checks returned `uat_schools=0`, `uat_users=0`, and SMKN 12 Garut attendance remained `0`.

## Automated quality gate

- targeted attendance/access tests: PASS;
- full Vitest regression: **156/156 PASS across 29 files**;
- `git diff --check`: PASS;
- Wasp compile/build: PASS;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client build: PASS;
- Prisma/schema change: **none**.

Existing dependency audit warnings remain in the toolchain (`8 moderate / 5 high`) and were not altered with a force-upgrade during this scoped release.

## Production deployment verification

Full immutable preflight: PASS.  
Full backend/static deployment: PASS.  
Repeat deployment: **idempotent=true**.

Production pointers after deployment:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/16bad88-attendance-wali-hardening`;
- static: `/var/www/saas-satu/releases/16bad88-attendance-wali-hardening`;
- `saas-satu.service`: **active**.

Smoke checks:

- `/school`: 200;
- `/auth/me`: 200;
- unauthenticated dashboard: 401;
- `/school/attendance`: 200;
- `/school/governance/walikelas`: 200;
- unauthenticated attendance query/save/report and homeroom dashboard operations: **401** each.

Final production DB check:

- SMKN 12 Garut active rombels: **50**;
- rombels with homeroom teacher: **50**;
- SMKN 12 Garut daily-attendance rows: **0**;
- temporary UAT schools: **0**.

## Backup and rollback

Pre-UAT database backup:

`/home/ubuntu/backups/SaaS_Satu/pre-attendance-wali-uat-20260922.dump`

Immediate deployment rollback pointers captured by the deploy runner:

- backend: `a6f23fc-pkl-journal-photo`;
- static: `c64509e-pkl-evidence-modal`.

No rollback was required.
