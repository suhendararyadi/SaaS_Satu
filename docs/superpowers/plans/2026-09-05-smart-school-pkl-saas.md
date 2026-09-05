# Smart School & E-PKL Multi-Tenant SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, commercial Multi-Tenant SaaS platform duplicating and modernizing all capabilities of `E-PKL-SMKN9Garut` (including PKL, LMS, Waka Kurikulum, Guru Piket, and Wali Kelas) on top of Open SaaS (React 19 + Wasp 0.25 + TypeScript + Prisma + PostgreSQL).

**Architecture:** Shared database with strict multi-tenant scoping via `schoolId` on all domain entities. Built as an end-to-end type-safe monorepo using Wasp RPC operations, Prisma ORM, and Tailwind CSS / ShadCN UI, exposed via a unified responsive PWA web application.

**Tech Stack:** React 19, Wasp 0.25, TypeScript 5+, Prisma 5.19, PostgreSQL 14+, Leaflet/OpenStreetMap, Lucide Icons, ShadCN UI, Tailwind CSS.

## Global Constraints
- Every school-scoped query and action MUST validate `context.user.schoolId` (or require `SUPERADMIN`).
- All dates and attendance calculations MUST use `Asia/Jakarta` (WIB) timezone convention.
- All forms and UI components must be fully mobile-responsive (PWA ready).
- Component reuse from `admin-web/src/features` of E-PKL wherever applicable.

---

### Task 1: Multi-Tenancy & School Master Data Schema Migration

**Files:**
- Modify: `app/schema.prisma`
- Test: PostgreSQL migration verification

**Interfaces:**
- Produces: `School`, `UserRole`, `Department`, `ClassRoom`, `AcademicYear`, `TeacherProfile`, `StudentProfile` in Prisma Client.

- [ ] **Step 1: Update schema.prisma with School & Core Academic Models**
Add `UserRole`, `SubscriptionTier`, `School`, `Department`, `AcademicYear`, `ClassRoom`, `TeacherProfile`, `StudentProfile` models, and add `schoolId` & `role` to `User`.

- [ ] **Step 2: Run Prisma migration**
Run: `cd app && npx prisma migrate dev --name add_school_core_multi_tenancy`
Expected: Migration created and applied to `saas_satu` database.

- [ ] **Step 3: Rebuild Wasp SDK**
Run: `cd app/.wasp/out/sdk/wasp && npm run build`
Expected: PASS, Prisma client generated with new types.

- [ ] **Step 4: Commit**
```bash
git add app/schema.prisma app/migrations/
git commit -m "feat(db): add multi-tenancy and school core master schema"
```

---

### Task 2: Multi-Tenant Authorization Helper & Context Guards

**Files:**
- Create: `app/src/school/authGuards.ts`
- Create: `app/src/school/types.ts`
- Test: Unit check for role and tenant matching

**Interfaces:**
- Produces: `ensureSchoolUser(context, allowedRoles?)`, `ensureSuperAdmin(context)`

- [ ] **Step 1: Implement authGuards.ts**
Create helper function that extracts `context.user`, verifies `context.user.schoolId`, and validates that `context.user.role` matches allowed roles (e.g. `SCHOOL_ADMIN`, `TEACHER`, etc.).

- [ ] **Step 2: Verify type-safety with Wasp context**
Verify that TypeScript compiles with no errors.

- [ ] **Step 3: Commit**
```bash
git add app/src/school/
git commit -m "feat(auth): add multi-tenant and role authorization guards"
```

---

### Task 3: School Core Operations (Jurusan, Kelas, Tahun Ajaran)

**Files:**
- Create: `app/src/school/operations.ts`
- Create: `app/src/school/school.wasp.ts`
- Modify: `app/main.wasp.ts`

**Interfaces:**
- Produces: `getSchoolInfo`, `getDepartments`, `createDepartment`, `getClassRooms`, `createClassRoom`, `getAcademicYears`, `setActiveAcademicYear`.

- [ ] **Step 1: Write Wasp queries and actions in operations.ts**
Implement CRUD for Department, ClassRoom, and AcademicYear, strictly scoped to `context.user.schoolId`.

- [ ] **Step 2: Register operations in school.wasp.ts and main.wasp.ts**
Register the spec in Wasp configuration.

