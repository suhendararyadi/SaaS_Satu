# Release — Student Login Provisioning

Date: **21 September 2026 (Asia/Jakarta)**
Status: **LIVE**

## Purpose

School OS now has an administrator-only flow to provision and revoke temporary login credentials for an existing student without creating a duplicate User/StudentProfile.

This was introduced so selected production students can be used for direct UAT of the student-side experience, including PKL Gen2.

## Auth model

School OS production uses email + password authentication.

The provisioning flow:

- requires an authenticated School Admin in the same tenant;
- resolves an existing STUDENT user;
- refuses provisioning when an Auth record already exists;
- generates a reserved School OS login identity under `@students.schoolos.invalid`;
- generates a strong one-time temporary password;
- hashes the password through the Wasp auth utility before persistence;
- marks the synthetic login email as verified so the user can log in immediately;
- returns the temporary password only in the provisioning response;
- does not overwrite the student's profile email;
- does not write the plaintext password to database, docs, or project memory.

Revocation deletes only the student's Auth relation. Student profile, class, placement, attendance, journals, and other academic data remain intact.

## Admin UI

On a student's detail page, School Admin now sees:

- **Buat Akun Login** when the student has no Auth;
- **Cabut Akun Login** when Auth exists;
- one-time display of login email + temporary password immediately after provisioning;
- a status banner when the login is already active.

## Quality gate

- targeted student-login/UI tests: **63/63 PASS**
- full regression: **152/152 PASS** across **28 files**
- Wasp build: PASS
- generated server bundle: PASS
- Vite SSR/client build: PASS
- immutable release preflight: PASS
- production deploy: PASS
- unauthenticated provision action: HTTP 401
- unauthenticated revoke action: HTTP 401
- repeat deploy: idempotent true

## Production release

- release: `74ef371-student-login-admin-ui`
- commit: `74ef3714f9757faf70668556a56a06149a54922c`
- backend: `/home/ubuntu/deployments/SaaS_Satu/releases/74ef371-student-login-admin-ui`
- static: `/var/www/saas-satu/releases/74ef371-student-login-admin-ui`
- rollback backend/static: `ec6a6a8-student-login-provision`

## Production verification

At the time of release verification, the selected UAT student still had **Auth count = 0**. No student credential was created automatically by deployment.

After release, School Admin explicitly provisioned the selected UAT student through the new flow. Current verified state:

- Auth count: **1**
- provider: **email**
- password data: **hashed**
- synthetic login identity: **verified**
- active sessions at last check: **0**

The actual login identifier/password are intentionally omitted from repository documentation and memory.

Provisioning must be initiated explicitly by an authenticated School Admin through the student detail page. This preserves operator control and prevents accidental account creation.

## Backup

Pre-provisioning production backup:

`/home/ubuntu/backups/SaaS_Satu/pre-adly-student-login-20260921.dump`

This backup should be retained while direct student-login UAT is ongoing.
