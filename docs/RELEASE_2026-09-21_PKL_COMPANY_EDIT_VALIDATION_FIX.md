# Release — PKL Mitra DUDI Edit Validation Fix

Date: **21 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

## Incident

Editing the demo DUDI and saving geofence coordinates returned:

`Operation arguments validation failed`

Production logs showed Zod validation errors on:

- `picName`
- `picPhone`

Both fields were empty in the form and therefore serialized as `null`, while the backend schema accepted only string/undefined.

## Root cause

The UI payload contract and backend validation contract were inconsistent for optional nullable company fields.

The same latent mismatch also existed for `industrySector`.

## Fix

The company input schema now accepts `null` for:

- `industrySector`
- `picName`
- `picPhone`

The schema was moved into pure module `app/src/pkl/companyPolicy.ts` so it can be regression-tested without importing server runtime.

Regression coverage:

`app/src/pkl/companyValidation.test.ts`

## Quality gate

- company validation regression: **2/2 PASS**
- targeted PKL policy/validation: **13/13 PASS**
- full Vitest regression: **150/150 PASS** across **27 files**
- Wasp build: PASS
- generated server bundle: PASS
- Vite SSR/client build: PASS
- immutable release preflight: PASS
- production deploy: PASS
- repeat deploy: idempotent true

## Production release

- release: `197c969-pkl-company-edit-fix`
- commit: `197c969ccaa2287ea9c80b55e5a18eaa89139f8f`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/197c969-pkl-company-edit-fix`
- static: `/var/www/saas-satu/releases/197c969-pkl-company-edit-fix`

Rollback backend was `d0809d4-pkl-uat-hardening`; rollback static was `066254d-pkl-foundation-permission-ui`.

## End-to-end production verification

The deployed `updateCompany` business operation was invoked against the authorized demo DUDI with the same shape as the UI form:

- empty PIC name/phone = `null`
- latitude = `-7.004497520015701`
- longitude = `107.26621246005183`
- radius = `100`

Result: PASS.

Persisted coordinates were verified in production.

Placement readiness after the update:

- ready: **true**
- blockers: **0**
- warnings: **0**

Security/runtime verification:

- service active
- `/school/pkl/companies`: HTTP 200
- unauthenticated `update-company`: HTTP 401
- no new validation/permission errors after rollout

## Backup

Pre-verification backup:

`/home/ubuntu/backups/SaaS_Satu/pre-pkl-demo-geo-update-20260921.dump`

SHA-256:

`c3f904fd04a620b7d75c9e4cbe2d51c3f28f2dced11cf68314a89c1385c54e4e`

