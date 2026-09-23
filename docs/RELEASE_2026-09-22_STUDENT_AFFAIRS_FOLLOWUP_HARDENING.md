# Release 2026-09-22 — Kesiswaan Terpadu + Tindak Lanjut Production-Grade Hardening

Status: **production / verified**  
Application commit: `0d52d90`  
Production release: `0d52d90-student-affairs-followup`

## Scope

This release hardens **Kesiswaan Terpadu** and **Tindak Lanjut** as one production workflow, covering:

- pelanggaran siswa;
- prestasi;
- pembinaan;
- izin/dispensasi;
- audit events;
- manual and automatic Follow-Up cases;
- role/scope boundaries for School Admin, Wakasek Kesiswaan, wali kelas, ordinary teachers, and students;
- tenant isolation;
- EWS Gen 2 student-affairs signals;
- lifecycle reopen/resolve behavior;
- concurrent editor protection.

The release is based on the production lineage that already contains PKL Gen 2 and Presensi Harian + Wali Kelas hardening.

## Production baseline

Read-only checks against SMKN 12 Garut before UAT:

- students: **1,539**;
- StudentViolation: **0**;
- StudentAchievement: **0**;
- StudentCoaching: **0**;
- StudentPermit: **0**;
- StudentAffairsEvent: **0**;
- SchoolFollowUpCase: **0**.

No genuine SMKN 12 Garut Kesiswaan or Follow-Up row was created during automated UAT.

## Key findings and fixes

### 1. Full roster capacity

The production Kesiswaan query previously used `take: 1500`, while SMKN 12 Garut has **1,539 students**. The final 39 students could therefore be omitted from the integrated Kesiswaan dataset.

The manual Follow-Up student selector was even narrower at `take: 500`.

Both flows now use the shared bounded constant:

`STUDENT_AFFAIRS_STUDENT_LIMIT = 5000`

Real-production read-only verification confirmed both Kesiswaan and Follow-Up now return **1,539 / 1,539** students.

### 2. Explicit class/student scope integrity

Explicit `classRoomId` and `studentId` selections now have server-side scope validation instead of degrading into empty/misleading datasets.

Verified protections include:

- wali kelas cannot select another wali's rombel;
- school admin cannot select another tenant's rombel;
- wali kelas cannot select a student outside the assigned active rombel;
- a student explicitly paired with the wrong selected class is rejected.

### 3. Active-year homeroom access

If no academic year is active, historical homeroom assignments no longer grant Kesiswaan access. A homeroom teacher only receives homeroom scope from the **active academic year**.

### 4. Historical-event date integrity

Server operations now reject:

- violation incidents dated in the future;
- achievement dates in the future.

Permit dates remain allowed to represent legitimate future permission requests; their start/end ordering is still validated separately.

### 5. Follow-Up assignee integrity

Crafted requests previously could assign a Follow-Up case to any same-school user, even though the UI only offered operational staff.

Backend validation now matches the UI contract: Follow-Up assignee must be a valid same-school:

- `TEACHER`; or
- `SCHOOL_ADMIN`.

Student and cross-tenant assignment attempts are rejected.

### 6. Optimistic concurrency

Mutable workflow records now protect against near-simultaneous stale writes using `updatedAt` optimistic guards for:

- StudentViolation;
- StudentAchievement;
- StudentCoaching;
- StudentPermit;
- SchoolFollowUpCase.

A conflicting write returns HTTP 409 instead of silently overwriting another editor's state. Real-DB UAT verified that two competing Follow-Up transitions produce one winning status mutation and one status-change audit event.

### 7. Clean reopen semantics

When resolved/completed records are reopened, stale resolution metadata is now cleared while immutable audit events remain available as history.

Verified cases:

