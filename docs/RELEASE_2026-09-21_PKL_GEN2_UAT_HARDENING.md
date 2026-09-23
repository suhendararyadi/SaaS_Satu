# Release — PKL Gen 2 UAT & Operational Hardening

Date: **21 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

This release completes the technical UAT and operational-hardening phase for School OS PKL Generasi Kedua.

## Runtime

- production release: `d0809d4-pkl-uat-hardening`
- application commit: `d0809d4d5492953476eb54894302794dfbbb294b`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/d0809d4-pkl-uat-hardening`
- static: `/var/www/saas-satu/releases/d0809d4-pkl-uat-hardening`
- service: `saas-satu.service` active
- rollback release: `5aee74e-pkl-gen2-full`

No schema or migration change was required for this hardening release.

## UAT architecture

UAT used a separate temporary PostgreSQL database:

`saas_satu_pkl_uat_20260921`

The UAT database was created from the current Prisma schema, populated only with synthetic multi-tenant PKL fixtures, and removed after verification.

Permanent reusable UAT harness:

- `app/uat/pklGen2.integration.ts`
- `app/uat/pklGen2Race.integration.ts`
- `app/vitest.pkl-uat.config.ts`

The UAT harness is intentionally outside the normal client Vitest include path and requires an explicit `PKL_UAT_DATABASE_URL`.

## UAT result

Final real-database UAT:

- **19/19 PASS**
- **2/2 UAT test files PASS**

Coverage includes:

1. bulk placement with tenant, concentration, duplicate-placement and Gen2 quota enforcement;
2. readiness and activation assignment scope;
3. active placement invariant;
4. DUDI transfer and placement event history;
5. attendance ordering, schedule, geofence, ownership and day-state conflict;
6. Journal Draft → Submit → Teacher review → DUDI review;
7. role dashboards and reports without tenant/assignment leakage;
8. future-start EWS behavior;
9. import preview aggregate capacity and atomic commit behavior;
10. evidence status authentication;
11. confirmation that production tenant is absent from the UAT database;
12. work-schedule validation;
13. concurrent placement requests competing for the final quota slot;
14. concurrent same-day journal writes;
15. admin attendance date-window enforcement;
16. concurrent transfer requests competing for one target quota slot;
17. import placement racing manual plotting against one quota slot;
18. admin day status conflicting with recorded presence;
19. concurrent plotting of one student to different DUDI.

## Defects found and fixed

UAT identified defects that ordinary unit/policy tests did not cover.

### Placement lifecycle

- ACTIVE placement can no longer lose its Guru Pembimbing or Pembimbing DUDI through edit.
- ACTIVE transfer requires a valid target DUDI mentor.
- PLANNED placement cannot be directly marked COMPLETED.
- lifecycle completion is restricted to ACTIVE placement.
- concurrent bulk placement now locks student rows and quota rows before insert.
- concurrent plotting of the same student to different DUDI produces at most one open placement.
- target-capacity transfer is rechecked under row lock inside the transaction.
- concurrent transfers cannot overbook the last target slot.

### Attendance

- CHECK_OUT is rejected unless CHECK_IN already exists that day.
- Izin/Sakit cannot coexist with recorded CHECK_IN/CHECK_OUT.
- manual day status must fall within the placement date range.
- admin manual day state is rejected if a presence record already exists; admin must use the explicit correction workflow.
- invalid workday strings are rejected.
- impossible work-schedule time ordering is rejected.

### Journal

- same placement/date journal writes are serialized on the Placement row.
- concurrent journal saves now resolve to one logical daily journal instead of duplicate records.

### EWS

- ACTIVE placements that have been activated before their future start date do not trigger no-attendance/no-journal alarms before PKL begins.

### Import

Placement preview now validates:

- existing open placement;
- student concentration availability;
- active DUDI and active partnership;
- DUDI↔concentration relation;
- configured period/DUDI/concentration capacity;
- aggregate capacity for the complete uploaded batch.

Placement import commit now locks student rows and capacity rows before insert. This keeps preview→commit behavior deterministic under concurrent manual plotting.

### Evidence endpoint

The PKL evidence-upload status operation now requires authenticated PKL access.

## Quality gate

- `git diff --check`: PASS
- Prisma validation: PASS
- targeted PKL tests: **12/12 PASS**
- normal full Vitest regression: **148/148 PASS** across **26 files**
- real-DB PKL UAT: **19/19 PASS**
- Wasp build: PASS
- generated server bundle: PASS
- Vite SSR build: PASS
- Vite client build: PASS
- immutable release preflight: PASS
- production deployment: PASS
- repeat deployment: `idempotent: true`

## Production verification

HTTP 200:

- `/school`
- `/school/pkl`
- `/school/pkl/foundation`
- `/school/pkl/placements`
- `/school/pkl/attendance`
- `/school/pkl/journals`
- `/school/pkl/monitoring`
- `/school/pkl/reports`
- `/school/pkl/import`

Unauthenticated sensitive PKL operations return HTTP 401, including:

- placement workspace;
- bulk placement;
- activation;
- transfer;
- Attendance Gen2;
- Journal Gen2;
- reports;
- import preview;
- import commit.

## Backup

Pre-deploy production backup:

`/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-uat-hardening-20260921.dump`

Verification:

- size: **1,524,261 bytes**
- mode: **0600**
- owner: **ubuntu**
- `pg_restore -l`: PASS
- SHA-256:
  `27a2a1cdb4fd42894d619f719fde3fca3b21a2419775da15bba0686618d86f5c`

## SMKN 12 Garut baseline after rollout

No synthetic PKL production data was inserted.

- students: **1,539**
- PTK: **103**
- Company: **0**
- PklPeriod: **0**
- DudiMentorProfile: **0**
- PklCompanyCapacity: **0**
- Placement: **0**
- AttendanceLog: **0**
- DailyJournal: **0**

The temporary UAT database was dropped after successful verification.

## Human review still required

The technical UAT cannot completely replace real-device acceptance testing. The following remain **NEEDS HUMAN REVIEW**:

- browser GPS permission on a real student phone;
- geolocation accuracy at an actual DUDI site;
- camera/selfie permission and capture flow on a real phone;
- real mobile-network behavior;
- subjective mobile UX, terminology and operator ease of use.

These items do not block the technical hardening release. They are the final human acceptance layer before authoritative PKL production data is onboarded.

## Dependency note

During the Wasp-generated install/build, `npm audit` reported existing dependency advisories (8 moderate, 5 high). They were not force-upgraded during this PKL UAT release because `npm audit fix --force` may introduce breaking dependency changes outside the PKL scope. A separate dependency-security review is recommended.
