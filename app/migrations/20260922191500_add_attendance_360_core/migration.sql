-- Attendance 360 core is intentionally idempotent.
-- This project had the additive schema pre-applied once before Prisma migration
-- bookkeeping was recorded. Every statement below is therefore safe both on a
-- fresh database and on that already-aligned production schema.

ALTER TYPE "StudentPermitType" ADD VALUE IF NOT EXISTS 'SICK';

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceCalendarDayType') THEN
    CREATE TYPE "AttendanceCalendarDayType" AS ENUM ('SCHOOL_DAY', 'HOLIDAY', 'NATIONAL_HOLIDAY', 'SEMESTER_BREAK', 'SCHOOL_EVENT', 'EXAM_DAY', 'SPECIAL_SCHEDULE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceEventType') THEN
    CREATE TYPE "AttendanceEventType" AS ENUM ('SELF_CHECK_IN', 'SELF_CHECK_OUT', 'DUTY_LATE', 'DUTY_EARLY_LEAVE', 'DUTY_DISPENSATION', 'SUBJECT_ATTENDANCE', 'HABIT_ATTENDANCE', 'PERMIT_STATUS', 'HOMEROOM_OVERRIDE', 'SYSTEM_RECONCILIATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceGeofenceStatus') THEN
    CREATE TYPE "AttendanceGeofenceStatus" AS ENUM ('INSIDE', 'OUTSIDE', 'UNVERIFIED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceReconciliationStatus') THEN
    CREATE TYPE "AttendanceReconciliationStatus" AS ENUM ('AUTO', 'NEEDS_REVIEW', 'VERIFIED', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceActivityStatus') THEN
    CREATE TYPE "AttendanceActivityStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED');
  END IF;
END
$migration$;

ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "arrivalAt" TIMESTAMP(3);
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "checkOutAt" TIMESTAMP(3);
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "lateMinutes" INTEGER;
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "earlyLeave" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "reconciliationStatus" "AttendanceReconciliationStatus" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "evidenceSummary" JSONB;
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "SchoolDailyAttendance" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "SchoolAttendancePolicy" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "radiusMeters" INTEGER NOT NULL DEFAULT 100,
  "maxGpsAccuracyMeters" INTEGER NOT NULL DEFAULT 50,
  "checkInOpen" TEXT NOT NULL DEFAULT '05:30',
  "lateAfter" TEXT NOT NULL DEFAULT '07:00',
  "checkInClose" TEXT NOT NULL DEFAULT '09:00',
  "checkOutOpen" TEXT NOT NULL DEFAULT '14:00',
  "checkOutClose" TEXT NOT NULL DEFAULT '18:00',
  "allowStudentCheckIn" BOOLEAN NOT NULL DEFAULT true,
  "allowStudentCheckOut" BOOLEAN NOT NULL DEFAULT true,
  "requireCheckInSelfie" BOOLEAN NOT NULL DEFAULT true,
  "requireCheckOutSelfie" BOOLEAN NOT NULL DEFAULT false,
  "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolAttendancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolCalendarDay" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "dateOnly" TEXT NOT NULL,
  "type" "AttendanceCalendarDayType" NOT NULL,
  "label" TEXT NOT NULL,
  "notes" TEXT,
  "checkInOpenOverride" TEXT,
  "lateAfterOverride" TEXT,
  "checkInCloseOverride" TEXT,
  "checkOutOpenOverride" TEXT,
  "checkOutCloseOverride" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolCalendarDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentAttendanceEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "dateOnly" TEXT NOT NULL,
  "type" "AttendanceEventType" NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceKey" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "gpsAccuracy" DOUBLE PRECISION,
  "distanceMeters" DOUBLE PRECISION,
  "geofenceStatus" "AttendanceGeofenceStatus",
  "evidenceKey" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAttendanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceActivity" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT,
  "dateOnly" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "status" "AttendanceActivityStatus" NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceActivityRecord" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "notes" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceActivityRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolAttendancePolicy_schoolId_key" ON "SchoolAttendancePolicy"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolCalendarDay_schoolId_dateOnly_key" ON "SchoolCalendarDay"("schoolId", "dateOnly");
CREATE INDEX IF NOT EXISTS "SchoolCalendarDay_schoolId_type_dateOnly_idx" ON "SchoolCalendarDay"("schoolId", "type", "dateOnly");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAttendanceEvent_schoolId_sourceKey_key" ON "StudentAttendanceEvent"("schoolId", "sourceKey");
CREATE INDEX IF NOT EXISTS "StudentAttendanceEvent_schoolId_studentId_dateOnly_idx" ON "StudentAttendanceEvent"("schoolId", "studentId", "dateOnly");
CREATE INDEX IF NOT EXISTS "StudentAttendanceEvent_schoolId_type_dateOnly_idx" ON "StudentAttendanceEvent"("schoolId", "type", "dateOnly");
CREATE INDEX IF NOT EXISTS "StudentAttendanceEvent_actorId_occurredAt_idx" ON "StudentAttendanceEvent"("actorId", "occurredAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceActivity_schoolId_dateOnly_code_key" ON "AttendanceActivity"("schoolId", "dateOnly", "code");
CREATE INDEX IF NOT EXISTS "AttendanceActivity_schoolId_dateOnly_status_idx" ON "AttendanceActivity"("schoolId", "dateOnly", "status");
CREATE INDEX IF NOT EXISTS "AttendanceActivity_academicYearId_idx" ON "AttendanceActivity"("academicYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceActivityRecord_activityId_studentId_key" ON "AttendanceActivityRecord"("activityId", "studentId");
CREATE INDEX IF NOT EXISTS "AttendanceActivityRecord_studentId_recordedAt_idx" ON "AttendanceActivityRecord"("studentId", "recordedAt");
CREATE INDEX IF NOT EXISTS "AttendanceActivityRecord_recordedById_recordedAt_idx" ON "AttendanceActivityRecord"("recordedById", "recordedAt");
CREATE INDEX IF NOT EXISTS "SchoolDailyAttendance_schoolId_reconciliationStatus_dateOnly_idx" ON "SchoolDailyAttendance"("schoolId", "reconciliationStatus", "dateOnly");
CREATE INDEX IF NOT EXISTS "SchoolDailyAttendance_verifiedById_idx" ON "SchoolDailyAttendance"("verifiedById");

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SchoolDailyAttendance_verifiedById_fkey') THEN
    ALTER TABLE "SchoolDailyAttendance" ADD CONSTRAINT "SchoolDailyAttendance_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SchoolAttendancePolicy_schoolId_fkey') THEN
    ALTER TABLE "SchoolAttendancePolicy" ADD CONSTRAINT "SchoolAttendancePolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SchoolCalendarDay_schoolId_fkey') THEN
    ALTER TABLE "SchoolCalendarDay" ADD CONSTRAINT "SchoolCalendarDay_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentAttendanceEvent_schoolId_fkey') THEN
    ALTER TABLE "StudentAttendanceEvent" ADD CONSTRAINT "StudentAttendanceEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentAttendanceEvent_studentId_fkey') THEN
    ALTER TABLE "StudentAttendanceEvent" ADD CONSTRAINT "StudentAttendanceEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentAttendanceEvent_actorId_fkey') THEN
    ALTER TABLE "StudentAttendanceEvent" ADD CONSTRAINT "StudentAttendanceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivity_schoolId_fkey') THEN
    ALTER TABLE "AttendanceActivity" ADD CONSTRAINT "AttendanceActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivity_academicYearId_fkey') THEN
    ALTER TABLE "AttendanceActivity" ADD CONSTRAINT "AttendanceActivity_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivity_createdById_fkey') THEN
    ALTER TABLE "AttendanceActivity" ADD CONSTRAINT "AttendanceActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivityRecord_activityId_fkey') THEN
    ALTER TABLE "AttendanceActivityRecord" ADD CONSTRAINT "AttendanceActivityRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "AttendanceActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivityRecord_studentId_fkey') THEN
    ALTER TABLE "AttendanceActivityRecord" ADD CONSTRAINT "AttendanceActivityRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceActivityRecord_recordedById_fkey') THEN
    ALTER TABLE "AttendanceActivityRecord" ADD CONSTRAINT "AttendanceActivityRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$migration$;
