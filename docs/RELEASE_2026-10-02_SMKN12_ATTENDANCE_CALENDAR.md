# Release — SMKN 12 Garut Attendance Calendar (2026/2027)

**Date:** 2 October 2026 (Asia/Jakarta)  
**Type:** production data import — no application code, schema, or deployment change  
**Tenant:** SMKN 12 Garut (`smkn-12-garut`)  
**Where it is managed:** `https://sekolah.suhendararyadi.com/school/attendance/settings` → **Kalender Operasional** (create, edit, delete; one date per entry)

## Goal

Give Attendance 360 real school-day and holiday data so student self-attendance can lock on non-school days. Nothing is hardcoded: the rows live in `SchoolCalendarDay` and the school admin maintains them through the existing module.

## Source

Instagram carousel by the Dinas Pendidikan Jawa Barat (3 July 2026): *Kalender Pendidikan TK, SD, SMP, SMA, SMK, SLB Provinsi Jawa Barat Tahun Ajaran 2026/2027*, four images (Semester 1 month grid, activity table, and notes). The images were supplied by the owner; they are not stored in the repository. Only school days and holidays were taken from them. Competitions, TKA, UKK, MPLS and similar activities are school days and have no row.

## What was written

**49 rows** in `SchoolCalendarDay`, Monday to Friday only (Saturday and Sunday are already closed by the policy's `workingDays`):

| Range | Type | Label | Rows |
| --- | --- | --- | --- |
| 1–14 Jul 2026 | `SEMESTER_BREAK` | Libur sebelum hari pertama masuk sekolah semester 1 | 10 |
| 17 Aug 2026 | `NATIONAL_HOLIDAY` | Hari Proklamasi Kemerdekaan Republik Indonesia | 1 |
| 25 Aug 2026 | `NATIONAL_HOLIDAY` | Maulid Nabi Muhammad SAW | 1 |
| 24 Dec 2026 | `HOLIDAY` | Cuti bersama Hari Natal | 1 |
| 25 Dec 2026 | `NATIONAL_HOLIDAY` | Hari Natal | 1 |
| 28 Dec 2026 – 8 Jan 2027 | `SEMESTER_BREAK` | Libur semester 1 | 10 |
| 8–12 Feb 2027 | `HOLIDAY` | Perkiraan libur awal Ramadan 1448 H | 5 |
| 8–19 Mar 2027 | `HOLIDAY` | Perkiraan libur Idul Fitri 1448 H | 10 |
| 28 Jun – 9 Jul 2027 | `SEMESTER_BREAK` | Libur akhir tahun ajaran 2026/2027 | 10 |

Notes in each row cite the source. The two "Perkiraan" rows are estimates in the source itself (the Ramadan start follows the government's determination); an admin should edit them once the dates are fixed.

Interpretation to be aware of: the 1–14 July 2026 range is read from the red cells of the month grid, which carries no label. The official first day of Semester 1 is 15 July 2026. National holidays of 2027 that the infographic does not list were **not** added.

## Effective school days

Monday to Friday outside the rows above, 15 July – 31 December 2026: **114 days** (Jul 13, Aug 19, Sep 22, Oct 22, Nov 21, Dec 17). Semester 2 to the report day on 25 June 2027 comes to 105 days before any 2027 national holiday not in the infographic.

## Verification

- Single transaction with a guard (aborts if the tenant already has calendar rows) and an in-transaction row count: PASS (`INSERT 0 49`).
- Read back from the database: 49 rows (16 `HOLIDAY`, 3 `NATIONAL_HOLIDAY`, 30 `SEMESTER_BREAK`).
- The real `resolveAttendanceDay` (`app/src/attendance360/policy.ts`) was run over every date with an active policy and the rows read from production: **4/4 PASS** — 114 effective days in Semester 1, every holiday row locks and shows its label, ordinary days / MPLS days / 23 December / 11 January 2027 stay school days, weekends stay closed. The temporary test file was removed afterwards.
- No attendance policy exists for the tenant yet and none was created; self-attendance remains disabled (see `SCHOOL_OS_TODO_PROGRESS.md` P2).

## Rollback

`/home/ubuntu/backups/SaaS_Satu/calendar-import-smkn12-20261002.cleanup.sql` deletes exactly these 49 dates. If the admin has since edited or added rows, review it first: it removes by date, so any edit to these dates is lost.

## Not done (still P2)

- Policy: school coordinates, radius, GPS accuracy, check-in and check-out times, selfie rules, and activation.
- Per-date overrides, for example the earlier Friday check-out time. The calendar has no per-weekday rule, so each Friday needs its own `SPECIAL_SCHEDULE` row once the school decides the times.
- Student logins (1 of 1,539 provisioned), real Guru Piket schedule, and real-device UAT.

## Notes for future agents

- Do not re-run the import; the guard aborts on a non-empty calendar. Add or change days through the settings page or its `saveAttendanceCalendarDay` operation.
- The module accepts one date per entry. A date-range mode in the add dialog would make entries like the semester break much quicker; it has not been built.
