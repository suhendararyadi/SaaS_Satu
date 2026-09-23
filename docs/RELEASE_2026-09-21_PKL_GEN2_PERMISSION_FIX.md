# Release — PKL Gen2 Foundation Permission Fix

Date: **21 September 2026 (Asia/Jakarta)**  
Status: **LIVE**

## Incident

The PKL Foundation page showed zero values even though the authorized demo PKL dataset existed in production.

Production logs showed HTTP 500 on:

- get-pkl-periods
- get-companies
- get-dudi-mentors
- get-pkl-company-capacities

PostgreSQL error: permission denied for the new PKL Gen2 tables.

## Root cause

Seven PKL Gen2 tables created by migrations were owned by the PostgreSQL superuser instead of the application database role:

- PklPeriod
- CompanyDepartment
- PklCompanyCapacity
- DudiMentorProfile
- DailyJournalRevision
- PklWorkSchedule
- PklPlacementEvent

Legacy tables such as Company, Placement and DailyJournal were already owned by the application role.

## Production fix

Table ownership for all seven PKL Gen2 tables was aligned to the application database role in one transaction.

No demo data was recreated and no unrelated production rows were changed.

Backup before ownership change:

/home/ubuntu/backups/SaaS_Satu/pre-pkl-gen2-permission-fix-20260921.dump

SHA-256:

4c7973e490f505f599637d97d00e615dfc4ccb0bdaa75020f61ea807a338b38d

## Verification

Using the same DATABASE_URL role used by the production service:

- PklPeriod read: PASS
- CompanyDepartment read: PASS
- PklCompanyCapacity read: PASS
- DudiMentorProfile read: PASS
- PklWorkSchedule read: PASS
- PklPlacementEvent read: PASS

Foundation demo counts through the application DB role:

- Period: 1
- Company: 1
- DUDI Mentor: 1
- Total quota: 1

All seven PKL Gen2 tables now report the application role as owner.

## UI hardening

PklFoundationPage no longer silently represents query failures as zero data. Query failures now display an error banner and the affected summary value as a dash.

Source commit:

066254d28762f5f25fe0c5018388045204c5d356

Static production release:

066254d-pkl-foundation-permission-ui

Backend remains:

d0809d4-pkl-uat-hardening

Quality gate:

- targeted PKL tests: 12/12 PASS
- full normal regression: 148/148 PASS across 26 files
- Wasp build: PASS
- Vite SSR/client build: PASS
- static deploy preflight: PASS
- static deploy: PASS
- repeat static deploy: idempotent true

## Operational lesson

If production migrations are executed as PostgreSQL superuser, newly created application tables must have ownership or equivalent CRUD privileges aligned to the runtime application DB role before the migration is considered production-complete.
