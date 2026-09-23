# Release — Attendance 360

Date: **22 September 2026**  
Production release: **`d77dd38-attendance360`**  
Runtime commit: **`d77dd38`**  
Previous rollback release: **`0d52d90-student-affairs-followup`**  
Implementation plan: [`ATTENDANCE_360_IMPLEMENTATION_PLAN.md`](./ATTENDANCE_360_IMPLEMENTATION_PLAN.md)

## Purpose

Attendance 360 upgrades School OS from a primarily homeroom-entered daily attendance register into an evidence-based attendance platform while preserving `SchoolDailyAttendance` as the official daily truth.

Canonical flow:

`Attendance Sources -> StudentAttendanceEvent -> Reconciliation Engine -> SchoolDailyAttendance -> Homeroom Verification -> Reports / EWS / Follow-Up`

The production-grade Daily Attendance/Wali Kelas contracts from the previous release remain backward compatible.

## Delivered scope

### Attendance Core Foundation

- `SchoolAttendancePolicy` for timezone, school coordinates, geofence radius, GPS accuracy threshold, check-in/check-out windows, working days, selfie policy, and feature enable flags.
- `SchoolCalendarDay` for holidays, semester breaks, events, exams, school-day overrides, and special schedules.
- `StudentAttendanceEvent` append-oriented evidence log with tenant/student/date/type/source, actor, GPS, geofence result, evidence key, metadata, and idempotent source key.
- `AttendanceActivity` / `AttendanceActivityRecord` for habituation and character activities.
- `SchoolDailyAttendance` extended with arrival/check-out timestamps, late minutes, early-leave flag, reconciliation state, evidence summary, and final verifier.
- Shared Haversine geofence helper reused by PKL and school attendance.
- Asia/Jakarta server-authoritative attendance time utilities.
- Authenticated private local attendance evidence storage.

### Student Self Attendance

Route: `/school/my-attendance`

- server-authoritative school day/time;
- current GPS + accuracy;
- server-side geofence validation;
- direct front-camera selfie UX;
- idempotent check-in/check-out;
- automatic lateness calculation;
- checkout requires a prior check-in;
- own evidence/history;
- student sick/permit request entry point.

Self-attendance is **not automatically enabled for real schools**. Admin must first configure exact school coordinates, schedule, GPS threshold, selfie policy, calendar, and set the policy active.

### Duty Teacher Gen 2

Existing `/school/governance/piket` remains compatible with its aggregate report and now also includes an operational per-student gate console:

- active school roster search;
- late-arrival event;
- early leave;
- dispensation;
- reason/action/destination/guardian metadata;
- digital late-entry pass;
- approved permit creation for early-leave/dispensation flows;
- idempotent attendance evidence events.

### Homeroom Reconciliation + Monthly Matrix

Existing `/school/attendance` now includes evidence-driven workflow alongside the legacy full-roster form:

- input/manual fallback;
- reconciliation workspace;
- evidence/conflict view;
- class-wide reconciliation;
- final homeroom/admin verification;
- optimistic stale-write protection;
- human-protected `MANUAL` / `VERIFIED` daily decisions;
- monthly 1–31 matrix;
- H/S/I/A/T totals and attendance percentage;
- CSV/Excel-compatible export;
- browser print/PDF mode;
- existing report views retained.

Manual full-roster attendance now records `HOMEROOM_OVERRIDE` audit events and remains the final explicit human path.

### LMS Subject Attendance Integration

LMS course attendance now emits `SUBJECT_ATTENDANCE` evidence events while retaining teacher/course/class authorization.

Additional supported subject statuses:

- `TERLAMBAT`;
- `DISPENSASI`.

Repeated subject absence can now be reconciled with gate evidence instead of remaining isolated inside LMS.

### Student Permit Integration

`StudentPermitType` now supports `SICK`.

- `REQUESTED` permit evidence does not change official daily attendance.
- `APPROVED SICK` can reconcile to `SAKIT` when no physical-presence evidence conflicts.
- other approved absence permits can reconcile to `IZIN`.
- physical presence + conflicting permit is surfaced for review rather than silently overwritten.

### Habituation / Character Attendance

Route: `/school/attendance/habituation`

Generic activity definitions and student participation support Sapa Pagi, Dhuha, Apel/Upacara, Literasi, Senam, or school-defined activities.

Habituation is deliberately a **separate participation signal** and does not automatically set school attendance to absent.

### Command Center / Settings / Audit

New routes:

- `/school/attendance/command`
- `/school/attendance/settings`
- `/school/attendance/habituation`
- `/school/attendance/audit`
- `/school/my-attendance`

Command Center includes daily status totals, self check-in/check-out counts, early-leave count, review count, per-rombel detail, per-grade breakdown, and per-program/department breakdown.

Audit Trail exposes authorized evidence events from student self-attendance, duty teacher, LMS, permits, habituation, homeroom override, and reconciliation sources.

