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

Primary cross-agent source of truth: [../DESIGN.md](../DESIGN.md). Detailed implementation/history reference: [UI_UX_APPLE_HIG.md](./UI_UX_APPLE_HIG.md).

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

- pre Attendance 360 production migration/deploy:
  `/home/ubuntu/backups/SaaS_Satu/pre-attendance360-20260922.dump`

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

PKL Foundation + the complete PKL Generasi Kedua workflow suite are finished and live. Presensi Harian + Wali Kelas and Kesiswaan Terpadu + Tindak Lanjut have also completed production-grade hardening. The current application release is `d77dd38-attendance360`. Attendance 360 is now production-live and includes richer cross-module attendance evidence plus EWS Gen 3. The next module should be selected from remaining production-grade queue rather than reopening Attendance 360 without a concrete regression. Until authoritative PKL data is supplied, do not seed additional synthetic PKL production records beyond explicitly authorized reversible demo data.

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

Demo company: DEMO-PKL-01 — PT Demo PKL School OS. One existing grade XII student and one existing teacher supervisor are linked. A synthetic DUDI mentor named Pembimbing DUDI Demo exists without Auth/login. GPS coordinates are now configured from the owner's captured location and verified through the deployed updateCompany business operation.

Pre-demo backup: /home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-smkn12-20260921.dump

Cleanup script: /home/ubuntu/backups/SaaS_Satu/pkl-demo-smkn12-20260921.cleanup.sql

When the owner says testing is complete, remove this demo dataset and restore the zero-PKL baseline.


## Presensi Harian + Wali Kelas production-grade — 22 September 2026

Production release: `16bad88-attendance-wali-hardening`.

Verified baseline: SMKN 12 Garut 1,539 students, 50 active rombels, 50/50 homeroom assignments, 0 genuine daily-attendance rows. Isolated two-tenant real-DB UAT: **33/33 PASS** and fully cleaned. Full regression: **156/156 PASS across 29 files**. Wasp build, server bundle, SSR/client builds, full preflight/deploy, idempotent re-deploy, and unauthenticated operation security checks all PASS.

Important contracts now enforced: active-semester date bounds; complete roster exactly once; same-tenant STUDENT-only relations; explicit class/student report selection must remain in authorized scope; Wali Kelas is a personal workspace only for an assigned `TEACHER`; Admin uses Struktur & Penugasan plus Presensi Harian instead; `ALPA` feeds EWS Gen 2.

Release handoff: [`RELEASE_2026-09-22_DAILY_ATTENDANCE_WALI_HARDENING.md`](./RELEASE_2026-09-22_DAILY_ATTENDANCE_WALI_HARDENING.md).

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-attendance-wali-uat-20260922.dump`.


## Kesiswaan Terpadu + Tindak Lanjut production-grade — 22 September 2026

Production release: `0d52d90-student-affairs-followup`.

Production read verification: Kesiswaan students **1,539/1,539** and Follow-Up student options **1,539/1,539**. Genuine SMKN 12 Garut StudentViolation, StudentAchievement, StudentCoaching, StudentPermit, StudentAffairsEvent, and SchoolFollowUpCase rows remain zero.

Isolated real-DB UAT: **55/55 PASS**. Full regression: **157/157 PASS across 29 files**. Wasp build, server bundle, SSR/client builds, immutable full deploy, idempotent redeploy, 12 protected-operation auth checks, post-restart logs, and VPS health checks PASS.

Important contracts: active-year homeroom scope only; explicit class/student selectors remain within authorized scope; historical violation/achievement dates cannot be future; Follow-Up assignee must be same-school TEACHER/SCHOOL_ADMIN; mutable workflow records use optimistic `updatedAt` guards; reopen clears stale resolution/approval metadata while audit events remain; HIGH/CRITICAL Student Affairs findings can synchronize to Follow-Up and feed EWS Gen 2.

Release handoff: [`RELEASE_2026-09-22_STUDENT_AFFAIRS_FOLLOWUP_HARDENING.md`](./RELEASE_2026-09-22_STUDENT_AFFAIRS_FOLLOWUP_HARDENING.md).

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-student-affairs-followup-uat-20260922.dump`.


## Attendance 360 production-live — 22 September 2026

Production release: `d77dd38-attendance360`; runtime commit: `d77dd38`.

Attendance 360 is fully implemented: policy/calendar, student GPS+selfie check-in/out, append-oriented evidence events, Duty Teacher Gen 2, Wali Kelas reconciliation, LMS subject attendance integration, sick/permit reconciliation, monthly matrix, habituation, Command Center, audit trail, and EWS Gen 3. `SchoolDailyAttendance` remains canonical and `MANUAL`/`VERIFIED` human decisions are protected from silent automatic overwrite.

Quality gate: production-clone UAT **62/62 PASS**, full regression **163/163 across 30 files**, Wasp build/server bundle/SSR/client PASS, migration PASS, immutable deploy PASS, repeat deploy idempotent PASS. All new pages return 200, protected operations/evidence APIs return 401 unauthenticated, and service logs are clean.

