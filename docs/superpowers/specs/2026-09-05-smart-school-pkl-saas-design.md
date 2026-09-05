# Spesifikasi Teknis: Smart School & E-PKL Multi-Tenant SaaS Platform

## 1. Ringkasan Eksekutif & Visi Produk
Platform ini adalah transformasi dan duplikasi menyeluruh dari sistem **E-PKL SMKN 9 Garut** menjadi **SaaS B2B Komersial Multi-Tenant** berbasis **Open SaaS (React 19 + Wasp + TypeScript + Prisma + PostgreSQL)**. 

Platform ini memungkinkan sekolah vokasi (SMK), politeknik, dan institusi pendidikan di seluruh Indonesia untuk mendaftar secara mandiri (*self-service*), memilih paket kapasitas siswa, dan mengelola seluruh operasional:
1. **Sistem PKL / Praktik Kerja Lapangan Lengkap** (DUDI, Penempatan, Presensi Geofencing GPS + Foto Selfie, Jurnal Harian & Validasi, Early Warning System).
2. **Sistem LMS (Learning Management System)** (Ruang Mapel, Agenda KBM & Foto Bukti Pembelajaran, Presensi Pertemuan, Materi, Tugas Siswa, Ujian Online / CBT Auto-scoring, dan Buku Nilai).
3. **Pemerintahan & Peran Khusus** (Waka Kurikulum, Guru Piket, Wali Kelas).
4. **Sistem Penagihan & Langganan SaaS** (Tier kuota siswa, checkout, portal tagihan, dan superadmin metrics).

---

## 2. Arsitektur Multi-Tenancy & Isolasi Data
* **Pola Desain**: *Shared Database, Shared Schema dengan Logical Isolation* via foreign key `schoolId`.
* **Guard Isolasi**: Setiap operasi Wasp (Queries & Actions) mewajibkan validasi identitas dan context:
  ```ts
  const schoolId = context.user.schoolId;
  if (!schoolId && !context.user.isSuperAdmin) {
    throw new HttpError(403, "Access denied: User is not associated with an active school");
  }
  ```
* **Domain URL**:
  - Landing & Pendaftaran SaaS: `https://opensaas.id/`
  - Portal Aplikasi: `https://opensaas.id/app/` (Multi-tenant workspace)
  - Admin Superadmin SaaS: `https://opensaas.id/admin/`

---

## 3. Matriks Peran Pengguna (Role-Based Access Control / RBAC)

| Peran (`UserRole`) | Deskripsi | Hak Akses Utama |
|---|---|---|
| `SUPERADMIN` | Pemilik / Pengelola Platform SaaS | Kelola tenant sekolah, statistik MRR/pendapatan, kontrol kuota, system logs |
| `SCHOOL_ADMIN` | Kepala Sekolah / Waka Hubin / Tim IT Sekolah | Kelola master data (Jurusan, Kelas, Siswa, Guru), langganan sekolah, konfigurasi PKL |
| `TEACHER` | Guru / Pembimbing Sekolah | Bimbingan PKL, review jurnal, buat ruang LMS, catat agenda & foto KBM, buat tugas & ujian |
| `STUDENT` | Siswa PKL & Siswa Kelas | Presensi GPS PKL, input jurnal PKL, akses materi LMS, kumpul tugas, kerjakan ujian |
| `DUDI_MENTOR` | Instruktur / Pembimbing Lapangan Industri | Presensi kehadiran siswa di DUDI, approval jurnal, beri nilai lapangan |
| `WAKA_KURIKULUM` | Waka Bidang Kurikulum (Flag khusus pada Teacher) | Supervisi KBM harian seluruh guru, pantau agenda mengajar & foto bukti |
| `DUTY_TEACHER` | Guru Piket Harian (Penugasan rotasi Teacher) | Catat siswa terlambat, dispensasi izin, rekapitulasi kehadiran sekolah |
| `HOMEROOM_TEACHER` | Wali Kelas (Penugasan rombel Teacher) | Monitoring perkembangan dan rekap presensi siswa perwaliannya |

