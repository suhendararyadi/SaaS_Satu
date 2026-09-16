# School OS — AI Agent Handoff

Last verified: **16 September 2026, 16:30 WIB (Asia/Jakarta)**.

This is the fast, durable entry point for any AI agent continuing School OS work. Read this file first, then [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for the full persistent context and the release documents linked below.

If documentation and runtime disagree, **runtime + repository verification wins**. Update this handoff after verified production changes.

## 1. Active project

- Product: **School OS**, multi-tenant school SaaS.
- Active operational tenant: **SMKN 12 Garut**.
- Production: `https://sekolah.suhendararyadi.com`.
- Repository baseline: `/home/ubuntu/projects/SaaS_Satu`.
- Active School OS worktree: `/home/ubuntu/projects/SaaS_Satu-hardening`.
- Active branch: `redesign/apple-hig`.
- Application release commit: `03655f4e810879f575064ea2c65d74245b608a58` — `feat(school): add complete PTK profile editor`.
- Production release: `03655f4-ptk-editor`.
- Current backend pointer: `/home/ubuntu/deployments/SaaS_Satu/releases/03655f4-ptk-editor`.
- Current static pointer: `/var/www/saas-satu/releases/03655f4-ptk-editor`.
- Rollback release: `e212f56-ptk-detail`.
- Service: `saas-satu.service` **active**.

## 2. Production baseline — SMKN 12 Garut

Verified read-only on 16 September 2026:

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

## 9. Latest PTK rollout verification

Complete PTK editor quality gate:

- targeted tests: **9/9 PASS**;
- full Vitest: **136/136 PASS** across 23 files;
- Wasp production build: PASS;
- generated server bundle: PASS;
- Vite SSR/client: PASS;
- immutable deploy preflight: PASS;
- production deploy: PASS;
- repeat deploy: idempotent PASS;
- `/school`: HTTP 200;
- `/school/teachers`: HTTP 200;
- PTK edit route: HTTP 200;
- unauthenticated PTK update action: HTTP 401;
- final baseline after rollout: **1,539 students / 103 PTK / 0 PTK Auth**.

## 10. Backups that matter

- pre SMKN 12 student write:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-student-write-20260915T2238WIB.dump`
- pre official profile/PTK/Sarpras import:
  `/home/ubuntu/backups/SaaS_Satu/pre-smkn12-profile-ptk-sarpras-20260915.dump`
- pre Dapodik PTK detail migration/backfill:
  `/home/ubuntu/backups/SaaS_Satu/pre-ptk-detail-dapodik-20260916.dump`

Do not delete these as routine cleanup.

## 11. Documentation reading order

For a new agent:

1. **this file** — current compact handoff;
2. [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — full persistent project state;
3. [RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md](./RELEASE_2026-09-15_SMKN12_GARUT_STUDENT_ONBOARDING.md);
4. [RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md](./RELEASE_2026-09-15_SMKN12_PROFILE_PTK_SARPRAS_IMPORT.md);
5. [RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md](./RELEASE_2026-09-16_DAPODIK_PTK_DETAIL.md);
6. [RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md](./RELEASE_2026-09-16_DAPODIK_PTK_EDITOR.md);
7. area-specific docs such as `UI_UX_APPLE_HIG.md`, `ARCHITECTURE.md`, `MODULES_GUIDE.md`, and `DEMO_DATA.md`.

## 12. Durable AI memory

Critical long-term knowledge now has a **VPS-global persistent layer** outside the project:

`/home/ubuntu/.mso/agent-memory`

This is the durable authority for high-value confirmed `project.school_os.*` semantic/procedural claims and remains available if this worktree is deleted or re-cloned.

Global manifest:

`/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`

Initial verified snapshot:

`/home/ubuntu/backups/MSO/global-agent-memory-20260916T1656WIB.tar.gz`

Repo-local memory under `.agent/memory/` still exists, but it is **operational Project/RASMIC memory**, not the sole permanent store. It is appropriate for tasks, debug/test evidence, failures, and local decisions.

Full contract: [`GLOBAL_PERSISTENT_MEMORY.md`](./GLOBAL_PERSISTENT_MEMORY.md).

Do not store raw student/PTK PII, credentials, tokens, or private keys in either global or repo-local memory. Promote globally only confirmed high-value counts, decisions, schema/contracts, provenance, release ids, and safety constraints.

## 13. Current continuation point

The PTK detail + complete edit flow is finished and live. No application-code task is currently pending from that rollout.

Before starting the next feature:

- inspect current runtime/repository state;
- retrieve VPS-global Agent Memory for `project.school_os.*`, then project-local memory as needed;
- preserve the SMKN 12 Garut production baseline;
- use authoritative data for identity/program mappings;
- update this handoff again after any verified production change.