Production baseline after deploy: SMKN 12 Garut **1,539 students, 50 active rombels, 0 daily-attendance rows, 0 Attendance 360 events, 0 Attendance 360 policies**. Policy is deliberately not auto-created; configure authoritative school coordinates/times/calendar before enabling student self-attendance.

Backup: `/home/ubuntu/backups/SaaS_Satu/pre-attendance360-20260922.dump`.

Release record: [`RELEASE_2026-09-22_ATTENDANCE_360.md`](./RELEASE_2026-09-22_ATTENDANCE_360.md).

## Student mobile Attendance UI live — 23 September 2026

Runtime release: `c083fdf-student-mobile-attendance`; runtime commit: `c083fdf`. The student mobile attendance view is now reference-inspired in composition but still strictly governed by root `DESIGN.md`: 16px grouped surfaces, system typography, system blue, subtle borders/shadows, Lucide icons, no decorative gradients, and semantic states with text/icon reinforcement.

Do not regress the new mobile hierarchy back to a generic desktop card stack. Also do not copy the external reference's branding/visual styling. Preserve the existing Attendance 360 server authority for geofence, GPS accuracy, selfie, schedule/calendar, idempotency and tenant isolation. Desktop behavior remains unchanged.

Release record: `docs/RELEASE_2026-09-23_STUDENT_MOBILE_ATTENDANCE_UI.md`.

## Student mobile attendance interaction rule — 23 September 2026

Live release `eada47c-student-mobile-selfie-nav` establishes two UX rules:

1. STUDENT mobile has no sidebar/hamburger drawer; use the shared student bottom navigation. Desktop sidebar remains.
2. On mobile Attendance 360, tapping the large `MASUK`/`PULANG` action opens the front-camera capture directly when selfie evidence is required. Successful evidence upload immediately feeds the existing `recordSelfAttendance` operation. Do not restore the removed mobile `Verifikasi presensi` card.

Keep `DESIGN.md` authoritative and preserve server-side geofence/GPS/schedule/selfie/idempotency/tenant validation.

## Student account uses school profile — 23 September 2026

Live runtime release: `8a6d5c2-student-account-profile`.

School OS STUDENT users with `schoolId` must see a read-only school profile on `/account`, rendered in `SchoolLayout`, not the generic SaaS subscription/credits/payment account view. The self-profile operation is `getMyStudentAccountProfile`; it must remain scoped to authenticated `context.user.id` + `context.user.schoolId` and role `STUDENT`, with no arbitrary target id.

Privacy rule: do not add NIK/KK, parent NIK, bank account, KIP/KPS number, home coordinates or physical measurements to the student account summary without a new explicit requirement and privacy review. Preserve `DESIGN.md`, shared student bottom navigation and the no-sidebar-on-student-mobile rule.

## Planned module — Tata Usaha (TU)

Authoritative implementation blueprint: [`PLAN_TATA_USAHA_MODULE.md`](./PLAN_TATA_USAHA_MODULE.md). Implementation has **not started**. The baseline is correspondence-first: capability/assignment, versioned templates, server-side atomic numbering, approval/signing workflow, immutable issued PDFs, QR verification, incoming mail/disposition, service requests, and archive metadata. Do not hard-code one school/province format; use tenant Administrative Rules Profile.

## TU Phase 0 discovery executed — 23 September 2026

SMKN 12 Garut Phase 0 is documented in `TU_PHASE0_SMKN12_GARUT_CONFIGURATION_PACK.md`, `TU_PHASE0_GOVERNANCE_CONTRACT.md`, and `TU_PHASE0_TEMPLATE_INTAKE_REGISTER.md`. Read these before implementing TU. Do not invent numbering/classification/signer rules. Current production data shows a Principal candidate, four Wakasek candidates, and 22 Tenaga Administrasi candidates, but no structured Kepala TU assignment and no Auth for those 22 staff. Phase 1 may build a gated foundation; production `ISSUED` must remain disabled until official samples/rules are confirmed.

## Tata Usaha Foundation Starter live — 23 September 2026

Current TU runtime foundation commit: `4231a13`; release: `4231a13-tu-foundation`.

Routes live: `/school/administration`, `/school/administration/templates`, `/school/administration/outgoing`, `/school/administration/outgoing/new`, `/school/administration/documents/:id`.

SMKN 12 Garut is initialized with 10 editable generic starter templates and `STARTER-OUTGOING`, but official issuance is hard-gated: register `isConfigured=false`, sequence=0, no production TU documents, no `ISSUED`/`SIGNED` state or final-number allocation operation. Do not bypass this gate. Next work should add explicit correspondence settings, atomic numbering and approval/signature policy before introducing official issue.

Authorization currently supports School Admin, Principal assignment, and legacy administration/TU staff assignments for compatibility; Phase 0 docs describe the planned capability-based refinement. Sensitive student fields are not in the template variable whitelist. Manual variables are escaped, template HTML is server-sanitized, and the local template preview is sanitized too.

Release record: `docs/RELEASE_2026-09-23_TU_FOUNDATION_STARTER.md`.