---

## 4. Spesifikasi Skema Database (Prisma Models)

### 4.1. Core Multi-Tenancy & Sekolah
```prisma
enum UserRole {
  SUPERADMIN
  SCHOOL_ADMIN
  TEACHER
  STUDENT
  DUDI_MENTOR
}

enum SubscriptionTier {
  FREE_TRIAL
  STARTER
  PRO
  ENTERPRISE
}

model School {
  id                  String            @id @default(uuid())
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  name                String
  slug                String            @unique
  npsn                String?
  address             String?
  city                String?
  province            String?
  phone               String?
  email               String?
  logoUrl             String?
  
  tier                SubscriptionTier  @default(FREE_TRIAL)
  studentQuota        Int               @default(50)
  subscriptionStatus  String            @default("active")
  subscriptionEndsAt  DateTime?

  users               User[]
  departments         Department[]
  classRooms          ClassRoom[]
  academicYears       AcademicYear[]
  companies           Company[]
  placements          Placement[]
  lmsCourses          LmsCourse[]
  dutyReports         DutyTeacherReport[]
}
```

### 4.2. Master Data Akademik
```prisma
model Department {
  id          String      @id @default(uuid())
  schoolId    String
  school      School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  code        String
  name        String
  classes     ClassRoom[]

  @@unique([schoolId, code])
}

model AcademicYear {
  id          String      @id @default(uuid())
  schoolId    String
  school      School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  yearName    String      // "2026/2027"
  semester    String      // "GANJIL" | "GENAP"
  isActive    Boolean     @default(false)
  classes     ClassRoom[]
  courses     LmsCourse[]

  @@unique([schoolId, yearName, semester])
}

model ClassRoom {
  id                  String        @id @default(uuid())
  schoolId            String
  school              School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  departmentId        String
  department          Department    @relation(fields: [departmentId], references: [id])
  academicYearId      String
  academicYear        AcademicYear  @relation(fields: [academicYearId], references: [id])
  gradeLevel          Int           // 10, 11, 12
  name                String        // "XII RPL 1"
  homeroomTeacherId   String?
  homeroomTeacher     User?         @relation("HomeroomClasses", fields: [homeroomTeacherId], references: [id])
  students            User[]        @relation("StudentClass")
  lmsCourses          LmsCourse[]

  @@unique([schoolId, academicYearId, name])
}
```

### 4.3. Profil User & Hubungan Khusus
```prisma
model TeacherProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nip           String?
  title         String?   // "S.Kom., M.T."
  phone         String?
  isWaka        Boolean   @default(false)
}

model StudentProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nis           String?
  nisn          String?
  gender        String?   // "L" | "P"
  birthDate     DateTime?
  status        String    @default("ACTIVE") // "ACTIVE", "SUSPENDED", "GRADUATED"
}
```

### 4.4. Domain PKL (Perusahaan, Penempatan, Presensi, Jurnal, EWS)
```prisma
model Company {
  id                  String        @id @default(uuid())
  schoolId            String
  school              School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name                String
  industrySector      String?
  address             String
  picName             String?
  picPhone            String?
  latitude            Float?
  longitude           Float?
  radiusMeters        Int           @default(100)
  maxQuota            Int           @default(5)
  placements          Placement[]
}

model Placement {
  id                  String          @id @default(uuid())
  schoolId            String
  school              School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  studentId           String
  student             User            @relation("StudentPlacements", fields: [studentId], references: [id])
  companyId           String
  company             Company         @relation(fields: [companyId], references: [id])
  teacherSupervisorId String?
  teacherSupervisor   User?           @relation("TeacherPlacements", fields: [teacherSupervisorId], references: [id])
  dudiMentorId        String?
  dudiMentor          User?           @relation("MentorPlacements", fields: [dudiMentorId], references: [id])
  startDate           DateTime
  endDate             DateTime
  status              String          @default("ACTIVE") // "ACTIVE", "COMPLETED", "CANCELED"
  
  attendances         AttendanceLog[]
  journals            DailyJournal[]
}

model AttendanceLog {
  id                  String        @id @default(uuid())
  placementId         String
  placement           Placement     @relation(fields: [placementId], references: [id], onDelete: Cascade)
  timestamp           DateTime      @default(now())
  dateOnly            String        // "YYYY-MM-DD" untuk indeks cepat per hari
  type                String        // "CHECK_IN", "CHECK_OUT"
  status              String        // "HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA", "LIBUR"
  latitude            Float?
  longitude           Float?
  distanceMeters      Float?
  photoUrl            String?
  notes               String?
}

model DailyJournal {
  id                  String        @id @default(uuid())
  placementId         String
  placement           Placement     @relation(fields: [placementId], references: [id], onDelete: Cascade)
  date                DateTime      @default(now())
  activityDescription String
  obstacleDescription String?
  photoUrl            String?
  status              String        @default("SUBMITTED") // "DRAFT", "SUBMITTED", "APPROVED", "REVISION"
  feedback            String?
  score               Int?          // Skala 0-100
  approvedAt          DateTime?
  approvedById        String?
}
```