- [ ] **Step 3: Verify build and endpoints**
Ensure `wasp build` compiles cleanly.

- [ ] **Step 4: Commit**
```bash
git add app/src/school/ app/main.wasp.ts
git commit -m "feat(school): implement core school master operations"
```

---

### Task 4: Bulk CSV/Excel Importer for Siswa, Guru & DUDI

**Files:**
- Create: `app/src/school/import/csvParser.ts`
- Create: `app/src/school/import/operations.ts`
- Modify: `app/src/school/school.wasp.ts`

**Interfaces:**
- Produces: `importStudentsFromCsv`, `importTeachersFromCsv`, `importCompaniesFromCsv`

- [ ] **Step 1: Implement parser and validator**
Validate CSV headers (e.g. NIS, NISN, Nama, Kelas, Email, Password) with Zod schemas.

- [ ] **Step 2: Create batch insert transaction**
Create user records with hashed passwords and link to `schoolId` and profiles in a single Prisma transaction.

- [ ] **Step 3: Commit**
```bash
git add app/src/school/import/
git commit -m "feat(import): add bulk CSV import for students, teachers, and companies"
```

---

### Task 5: School Admin Dashboard UI (Master Data & Import)

**Files:**
- Create: `app/src/school/pages/SchoolDashboardPage.tsx`
- Create: `app/src/school/pages/DepartmentsPage.tsx`
- Create: `app/src/school/pages/ClassesPage.tsx`
- Create: `app/src/school/pages/StudentsPage.tsx`
- Create: `app/src/school/pages/TeachersPage.tsx`
- Create: `app/src/school/pages/ImportDataPage.tsx`
- Modify: `app/src/school/school.wasp.ts`

**Interfaces:**
- Produces: Web UI routes `/school`, `/school/departments`, `/school/classes`, `/school/students`, `/school/teachers`, `/school/import`.

- [ ] **Step 1: Build layout and navigation for School Admin**
Port UI components from `admin-web/src/features/academic` and `admin-web/src/features/students`.

- [ ] **Step 2: Integrate React Query hooks**
Hook up tables, filters, search, and pagination.

- [ ] **Step 3: Test CSV upload and preview**
Verify student import creates records in database.

- [ ] **Step 4: Commit**
```bash
git add app/src/school/pages/
git commit -m "feat(ui): add school admin dashboard and management pages"
```

---

### Task 6: E-PKL Subsystem Schema & Migration (DUDI, Penempatan, Presensi, Jurnal)

**Files:**
- Modify: `app/schema.prisma`
- Test: Migration verification

**Interfaces:**
- Produces: `Company`, `Placement`, `AttendanceLog`, `DailyJournal` models.

- [ ] **Step 1: Add PKL models to schema.prisma**
Add `Company`, `Placement`, `AttendanceLog`, `DailyJournal` with relations to `School`, `User`.

- [ ] **Step 2: Run Prisma migration**
Run: `cd app && npx prisma migrate dev --name add_pkl_subsystem`

- [ ] **Step 3: Rebuild SDK**
Run: `cd app/.wasp/out/sdk/wasp && npm run build`

- [ ] **Step 4: Commit**
```bash
git add app/schema.prisma app/migrations/
git commit -m "feat(db): add PKL domain models"
```

---

### Task 7: Master DUDI & Geofencing Management

**Files:**
- Create: `app/src/pkl/companies/operations.ts`
- Create: `app/src/pkl/companies/CompaniesPage.tsx`
- Create: `app/src/pkl/companies/CompanyMapPicker.tsx` (Leaflet / OpenStreetMap)
- Create: `app/src/pkl/pkl.wasp.ts`
- Modify: `app/main.wasp.ts`

**Interfaces:**
- Produces: `getCompanies`, `createCompany`, `updateCompany`, `deleteCompany`.

- [ ] **Step 1: Implement DUDI operations**
Include latitude, longitude, radiusMeters, maxQuota, and contact PIC.

- [ ] **Step 2: Implement Leaflet map coordinate picker**
Interactive map to drop pin and adjust geofence radius.

- [ ] **Step 3: Commit**
```bash
git add app/src/pkl/companies/ app/src/pkl/pkl.wasp.ts
git commit -m "feat(pkl): add DUDI master and geofencing configuration"
```

---

### Task 8: Penempatan PKL (Plotting Siswa ke DUDI & Guru Pembimbing)