## TU letterhead & people search live — 23 September 2026

Runtime: `7ce72db-tu-letterhead-search` / commit `7ce72db`.

TU draft/template preview shares `AdministrationLetterhead`: Jabar emblem, `PEMERINTAH DAERAH PROVINSI JAWA BARAT`, `DINAS PENDIDIKAN`, school identity/contact/NPSN, and Disdik Jabar mark. This is based on the user-approved visual reference; do not replace it with generic SaaS branding.

`Nomor Surat` is mandatory manual input for draft creation. Keep automatic numbering disabled while `STARTER-OUTGOING.isConfigured=false`.

Resolve signer identity from the active `PRINCIPAL` SchoolStaffAssignment + TeacherProfile. Student and staff selectors must use `searchAdministrationPeople`, which is tenant scoped and searches master data. Do not preload all students into the browser. `AdministrationDocument.relatedStaffId` is now available.

SMKN 12 Garut starter `ASSIGNMENT` is version 2 and uses `staff.name`, `staff.nip`, `staff.title`. Keep sensitive fields outside the template whitelist.

Release record: `docs/RELEASE_2026-09-23_TU_LETTERHEAD_PERSON_SEARCH.md`.

## TU exact letterhead live — 23 September 2026

Runtime `3a675e4-tu-letterhead-exact`. The authoritative TU header renderer is `app/src/administration/AdministrationLetterhead.tsx` and is intentionally based on measured geometry/fonts from the user-supplied Jawa Barat administrative letter PDF.

Critical non-regression rules:

- use F4 `816×1248px` preview canvas;
- Times New Roman hierarchy 14/18/6/7 pt;
- exactly one `/administration/jawa-barat-emblem.png` on the left;
- do not restore a right-side Disdik logo;
- keep the double lower rule;
- school name/contact values come from `School`;
- Program Keahlian comes from tenant `Department` rows;
- do not invent missing website/postal data;
- retain manual number, principal resolver, and person autocomplete behavior.

`CABANG DINAS PENDIDIKAN WILAYAH VI` currently follows the supplied reference. If another tenant needs a different Cabang Dinas, add an explicit administration identity configuration; never infer it silently.

Release record: `docs/RELEASE_2026-09-23_TU_EXACT_JABAR_LETTERHEAD.md`.

## OpenClaw read-only integration live — 23 September 2026

Runtime backend `884abc6-openclaw-integration` (rollback `5a4d731-tu-content-gen2`). Static release unchanged: no client code was touched.

Any agent continuing this work must preserve the integration security contract:

- the surface lives under `/operations/integration/*` and is declared `api("GET", …)` with `auth: false`, with authorization performed **inside** each handler against the bearer `INTEGRATION_TOKEN`;
- it must stay **fail-closed**: an absent token, or one shorter than 16 characters, denies every request; never make it fall open;
- token comparison stays timing-safe;
- handlers must remain **reads only** (Prisma `findMany`/`findUnique`); never add a write path to this surface;
- keep responses aggregated by default; student names only with `detail=1`;
- nginx must keep `location ^~ /operations/integration/ { return 404; }` ahead of the `/operations/` proxy so the surface stays loopback-only;
- the token lives in `/etc/saas-satu/staging.env` (app, root 0600) and `/home/ubuntu/.openclaw/secrets/schoolos-integration-token` (OpenClaw, 0600). It must never appear in chat, logs, docs, commits, or the model context.

The daily digest is the automation **“School OS - rekap absensi harian”** (09:00 Asia/Jakarta) running `/home/ubuntu/.openclaw/scripts/schoolos-attendance-summary.sh`.

Deployment deviation to record: this release was staged and cut over manually (git worktree in `releases/`, `wasp build` + `npm run bundle`, symlink switch, `saas-satu.service` restart) because the GitHub connection required by the bounded MSO function path was not available to the acting agent. Prefer the section 8 MSO `school_os_deploy_preflight` / `school_os_deploy_release` path for future releases, and treat the manual steps above as the equivalent fallback.

Release record: `docs/RELEASE_2026-09-23_OPENCLAW_READONLY_INTEGRATION.md`.

**Follow-up (same day):** runtime backend moved to `34fcd3b-openclaw-tenant-attribution` (rollback `884abc6-openclaw-integration`). Every class row now carries `schoolId`/`schoolName`/`schoolSlug`, a `schools[]` per-tenant rollup was added, and `attendance/daily` accepts `from`/`to` for ranges (reporting `mode`, `from`, `to`; `from > to` returns 400). The security contract above is unchanged and must stay that way. Release record: `docs/RELEASE_2026-09-23_OPENCLAW_TENANT_ATTRIBUTION.md`.

Operator scripts (`/home/ubuntu/.openclaw/scripts/schoolos-attendance-summary.sh`, `schoolos-api.sh`) must read the token with `read -r TOKEN < "$TOKEN_FILE"`. Do not reintroduce a `$(cat <token-file>)` command substitution: it is redacted at write time and produces an invalid Authorization header.
