# Release — School Profile / SaaS Account Separation

Date: **29 September 2026 (Asia/Jakarta)**
Status: **LIVE (static/frontend)**

## Runtime

Source commit: `bf79043747f36d8099b295876fad240d6930b4eb`

Live backend remains:

- commit: `3bd5515cdebdba7a63d60cf282a2cca0cf28a36d`
- release: `3bd5515-teacher-login-provisioning`
- pointer: `/home/ubuntu/deployments/SaaS_Satu/releases/3bd5515-teacher-login-provisioning`

Live static/frontend:

- release: `bf79043-school-profile-routing`
- pointer: `/var/www/saas-satu/releases/bf79043-school-profile-routing`

Static rollback:

`/var/www/saas-satu/releases/3bd5515-teacher-login-provisioning`

## Purpose

Separate the School OS operational user profile from the SaaS subscription/account surface.

Operational school users should experience School OS as a school workspace, not as a SaaS customer billing dashboard.

## Route contract

### `/school/profile` — Profil Saya

Primary operational profile route for school users.

- `TEACHER`: dedicated Guru/GTK profile.
- `STUDENT`: dedicated student profile using existing authoritative student profile data.
- `DUDI_MENTOR`: school-user identity/security profile.
- `SCHOOL_ADMIN`: school profile is available while SaaS account remains separately accessible.

### `/account` — Akun & Langganan SaaS

Reserved for users that may manage the SaaS account/subscription surface.

Operational roles `TEACHER`, `STUDENT`, and `DUDI_MENTOR` are defensively redirected from `/account` to `/school/profile`, even if they type the URL directly or have an incomplete school link.

`SCHOOL_ADMIN` and `SUPERADMIN` retain access to `/account` where appropriate.

## Account-menu behavior

The top-bar avatar menu now uses role-aware navigation:

- all school users get **Profil Saya**;
- operational roles do **not** see **Akun & Langganan**;
- School Admin / Super Admin may see **Akun & Langganan** in addition to **Profil Saya**;
- logout behavior is unchanged.

The older generic user menu also redirects school operational users to **Profil Saya** rather than Account Settings.

## Teacher profile

The Teacher/GTK self profile is read-mostly and uses the existing `getSchoolTeacherDetail({ id: user.id })` authorization/masking contract.

Sections include:

- identity and employment;
- NIP, PTK type, employment status, job title;
- education/certification and work-start date;
- teaching subjects, competencies and teaching load;
- active homeroom/Wakasek/staff assignments;
- contact;
- School OS security/account identity.

Authoritative school/Dapodik/HR fields are presented as read-only. Corrections remain an Admin responsibility.

The Admin administrative teacher page remains unchanged:

`/school/teachers/:id`

It continues to own Teacher master-data editing and Teacher/GTK login provisioning.

## Student profile

Student `/school/profile` uses the existing `getMyStudentAccountProfile` query and displays school/class/academic identity, student identifiers, contact/domicile and security account information.

Authoritative school data remains read-only.

## Security / privacy

This release intentionally does not expose billing/subscription information to operational school roles.

No new database query, mutation, Prisma model or migration was introduced.

No Teacher/Student/DUDI Auth record is modified by the profile routing itself.

The current SMKN 12 Garut Teacher Auth count after deployment is **1**, belonging to synthetic demo teacher `[DEMO] SMKN12 Maya Contoh — TJKT`. This Auth existed independently of the static profile release; the release performed no database writes.

## Quality gate

Final verified source:

- role-routing/menu targeted tests: **8/8 PASS**;
- full School OS regression: **200/200 PASS across 37 test files**;
- Wasp 0.25 build: PASS;
- generated server TypeScript/Rollup bundle: PASS;
- final Vite production SSR build: PASS;
- final Vite production client build: PASS;
- `git diff --check`: PASS.

Production verification:

- official static preflight: PASS;
- official static deploy: PASS;
- repeated static deploy: `idempotent=true`;
- backend pointer unchanged at `3bd5515-teacher-login-provisioning`;
- `/school`: HTTP 200;
- `/school/profile`: HTTP 200;
- `/account`: HTTP 200 shell;
- `/school/teachers`: HTTP 200;
- `/school/lms/teaching`: HTTP 200;
- unauthenticated Teacher Auth operations remain 401;
- service: active;
- recent service error scan: clean;
- real/Dapodik student count remains **1,539**.

## Deployment impact

This was a **static-only release**.

The backend service and database were not redeployed or migrated.