**Files:**
- Create: `app/src/pkl/placements/operations.ts`
- Create: `app/src/pkl/placements/PlacementsPage.tsx`
- Create: `app/src/pkl/placements/PlacementModal.tsx`

**Interfaces:**
- Produces: `getPlacements`, `assignStudentToCompany`, `unassignStudent`, `getTeacherSupervisedStudents`.

- [ ] **Step 1: Implement placement operations**
Support single and bulk assignment of students to a DUDI and supervising teacher.

- [ ] **Step 2: Implement UI for placement management**
Show quota status per DUDI (e.g. 3/5 students) and assigned teacher.

- [ ] **Step 3: Commit**
```bash
git add app/src/pkl/placements/
git commit -m "feat(pkl): implement student placement and supervisor assignment"
```

---

### Task 9: Presensi Siswa PWA (GPS Geofence + Selfie Camera)

**Files:**
- Create: `app/src/pkl/attendance/operations.ts`
- Create: `app/src/pkl/attendance/geoUtils.ts` (Haversine distance calculation)
- Create: `app/src/pkl/attendance/StudentAttendancePage.tsx`
- Create: `app/src/pkl/attendance/CameraCapture.tsx`

**Interfaces:**
- Produces: `recordPklAttendance`, `getMyAttendanceHistory`, `getPlacementAttendanceSummary`.

- [ ] **Step 1: Implement Haversine distance & geofence validation**
Compute distance in meters between student coordinates and DUDI coordinates. If > radius, flag as out-of-bounds or reject depending on school setting.

- [ ] **Step 2: Implement CameraCapture component**
Capture selfie using HTML5 `navigator.mediaDevices.getUserMedia`.

- [ ] **Step 3: Build mobile-friendly StudentAttendancePage**
Large check-in / check-out buttons, real-time distance indicator, and status badge.

- [ ] **Step 4: Commit**
```bash
git add app/src/pkl/attendance/
git commit -m "feat(pkl): add GPS geofenced attendance with camera selfie"
```

---

### Task 10: Jurnal Harian Siswa & Approval Guru Pembimbing

**Files:**
- Create: `app/src/pkl/journals/operations.ts`
- Create: `app/src/pkl/journals/StudentJournalPage.tsx`
- Create: `app/src/pkl/journals/TeacherJournalReviewPage.tsx`

**Interfaces:**
- Produces: `submitDailyJournal`, `getStudentJournals`, `reviewJournal` (approve, revision, score).

- [ ] **Step 1: Implement journal CRUD & review operations**
Allow students to submit activity, obstacles, and photo; allow teachers to approve/reject with feedback and score (0-100).

- [ ] **Step 2: Implement Student journal entry UI**
Mobile-friendly form with photo preview.

- [ ] **Step 3: Implement Teacher review portal**
Batch review cards for supervising teachers.

- [ ] **Step 4: Commit**
```bash
git add app/src/pkl/journals/
git commit -m "feat(pkl): add daily journal submission and teacher review workflow"
```

---

### Task 11: Early Warning System & Rekapitulasi PKL

**Files:**
- Create: `app/src/pkl/early-warning/operations.ts`
- Create: `app/src/pkl/early-warning/EarlyWarningDashboard.tsx`
- Create: `app/src/pkl/reports/PklReportPage.tsx`

**Interfaces:**
- Produces: `getEarlyWarningMetrics`, `getPklAttendanceReport`.

- [ ] **Step 1: Implement EWS query**
Identify students with >= 3 absences, consecutive missing journals, or chronic lateness.

- [ ] **Step 2: Build alert indicators and follow-up notes**
Color-coded severity tags (Merah, Kuning, Hijau) with direct WhatsApp contact button for parents/students.

- [ ] **Step 3: Commit**
```bash
git add app/src/pkl/early-warning/ app/src/pkl/reports/
git commit -m "feat(pkl): add early warning system and attendance reports"
```

---

### Task 12: LMS Schema & Migration

**Files:**
- Modify: `app/schema.prisma`
- Test: Migration verification

**Interfaces:**
- Produces: `LmsCourse`, `LmsAgenda`, `LmsAgendaPhoto`, `LmsAttendanceSession`, `LmsAttendanceRecord`, `LmsMaterial`, `LmsAssignment`, `LmsSubmission`, `LmsAssessment`, `LmsAssessmentQuestion`, `LmsAssessmentResult`.

