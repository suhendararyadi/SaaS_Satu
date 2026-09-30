# Release — Daily Attendance Unrecorded Default

**Date:** 30 September 2026 (Asia/Jakarta)  
**Source commit:** `e4bd9533cf12f9ee163b89397164d9835dcbc2f6`  
**Release:** `e4bd953-attendance-unrecorded`  
**Production:** `https://sekolah.suhendararyadi.com/school/attendance`

## Problem

The backend query already returned `attendance: null` for students without a `SchoolDailyAttendance` row. The input UI then converted that missing record into `HADIR`, and the save operation required the entire active class roster. As a result, saving attendance could persist untouched students as present.

## New contract

- A student without a saved daily-attendance record is **Belum diinput**.
- Missing input is not `HADIR` and is not `ALPA`.
- Hadir, Sakit, Izin, Alpa, and Terlambat remain explicit attendance statuses.
- The UI displays a dedicated **Belum Diinput** count and per-student marker.
- **Tandai Semua Hadir** remains available only as an explicit bulk action.
- Saving can persist a valid subset of the active class roster.
- Students omitted from a save remain unrecorded; existing persisted records remain intact.
- Server validation still rejects duplicate student IDs and students outside the selected class.
- No database schema migration was required.

## Verification

- focused daily-attendance/access tests: **12/12 PASS**;
- full normal Vitest regression: **207/207 PASS across 38 files**;
- Wasp build: PASS;
- generated server bundle: PASS;
- Vite production SSR/client builds: PASS;
- immutable full-release preflight: PASS;
- bounded full deployment: PASS;
- repeated deployment: **idempotent true**;
- `saas-satu.service`: active;
- public `/school/attendance`: HTTP 200;
- public `/school`: HTTP 200;
- backend health `/auth/me`: HTTP 200;
- unauthenticated admin-dashboard operation: HTTP 401;
- live static bundle contains `Belum diinput` and `Tandai Semua Hadir`;
- live backend source contains the subset-roster validation and no longer requires `args.records.length === classStudentIds.size`.

## Rollback

- backend: `19acc6e-p6-super-admin`;
- static: `328c47d-p7-profile-cleanup`.

Existing npm dependency/deprecation warnings and the known Vite Prisma browser-alias warning remain nonblocking technical debt and were not changed by this attendance-scoped release.
