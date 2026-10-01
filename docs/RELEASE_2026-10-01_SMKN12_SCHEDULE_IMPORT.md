# Release — SMKN 12 Garut Teaching Schedule Import (Class X & XI, 2026/2027 Ganjil)

**Date:** 1 October 2026 (Asia/Jakarta)  
**Type:** production data import — no application code, schema, or deployment change  
**Tenant:** SMKN 12 Garut (`smkn-12-garut`)  
**Production:** `https://sekolah.suhendararyadi.com`

## Goal

Load the school's official 2026/2027 lesson timetable for Class X and Class XI into the LMS so that Teaching Session (KBM) schedules, teacher check-in, subject attendance, and Guru Piket flows have real schedule data to run on.

## Source material

Three PDFs supplied by the owner (not stored in the repository):

- `DAFTAR NAMA DAN KODE GURU.pdf` — 155 teacher/subject codes for 80 people (numbers 1–80, suffix `a`–`d` per subject);
- `JADWAL KELAS X.pdf` — 18 rombel;
- `JADWAL KELAS XI.pdf` — 16 rombel.

The timetable cells hold a teacher code plus a room. The code determines both the teacher and the subject. The room column is a **fixed room per rombel**, not a per-session room.

Kelas XII was not supplied and is **not imported**.

## Method and accuracy checks

The PDFs were read as text with word coordinates (`pdftotext -bbox`) and mapped to columns programmatically, not read visually.

- Class X: 18 rombel × 48 jam = 864 cells; Class XI: 16 rombel × 48 jam = 768 cells. Every row had the exact column count and no column shifted.
- Teacher list: no duplicate code, numbers 1–80 complete, one name per number.
- Every schedule code exists in the teacher list except bare code `17` (see decisions).
- Time slots are identical between Class X and XI.
- No room double-booking and no vocational subject assigned to the wrong program.

### Rombel mapping (PDF → database)

| PDF | DB name | Department |
| --- | --- | --- |
| ATPH | `A_n` | Agribisnis Tanaman Pangan dan Hortikultura |
| TSM | `B_n` | Teknik Sepeda Motor |
| DKV | `C_n` | Desain Komunikasi Visual |
| PEMASARAN | `D_n` | Bisnis Retail |
| AKL | `E_n` | Layanan Perbankan Syariah |
| APT | `F_1` | Agribisnis Perbenihan Tanaman |
| APAT | `G_1` | Agribisnis Perikanan Air Tawar |

Names in the database are written `X A_1`, `XI B_3`, and so on. The mapping was inferred from column order and exact rombel counts (X: 3/4/3/3/3/1/1, XI: 3/4/3/2/2/1/1), which match the database exactly.

### Teacher mapping

All 80 people mapped to 80 distinct `TEACHER` users of the tenant: 70 by exact name after removing academic titles, 10 by abbreviation or spelling differences. Code **22** (`RD. … S`) was matched to the user whose name expands "RD." to Raden and "S" to a surname; it is a name inference, not an exact match, and no other candidate existed. It must not be confused with code 5, which is a different person with a similar name.

## Owner decisions

1. **Six teacher clashes in the source PDF are kept as is** (see below).
2. Bare code `17` (18 jam in XI A_1, XI A_2, XI F_1) is read as **`17a`** (Konsentrasi Keahlian Agribisnis Tanaman). Each of those rombel has 6-jam concentration blocks, while elective (`17b`) is only 2 jam.
3. **Generic subject names are kept as the PDF lists them** ("Mata Pelajaran Pilihan", "Konsentrasi Keahlian …", "Dasar-Dasar Program Keahlian …", "Muatan Lokal", "Projek IPAS"). Only the typo "Komuniklasi" was corrected to "Komunikasi" and whitespace was normalized.
4. The existing demo LMS data is left untouched.

### Teacher clashes accepted from the source

The same person is scheduled in two rombel at overlapping times. These exist in the PDF itself.

| Day | Code | Rombel | Overlap |
| --- | --- | --- | --- |
| Selasa | `50a` | XI A_1 and XI A_3 | 08.40–09.20 |
| Selasa | `52a` / `52b` | X E_2 and XI E_2 | 09.40–10.20 |
| Selasa | `49a` / `49b` | X B_2 and X G_1 | 11.40–12.20 |
| Selasa | `57a` | X E_1 and X F_1 | 13.00–13.40 |
| Kamis | `78a` | XI F_1 and XI A_2 | 08.00–08.40 |
| Kamis | `78a` | XI A_1 and XI A_3 | 13.00–13.40 |