- [ ] **Step 1: Add LMS models to schema.prisma**
Add all LMS tables specified in Section 4.5 of design spec.

- [ ] **Step 2: Run Prisma migration**
Run: `cd app && npx prisma migrate dev --name add_lms_subsystem`

- [ ] **Step 3: Rebuild Wasp SDK**
Run: `cd app/.wasp/out/sdk/wasp && npm run build`

- [ ] **Step 4: Commit**
```bash
git add app/schema.prisma app/migrations/
git commit -m "feat(db): add comprehensive LMS domain models"
```

---

### Task 13: LMS Ruang Mapel & Auto-Enrollment

**Files:**
- Create: `app/src/lms/courses/operations.ts`
- Create: `app/src/lms/courses/CoursesPage.tsx`
- Create: `app/src/lms/courses/CourseDetailPage.tsx`
- Create: `app/src/lms/lms.wasp.ts`
- Modify: `app/main.wasp.ts`

**Interfaces:**
- Produces: `getCoursesByTeacher`, `getCoursesByStudent`, `createCourse`, `getCourseDetails`.

- [ ] **Step 1: Implement course operations**
Auto-resolve student enrollments based on classroom roster.

- [ ] **Step 2: Build course cards & subject directory UI**
Clean card view for teachers and students.

- [ ] **Step 3: Commit**
```bash
git add app/src/lms/courses/ app/src/lms/lms.wasp.ts
git commit -m "feat(lms): implement course management and auto-enrollment"
```

---

### Task 14: Agenda KBM Guru & Foto Pembelajaran

**Files:**
- Create: `app/src/lms/agendas/operations.ts`
- Create: `app/src/lms/agendas/CourseAgendasTab.tsx`
- Create: `app/src/lms/agendas/CreateAgendaModal.tsx`

**Interfaces:**
- Produces: `getCourseAgendas`, `createAgendaEntry`, `deleteAgendaEntry`.

- [ ] **Step 1: Implement agenda operations**
Support date, period/jam ke-, competency/materi ajar, summary, and photo upload.

- [ ] **Step 2: Build agenda timeline UI**
Display past teaching sessions with gallery of classroom photos.

- [ ] **Step 3: Commit**
```bash
git add app/src/lms/agendas/
git commit -m "feat(lms): add class agenda logging and photo documentation"
```

---

### Task 15: Presensi Pertemuan Mapel LMS

**Files:**
- Create: `app/src/lms/attendance/operations.ts`
- Create: `app/src/lms/attendance/CourseAttendanceTab.tsx`

**Interfaces:**
- Produces: `createAttendanceSession`, `saveAttendanceRecords`, `getCourseAttendanceHistory`.

- [ ] **Step 1: Implement multi-session attendance operations**
Record status (`HADIR`, `SAKIT`, `IZIN`, `ALPA`) for all enrolled students in the class.

- [ ] **Step 2: Build interactive attendance sheet UI**
Radio/toggle buttons for rapid roll-call marking.

- [ ] **Step 3: Commit**
```bash
git add app/src/lms/attendance/
git commit -m "feat(lms): add course session roll-call attendance"
```

---

### Task 16: Materi & Penugasan Berkas LMS

**Files:**
- Create: `app/src/lms/assignments/operations.ts`
- Create: `app/src/lms/materials/operations.ts`
- Create: `app/src/lms/assignments/AssignmentsTab.tsx`
- Create: `app/src/lms/materials/MaterialsTab.tsx`

**Interfaces:**
- Produces: `createMaterial`, `createAssignment`, `submitAssignment`, `gradeSubmission`.

- [ ] **Step 1: Implement material and assignment operations**
Support attachment URLs, deadline timestamps, student submission status, and teacher grading/feedback.

- [ ] **Step 2: Build materials feed and assignment submission portal**
Student view to upload homework files and teacher view to score submissions.

- [ ] **Step 3: Commit**
```bash
git add app/src/lms/assignments/ app/src/lms/materials/
git commit -m "feat(lms): add materials sharing, assignments, and grading"
```

---

### Task 17: Ujian Online (CBT / Assessment) & Auto-Scoring

