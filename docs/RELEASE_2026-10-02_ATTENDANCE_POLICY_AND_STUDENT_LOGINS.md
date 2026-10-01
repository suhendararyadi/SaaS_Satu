# Release — Attendance Policy, Student Logins and NISN Sign-in (SMKN 12 Garut)

**Date:** 2 October 2026 (Asia/Jakarta)  
**Tenant:** SMKN 12 Garut (`smkn-12-garut`)  
**Production:** `https://sekolah.suhendararyadi.com`

Three changes for the student self-attendance trial (P2 in `SCHOOL_OS_TODO_PROGRESS.md`):

1. an attendance policy row (data);
2. login accounts for every real student (data);
3. a NISN sign-in tab on the login page (frontend, static release `6afa3e2-student-login-toggle`).

Backend unchanged: `e7a7fc3-teaching-timetable`. Static rollback chain: `6afa3e2-student-login-toggle` → `3063569-student-nisn-login` → `d7eaee5-admin-timetable-menu`.

## 1. Attendance policy (data)

One `SchoolAttendancePolicy` row, created with a guard that aborts if the tenant already has one:

| Setting | Value |
| --- | --- |
| Location | -7.200116595457873, 107.8887518789388 (supplied by the owner as the main school point) |
| Late after (school start) | 06:30 |
| Check-in opens / closes | 05:30 / 09:00 (defaults) |
| Check-out opens / closes | 15:00 / 18:00 |
| Selfie | required for check-in **and** check-out |
| Radius / max GPS accuracy | 100 m / 50 m (defaults, to be tuned in the field) |
| Working days | Monday–Friday |
| Active | yes (trial) |

Known consequences:

- **Kampus 2 is not configured.** The policy has one point per school. XI A_1, A_2, A_3 and F_1 (91 students) study at "KAMPUS 2" per the timetable; if it is outside the radius they will be rejected until the owner decides how to handle it.
- **Fridays:** lessons end 11:15 but check-out opens at 15:00. A per-date `SPECIAL_SCHEDULE` calendar row would be needed to let students check out earlier; none was created.
- The radius and accuracy are defaults, not site-measured values.

Backup before the change: `/home/ubuntu/backups/SaaS_Satu/pre-attendance-policy-and-student-login-smkn12-20261002.dump`. Rollback: `attendance-policy-smkn12-20261002.cleanup.sql` (same folder; returns the tenant to the inactive default).

## 2. Student logins (data)

**1,538 `Auth` + `AuthIdentity` rows** created in one guarded transaction; together with the one student who already had a login, **all 1,539 real students** (not the 21 synthetic demo students) can now sign in.

- Login identity follows the existing provisioning convention: the email `<NISN>@students.schoolos.invalid`. The address cannot receive mail.
- The passwords are **temporary trial credentials** set on the owner's instruction. The scheme is deliberately **not** written in this repository. They must be rotated or revoked when the trial ends.
- Hashes were produced with the same library and exact steps as Wasp's `sanitizeAndSerializeProviderData` (`@wasp.sh/lib-auth` `hashPassword`, then `JSON.stringify`), not by hand. Existing rows were never overwritten.
- Data checks before writing: all 1,539 NISN are 10 digits, none duplicated, none empty, and no existing login identity collided with the new addresses.
- 40 of 40 sampled hashes verified with `verifyPassword`; a wrong password was rejected.
- The guard aborts if any target student already has an `Auth` row or does not belong to the tenant, and the transaction checks the row counts before commit.
- Rollback: `student-logins-smkn12-20261002.cleanup.sql` deletes only the `Auth` relation of those students (identities and sessions cascade); student profile, class, attendance and other academic data stay intact. Do not run it blindly once students have real sessions or records tied to their accounts.

The first attempt to run this was refused by the execution safety controls (mass creation of predictable credentials for minors). It proceeded after the owner approved it explicitly in chat. A second run failed harmlessly because the `postgres` OS user could not read a mode-600 file, and an earlier cleanup step then removed the generated file; it was regenerated and applied through stdin. Nothing was partially written.

Security notes for the owner:

- Anyone who knows a classmate's NISN can sign in as that student and, with the policy active, check in or out on that student's behalf (GPS and selfie are still required). Keep the trial short and shut the accounts or change the passwords afterwards.
- There is no forced password change on first login and no login rate limit in front of `/auth/email/login`; both are worth adding before wider use. Shared school Wi-Fi makes per-IP limits tricky.

## 3. NISN sign-in tab (frontend)

`/login` now has two tabs: **Email** (the unchanged Wasp `LoginForm`, still the default) and **NISN (siswa)**.

- The NISN form accepts 10 digits (digits only, pasted spaces dropped), appends the internal domain and calls the same Wasp email `login()`; redirection after login still comes from `useRedirectIfLoggedIn`.
- The student tab hides the sign-up and password-reset links (the internal address cannot receive mail) and tells students to contact their homeroom teacher or an admin.
- Wrong credentials give one generic message; other failures give a connection message. Input is validated before any request and a second submit while one is running is ignored.
- The public page never says what the initial password is.
- The last chosen tab is remembered in `localStorage` (failures ignored).
- `studentLoginEmailFromNisn()` and `STUDENT_LOGIN_EMAIL_DOMAIN` live in `app/src/school/studentLoginPolicy.ts`, shared with the provisioning flow so the two cannot drift.

Release history: `3063569-student-nisn-login` added the tab; a visual check in a headless browser then showed that the "show password" checkbox rendered as a tall empty capsule (the auth pages size every `input`), so `6afa3e2-student-login-toggle` replaced it with a text button (`aria-pressed`).

## Verification

- Full regression: **234/234 across 40 files**; `wasp build` (type check) PASS.
- `static-preflight` and `static` PASS for both static releases; repeat deploy idempotent; the backend service was not restarted.
- **Real headless-browser test against production** (Playwright 1.55.1, Chromium): default Email tab shows the Wasp form; NISN tab shows the form without sign-up/reset links and without a checkbox; short NISN rejected client-side; wrong password shows the generic message; the correct credentials reach `/school` and a session is stored; the show-password toggle works; on a 390 px phone viewport the submit button is 44 px high and the page does not scroll horizontally. The test session was ended with the logout API (200), and the test credentials were never printed or stored.
- API level: correct login 200, wrong password 401, logout 200.
- Public routes `/login`, `/school`, `/school/attendance`, `/school/lms/schedule` and `/auth/me` return 200.
- Screenshots captured during the test contained a real student's NISN and were deleted.

## Not done

- Kampus 2 location decision (91 students).
- Friday check-out override per date, and Guru Piket real schedule.
- Real-device UAT (GPS, camera, mobile network); Chromium here has no real GPS or camera.
- Forced password change and login rate limiting.
- The staff **Email** tab still shows Wasp's English text and yellow button ("Log in to your account"), which clashes with the Indonesian, blue style used elsewhere. That predates this release and was left alone.
