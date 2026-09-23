# Release — TU Letterhead, Manual Number & Person Search

**Date:** 23 September 2026  
**Production release:** `7ce72db-tu-letterhead-search`  
**Runtime commit:** `7ce72db`  
**Rollback release:** `4231a13-tu-foundation`  
**Database backup:** `/home/ubuntu/backups/SaaS_Satu/pre-tu-letterhead-search-20260923.dump`

## Purpose

Refine the live Tata Usaha correspondence framework based on the user's uploaded Jawa Barat education-document reference and the requested operational behavior:

1. use a Jawa Barat / Dinas Pendidikan style correspondence letterhead;
2. keep letter number as manual operator input;
3. resolve Kepala Sekolah automatically from School OS structure/master data;
4. replace large student dropdowns with database-backed autocomplete;
5. add equivalent autocomplete for guru/tendik.

Official issuing/TTE remains deliberately disabled in Starter Mode.

## Letterhead

The shared `AdministrationLetterhead` is now used by draft preview and template preview.

Composition:

- West Java provincial emblem on the left;
- centered `PEMERINTAH DAERAH PROVINSI JAWA BARAT`;
- centered `DINAS PENDIDIKAN`;
- school name immediately below;
- school address, city/province, phone, email and NPSN from `School` master data;
- Disdik Jabar identity mark on the right;
- formal bottom separator.

The user-supplied document was used as a structural/visual reference only. Certificate-specific wording/content was not copied into School OS correspondence templates.

## Manual document number

`Nomor Surat` is now mandatory when creating a draft and is entered manually by the TU operator.

- value is stored in `AdministrationDocument.documentNumber`;
- the same value is frozen into `variableSnapshot.document.number`;
- preview displays the manual number;
- no automatic sequence allocation is performed;
- existing `STARTER-OUTGOING` remains `isConfigured=false` and sequence `0`.

This means a number can appear on a draft while School OS still does not claim that the document has been officially issued.

## Principal resolver

The backend resolves the active `PRINCIPAL` assignment for the authenticated school and snapshots:

- principal user id;
- display name including stored academic titles where available;
- NIP;
- official title/custom assignment title;
- unit name.

The create form displays the resolved principal as the default signatory identity. Draft preview uses the same snapshot for the signature block. If there is no active principal assignment, the UI shows a safe not-configured state rather than guessing a signer.

SMKN 12 Garut production verification found exactly one active principal and a populated NIP.

## Student/guru autocomplete

New operation: `searchAdministrationPeople`.

It is authenticated, administration-access checked and always scoped to `context.user.schoolId`.

### Student search

Searches:

- name;
- username;
- NIS;
- NISN;
- rombel name.

Result metadata includes class and department.

### Guru/Tendik search

Searches:

- name;
- username;
- email;
- NIP;
- NUPTK;
- active assignment title;
- active assignment unit.

Search is debounced client-side and limited server-side. It replaces preloading thousands of students into a select element.

## Related staff model

Migration `20260923024500_add_tu_related_staff` adds optional `AdministrationDocument.relatedStaffId` plus tenant-friendly index and FK to `User`.

A draft can now link independently to:

- a student;
- a guru/tendik;
- both;
- neither.

The staff relation is returned on document detail and is shown in metadata.

## Template variables

Safe whitelist now additionally supports:

```text
staff.name
staff.nip
staff.title
staff.unitName
principal.name
principal.nip
principal.title
document.number
```

Sensitive personal fields remain unavailable as default template variables.

The `ASSIGNMENT` / Surat Tugas starter template was upgraded in SMKN 12 Garut from version 1 to version 2 and now uses selected staff master data (`staff.name`, `staff.nip`, `staff.title`) instead of a free-text assignee field. The upgrade was performed through template versioning and verified idempotent.

## Database migration safety

The new migration was first applied to a production clone using application DB ownership and passed.

Production rollout:

- pre-migration backup completed;
- migration applied inside a single transaction using application DB credentials;
- migration marked applied in Prisma migration history;
- `AdministrationDocument` owner remained `saas_satu_staging`;
- application CRUD privilege remained available.

## Verification

### Real-DB clone UAT

**23/23 PASS** covering:

- principal resolution;
- principal title/NIP snapshot;
- student autocomplete;
- student cross-tenant isolation;
- staff autocomplete by NIP;
- staff assignment metadata;
- staff autocomplete by unit/title;
- manual number required;
- manual number persisted;
- selected staff relation;
- selected student relation;
- document detail related staff;
- principal/staff/number variable snapshots;
- Surat Tugas staff rendering;
- cross-tenant staff rejection;
- independent second-tenant principal/template behavior.

### Automated gates

- Wasp build: PASS
- **31 test files / 169 tests PASS**
- generated server bundle: PASS
- Vite SSR production build: PASS
- Vite client production build: PASS
- immutable preflight: PASS
- production deploy: PASS
- repeat deploy: `idempotent=true`

### Live smoke

- `/school/administration`: 200
- `/school/administration/templates`: 200
- `/school/administration/outgoing/new`: 200
- `/administration/jawa-barat-emblem.png`: 200
- `/administration/disdik-jabar.png`: 200
- unauthenticated `search-administration-people`: 401
- unauthenticated `create-administration-draft`: 401
- unauthenticated `get-administration-workspace`: 401
- service: active
- recent error scan: clean

### SMKN 12 Garut integrity

- students: 1,539
- StudentProfile: 1,539
- rombels: 50
- TU templates: 10
- TU documents: 0
- active Principal assignments: 1
- principal NIP present: yes
- `ASSIGNMENT` current version: 2
- `STARTER-OUTGOING`: still unconfigured, sequence 0

## Still intentionally gated

This release does **not** enable:

- automated/legal number allocation;
- official `ISSUED` state;
- certified TTE;
- QR public verification;
- automatic official archive finalization.

Manual number entry is a drafting/operational convenience while the official issuance governance remains gated.