### 4.5. Domain LMS (Learning Management System)
```prisma
model LmsCourse {
  id                  String          @id @default(uuid())
  schoolId            String
  school              School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  academicYearId      String
  academicYear        AcademicYear    @relation(fields: [academicYearId], references: [id])
  classRoomId         String
  classRoom           ClassRoom       @relation(fields: [classRoomId], references: [id])
  teacherId           String
  teacher             User            @relation("TeacherCourses", fields: [teacherId], references: [id])
  subjectName         String          // Nama Mapel: "Pemrograman Web"
  description         String?

  agendas             LmsAgenda[]
  materials           LmsMaterial[]
  assignments         LmsAssignment[]
  assessments         LmsAssessment[]
  attendances         LmsAttendanceSession[]
}

model LmsAgenda {
  id                  String          @id @default(uuid())
  courseId            String
  course              LmsCourse       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  date                DateTime        @default(now())
  period              String          // "Jam ke 1-3"
  competency          String          // Materi / KD yang diajarkan
  summary             String          // Uraian kegiatan pembelajaran
  photos              LmsAgendaPhoto[]
}

model LmsAgendaPhoto {
  id                  String          @id @default(uuid())
  agendaId            String
  agenda              LmsAgenda       @relation(fields: [agendaId], references: [id], onDelete: Cascade)
  photoUrl            String
}

model LmsAttendanceSession {
  id                  String          @id @default(uuid())
  courseId            String
  course              LmsCourse       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  date                DateTime        @default(now())
  sessionNumber       Int             @default(1)
  records             LmsAttendanceRecord[]
}

model LmsAttendanceRecord {
  id                  String                @id @default(uuid())
  sessionId           String
  session             LmsAttendanceSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentId           String
  student             User                  @relation(fields: [studentId], references: [id])
  status              String                // "HADIR", "SAKIT", "IZIN", "ALPA"
  notes               String?
}

model LmsMaterial {
  id                  String          @id @default(uuid())
  courseId            String
  course              LmsCourse       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title               String
  description         String?
  fileUrl             String?
  externalUrl         String?
  createdAt           DateTime        @default(now())
}

model LmsAssignment {
  id                  String          @id @default(uuid())
  courseId            String
  course              LmsCourse       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title               String
  instruction         String
  deadline            DateTime
  attachmentUrl       String?
  submissions         LmsSubmission[]
}

model LmsSubmission {
  id                  String          @id @default(uuid())
  assignmentId        String
  assignment          LmsAssignment   @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId           String
  student             User            @relation(fields: [studentId], references: [id])
  submittedAt         DateTime        @default(now())
  textContent         String?
  fileUrl             String?
  grade               Float?
  feedback            String?
}

model LmsAssessment {
  id                  String                  @id @default(uuid())
  courseId            String
  course              LmsCourse               @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title               String
  durationMinutes     Int                     @default(60)
  startTime           DateTime
  endTime             DateTime
  isRandomized        Boolean                 @default(true)
  questions           LmsAssessmentQuestion[]
  results             LmsAssessmentResult[]
}

model LmsAssessmentQuestion {
  id                  String                  @id @default(uuid())
  assessmentId        String
  assessment          LmsAssessment           @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  questionType        String                  // "MULTIPLE_CHOICE", "ESSAY"
  prompt              String
  imageUrl            String?
  options             Json?                   // [{ id: "A", text: "...", isCorrect: true }, ...]
  points              Float                   @default(10.0)
}

model LmsAssessmentResult {
  id                  String          @id @default(uuid())
  assessmentId        String
  assessment          LmsAssessment   @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  studentId           String
  student             User            @relation(fields: [studentId], references: [id])
  score               Float
  startedAt           DateTime        @default(now())
  finishedAt          DateTime?
  answers             Json            // Raw jawaban siswa
}
```

