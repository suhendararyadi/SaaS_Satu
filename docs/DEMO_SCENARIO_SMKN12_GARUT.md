# Demo Scenario — SMKN 12 Garut

Last verified: 24 September 2026 (Asia/Jakarta).

This dataset is synthetic and lives inside the real SMKN 12 Garut tenant only for product demonstration. Every synthetic master record is clearly marked with `[DEMO] SMKN12`, `DEMO-SMKN12-`, or `smkn12-...@schoolos-demo.invalid`.

## Safety

- 1,539 real students remain untouched.
- 50 real class rooms remain untouched.
- the pre-existing real company and placement remain untouched.
- demo users/classes/courses/companies are isolated by markers.
- no demo Auth/password is created by these seed scripts.
- cleanup must run the modern cleanup first, then the base cleanup.
- never remove this dataset with ad-hoc SQL.

Backup before production seed:

`/home/ubuntu/backups/SaaS_Satu/pre-smkn12-demo-scenario-20260924-060243.dump`

SHA-256:

`e10c592bd6bd6042ee291526d7fe35e68c8b200dc288d14604533896e7800f0a`

## Demo data coverage

Base demo:

- 29 users: 6 teachers, 21 students, 2 DUDI mentors;
- 3 demo departments;
- 5 demo class rooms;
- 4 demo companies;
- 8 active PKL placements;
- 6 LMS courses;
- 12 agendas;
- 12 materials;
- 12 assignments;
- 18 submissions;
- 12 assessments;
- 24 CBT questions;
- 18 historical CBT results;
- 18 LMS attendance sessions;
- 72 subject-attendance records;
- 36 PKL attendance logs;
- 7 PKL journals;
- 4 duty-teacher reports after the Gen2 extension.

Modern/Gen2 extension:

- 100 Global Attendance rows over five dates;
- 100 attendance evidence/event rows;
- 1 habituation activity with 20 student records;
- 6 Teaching Schedules;
- 5 Teaching Sessions;
- 16 engagement-score rows;
- 5 Teaching Session audit events;
- 1 PKL period;
- 8 PKL placement lifecycle events;
- 2 DUDI Mentor Profiles;
- 8 company-department links;
- 8 PKL capacity rows;
- 4 PKL work schedules;
- 1 student violation;
- 1 student achievement;
- 1 coaching record;
- 1 approved student permit;
- 1 active follow-up case.

## Demo story

### 1. Dashboard and master data

Open School Dashboard, Students, Class Rooms, Teachers, and Departments.

Use the `[DEMO] SMKN12` prefix to distinguish demonstration data.

### 2. Global Attendance

Open Daily Attendance and select one of the `[DEMO] SMKN12` classes.

Today's demo Global Attendance distribution:

- HADIR 12;
- TERLAMBAT 2;
- IZIN 2;
- SAKIT 2;
- ALPA 2.

There are also five days of Global Attendance history for trend/report demonstrations.

### 3. Attendance 360 / habituation

Open Attendance Command Center, Attendance Audit, and Habituation Attendance.

Demo habituation:

`[DEMO] SMKN12 Apel Pagi & Budaya Kerja`

It contains 20 student records, including present, late, and not-present states.

### 4. LMS

Open LMS Courses.

Demo courses:

- Administrasi Infrastruktur Jaringan;
- Basis Data;
- Desain Visual Digital;
- KIK & Kewirausahaan;
- Pemrograman Web;
- Projek Kreatif.

Each course has agenda, materials, assignments, submissions, attendance, CBT questions, and historical results.

### 5. Teaching Session

Open `/school/lms/teaching`.

There are six Teaching Schedules for today. Five already have Teaching Session records and one `Projek Kreatif` schedule intentionally has no session, so the workspace can demonstrate an upcoming/missed-session state depending on current time.

The seeded sessions include COMPLETED and DELEGATED states, agenda method, teacher check-in/out time, GPS/geofence evidence metadata, subject attendance, engagement scores, and audit events.

### 6. Selective-truancy story

A deliberate scenario exists where a demo student is marked HADIR/TERLAMBAT globally but ALPA in a subject session.

Examples verified in production include:

- `[DEMO] SMKN12 Siswa 08`: Global HADIR, subject ALPA;
- `[DEMO] SMKN12 Siswa 12`: Global TERLAMBAT, subject ALPA;
- `[DEMO] SMKN12 Siswa 16`: Global HADIR, subject ALPA.

Use this to explain that subject attendance never overwrites Global Attendance and that EWS can surface selective truancy.

### 7. Guru Piket

Open Guru Piket.

A demo teacher is assigned as today's Duty Teacher. One Teaching Session is delegated with a task instruction, and duty reports contain late/dispensation counts.

### 8. PKL Gen2

Open Companies, PKL Foundation, Placements, Attendance, Journals, Reports, and Monitoring/EWS.

Demo companies:

- `DEMO-SMKN12-PKL-01` — CV Kreasi Media Edu;
- `DEMO-SMKN12-PKL-02` — PT Jaringan Nusantara Edu;
- `DEMO-SMKN12-PKL-03` — PT Solusi Digital Edu;
- `DEMO-SMKN12-PKL-04` — Studio Otomasi Edu.

Each company has two demo placements. The dataset includes geofence/schedule metadata, work schedules, capacities, company-department links, mentors, lifecycle events, and varied attendance states.

PKL journal states:

- APPROVED: 4;
- SUBMITTED: 2;
- REVISION: 1;
- one placement intentionally lacks normal journal coverage for an attention/EWS state.

### 9. Kesiswaan / Follow-Up / EWS

Open Student Affairs, Follow-Up, and EWS.

Seeded demonstration states include:

- HIGH violation: `[DEMO] SMKN12 Keterlambatan berulang`;
- active coaching;
- approved dispensation permit;
- student achievement;
- active HIGH follow-up case: `[DEMO] SMKN12 Tindak lanjut kedisiplinan`.

## Seed commands

Run from the application directory with the production `DATABASE_URL` loaded:

```bash
node scripts/school-os-demo-smkn12.mjs seed --dry-run
node scripts/school-os-demo-smkn12.mjs seed

node scripts/school-os-demo-smkn12-modern.mjs seed --dry-run
node scripts/school-os-demo-smkn12-modern.mjs seed
```

Both seeds are idempotent.

## Cleanup

Always clean the modern layer first:

```bash
node scripts/school-os-demo-smkn12-modern.mjs cleanup --dry-run
node scripts/school-os-demo-smkn12-modern.mjs cleanup --confirm=DELETE-SMKN12-DEMO-SCENARIO
node scripts/school-os-demo-smkn12.mjs cleanup --dry-run
node scripts/school-os-demo-smkn12.mjs cleanup --confirm=DELETE-SMKN12-DEMO-SCENARIO
```

The cleanup sequence was verified on a production database clone before the production seed.
