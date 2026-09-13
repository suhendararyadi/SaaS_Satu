# Release — Database Siswa berbasis Dapodik

Date: **13 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Summary

School OS now uses a Dapodik-aligned student profile as the canonical structure for the school student database.

The example Dapodik workbook supplied during product design was used **only to understand the workbook/header structure**. No row from that example workbook was imported, seeded, or copied into production.

## Product surfaces

- `/school/students` — compact student directory.
- `/school/students/new` — full add-student form.
- `/school/students/:id` — dedicated student detail page.
- `/school/students/:id/edit` — full edit form.
- `/school/import` — Dapodik Excel import with preview and validation.

The old small CRUD dialog is no longer the primary student-entry surface because the Dapodik-compatible student dataset is too large for a modal.

## Required data

Manual entry intentionally keeps the minimum requirement small:

- **Nama Lengkap** — required.
- **Jenis Kelamin** — required.

Other Dapodik fields are optional and nullable. Existing students are not filled with synthetic values. Missing data remains empty and is shown as **Belum diisi** until completed manually or imported from a real Dapodik export.

## StudentProfile schema

The additive profile supports:

- core identity: NIPD/NIS, NISN, gender, birthplace/date, NIK, religion, status;
- address/contact: address, RT/RW, hamlet, village, district, postal code, residence type, transport, telephone, mobile;
- education/documents: SKHUN, current class text, national-exam number, diploma serial, previous school, birth certificate;
- social assistance: KPS/KIP/KKS/PIP;
- father, mother, guardian identity/background;
- bank/account details;
- special needs;
- birth order;
- latitude/longitude;
- family-card number;
- weight, height, head circumference;
- sibling count;
- home-to-school distance;
- `dapodikImportedAt`.

Dapodik NIPD maps to the existing `nis` field for compatibility with older School OS modules.

## Dapodik XLSX import

Student import now accepts the original `.xlsx` Daftar Peserta Didik structure.

The parser supports:

- report metadata before the table;
- two-row headers;
- grouped `Data Ayah`, `Data Ibu`, and `Data Wali` columns;
- Excel date serial conversion;
- preservation/padding of numeric identifiers such as NISN, NIK, No KK, and postal code;
- maximum upload size 10 MB;
- maximum 5,000 student rows per import.

Import flow:

**Select XLSX → parse → preview/validate → confirm → import**

Preview performs no database writes.

Existing-student matching is designed to update rather than duplicate existing identities. The importer does not auto-create class rooms.

## Detail and edit experience

Every student now has an individual detail page containing grouped information for:

- identity and academic state;
- address/contact;
- documents/history;
- father;
- mother;
- guardian;
- KPS/KIP/PIP;
- bank;
- additional health/location/family attributes;
- PKL history.

The edit page uses the same grouped field contract so manual edits and Dapodik imports write to the same structured database fields.

## Privacy and authorization

- create/edit/import require school-admin access;
- directory/detail reads require School OS directory access;
- all reads and writes are scoped by active `schoolId`;
- selected class rooms are verified to belong to the active school;
- NIPD/NIS, NISN, and NIK uniqueness is checked within the school;
- non-admin viewers do not receive sensitive identifiers including student/parent/guardian NIK, No KK, bank account number, birth-certificate number, and KPS/KIP/KKS numbers.

## Migration

Additive migration:

`20260912213000_add_dapodik_student_profile`

Production migration status after rollout:

**Database schema is up to date.**

No existing student record was deleted or replaced.

## Backup

Safety backup:

`/var/backups/saas-satu/saas_satu_staging-dapodik-20260913T084334Z.sql.gz`

Verification:

- gzip integrity: PASS;
- mode: 600;
- owner: root.

## Source and runtime releases

Feature source:

`783ff2cdfc37c9402597b89881bdb9ba18ca7152`
`feat(school): build Dapodik student database`

Runtime detail fix:

`2c07ede4e57189c29a2a4b0f3616fb3f820ff77b`
`fix(school): correct student detail academic year`

Final production release:

`2c07ede-student-detail-fix`

Immediate rollback:

`783ff2c-dapodik-student-database`

## Runtime incident and fix

The first authenticated detail-page rollout exposed a Prisma validation error because the detail query selected `AcademicYear.name`, while the actual model uses:

- `yearName`
- `semester`
- `isActive`

Commit `2c07ede` corrected the query. A fresh 91-test suite, Wasp build, Vite build, backend bundle, release preflight, and blue-green startup all passed before final cutover.

After final cutover:

- exact read-only production Prisma query for student + class + academic year + PKL: PASS;
- recent `get-school-student-detail` 500 count: 0;
- recent `/auth/me` 500 count: 0.

## Data-preservation proof

Production verification:

- student users: **21**
- student profiles: **21**
- profiles with `dapodikImportedAt` set: **0**

This confirms the existing student/profile population remains intact and that no Dapodik sample workbook row was imported.

## Quality gates

- Vitest: **91/91 PASS** across 11 test files.
- TypeScript: PASS.
- Wasp 0.25 production build: PASS.
- Prisma Client generation: PASS.
- Vite SSR: PASS.
- Vite client: PASS.
- Backend bundle: PASS.
- Full release preflight: PASS.
- Blue-green backend startup on port 3102: PASS.
- Blue-green `/auth/me`: HTTP 200.
- Blue-green unauthenticated student-detail operation: HTTP 401.
- Live student list/add/import shell routes: HTTP 200.
- Live unauthenticated detail/preview/import/create/update operations: HTTP 401.
- Production migration status: up to date.
- Exact production detail relation query: PASS.

## Existing dependency debt

The existing npm audit baseline remains 13 vulnerabilities (8 moderate, 5 high). This release does not claim to resolve that pre-existing dependency debt.
