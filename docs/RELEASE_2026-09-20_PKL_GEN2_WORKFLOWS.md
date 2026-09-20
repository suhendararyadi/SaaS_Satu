# Release — PKL Generasi Kedua Workflow Suite

Date: **20 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

This release completes the School OS PKL Generasi Kedua roadmap after PKL Foundation Gen2.

## Runtime

- production release: `5aee74e-pkl-gen2-full`
- application commit: `5aee74e9edeecd3c23533ce6b1ccfb28f8dcc8c1`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/5aee74e-pkl-gen2-full`
- static: `/var/www/saas-satu/releases/5aee74e-pkl-gen2-full`
- service: `saas-satu.service` active
- rollback release: `45a11a5-pkl-foundation-gen2`

## Completed scope

### 1. Placement Gen2

Route:

`/school/pkl/placements`

Admin workspace now supports:

- PKL Period filtering;
- concentration/Department filtering;
- eligible DUDI filtering from `CompanyDepartment`;
- live remaining quota from `PklCompanyCapacity`;
- single/bulk placement through checkbox selection;
- server-side over-capacity rejection;
- Guru Pembimbing assignment;
- Pembimbing DUDI assignment;
- status lifecycle `PLANNED / ACTIVE / COMPLETED / CANCELED`;
- placement date editing;
- notes;
- DUDI transfer;
- mentor change;
- permanent event history through `PklPlacementEvent`.

Placement Gen1 compatibility remains in legacy actions, but Gen2 workspace uses period/concentration capacity rather than `Company.maxQuota`.

### 2. PKL Readiness Check

Before activation, server checks:

- PKL Period exists and is active;
- placement dates fit inside the PKL Period;
- DUDI and partnership are active;
- DUDI accepts the student's concentration;
- period/concentration quota exists and has remaining capacity;
- Guru Pembimbing is assigned;
- Pembimbing DUDI is assigned and belongs to the selected DUDI;
- DUDI GPS presence is reported as a warning.

Only `PLANNED` placements that pass blockers can become `ACTIVE`.

### 3. Attendance Gen2

Route:

`/school/pkl/attendance`

Features:

- active-placement enforcement;
- placement and PKL Period date-window enforcement;
- DUDI geofence server calculation;
- `INSIDE / OUTSIDE / UNVERIFIED` geofence metadata;
- DUDI work schedule;
- working-day validation;
- late threshold and `TERLAMBAT`;
- statuses `HADIR / TERLAMBAT / IZIN / SAKIT / ALPA / LIBUR`;
- student exception flow for Izin/Sakit;
- admin correction flow with correction actor/time/reason;
- optional selfie/evidence upload through the existing S3 signed-upload pipeline;
- evidence access remains scoped through signed download URLs.

If file upload is not configured on a deployment, the UI reports that upload is unavailable without breaking attendance.

### 4. Journal Gen2

Route:

`/school/pkl/journals`

Features:

- one date-oriented journal workflow per placement;
- `DRAFT → SUBMITTED → APPROVED / REVISION`;
- activity;
- competencies/skills;
- obstacles/solutions;
- reflection;
- optional documentation upload;
- student edit/resubmit for DRAFT/REVISION;
- revision snapshots through `DailyJournalRevision`;
- separate Teacher review and DUDI Mentor review;
- separate scores/feedback/timestamps;
- aggregate legacy score retained for compatibility;
- approval requires all assigned reviewer roles to approve.

### 5. Monitoring & EWS Gen2

Route:

`/school/pkl/monitoring`

EWS now includes:

- PLANNED placement readiness blockers;
- placement ready but not activated;
- no attendance;
- repeated ALPA;
- repeated out-of-radius check-in;
- no journal;
- stale journal;
- submitted journal review delayed ≥2 days;
- PKL approaching end without approved journal administration.

EWS remains role/assignment scoped and connects to the existing Follow-Up workflow.

### 6. Role-specific PKL panel

Route:

`/school/pkl`

Role-aware summary:

- School Admin: full school scope;
- Teacher: only supervised placements;
- Student: only own placement;
- DUDI Mentor: only assigned placements.

Navigation for Teacher, Student, and DUDI Mentor now points to the PKL summary and relevant Attendance/Journal/Monitoring/Report views.

### 7. Reports & administration

Route:

`/school/pkl/reports`

Features:

- filter by Period;
- concentration;
- DUDI;
- placement status;
- placement summary;
- print-ready report page;
- browser Print / Save as PDF;
- Excel-compatible CSV exports for:
  - placements;
  - attendance;
  - journals.

Server report scope follows the active role/assignment.

### 8. PKL Import

Route:

`/school/pkl/import`

Supported import kinds:

- DUDI;
- Pembimbing DUDI;
- capacity;
- placement.

Workflow:

`template XLSX → upload XLSX/CSV → preview → validate → commit`

Properties:

- real XLSX template generation in browser;
- XLSX first-sheet parser;
- server-side validation against current School OS masters;
- preview hash prevents stale commit;
- invalid rows block commit;
- capacity import upserts capacity and DUDI↔Department relation;
- DUDI Mentor import does not create Auth/password/username/login email;
- placement import creates `PLANNED` placement only;
- placement import is atomic and re-checks open placements/capacity before commit;
- no production import data was inserted during rollout.

## New schema

Migration:

`20260920010500_add_pkl_gen2_workflows`

SHA-256:

`bcb47307076429be5f49b75120fb629874f697b9605845b85afb253a512f878a`

New models:

- `PklWorkSchedule`
- `PklPlacementEvent`
- `DailyJournalRevision`

Placement additions:

- `departmentId`
- notes/source
- readiness/activation/completion/cancellation timestamps
- created/updated timestamps

Attendance additions:

- geofence/schedule metadata
- evidence
- correction metadata

Journal additions:

- `dateOnly`
- competencies
- reflection
- evidence
- revision metadata
- independent Teacher/DUDI review metadata
- created/updated timestamps

Migration also backfilled 7 existing journals belonging to other tenants with `dateOnly` and `submittedAt` compatibility values. SMKN 12 Garut had zero journals and was unaffected by that backfill.

## Backup & migration verification

Pre-migration backup:

`/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-workflows-20260920.dump`

Verified:

- size: 1,508,542 bytes;
- mode: 0600;
- owner: ubuntu;
- `pg_restore -l`: PASS.

Migration was restored and applied to a temporary clone before production.

Clone checks:

- all 3 new tables: PASS;
- Placement Gen2 columns: 9/9;
- Attendance Gen2 columns: 7/7;
- Journal Gen2 columns: 19/19;
- students remained 1,539;
- PTK remained 103;
- Company/PklPeriod/Placement remained 0.

Temporary database was dropped after verification.

## Quality gate

- `git diff --check`: PASS;
- Prisma validation: PASS;
- targeted PKL tests: 12/12 PASS;
- full Vitest: **148/148 PASS** across **26 test files**;
- Wasp build: PASS;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client build: PASS;
- immutable deploy preflight: PASS;
- production deployment: PASS;
- repeat deployment: `idempotent: true`.

## Production verification

Routes HTTP 200:

- `/school`
- `/school/pkl`
- `/school/pkl/foundation`
- `/school/pkl/placements`
- `/school/pkl/attendance`
- `/school/pkl/journals`
- `/school/pkl/monitoring`
- `/school/pkl/reports`
- `/school/pkl/import`

Unauthenticated sensitive operations return HTTP 401:

- `get-placement-workspace`
- `create-placements-bulk`
- `activate-placement`
- `record-attendance-gen2`
- `save-daily-journal-gen2`
- `get-pkl-report-data`
- `preview-pkl-import`
- `commit-pkl-import`

## SMKN 12 Garut production baseline after rollout

No synthetic PKL data was inserted.

- students: **1,539**
- PTK: **103**
- Company: **0**
- PklPeriod: **0**
- DudiMentorProfile: **0**
- PklCompanyCapacity: **0**
- Placement: **0**
- AttendanceLog: **0**
- DailyJournal: **0**
- PklWorkSchedule: **0**
- PklPlacementEvent: **0**

The application workflow is therefore complete and ready for authoritative PKL data later.

## Current continuation point

The Gen2 feature workflow is complete. Until authoritative PKL data is supplied, the safest next work is refinement/UX review, automated integration tests for operations, and optional official document templates (school letterheads/sertifikat) rather than creating production PKL records.