### Attendance EWS Gen 3

Existing base scoring remains intact. Added attendance patterns:

- repeated lateness (`>=5` in the current window);
- consecutive ALPA (`>=3`);
- attendance rate below 85% after at least five recorded days;
- repeated early leave (`>=3`);
- repeated unresolved attendance conflicts (`>=3`);
- habituation participation trend (`>=4` absence/late records), explicitly separate from school attendance.

EWS remains prioritization and decision support; it does not apply automatic punishment or discipline.

## Reconciliation safety contract

Automatic reconciliation never silently replaces a `MANUAL` or `VERIFIED` daily record. Later evidence remains auditable, while the explicit human decision remains protected until a new authorized verification/manual action occurs.

Typical automatic behavior verified in UAT:

- valid self check-in -> `HADIR`;
- late self check-in/duty late -> `TERLAMBAT`;
- approved sick permit without physical presence -> `SAKIT`;
- approved absence permit without physical presence -> `IZIN`;
- two subject `ALPA` records without physical-presence evidence -> `ALPA`;
- school/gate presence plus repeated subject `ALPA` -> presence retained + `NEEDS_REVIEW`;
- early leave -> presence retained + `earlyLeave=true`.

## Database migration

Migration:

`20260922191500_add_attendance_360_core`

The additive Attendance 360 objects had been physically present on production before Prisma migration bookkeeping was finalized during an interrupted implementation session. Production read-only audit confirmed the physical schema was complete and contained no Attendance 360 events/policies.

The migration was therefore hardened to be idempotent using guarded enum/table/column/index/FK creation. It was tested on an isolated production clone through `prisma migrate deploy`, then applied to production successfully so `_prisma_migrations` now records the release correctly.

Production verification after deploy:

- migration finished rows: **1**;
- SMKN 12 Garut students: **1,539**;
- active rombels: **50**;
- genuine `SchoolDailyAttendance`: **0**;
- SMKN 12 `StudentAttendanceEvent`: **0**;
- SMKN 12 `SchoolAttendancePolicy`: **0**;
- temporary Attendance 360 UAT schools: **0**.

## Verification

### Unit / regression

- targeted Attendance 360 + attendance/PKL tests: **15/15 PASS**;
- full regression: **163/163 PASS across 30 test files**;
- Prisma validation: PASS;
- Wasp build: PASS;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client production build: PASS;
- `git diff --check`: PASS.

### Real database UAT

A production-clone, multi-tenant real-DB UAT completed **62/62 PASS** and the temporary clone was deleted afterward.

Coverage included:

- policy/calendar authorization;
- school-day lock;
- geofence and GPS-accuracy rejection;
- self check-in/out lifecycle and idempotency;
- student/staff access boundaries;
- Duty Teacher scope, digital pass, early leave, and cross-tenant denial;
- sick request and approval;
- LMS subject-attendance event propagation;
- cross-course/class authorization;
- homeroom scope/reconciliation;
- final verification + optimistic concurrency;
- human-protection after later evidence;
- legacy manual attendance compatibility;
- monthly matrix;
- Command Center breakdowns;
- habituation separation;
- multi-source audit;
- tenant isolation;
- all Attendance EWS Gen 3 patterns.

### Deployment

- immutable preflight: PASS;
- production Prisma migration: PASS;
- full immutable deploy: PASS;
- repeat deploy: **idempotent=true**;
- backend health: service active, `/auth/me` = 200;
- public `/school` = 200;
- protected dashboard = 401 unauthenticated;
- all Attendance 360 pages = 200;
- 12 protected Wasp operations + evidence upload/file APIs = 401 unauthenticated;
- post-restart error scan: no uncaught/unhandled/fatal/panic/error findings.

Live pointers:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/d77dd38-attendance360`
- static: `/var/www/saas-satu/releases/d77dd38-attendance360`

Rollback:

- backend/static: `0d52d90-student-affairs-followup`

## Backup

Pre-Attendance-360 production backup:

`/home/ubuntu/backups/SaaS_Satu/pre-attendance360-20260922.dump`

## Operational activation note

The production code is live, but self-attendance for SMKN 12 Garut is intentionally **not auto-activated**. Its policy count is zero. Before students use self check-in, an authorized admin must configure and verify:

1. exact school latitude/longitude;
2. geofence radius;
3. accepted GPS accuracy;
4. school check-in/late/check-out times;
5. working days and calendar exceptions;
6. selfie requirements;
7. then explicitly activate the Attendance 360 policy.

This prevents synthetic/default coordinates or times from being mistaken for official school attendance rules.

## Known dependency advisory

The Wasp/npm audit still reports the existing dependency advisories (**13 total: 8 moderate, 5 high**). No forced dependency upgrade was included in this scoped release because that would introduce unrelated breaking-change risk.
