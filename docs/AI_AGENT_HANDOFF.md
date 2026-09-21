# School OS — AI Agent Handoff

Last verified: **20 September 2026 (Asia/Jakarta)**.

This is the fast, durable entry point for any AI agent continuing School OS work. Read this file first, then [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for the full persistent context and the release documents linked below.

If documentation and runtime disagree, **runtime + repository verification wins**. Update this handoff after verified production changes.

## 1. Active project

- Product: **School OS**, multi-tenant school SaaS.
- Active operational tenant: **SMKN 12 Garut**.
- Production: `https://sekolah.suhendararyadi.com`.
- Repository baseline: `/home/ubuntu/projects/SaaS_Satu`.
- Active School OS worktree: `/home/ubuntu/projects/SaaS_Satu-hardening`.
- Active branch: `redesign/apple-hig`.
- Current application commit: `197c969ccaa2287ea9c80b55e5a18eaa89139f8f` — PKL Mitra DUDI nullable optional-field validation fix.
- Production release: `197c969-pkl-company-edit-fix`.
- Current backend pointer: `/home/ubuntu/deployments/SaaS_Satu/releases/197c969-pkl-company-edit-fix`.
- Current static pointer: `/var/www/saas-satu/releases/197c969-pkl-company-edit-fix`.
- Rollback backend release: `d0809d4-pkl-uat-hardening`.
- Rollback static release: `066254d-pkl-foundation-permission-ui`.
- Service: `saas-satu.service` **active**.

## 2. Production baseline — SMKN 12 Garut

Verified on 20 September 2026:

- students: **1,539**;
- StudentProfile: **1,539**;
- active rombel: **50**;
- PTK / TeacherProfile: **103**;
- PTK composition: **80 Guru, 22 Tenaga Kependidikan, 1 Kepala Sekolah**;
- PTK Auth/login rows: **0**;
- student Auth/login created during Dapodik onboarding: **0**;
- all 50 rombel have authoritative program/concentration mapping and homeroom assignment;
- Wakasek: **4**;
- SchoolStaffAssignment from authoritative school profile: **43**;
- FacilityRoom: **75**;
- AssetItem source records: **816**, representing **2,512 units**.

Tenant student-isolation baseline:

- SMKN 12 Garut: **1,539**;
- SMKN 1 Rongga: **21**;
- SMPN 1 Gununghalu: **0**.

Do not change these numbers by synthetic seeding, bulk cleanup, or guessed identity correction.

## 3. Authoritative SMKN 12 Garut program mapping

The official school profile workbook established:

- A → Agribisnis Tanaman Pangan dan Hortikultura — Program Agribisnis Tanaman
- B → Teknik Sepeda Motor — Program Teknik Otomotif
- C → Desain Komunikasi Visual
- D → Bisnis Retail — Program Pemasaran
- E → Layanan Perbankan Syariah — Program Akuntansi dan Keuangan Lembaga
- F → Agribisnis Perbenihan Tanaman — Program Agribisnis Tanaman
- G → Agribisnis Perikanan Air Tawar — Program Agribisnis Perikanan

This mapping is already live. Do not infer or remap A–G from naming heuristics.

## 4. Student database contract

Student data follows the Dapodik-aligned `StudentProfile` model.

Primary routes:

- `/school/students`
- `/school/students/new`
- `/school/students/:id`
- `/school/students/:id/edit`
- `/school/import`

Important safety constraints:

- never overwrite existing students with sample/demo workbook data;
- never guess identity fields;
- duplicate/conflicting authoritative identity rows must remain unresolved until corrected by the school/operator;
- temporary import payloads containing PII must be removed after verification;
- preserve tenant isolation on every query and write.

## 5. Guru & Tenaga Kependidikan contract

PTK routes:

- `/school/teachers`
- `/school/teachers/:id`
- `/school/teachers/:id/edit`

`TeacherProfile` includes Dapodik-aligned optional fields for NIP, NUPTK, gender, birth place/date, NIK, employment/PTK status, titles, education, certification, TMT, duties, subjects, JJM/workload, competencies, job title, contact, and `dapodikImportedAt`.

Current production completeness from the authoritative workbook:

- 103/103 PTK profiles backfilled;
- NUPTK present: 100;
- NIK present: 103;
- NIP present: 96.

Privacy/security:

- NUPTK, NIK, birth place, and birth date are sensitive;
- non-admin directory viewers receive a privacy-safe server projection;
- complete edit requires `requireSchoolAdmin` / `manageSchool`;
- `updateSchoolTeacherProfile` is tenant-scoped;
- duplicate NIP/NUPTK/NIK within the school and duplicate email are rejected;
- PTK profile edit must **not** modify WakasekAssignment, homeroom assignment, SchoolStaffAssignment, username, or Auth/login.

Organization assignments are managed separately in the Structure & Assignment center.

## 5.1 PKL Foundation Generasi Kedua — LIVE

Production now includes the Gen2 foundation required before placement modernization.

Admin route:

- `/school/pkl/foundation`

Foundation models/contracts:

- `PklPeriod` — first-class PKL program/period linked optionally to AcademicYear;
- `CompanyDepartment` — explicit DUDI ↔ concentration relation;
- `PklCompanyCapacity` — quota per Period × DUDI × concentration;
- `DudiMentorProfile` — managed industrial mentor master;
- richer `Company` partnership profile: code, legal name, contact, website, partnership status/dates, MoU/PKS, notes, archive state;
- optional `Placement.pklPeriodId`, ready for Placement Gen2.

DUDI Mentor creation creates a master `User` role `DUDI_MENTOR` but **does not create Auth, password, username, or login email**. Archive semantics preserve history.

Legacy `Company.maxQuota` remains active for Placement Gen1. The new period/concentration capacity is planning data until Placement Gen2 switches quota enforcement.

No synthetic PKL data has been inserted for SMKN 12 Garut. Verified post-rollout counts:

- Company: **0**
- PklPeriod: **0**
- DudiMentorProfile: **0**
- PklCompanyCapacity: **0**
- Placement: **0**
- DUDI Mentor Auth: **0**

Release handoff: [`RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md`](./RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md).

## 5.2 PKL Generasi Kedua Workflow Suite — LIVE

The complete Gen2 workflow is now live:

- role-aware summary: `/school/pkl`;
- Placement Gen2: period/concentration-aware workspace, eligible DUDI, live quota, bulk placement, `PLANNED / ACTIVE / COMPLETED / CANCELED`, edit, transfer, and event history;
- PKL Readiness Check before activation;
- Attendance Gen2: active/date enforcement, geofence metadata, DUDI work schedule, late status, Izin/Sakit, ALPA/LIBUR admin correction, and optional S3 selfie/evidence;
- Journal Gen2: Draft/Submit/Revision/Approved, competency/reflection/documentation, revision snapshots, independent Teacher + DUDI Mentor review;
- Monitoring/EWS Gen2: readiness, attendance, journal, review-delay, and near-completion signals;
- role panels for Admin/Teacher/Student/DUDI Mentor;
- print-ready reports + browser PDF + Excel-compatible CSV;
- PKL import for DUDI/Mentor/Capacity/Placement using XLSX/CSV preview → validation → commit.

Migration: `20260920010500_add_pkl_gen2_workflows`.

Release: `5aee74e-pkl-gen2-full`.

No synthetic PKL data was inserted for SMKN 12 Garut. Current PKL rows for Company/Period/Mentor/Capacity/Placement/Attendance/Journal/Schedule/Event remain **0**.

Release handoff: [`RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md`](./RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md).

## 5.3 PKL Gen2 UAT & Operational Hardening — LIVE

Production release: `d0809d4-pkl-uat-hardening`.

Technical UAT used an isolated PostgreSQL database and permanent reusable harness under `app/uat/`. Final result: **19/19 real-database UAT PASS**, plus **148/148 normal regression tests PASS**.

Hardening added server invariants for active placement assignments, valid completion lifecycle, attendance ordering/day-state conflict, work-schedule validation, future-start EWS suppression, batch import validation, transaction-level student/quota locking, concurrent transfer safety, concurrent journal serialization, and authenticated evidence-status access.

No schema/migration change was required.

SMKN 12 Garut remains **1,539 students / 103 PTK / zero PKL production rows**.

The temporary UAT database was removed after verification.

Human acceptance still required only for real-device GPS/geofence, camera/selfie, mobile-network behavior, and subjective mobile/operator UX.

Release handoff: [`RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md`](./RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md).

## 5.5 PKL Gen2 database ownership fix — LIVE

On 21 September 2026 the PKL Foundation UI showed zero values although the demo rows existed. Production logs revealed PostgreSQL `permission denied` errors on the Gen2 tables.

Root cause: seven tables created by PKL Gen2 migrations were owned by `postgres`, while the runtime application uses database role `saas_satu_staging`.

Ownership was aligned in one transaction for:

- `PklPeriod`
- `CompanyDepartment`
- `PklCompanyCapacity`
- `DudiMentorProfile`
- `DailyJournalRevision`
- `PklWorkSchedule`
- `PklPlacementEvent`

Application-role verification now reads demo Foundation counts **1 period / 1 company / 1 mentor / total quota 1**.

The Foundation page was also hardened so query failures display an error banner instead of silently appearing as zero data.

Backend remains `d0809d4-pkl-uat-hardening`; static UI is `066254d-pkl-foundation-permission-ui`.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-permission-fix-20260921.dump`.

Release handoff: [`RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md`](./RELEASE_2026-09-21_PKL_GEN2_PERMISSION_FIX.md).

## 5.6 PKL Mitra DUDI edit validation fix — LIVE

On 21 September 2026, editing the demo DUDI and saving geofence coordinates failed with `Operation arguments validation failed`.

Production Zod logs showed `picName` and `picPhone` were sent as `null` by the UI while the backend schema accepted only string/undefined. `industrySector` had the same latent contract mismatch.

The backend input contract now accepts nullable optional values for these fields. The company schema moved to `app/src/pkl/companyPolicy.ts` with regression coverage in `app/src/pkl/companyValidation.test.ts`.

Quality gate: targeted validation/policy **13/13 PASS**, full regression **150/150 PASS** across 27 files, Wasp build PASS, server bundle PASS, Vite SSR/client PASS, immutable preflight/deploy PASS, repeated deploy idempotent true.

Production end-to-end verification invoked the deployed `updateCompany` business operation with empty PIC fields and the captured geofence coordinates. Coordinates persisted successfully. The demo placement readiness is now **ready=true, blockers=0, warnings=0**.

Release: `197c969-pkl-company-edit-fix`.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-geo-update-20260921.dump`.

Release handoff: [`RELEASE_2026-09-21_PKL_COMPANY_EDIT_VALIDATION_FIX.md`](./RELEASE_2026-09-21_PKL_COMPANY_EDIT_VALIDATION_FIX.md).

## 6. Active design contract

The active UI system is **School OS — Apple HIG-inspired**.

Source of truth: [UI_UX_APPLE_HIG.md](./UI_UX_APPLE_HIG.md).

Important:

- `M3*` component names and `components/m3/` are legacy API compatibility names only;
- they do **not** make Material 3 the active visual design authority;
- do not redesign new School OS work back toward Material 3;
- preserve macOS-like compact shell, restrained grouped surfaces, system typography/colors, thin separators, responsive iOS-like mobile behavior, and role-aware navigation;
- use real production data only; do not invent dashboard metrics.

## 7. Authorization and multi-tenant rules

`schoolId` is the tenant boundary.

For every School OS data operation:

1. authenticate;
2. resolve authorized capability/role;
3. scope reads/writes to the active `schoolId`;
4. apply assignment-specific filters where relevant;
5. treat UI visibility as presentation only, never as the security boundary.

Sensitive school data must be protected by server DTO/projection and authorization, not CSS or conditional rendering alone.

## 8. Deployment contract

Use bounded MSO project functions from `.mso/functions.json`.

For backend/full-stack release:

1. build/verify source;
2. run tests;
3. build generated server bundle;
4. build Vite SSR/client;
5. stage immutable backend/static release;
6. call `school_os_deploy_preflight`;
7. call `school_os_deploy_release`;
8. verify service, pointers, public smoke, authorization boundary, and production baseline;
9. rerun deployment for idempotency when relevant;
10. update documentation and native project memory.

Do not bypass service-control guards with force kills or ad-hoc production process manipulation.

For frontend-only changes, prefer the bounded static-only preflight/deploy path.

## 9. Latest production rollout verification — PKL Gen2 UAT Hardening

PKL Gen2 UAT/hardening quality gate:

- real-database UAT: **19/19 PASS** across **2 UAT files**;
- targeted PKL tests: **12/12 PASS**;
- full normal Vitest regression: **148/148 PASS** across **26 files**;
- Prisma validation: PASS;
- Wasp build: PASS;
- generated server bundle: PASS;
- Vite SSR/client builds: PASS;
- immutable deploy preflight: PASS;
- production deploy: PASS;
- repeat deploy: idempotent PASS;
- all PKL routes including dashboard/placement/attendance/journal/monitoring/reports/import: HTTP 200;
- unauthenticated sensitive Gen2 operations: HTTP 401;
- final SMKN 12 baseline: **1,539 students / 103 PTK / zero PKL production data**;
- temporary UAT database removed after verification.

Rollback release: `5aee74e-pkl-gen2-full`.

## 10. Backups that matter

- pre SMKN 12 student write:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`
- pre official profile/PTK/Sarpras import:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`
- pre Dapodik PTK detail migration/backfill:
  `/home/ubuntu/backups/SaaS_Satu/pre-ptk-detail-dapodik-20260916.dump`
- pre PKL Foundation Gen2 migration:
  `/home/ubuntu/backups/SaaS_Satu/pre-pkl-foundation-gen2-20260920.dump`
- pre PKL Gen2 workflow migration:
  `/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-workflows-20260920.dump`
- pre PKL Gen2 UAT hardening deploy:
  `/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-uat-hardening-20260921.dump`

Do not delete these as routine cleanup.

## 11. Documentation reading order

For a new agent:

1. **this file** — current compact handoff;
2. [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — full persistent project state;
3. [RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md);
4. [RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md);
5. [RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md](./RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md);
6. [RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md](./RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md);
7. [RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md](./RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md);
8. [RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md](./RELEASE_2026-09-20_PKL_GEN2_WORKFLOWS.md);
9. [RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md](./RELEASE_2026-09-21_PKL_GEN2_UAT_HARDENING.md) — current PKL state;
10. area-specific docs such as `UI_UX_APPLE_HIG.md`, `ARCHITECTURE.md`, `MODULES_GUIDE.md`, and `DEMO_DATA.md`.

## 12. Durable AI memory

Critical long-term knowledge now has a **VPS-global persistent layer** outside the project:

`/home/ubuntu/.mso/agent-memory`

This is the durable authority for high-value confirmed `project.school_os.*` semantic/procedural claims and remains available if this worktree is deleted or re-cloned.

Global manifest:

`/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`

Latest verified snapshot after PKL Foundation Gen2:

`/home/ubuntu/backups/MSO/global-agent-memory-20260921T1024WIB.tar.gz`

Repo-local memory under `.agent/memory/` still exists, but it is **operational Project/RASMIC memory**, not the sole permanent store. It is appropriate for tasks, debug/test evidence, failures, and local decisions.

Full contract: [`GLOBAL_PERSISTENT_MEMORY.md`](./GLOBAL_PERSISTENT_MEMORY.md).

Do not store raw student/PTK PII, credentials, tokens, or private keys in either global or repo-local memory. Promote globally only confirmed high-value counts, decisions, schema/contracts, provenance, release ids, and safety constraints.

## 13. Current continuation point

PKL Foundation + the complete PKL Generasi Kedua workflow suite are finished and live. Until authoritative PKL data is supplied, do not seed synthetic PKL production records; focus only on review/refinement or approved next features.

Before starting the next feature:

- inspect current runtime/repository state;
- retrieve VPS-global Agent Memory for `project.school_os.*`, then project-local memory as needed;
- preserve the SMKN 12 Garut production baseline;
- use authoritative data for identity/program mappings;
- update this handoff again after any verified production change.

---

## Temporary PKL demo — 21 September 2026

The owner explicitly authorized one minimal reversible PKL demo dataset in SMKN 12 Garut production for direct testing. This supersedes earlier statements in this document that PKL production counts are zero while the demo remains.

Current demo counts: Company 1, PklPeriod 1, DudiMentorProfile 1, PklCompanyCapacity 1, Placement 1 (PLANNED), PklWorkSchedule 1, PklPlacementEvent 1, AttendanceLog 0, DailyJournal 0.

Demo company: DEMO-PKL-01 — PT Demo PKL School OS. One existing grade XII student and one existing teacher supervisor are linked. A synthetic DUDI mentor named Pembimbing DUDI Demo exists without Auth/login. GPS coordinates are intentionally unset.

Pre-demo backup: /home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-smkn12-20260921.dump

Cleanup script: /home/ubuntu/backups/SaaS_Satu/pkl-demo-smkn12-20260921.cleanup.sql

When the owner says testing is complete, remove this demo dataset and restore the zero-PKL baseline.
