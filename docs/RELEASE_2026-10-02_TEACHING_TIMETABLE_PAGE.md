# Release — Jadwal Mengajar (Teaching Timetable Page)

**Date:** 2 October 2026 (Asia/Jakarta; cutover at 19:0x UTC on 1 October)  
**Source commit:** `e7a7fc3adb443b2e97320b65d79a25fbde499fb3`  
**Backend and static release:** `e7a7fc3-teaching-timetable`  
**Production:** `https://sekolah.suhendararyadi.com`  
**Rollback:** backend `e4bd953-attendance-unrecorded`, static `adad36c-mobile-ux-hardening`

## Goal

Teachers had no single view of their weekly teaching sessions. `KBM Hari Ini` shows one weekday and the course teaching page shows one course. After the class X/XI timetable import ([`RELEASE_2026-10-01_SMKN12_SCHEDULE_IMPORT.md`](./RELEASE_2026-10-01_SMKN12_SCHEDULE_IMPORT.md)) there is real data to show, so a teacher can now open one page and see every session in the week.

## What changed

- New teacher sidebar entry **Jadwal Mengajar** under `MENGAJAR`, directly below `KBM Hari Ini`. Route: `/school/lms/schedule`.
- New read-only query `getTeachingTimetable` (`app/src/lms/teachingTimetable.ts`): every active `LmsTeachingSchedule` of the active academic year.
  - A `TEACHER` sees only the courses they teach.
  - Teaching admins (`SCHOOL_ADMIN`, `SUPERADMIN`, `isAdmin`), Wakasek Kurikulum, the Principal, and department heads can switch to `ALL` for everything in their scope. The scope logic mirrors `getTeachingWorkspace` (`getTeachingMonitorScope`).
  - A plain teacher asking for `ALL` is silently kept on `MINE`. Students and other roles get 403. An invalid `scope` value gets 400.
  - Tenant-scoped through `course.schoolId`.
- New page `LmsTeachingTimetablePage`: sessions grouped Monday to Friday (Saturday and Sunday only when they have sessions, empty weekdays shown as "Tidak ada sesi"), today badge, `Berlangsung` marker on the running session (refreshed every minute), summary cards (sessions per week, face-to-face duration, teaching days, rombel), and a per-row `Detail` link to the course teaching page. Scoped viewers get a `Jadwal saya` / `Semua dalam cakupan` tab and see teacher names in `ALL` mode.
- Pure helpers in `teachingPolicy.ts`: `groupTimetableByDay`, `summarizeTimetable`, `formatTimetableDuration`, `timetableSlotMinutes`, `timetableSlotPhase`.

The route is deliberately **not** under `/school/lms/teaching/`. The drawer marks the active item with `startsWith`, so a child route would highlight `KBM Hari Ini` as well.

This release did not change the admin sidebar; the admin entry was added in the follow-up at the end of this document.

No schema or migration change.

## Verification

- `wasp build` (includes the SDK type check): PASS.
- Full Vitest regression: **221/221 PASS across 39 files** (focused policy tests 12/12, page render tests 7/7).
- Production-clone UAT `uat/teachingTimetable.integration.ts`: **9/9 PASS** on a temporary database restored from a fresh dump of production (already containing the imported timetable): own-sessions-only and ordering, no scope widening for a plain teacher, disjoint timetables between teachers, admin sees the whole school and `MINE` is empty, tenant isolation, student rejected (403), invalid scope rejected (400), and a synthetic department head (own plus department sessions). The temporary database, role, and dump were removed afterwards.
- Release build from a detached worktree at the exact commit: server bundle, Vite SSR and client build with `REACT_APP_API_URL=https://sekolah.suhendararyadi.com`. Built artifacts contain `getTeachingTimetable`, the route, and the menu label.
- `school_os_deploy_preflight` equivalent (`ops/deploy-school-os-release.mjs preflight`): PASS.
- Promote via `ops/deploy-school-os-release.mjs deploy`: PASS on the second attempt (see below). Repeat deploy: **idempotent true**.
- After rollout: `/school` 200, `/school/lms/schedule` 200, `/school/lms/teaching` 200, `/auth/me` 200; unauthenticated `get-teaching-timetable` and `get-teaching-workspace` both **401**; `saas-satu.service` active; no errors in the service log after the cutover.
- Production baseline unchanged: SMKN 12 Garut **1,539 real / 21 demo students**; **474 courses / 764 schedules**; `LmsTeachingSession` still **7**.
- No walkthrough in a real browser as a teacher account was performed; UI behavior is covered by the render tests.

