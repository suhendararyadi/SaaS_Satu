# Release — Tata Usaha Foundation Starter

**Date:** 23 September 2026  
**Production release:** `4231a13-tu-foundation`  
**Runtime commit:** `4231a13`  
**Core feature commit:** `8fffa6b`  
**Previous pre-TU runtime:** `8a6d5c2-student-account-profile`  
**Database backup:** `/home/ubuntu/backups/SaaS_Satu/pre-tu-foundation-20260923.dump`

## Purpose

Deliver a usable first School OS Tata Usaha framework now, using configurable generic starter templates rather than waiting for final SMKN 12 Garut letter samples.

This release intentionally operates in **Starter Mode**. It supports template customization, data merge, draft generation, preview, internal review states and audit, but **does not enable official numbering, final signing, or issuance**.

The goal is to let the school shape the framework through the UI first, then enable official issue workflows after numbering, classification, signatory authority and approval rules are confirmed.

## Live routes

- `/school/administration` — TU dashboard
- `/school/administration/templates` — template library/editor
- `/school/administration/outgoing` — outgoing draft register
- `/school/administration/outgoing/new` — create draft
- `/school/administration/documents/:id` — draft preview/review

School Admin receives a `TATA USAHA` sidebar group with Dashboard TU, Surat Keluar and Template Surat.

A teacher/staff user receives the TU navigation only when the existing assignment indicates `PRINCIPAL` or an active `OTHER` assignment whose administrative title/unit contains `administrasi` or `tata usaha`.

## Starter template library

SMKN 12 Garut was initialized with exactly ten editable generic templates:

1. Surat Keterangan Aktif Siswa (`STUDENT-ACTIVE`)
2. Surat Keterangan Siswa (`STUDENT-STATEMENT`)
3. Surat Tugas (`ASSIGNMENT`)
4. Surat Pengantar (`COVER-LETTER`)
5. Surat Undangan (`INVITATION`)
6. Surat Pemberitahuan (`NOTICE`)
7. Surat Permohonan (`REQUEST`)
8. Surat Rekomendasi (`RECOMMENDATION`)
9. Surat Pengantar PKL (`PKL-COVER`)
10. Surat Panggilan Orang Tua/Wali (`PARENT-CALL`)

These are **starter content**, not claims of official SMKN 12 Garut or government correspondence format.

Each template stores versions. Editing from the Template page creates a new version, allowing existing drafts to retain their original template version.

## Template engine

Placeholder syntax:

```text
{{school.name}}
{{student.name}}
{{student.nis}}
{{student.nisn}}
{{student.className}}
{{student.department}}
{{academicYear.yearName}}
{{academicYear.semester}}
{{document.date}}
{{manual.purpose}}
```

The resolver is whitelist-based. Sensitive defaults such as student NIK, KK, bank information, KIP/KPS data and home coordinates are not available as template variables.

Manual values are HTML escaped before document rendering.

Template HTML is server sanitized to a limited set of structural tags. Script/style/iframe/form/input/button/object/embed markup and HTML attributes are stripped. The local editor preview also runs a matching sanitization pass before `dangerouslySetInnerHTML` rendering.

## Draft correspondence workflow

Starter workflow:

```text
DRAFT
→ IN_REVIEW
→ APPROVED
```

Alternative states:

```text
RETURNED_FOR_REVISION
VOID
```

There is deliberately no `ISSUED`, `SIGNED`, or final-number allocation operation in this release.

Draft creation can merge existing School OS data from:

- School
- User / StudentProfile
- ClassRoom
- Department
- AcademicYear

The draft stores a variable snapshot and template-version reference so later master-data/template changes do not silently rewrite an existing draft.

Optimistic concurrency is enforced on workflow transitions through `expectedUpdatedAt`; stale writes return conflict instead of overwriting a newer state.

## Register foundation

SMKN 12 Garut received one starter register:

- code: `STARTER-OUTGOING`
- name: `Register Surat Keluar — Starter`
- candidate pattern: `{{sequence}}/{{unit}}/{{monthRoman}}/{{year}}`
- reset policy: `YEARLY`
- `isConfigured = false`
- `currentSequence = 0`

The pattern is a configurable placeholder example only. No official number allocation exists in the current runtime.

## Authorization baseline

Current access behavior:

- School Admin / Super Admin: view workspace, manage templates and drafts.
- Principal assignment: view/manage draft workflow; not automatically template manager/signatory.
- Existing staff assignment with administration/TU title/unit: view/manage templates and drafts.
- Unassigned teacher: denied.
- Student/non-school role: denied.

Every operation resolves `schoolId` from authenticated context; the client does not choose authoritative tenant id.

Phase 0 remains the source of truth for future proper capability/assignment refactoring. Current administrative-title detection is a compatibility bridge for existing SMKN 12 Garut data, not the final capability model.

## Schema/migration

Migration:

`20260923014500_add_tu_foundation`

New enums:

- `AdministrationTemplateStatus`
- `AdministrationDocumentStatus`
- `AdministrationDirection`
- `AdministrationAuditAction`

New models:

- `AdministrationTemplate`
- `AdministrationTemplateVersion`
- `LetterRegister`
- `AdministrationDocument`
- `AdministrationAuditEvent`

Migration is additive. It was first tested on an isolated clone. A first clone attempt exposed an ownership pitfall when applying SQL as `postgres`; the clone was rebuilt and migration was successfully reapplied as the application DB owner. Production migration therefore used application credentials and a single SQL transaction.

Production verification:

- migration row recorded: 1
- TU tables present: 5
- table owner: `saas_satu_staging`
- application SELECT/INSERT/UPDATE/DELETE privilege: PASS

## Real-DB clone UAT

Isolated clone UAT result: **28/28 PASS**.

Coverage included:

- initialize exactly 10 starter templates;
- workspace initialization;
- starter register exists but is not configured;
- official issuance flag remains false;
- initialization idempotency;
- unassigned teacher denied;
- assigned TU staff allowed;
- student denied;
- student options tenant-scoped;
- student starter template available;
- draft creation;
- master student data merge;
- manual HTML escaping;
- no official document number;
- cross-tenant student rejected;
- required manual fields enforced;
- forbidden sensitive variable rejected;
- template edit creates version 2;
- old draft remains bound to template version 1;
- valid workflow transition;
- stale update rejected;
- internal approval transition;
- invalid transition rejected;
- document workflow audit generated;
- independent second-tenant template initialization;
- tenant B cannot see tenant A documents;
- template libraries tenant-isolated.

## Automated quality gates

Final hardening commit gates:

- `git diff --check`: PASS
- Wasp build: PASS
- **31 test files / 167 tests PASS**
- generated server bundle: PASS
- Vite SSR production build: PASS
- Vite client production build: PASS
- immutable release preflight: PASS
- production deploy: PASS
- repeat deploy: `idempotent=true`

Existing dependency audit warning remains unchanged: 13 vulnerabilities (8 moderate, 5 high). No forced dependency upgrade was performed in this scoped release.

## Production initialization

SMKN 12 Garut initialization result:

- first initialization: `10` templates created
- second initialization: `0` templates created (idempotency PASS)
- template count: `10`
- template version count: `10`
- register count: `1`
- register configured: `false`
- current sequence: `0`
- documents: `0`
- TU audit events: `1`
- official issuing enabled: `false`

No genuine letter/document was generated during deployment.

## Post-deploy verification

HTTP page smoke:

- `/school/administration`: 200
- `/school/administration/templates`: 200
- `/school/administration/outgoing`: 200
- `/school/administration/outgoing/new`: 200

Unauthenticated operation boundary:

- `get-administration-workspace`: 401
- `initialize-administration-module`: 401
- `get-administration-student-options`: 401
- `save-administration-template`: 401
- `set-administration-template-status`: 401
- `create-administration-draft`: 401
- `get-administration-document`: 401
- `update-administration-document-status`: 401

Service is active and recent error scan is clean.

SMKN 12 Garut existing data integrity after rollout:

- students: 1,539
- StudentProfile: 1,539
- rombels: 50
- daily attendance: 0
- Attendance 360 events: 0

## What remains intentionally gated

The following are **not implemented as official production actions yet**:

- legal/official number allocation;
- configured classification codes;
- signer authority matrix;
- paraf/approval chain based on school policy;
- official letterhead/logo pack;
- final immutable PDF artifact;
- certified electronic signature/TTE;
- public QR verification;
- incoming mail/disposition;
- archive retention workflow;
- service-request front office.

The next implementation increment should focus on **configurable official correspondence profile + atomic numbering + approval/signature configuration**, while keeping `ISSUED` disabled until those settings are explicitly completed.