They may be intentional combined classes or spreadsheet errors; the school has not confirmed which. The application's own conflict check runs only when a schedule is created or edited through the UI, so editing one of these rows in the UI will be rejected until the clash is resolved.

## What was written

`LmsCourse` — one row per rombel × teacher code (`teacherId`, `subjectName`, no description).  
`LmsTeachingSchedule` — one row per contiguous block.

- Consecutive jam for the same rombel, code and day are merged when the next start equals the previous end. The breaks 09.20–09.40 and 12.20–13.00 therefore split blocks.
- `dayOfWeek`: 1 = Senin … 5 = Jumat. Times are stored as `HH:mm`. `roomLabel` is the rombel's fixed room from the PDF (for example `K-13`, `KAMPUS 2`, `MESJID`, `LAB TSM`).
- Senin jam 1 (Upacara) and Jumat jam 1 (Pembiasaan / Budaya Positif) are not lessons and were not imported.

### Time slots

| Jam | Senin | Selasa–Kamis | Jumat |
| --- | --- | --- | --- |
| 1 | Upacara | 06.30–07.20 | Pembiasaan |
| 2 | 07.20–08.00 | 07.20–08.00 | 07.20–08.00 |
| 3 | 08.00–08.40 | 08.00–08.40 | 08.00–08.40 |
| 4 | 08.40–09.20 | 08.40–09.20 | 08.40–09.20 |
| 5 | 09.40–10.20 | 09.40–10.20 | 09.40–10.15 |
| 6 | 10.20–11.00 | 10.20–11.00 | 10.15–11.15 |
| 7 | 11.00–11.40 | 11.00–11.40 | — |
| 8 | 11.40–12.20 | 11.40–12.20 | — |
| 9 | 13.00–13.40 | 13.00–13.40 | — |
| 10 | 13.40–14.20 | 13.40–14.20 | — |
| 11 | 14.20–15.00 | 14.20–15.00 | — |

Friday has 5 lesson jam. Every rombel has 48 jam per week.

### Result

- **468 courses** and **757 schedule rows**, covering all 1,632 jam.
- Block length: 214 × 1 jam, 275 × 2, 204 × 3, 64 × 4.
- No duplicate `(course, day, start, end)` and no overlap inside any single rombel.
- Written in a single transaction with guards (target rombel have no existing courses, rombel and teachers belong to the tenant and active academic year) and in-transaction count verification.

## Verification

- Rows read back from the database for real Class X/XI rombel (757) are **identical** to the plan.
- SMKN 12 Garut totals after import: **474 courses / 764 schedules** (468 / 757 imported + 6 / 7 pre-existing demo). `LmsTeachingSession` stayed at 7, so no sessions were created or touched.
- `saas-satu.service` active, no errors in the service log for the following ten minutes, public `/school` and `/auth/me` HTTP 200.
- No UI walkthrough was performed as a teacher or admin as part of this release.

The daily Teaching workspace (`getTeachingWorkspace`) lists the active schedules for the selected weekday, so the imported rows appear there without any further step. No `LmsTeachingSession` rows were pre-created by this import.

## Backup and rollback

- Backup before the write: `/home/ubuntu/backups/SaaS_Satu/pre-schedule-import-smkn12-20261001.dump` (do not delete as routine cleanup).
- Cleanup: `/home/ubuntu/backups/SaaS_Satu/schedule-import-smkn12-20261001.cleanup.sql` deletes only the 468 imported courses (schedules and sessions cascade).

**Warning:** the cleanup script is only safe while the imported courses are unused. Once teachers have started sessions, subject attendance, engagement scores, agendas, materials, assignments, or CBT on these courses, deleting a course cascades to that work. After real use begins, deactivate schedules (`isActive = false`) or correct individual rows instead of running the cleanup.

## Notes for future agents

- Do not re-run the import; it would duplicate courses. The guard aborts if any target rombel already has a course.
- To replace the timetable, deactivate or edit the affected schedules, or restore from backup only if no real use has occurred.
- Class XII needs its own timetable PDF; do not copy Class XI.
- Several courses of one rombel can share the same generic `subjectName` with different teachers (for example three concentration courses in XI A_1). This is a consequence of decision 3, not a defect.
- The Selasa–Kamis jam 1 slot is 50 minutes and the Jumat jam 6 slot is 60 minutes; the other slots are 35–40 minutes.
- Reproducible parsing tools were run from a session scratchpad and are not committed.