**Files:**
- Create: `app/src/lms/assessments/operations.ts`
- Create: `app/src/lms/assessments/AssessmentsTab.tsx`
- Create: `app/src/lms/assessments/ExamRunnerPage.tsx`
- Create: `app/src/lms/assessments/AssessmentQuestionsEditor.tsx`

**Interfaces:**
- Produces: `createAssessment`, `saveQuestions`, `startExam`, `submitExamAnswers`, `getExamResults`.

- [ ] **Step 1: Implement CBT assessment operations with auto-grading**
Automatically compare submitted answers against correct options, calculate percentage score, and save result.

- [ ] **Step 2: Build interactive ExamRunnerPage**
Timer countdown, question navigation palette, option selection, and autosave.

- [ ] **Step 3: Build teacher question editor**
Support multiple choice, option items, points, and image prompts.

- [ ] **Step 4: Commit**
```bash
git add app/src/lms/assessments/
git commit -m "feat(lms): add online CBT assessment with automatic grading"
```

---

### Task 18: Portal Waka Kurikulum (Monitoring KBM & Tindak Lanjut)

**Files:**
- Create: `app/src/curriculum/operations.ts`
- Create: `app/src/curriculum/WakaDashboardPage.tsx`
- Create: `app/src/curriculum/curriculum.wasp.ts`
- Modify: `app/main.wasp.ts`

**Interfaces:**
- Produces: `getDailyKbmSummary`, `getTeacherTeachingStatus`, `saveSupervisionNote`.

- [ ] **Step 1: Implement Waka Kurikulum monitoring operations**
Aggregate all courses taught today, check whether agenda was recorded, and inspect evidence photos.

- [ ] **Step 2: Build Waka dashboard UI**
Real-time progress bars: "% KBM Terlaksana Hari Ini", list of active classes, and quick supervision notes.

- [ ] **Step 3: Commit**
```bash
git add app/src/curriculum/
git commit -m "feat(curriculum): add Waka Kurikulum monitoring and supervision dashboard"
```

---

### Task 19: Portal Guru Piket & Wali Kelas

**Files:**
- Create: `app/src/duty/operations.ts`
- Create: `app/src/duty/DutyTeacherPage.tsx`
- Create: `app/src/homeroom/HomeroomPage.tsx`

**Interfaces:**
- Produces: `recordLateStudent`, `createDispensation`, `getHomeroomStudentOverview`.

- [ ] **Step 1: Implement Duty Teacher and Homeroom operations**
Log late arrivals, print/show dispensations, and give homeroom teachers single-view stats of their classroom.

- [ ] **Step 2: Build Duty and Homeroom interfaces**
Quick search by student name/NISN and status cards.

- [ ] **Step 3: Commit**
```bash
git add app/src/duty/ app/src/homeroom/
git commit -m "feat(roles): add Guru Piket and Wali Kelas portals"
```

---

### Task 20: Pilot School Seed (SMKN 9 Garut) & Official PDF Export

**Files:**
- Create: `app/src/server/scripts/seedPilotSchool.ts`
- Create: `app/src/reports/pdfGenerator.ts`
- Modify: `app/main.wasp.ts`
- Modify: `app/src/client/components/NavBar/NavBar.tsx`

**Interfaces:**
- Produces: Full SMKN 9 Garut pilot dataset in PostgreSQL database, PDF printable views with official header.

- [ ] **Step 1: Implement seedPilotSchool script**
Seed School "SMKN 9 Garut", Jurusan (RPL, TKJ, DKV), Classes (XII RPL 1, XII TKJ 1), Teachers, Students, DUDI, Placements, Attendance, Journals, and sample LMS courses.

- [ ] **Step 2: Run seed script**
Populate database with complete pilot dataset.

- [ ] **Step 3: Implement printable PDF templates**
Cetak Rekap Presensi PKL, Lembar Penilaian PKL, dan Jurnal Harian ber-KOP resmi.

- [ ] **Step 4: Update main navbar with role-aware switcher**
Easily switch between School Admin, Guru, Siswa, Waka, and Piket for demo/testing.

- [ ] **Step 5: Full verification check**
Verify all 20 tasks, check server logs, ensure 0 errors.

- [ ] **Step 6: Final Commit**
```bash
git add .
git commit -m "feat(complete): complete Smart School & E-PKL SaaS implementation with pilot seed"
```
