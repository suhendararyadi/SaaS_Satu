# Release — TU Exact Jawa Barat Letterhead Baseline

**Date:** 23 September 2026  
**Production release:** `3a675e4-tu-letterhead-exact`  
**Runtime commit:** `3a675e4`  
**Rollback release:** `7ce72db-tu-letterhead-search`

## Source of truth

The uploaded `SURAT DISPEN PANITIA DONOR DARAH.pdf` is the visual source of truth for the School OS TU correspondence letterhead. The PDF was measured directly rather than approximated from a screenshot.

Measured baseline:

- paper: F4 / 8.5 × 13 inch (`612 × 935.4 pt` in PDF; `816 × 1248 px` at the application 96-dpi preview scale);
- typeface: Times New Roman family embedded in the source PDF;
- government / department / branch lines: Times New Roman regular 14 pt;
- school name: Times New Roman bold 18 pt;
- `Program Keahlian`: Times New Roman italic 6 pt on reference-length content;
- address / contact / locality: Times New Roman italic 7 pt;
- one West Java provincial emblem on the left;
- no right-side Disdik logo;
- two separate ~1 pt horizontal rules below the header;
- body guide margins approximately 4 cm left and 3 cm right.

The actual West Java emblem image was extracted from the uploaded reference and is now the live `/administration/jawa-barat-emblem.png` asset.

## Header hierarchy

The document header is locked to the source hierarchy:

1. `PEMERINTAH DAERAH PROVINSI JAWA BARAT`
2. `DINAS PENDIDIKAN`
3. `CABANG DINAS PENDIDIKAN WILAYAH VI`
4. dynamic school name
5. dynamic `Program Keahlian` list
6. dynamic official address + phone
7. dynamic email/contact line
8. dynamic locality line
9. double horizontal rule

`CABANG DINAS PENDIDIKAN WILAYAH VI` follows the supplied source exactly. It is not inferred from location. If a tenant must use another Cabang Dinas, that value should become an explicit school-administration identity setting rather than be guessed automatically.

## Dynamic master data

The TU workspace and draft resolver now include tenant-scoped `Department` rows in the school identity snapshot.

Dynamic fields are sourced from School OS master data:

- school name → `School.name`;
- Program Keahlian → all tenant `Department.name` values;
- address → `School.address`;
- city/kabupaten → `School.city`;
- province → `School.province`;
- phone → `School.phone`;
- email → `School.email`.

Website and postal code are not currently first-class School fields. They are therefore **not fabricated**. The renderer only prints master data that actually exists.

For long Program Keahlian lists, the reference size remains 6 pt where content fits; only that one line can reduce to 5 pt / 4.5 pt to prevent overflow while retaining the official single-line hierarchy.

## F4 document renderer

`AdministrationPaper` now uses a fixed F4 canvas (`816 × 1248 px`) instead of a generic A4-like preview. `AdministrationPaperBody` provides the measured document body guides while the surrounding School OS interface continues to follow `DESIGN.md`.

Both:

- Template Surat preview; and
- individual draft document preview

use the same shared renderer and letterhead component.

## Preserved TU behavior

This release does not regress the previous TU contract:

- Nomor Surat remains mandatory manual input;
- Kepala Sekolah remains resolved from active `PRINCIPAL` assignment + `TeacherProfile`;
- student autocomplete remains tenant-scoped;
- guru/tendik autocomplete remains tenant-scoped;
- official issuance/TTE remains disabled;
- `STARTER-OUTGOING` remains unconfigured with sequence `0`.

## Verification

### Targeted renderer tests

`AdministrationLetterhead.test.tsx`: **4/4 PASS**

Covers:

- F4 dimensions;
- required government hierarchy;
- exactly one emblem image;
- no Disdik-right-logo reference;
- dynamic programs/address/contact;
- measured Times New Roman 14/18/6/7 pt baseline sizes.

### Full regression/build

- full regression: **173/173 PASS across 32 test files**;
- Wasp build: PASS;
- generated server bundle: PASS;
- Vite SSR production build: PASS;
- Vite client production build: PASS;
- git diff check: PASS.

### Real-DB clone UAT

**15/15 PASS** covering:

- dynamic school name;
- dynamic address;
- dynamic city/province;
- dynamic phone/email;
- tenant-scoped Department list;
- correct program names from DB;
- no cross-tenant program leak;
- draft snapshot freezes school identity;
- draft snapshot freezes all program departments;
- manual document number unchanged;
- second tenant resolves its own programs and cannot see the other tenant's draft.

### Deployment

- immutable preflight: PASS;
- production deploy: PASS;
- repeat deploy: `idempotent=true`;
- live backend/static release: `3a675e4-tu-letterhead-exact`;
- rollback retained: `7ce72db-tu-letterhead-search`;
- service active;
- recent error scan clean.

### Production integrity — SMKN 12 Garut

- students: 1,539;
- StudentProfile: 1,539;
- rombels: 50;
- Program Keahlian/Department: 7;
- TU templates: 10;
- TU documents: 0;
- register `STARTER-OUTGOING`: `isConfigured=false`, sequence `0`.

No database migration was required for this release.