- violation `RESOLVED → IN_REVIEW` clears stored resolution note/time and reopens linked Follow-Up to `IN_PROGRESS`;
- coaching `COMPLETED → IN_PROGRESS` clears completion/resolution fields in both coaching and linked Follow-Up;
- Follow-Up `RESOLVED → IN_PROGRESS` clears `resolutionNote`, `resolvedAt`, and `resolvedById`;
- permit `REJECTED → REQUESTED` clears stale `approvedById`, `approvalNote`, and `returnedAt`.

### 8. EWS Gen 2 integration

A live HIGH violation created in isolated UAT generated the expected `STUDENT_AFFAIRS / OPEN_VIOLATION_HIGH` signal in EWS Gen 2 for the authorized scope.

## Real-database UAT

A reversible multi-tenant UAT fixture was created only after a production database backup. It included:

- School Admin;
- Wakasek Kesiswaan;
- two wali kelas;
- ordinary teacher;
- students across multiple rombels;
- a separate tenant;
- a school with historical homeroom data but no active academic year.

Result: **55/55 PASS**.

Coverage included:

- full 1,539-student production read capacity;
- admin/Waka/wali scope;
- ordinary teacher/student denial;
- tenant isolation;
- explicit class/student selector validation;
- historical homeroom denial without active academic year;
- future violation/achievement rejection;
- invalid handler/assignee rejection;
- HIGH violation automatic Follow-Up;
- MEDIUM violation no-auto-follow-up behavior;
- violation transition and mandatory-resolution-note rules;
- Kesiswaan-to-EWS signal propagation;
- resolve/reopen synchronization;
- achievement create/update scope;
- coaching lifecycle and linked Follow-Up;
- permit lifecycle and reopened decision metadata;
- manual Follow-Up assignment policy;
- homeroom teacher Follow-Up work/comment permissions;
- cross-tenant Follow-Up isolation;
- concurrent competing Follow-Up transitions;
- StudentAffairsEvent and Follow-Up audit history.

The temporary UAT tenants and users were deleted in the script `finally` block. Post-cleanup verification returned:

- UAT schools: **0**;
- UAT users: **0**;
- all genuine SMKN 12 Garut Kesiswaan tables: **0**;
- genuine SMKN 12 Garut Follow-Up cases: **0**.

## Automated quality gate

- targeted Kesiswaan/Follow-Up/EWS tests: PASS;
- full Vitest regression: **157/157 PASS across 29 files**;
- `git diff --check`: PASS;
- Wasp compile/build: PASS;
- generated server bundle: PASS;
- Vite SSR build: PASS;
- Vite client build: PASS;
- Prisma/schema change: **none**.

Existing toolchain dependency audit warnings (`8 moderate / 5 high`) were left unchanged; no forced dependency upgrade was mixed into this scoped release.

## Production deployment verification

Full immutable deploy preflight: PASS.  
Full backend/static deployment: PASS.  
Repeat deployment: **idempotent=true**.

Production pointers:

- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/0d52d90-student-affairs-followup`;
- static: `/var/www/saas-satu/releases/0d52d90-student-affairs-followup`;
- `saas-satu.service`: **active**.

Public/security smoke:

- `/school`: 200;
- `/auth/me`: 200;
- unauthenticated protected dashboard: 401;
- `/school/student-affairs`: 200;
- `/school/follow-up`: 200;
- all 12 tested Kesiswaan/Follow-Up operation endpoints: **401 unauthenticated**.

Post-restart service logs show successful auth initialization, pg-boss startup, server listening on port 3101, and no uncaught/unhandled/fatal/error scan findings.

VPS health after deployment:

- CPU: 0% at sample time;
- memory: ~1.83 GB / 12.5 GB;
- disk: ~62.5 GB / 186 GB.

## Backup and rollback

Pre-UAT database backup:

`/home/ubuntu/backups/SaaS_Satu/pre-student-affairs-followup-uat-20260922.dump`

Immediate rollback release captured by the deploy runner:

`16bad88-attendance-wali-hardening`

No rollback was required.
