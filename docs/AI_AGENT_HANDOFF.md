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
- Application release commit: `45a11a546fe4b6f2fefad46d2120cac7d30de25a` — PKL Foundation Generasi Kedua final compatibility commit.
- Production release: `45a11a5-pkl-foundation-gen2`.
- Current backend pointer: `/home/ubuntu/deployments/SaaS_Satu/releases/45a11a5-pkl-foundation-gen2`.
- Current static pointer: `/var/www/saas-satu/releases/45a11a5-pkl-foundation-gen2`.
- Previous known stable application release: `03655f4-ptk-editor`.
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

## 9. Latest production rollout verification — PKL Foundation Gen2

PKL Foundation Generasi Kedua quality gate:

- Foundation policy tests: **5/5 PASS**;
- full Vitest: **141/141 PASS** across **24 files**;
- Prisma validation: PASS;
- migration dry-run on restored production clone: PASS;
- Wasp production build: PASS;
- generated server bundle: PASS;
- Vite SSR/client: PASS;
- immutable deploy preflight: PASS;
- production deploy: PASS;
- repeat deploy: idempotent PASS;
- `/school`: HTTP 200;
- `/school/pkl/foundation`: HTTP 200;
- `/school/pkl/companies`: HTTP 200;
- unauthenticated foundation query/action: HTTP 401;
- final baseline: **1,539 students / 103 PTK / zero PKL foundation & placement rows**.

The earlier PTK editor release `03655f4-ptk-editor` remains an important historical/known-stable release, but is no longer the current application release.

## 10. Backups that matter

- pre SMKN 12 student write:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`
- pre official profile/PTK/Sarpras import:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`
- pre Dapodik PTK detail migration/backfill:
  `/home/ubuntu/backups/SaaS_Satu/pre-ptk-detail-dapodik-20260916.dump`
- pre PKL Foundation Gen2 migration:
  `/home/ubuntu/backups/SaaS_Satu/pre-pkl-foundation-gen2-20260920.dump`

Do not delete these as routine cleanup.

## 11. Documentation reading order

For a new agent:

1. **this file** — current compact handoff;
2. [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — full persistent project state;
3. [RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md);
4. [RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md);
5. [RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md](./RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md);
6. [RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md](./RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md);
7. [RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md](./RELEASE_2026-09-20_PKL_FOUNDATION_GEN2.md) for current PKL continuation;
8. area-specific docs such as `UI_UX_APPLE_HIG.md`, `ARCHITECTURE.md`, `MODULES_GUIDE.md`, and `DEMO_DATA.md`.

## 12. Durable AI memory

Critical long-term knowledge now has a **VPS-global persistent layer** outside the project:

`/home/ubuntu/.mso/agent-memory`

This is the durable authority for high-value confirmed `project.school_os.*` semantic/procedural claims and remains available if this worktree is deleted or re-cloned.

Global manifest:

`/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`

Latest verified snapshot after PKL Foundation Gen2:

`/home/ubuntu/backups/MSO/global-agent-memory-20260920T0731WIB.tar.gz`

Repo-local memory under `.agent/memory/` still exists, but it is **operational Project/RASMIC memory**, not the sole permanent store. It is appropriate for tasks, debug/test evidence, failures, and local decisions.

Full contract: [`GLOBAL_PERSISTENT_MEMORY.md`](./GLOBAL_PERSISTENT_MEMORY.md).

Do not store raw student/PTK PII, credentials, tokens, or private keys in either global or repo-local memory. Promote globally only confirmed high-value counts, decisions, schema/contracts, provenance, release ids, and safety constraints.

## 13. Current continuation point

PKL Foundation Generasi Kedua is finished and live. The next planned PKL phase is **Penempatan PKL Generasi Kedua**.

Before starting the next feature:

- inspect current runtime/repository state;
- retrieve VPS-global Agent Memory for `project.school_os.*`, then project-local memory as needed;
- preserve the SMKN 12 Garut production baseline;
- use authoritative data for identity/program mappings;
- update this handoff again after any verified production change.
