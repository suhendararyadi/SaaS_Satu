# School OS — Attendance 360 Implementation Plan

Status: **Implemented / production-live**
Date: **22 September 2026**
Baseline production at approval: `0d52d90-student-affairs-followup`
Production implementation: `d77dd38-attendance360`
Primary operational reference: Jingga Asik attendance specification from SMKN 1 Rongga.
Design authority: root `DESIGN.md`.

## 1. Goal

Transform School OS attendance from a primarily homeroom-entered daily register into an evidence-based **Attendance 360** system while preserving the hardened `SchoolDailyAttendance` workflow as the official daily summary.

The system must combine evidence from:

1. student self check-in / check-out;
2. duty-teacher gate events;
3. habituation / character activities;
4. subject/LMS attendance;
5. permit/sick/dispensation records;
6. homeroom verification and audited manual corrections.

## 2. Core Architecture

Do not replace `SchoolDailyAttendance`.

Target flow:

`Attendance Sources -> StudentAttendanceEvent -> Reconciliation Engine -> SchoolDailyAttendance -> Homeroom Verification -> Reports / EWS / Follow-Up`

`SchoolDailyAttendance` remains the canonical daily record used by current dashboards, reporting and risk logic. Source evidence remains available for audit.

## 3. Existing School OS Capabilities to Reuse

Reuse rather than duplicate:

- production-grade daily attendance role/tenant hardening;
- LMS `LmsAttendanceSession` / `LmsAttendanceRecord`;
- StudentPermit lifecycle;
- Duty Teacher assignment/access policy;
- PKL Haversine/geofence implementation;
- PKL authenticated local evidence-storage pattern;
- EWS Gen 2 scoring and Follow-Up integration;
- Wasp authentication and current tenant model;
- current Prisma/PostgreSQL database.

Do not introduce Keycloak or Supabase as a second identity/data source.
Do not adopt `password = NIS`.

## 4. Target Data Model

### 4.1 SchoolAttendancePolicy

Per-school attendance configuration:

- timezone (`Asia/Jakarta` default);
- school latitude / longitude;
- geofence radius;
- maximum GPS accuracy;
- check-in open time;
- late threshold;
- check-in close time;
- check-out open / close time;
- self-attendance enable flags;
- selfie requirements;
- enabled working days;
- active flag.

### 4.2 SchoolCalendarDay

Per-school operating-calendar override:

- `SCHOOL_DAY`;
- `HOLIDAY`;
- `NATIONAL_HOLIDAY`;
- `SEMESTER_BREAK`;
- `SCHOOL_EVENT`;
- `EXAM_DAY`;
- `SPECIAL_SCHEDULE`;
- optional check-in/check-out time overrides.

### 4.3 StudentAttendanceEvent

Append-oriented evidence event:

- school/student/date;
- event type and status;
- occurrence timestamp;
- actor/source;
- latitude/longitude/GPS accuracy;
- distance and geofence result;
- evidence key;
- notes / metadata;
- optional references to course/session/permit/activity.

Initial event types:

- `SELF_CHECK_IN`;
- `SELF_CHECK_OUT`;
- `DUTY_LATE`;
- `DUTY_EARLY_LEAVE`;
- `DUTY_DISPENSATION`;
- `SUBJECT_ATTENDANCE`;
- `HABIT_ATTENDANCE`;
- `PERMIT_STATUS`;
- `HOMEROOM_OVERRIDE`;
- `SYSTEM_RECONCILIATION`.

### 4.4 AttendanceActivity / AttendanceActivityRecord

Generic participation system for:

- Sapa Pagi;
- Dhuha;
- Apel / Upacara;
- Literasi;
- Senam;
- school-defined activities.

Habituation participation is a distinct signal and must not automatically mean school absence.

### 4.5 Extend SchoolDailyAttendance

Preserve existing status and unique key while adding optional summary fields:

- arrivalAt;
- checkOutAt;
- lateMinutes;
- earlyLeave;
- reconciliationStatus (`AUTO`, `NEEDS_REVIEW`, `VERIFIED`, `MANUAL`);
- verifiedBy / verifiedAt;
- evidence summary metadata.

## 5. Initial Reconciliation Rules

- valid self check-in + compatible source evidence -> `HADIR`;
- valid check-in after late threshold -> `TERLAMBAT`;
- approved sickness/permit evidence -> `SAKIT` / `IZIN`;
- no gate evidence + repeated subject ALPA -> `ALPA` candidate;
- check-in + approved early leave -> daily presence retained with `earlyLeave=true`;
- conflicting evidence -> `NEEDS_REVIEW`, never silently overwritten;
- homeroom verification is final manual authority and is audited.

The engine may propose or build a daily summary but never hides source evidence.

## 6. Delivery Phases

### Phase 1 — Attendance Core Foundation

- policy/calendar/event/activity schema;
- shared geofence helper;
- authoritative Jakarta server-time utilities;
- reconciliation service;
- authenticated attendance evidence storage;
- admin attendance policy/calendar operations;
- compatibility with existing daily attendance.

### Phase 2 — Student Self Attendance

Create `/school/my-attendance` for students:

- authoritative server clock;
- school-day status;
- GPS + accuracy;
- geofence distance;
- direct camera selfie capture;
- check-in;
- late calculation;
- check-out;
- own attendance history;
- entry point to permit/sick workflow.

### Phase 3 — Duty Teacher Gen 2

Upgrade `/school/governance/piket` into an operational gate console:

- live arrival summary;
- student search;
- late-arrival entry;
- early-leave/dispensation entry;
- reason/action notes;
- digital class-entry pass;
- per-student audit events;
- keep legacy aggregate report compatibility.

### Phase 4 — Homeroom Reconciliation

Upgrade `/school/attendance` into:

- Today;
- Needs Verification;
- Monthly Matrix;
- Student History;
- Reports.

Existing full-roster manual entry remains as fallback, but evidence-driven reconciliation becomes the normal path.

### Phase 5 — LMS Subject Attendance Integration

- emit Attendance Core events from LMS attendance sessions;
- support `TERLAMBAT` and `DISPENSASI` subject statuses;
- keep teacher/course authorization;
- connect attendance session with teaching agenda where possible;
- detect gate-present / subject-absent patterns.

### Phase 6 — Monthly Matrix & Reporting

Provide 1–31 monthly matrix with:

- H / S / I / A / T;
- totals;
- attendance percentage;
- official class report view;
- printable mode;
- CSV/XLSX/PDF export where supported safely.

### Phase 7 — Habituation Attendance

- activity definitions;
- scheduled sessions;
- participation recording;
- executive participation reports;
- separate character-participation signals.

### Phase 8 — Attendance EWS Gen 3 & Executive Monitoring

Add signals for:

- consecutive ALPA;
- repeated lateness;
- low attendance percentage;
- repeated early leave;
- gate presence with repeated subject absence;
- unresolved attendance conflicts;
- habituation participation trend as a separate signal.

EWS remains prioritization/decision support, never automatic punishment.

## 7. Target Navigation

Staff:

- Kehadiran / Command Center;
- Presensi Harian;
- Guru Piket;
- Presensi Mapel;
- Pembiasaan;
- Izin & Dispensasi;
- Kalender Sekolah;
- Pengaturan Kehadiran;
- Audit Trail.

Student:

- Beranda;
- Kehadiran Saya;
- Pembelajaran;
- PKL.

## 8. Integrity and Security Requirements

- tenant isolation on every query/mutation;
- server-authoritative timestamps and late calculations;
- server-side geofence validation from submitted coordinates;
- configurable GPS-accuracy threshold;
- authenticated evidence retrieval only;
- browser GPS must be treated as evidence, not an absolute anti-spoof guarantee;
- direct-camera UX where platform allows, with documented browser limits;
- idempotent check-in/check-out per student/date/type;
- append-oriented evidence events;
- audited corrections rather than destructive evidence edits;
- optimistic concurrency for mutable verification state;
- active academic-year/class validation;
- no writes to genuine production student data during automated UAT.

## 9. UI Principles

All new surfaces follow root `DESIGN.md`:

- Apple HIG/macOS-inspired School OS visual language;
- system fonts;
- Lucide icons;
- grouped surfaces;
- high-density desktop tables where appropriate;
- >=44px touch targets on mobile;
- status never communicated by color alone;
- no large redesign of unrelated modules.

## 10. Release and Verification Strategy

Each phase uses:

1. current-production reconciliation;
2. database backup before migration/write UAT;
3. isolated branch/worktree;
4. targeted unit tests;
5. reversible synthetic multi-tenant real-DB UAT;
6. full Vitest regression;
7. Wasp build;
8. server bundle;
9. SSR + client production builds;
10. immutable deploy preflight;
11. bounded deploy;
12. post-deploy auth/security/DB/service/log verification;
13. permanent release documentation.

If another parallel session promotes a newer production release, reconcile before deployment and never overwrite it blindly.

## 11. Completion Criteria

Attendance 360 is complete when:

- students can securely check in/out with policy/geofence/evidence;
- duty teachers can record per-student gate events;
- LMS attendance feeds the attendance core;
- permits feed reconciliation;
- homeroom teachers can verify conflicts and produce official daily/monthly records;
- monthly reports are administratively usable;
- habituation is independently recordable;
- EWS consumes richer attendance evidence;
- all role/tenant boundaries and audit trails pass production-grade UAT.


## 12. Production completion record

The approved roadmap was implemented and promoted on 22 September 2026 as release `d77dd38-attendance360`. Real-DB UAT passed **62/62**, full regression passed **163/163 across 30 files**, Wasp/server/SSR/client build gates passed, production migration/deploy passed, repeat deploy was idempotent, and post-deploy security/DB/service checks passed.

SMKN 12 Garut remained at **1,539 students / 50 active rombels / 0 genuine daily-attendance rows / 0 Attendance 360 events** immediately after deployment. Self-attendance policy was intentionally left unconfigured/inactive for the real school until authoritative coordinates, schedules, and calendar settings are entered by an authorized admin.

Detailed evidence: [`RELEASE_2026-09-22_ATTENDANCE_360.md`](./RELEASE_2026-09-22_ATTENDANCE_360.md).