### 4.6. Guru Piket & Monitoring Khusus
```prisma
model DutyTeacherReport {
  id                  String          @id @default(uuid())
  schoolId            String
  school              School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  date                DateTime        @default(now())
  dutyTeacherId       String
  dutyTeacher         User            @relation(fields: [dutyTeacherId], references: [id])
  lateStudentsCount   Int             @default(0)
  dispensationsCount  Int             @default(0)
  notes               String?
}
```

---

## 5. Rencana Pelaksanaan Bertahap (Roadmap Eksekusi)

### Fase 1: Multi-Tenancy & Master Data Sekolah (Dasar Fondasi)
1. Ekstensi skema database Prisma untuk `School`, `Department`, `ClassRoom`, `AcademicYear`, `TeacherProfile`, `StudentProfile`.
2. Integrasi onboarding sekolah mandiri dengan pemilihan paket langganan.
3. Portal Admin Sekolah:
   - CRUD Jurusan, Kelas, dan Tahun Ajaran.
   - Modul Import CSV/Excel untuk pendaftaran massal Siswa, Guru, dan Akun Login.

### Fase 2: Siklus Penuh E-PKL
1. Master Data DUDI & Geofence (Peta Leaflet / koordinat GPS kantor + radius toleransi).
2. Penempatan Siswa (Plotting siswa ↔ DUDI ↔ Pembimbing Sekolah).
3. Presensi Siswa PWA (Deteksi Geolocation HTML5 + Kamera selfie + validasi radius).
4. Jurnal Harian PKL (Upload dokumentasi kegiatan + Review/Approval Guru).
5. Early Warning System (Alert siswa terlambat/alpa berturut-turut).

### Fase 3: LMS Lengkap (Ruang Mapel, Agenda, Tugas & Ujian)
1. Ruang Kelas Mapel (Auto-enroll siswa per rombel).
2. Agenda KBM Guru + Upload Foto Pembelajaran di Kelas.
3. Presensi Mapel Pertemuan.
4. Materi Ajar & Penugasan Berkas.
5. Ujian Online (CBT) dengan auto-scoring nilai pilihan ganda.
6. Gradebook / Buku Nilai Siswa.

### Fase 4: Portal Peran Khusus & Export Dokumen Resmi
1. Dashboard Monitoring Waka Kurikulum (Supervisi KBM guru).
2. Portal Guru Piket (Siswa terlambat & dispensasi).
3. Portal Wali Kelas.
4. Export Laporan Resmi Ber-KOP Sekolah (PDF Rekap Presensi, Jurnal, Nilai PKL, & Sertifikat).

---

## 6. Kriteria Keberhasilan & Verifikasi
- [ ] Admin sekolah baru dapat mendaftar dan akun langsung terikat pada `School` miliknya.
- [ ] Siswa dari SMK A tidak dapat melihat data siswa atau DUDI milik SMK B (Strict Multi-Tenant Isolation).
- [ ] Presensi PKL sukses menghitung jarak koordinat real-time siswa terhadap titik DUDI.
- [ ] Siswa dapat mengerjakan kuis CBT dan nilai langsung terakumulasi ke buku nilai guru.
- [ ] Semua rute responsif sempurna saat dibuka di HP (PWA mode).