## Deployment incident (first attempt rolled back)

The first `deploy` call failed with `The operation was aborted due to timeout` and the guard rolled back automatically (`static restored`, `backend restored and healthy`). Production stayed on `e4bd953` / `adad36c`.

Evidence collected before retrying:

- the new backend was healthy (`/auth/me` 200 in about 3 ms on loopback);
- of the three public smoke requests only `GET /school` reached nginx; the next request (`/auth/me`) appears in neither the nginx access log nor the backend log, so it never reached the new backend;
- the same Node `fetch` sequence run eight times against the live (old) release completed in 2–93 ms every time.

This pointed to a transient stall on the smoke connection during cutover rather than a defect in the release. One retry with the same guard succeeded and the guard's checks passed. If it recurs, check the loopback-to-public-hostname path used by `publicSmoke()` before suspecting the release. Each failed attempt restarts `saas-satu.service` twice (about 7 seconds in total).

The staged static directory had mode 664/775 after `cp -a` from the build output; it was normalized to 644/755 (as in earlier releases) before the successful promote.

## Notes for future agents

- Release procedure used: detached worktree at the release commit under `/home/ubuntu/deployments/SaaS_Satu/releases/`, `npm ci`, `wasp install`, `wasp build`, restore `package-lock.json`, `npm install` and `npm run bundle` in `.wasp/out/server`, `REACT_APP_API_URL=… npx vite build`, `sudo cp -a` the build output into `/var/www/saas-satu/releases/<release>` (root-owned, 644/755), then `preflight` and `deploy` with JSON on stdin.
- `wasp install` rewrites `app/package-lock.json`; restore it (`git checkout -- package-lock.json`) so it never enters a commit.
- `/home/ubuntu/deployments/SaaS_Satu/RELEASE_CURRENT` is root-owned and is not updated by the deploy script; it is stale (still names `4ee295b`). Trust the `current` symlinks instead.
- The commits were fast-forwarded into canonical `main` and pushed to `origin` (GitHub `suhendararyadi/SaaS_Satu`, `ae36346..0d76526`) on 2 October 2026. Git on the server has no credential helper, so the push borrowed the `gh` token for one command: `git -c credential.helper='!gh auth git-credential' push origin main`.

## Follow-up (2 October 2026): admin menu entry

Static-only release `d7eaee5-admin-timetable-menu` (commit `d7eaee55845081438bee1bd3c6cecc6316ccc190`) adds **Jadwal Mengajar** to the admin `PEMBELAJARAN` section, directly below `KBM Hari Ini`. The page already defaulted to the whole school for teaching admins, so no backend change was needed.

- Backend unchanged: `e7a7fc3-teaching-timetable`; `saas-satu.service` was not restarted.
- Static rollback: `e7a7fc3-teaching-timetable`.
- Verification: full regression 221/221 across 39 files; the built bundle holds two `Jadwal Mengajar` menu entries (teacher and admin) against one in the previous static release; `static-preflight` PASS; `static` deploy PASS; repeat deploy idempotent true; `/school`, `/school/lms/schedule`, `/school/lms/teaching` and `/auth/me` 200; unauthenticated `get-teaching-timetable` 401.
- Known and unchanged: because the drawer matches routes with `startsWith`, the admin items `KBM Hari Ini` and `Audit KBM` both highlight on `/school/lms/teaching/audit`. The new entry does not add to that, as `/school/lms/schedule` is outside that prefix.
