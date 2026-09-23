# School OS Demo Data

School OS includes an explicit operator-only demo-data runner for filling the school portal with clearly synthetic records. It is intended for visual QA, workflow checks, screenshots, and demonstrations on a school that otherwise has little or no operational data.

## Safety contract

- The default target is `smkn-1-rongga`; override it only with `SCHOOL_OS_DEMO_SCHOOL_SLUG`.
- Synthetic records use the `[DEMO]` prefix, `DEMO-` department codes, or the reserved `@schoolos-demo.invalid` email domain.
- Existing school, admin, active academic year, and existing `RPL` department are reused read-only where appropriate. They are not overwritten by the demo runner.
- `seed --dry-run` executes the complete seed inside a database transaction and rolls it back.
- Re-running `seed` is idempotent for the same school/date: it updates or reuses the same demo records instead of multiplying them.
- `cleanup --dry-run` proves the cleanup plan without persisting deletions.
- Actual cleanup requires the exact confirmation token `DELETE-SCHOOL-OS-DEMO`.
- Cleanup refuses to remove demo classes if a non-demo student or non-demo LMS course has been attached to them.
- The runner is deliberately **not** registered in `app.db.seeds`; `wasp db seed` therefore cannot invoke it accidentally.
- No schema migration or application restart is required.
- Do not delete demo records with ad-hoc SQL; use the runner so its safety checks remain in effect.

## Dataset coverage

The current dataset exercises the major School OS surfaces:

- departments and active academic year context;
- teachers, Waka Kurikulum, students, and class rooms;
- one student without a class and one teacher without a mapped teaching context for admin decision states;
- DUDI companies, active PKL placements, geofence attendance, journals, review/revision states, and EWS conditions;
- LMS courses, agendas, materials, assignments, graded/ungraded submissions, attendance, CBT questions, open assessments, and historical results;
- duty-teacher reports;
- data used by attendance, LMS gradebook, PKL recap, active-student certificate, Wali Kelas, Waka, EWS, and Admin Dashboard views.

The production seed performed on 10 September 2026 created/reused:

- 29 demo users: 6 teachers, 21 students, 2 DUDI mentors;
- 2 additional demo departments and 5 class rooms;
- 4 demo DUDI companies and 8 active PKL placements;
- 6 LMS courses, 12 agendas, 12 materials, 12 assignments, 18 submissions;
- 12 assessments/CBT, 24 questions, 18 historical results;
- 18 LMS attendance sessions and 72 attendance records;
- 36 PKL attendance logs, 7 journals, and 3 duty-teacher reports.

Deliberate edge/attention states include:

- 1 student without a class room;
- 1 teacher without a mapped subject/teaching context;
- 6 submissions not yet graded;
- PKL journals requiring review/revision;
- several EWS/attention conditions.

At the seed verification point, the Admin Dashboard attendance example resolved to **20 Hadir, 2 Izin, 2 Sakit** from 24 attendance records, or about **83% Hadir**. `Perlu Keputusan Anda` also had real server-backed conditions to display.

## Commands

Run from `app/` with the intended `DATABASE_URL` already present in the environment.

```bash
node scripts/school-os-demo-data.mjs status
node scripts/school-os-demo-data.mjs seed --dry-run
node scripts/school-os-demo-data.mjs seed
node scripts/school-os-demo-data.mjs cleanup --dry-run
node scripts/school-os-demo-data.mjs cleanup --confirm=DELETE-SCHOOL-OS-DEMO
```

## Production rollout on 2026-09-10

Before the first production seed, the normal database backup service created and verified a fresh root-only gzip backup:

`/var/backups/saas-satu/saas_satu_staging-20260910T011823Z.sql.gz`

The backup was verified as gzip PASS with permission mode `600`.

The full seed was then validated in rollback-only dry-run mode, persisted, run a second time to prove idempotency, and followed by a cleanup dry-run. The cleanup dry-run reached zero demo records inside its transaction, then rolled back, leaving the demo dataset available for UI testing.

The seed operation itself required no schema migration, backend restart, or UI deployment.

## Verification snapshot

After seeding, the following School OS surfaces were checked successfully and returned HTTP 200 in the verification run: Beranda, Siswa, Guru, Rombel, LMS, DUDI, PKL, Monitoring EWS, Guru Piket, Wali Kelas, Waka, and Laporan. Dashboard API checks also remained healthy without a new 5xx in that verification window.

This is a historical verification snapshot. Re-run the appropriate health/smoke checks after any future code, deployment, or data-operation change.

## Login accounts are intentionally separate

The demo dataset creates application records and role relationships, but it does **not** create arbitrary production login passwords for Guru, Siswa, or DUDI Mentor.

If role-based UI testing needs real sign-in sessions, create dedicated test accounts through the official School OS authentication flow. Do not inject password hashes or improvised credentials directly into the production database.

The next intended role-login QA covers:

- Guru;
- Siswa;
- Pembimbing DUDI.

For cross-session continuation and the current worktree/production snapshot, read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
