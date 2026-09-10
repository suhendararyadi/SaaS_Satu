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

## Dataset coverage

The current dataset exercises the major School OS surfaces:

- departments and active academic year context;
- teachers, Waka Kurikulum, students, and class rooms;
- one student without a class and one teacher without a course for admin decision states;
- DUDI companies, active PKL placements, geofence attendance, journals, review/revision states, and EWS conditions;
- LMS courses, agendas, materials, assignments, graded/ungraded submissions, attendance, CBT questions, open assessments, and historical results;
- duty-teacher reports;
- data used by attendance, LMS gradebook, PKL recap, active-student certificate, Wali Kelas, Waka, EWS, and Admin Dashboard views.

The runner currently creates up to:

- 29 demo users: 6 teachers, 21 students, 2 DUDI mentors;
- 2 additional demo departments and 5 class rooms;
- 4 demo DUDI companies and 8 active PKL placements;
- 6 LMS courses, 12 agendas, 12 materials, 12 assignments, 18 submissions;
- 12 assessments, 24 questions, 18 historical results;
- 18 LMS attendance sessions and 72 attendance records;
- 36 PKL attendance logs, 7 journals, and 3 duty-teacher reports.

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

Before the first production seed, the normal database backup service created and verified a fresh root-only gzip backup. The full seed was then validated in rollback-only dry-run mode, persisted, run a second time to prove idempotency, and followed by a cleanup dry-run. The cleanup dry-run reached zero demo records inside its transaction, then rolled back, leaving the demo dataset available for UI testing.
