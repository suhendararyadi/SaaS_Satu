-- Organization Assignment Center: generic assignments that do not already
-- have a canonical model (Wakasek and Homeroom remain in their existing tables).

CREATE TYPE "SchoolStaffAssignmentRole" AS ENUM (
  'PRINCIPAL',
  'DUTY_TEACHER',
  'DEPARTMENT_HEAD',
  'EXTRACURRICULAR_ADVISOR',
  'OTHER'
);

CREATE TABLE "SchoolStaffAssignment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "role" "SchoolStaffAssignmentRole" NOT NULL,
  "academicYearId" TEXT,
  "departmentId" TEXT,
  "unitName" TEXT,
  "customTitle" TEXT,
  "dutyDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchoolStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolStaffAssignment_schoolId_role_isActive_idx"
ON "SchoolStaffAssignment"("schoolId", "role", "isActive");

CREATE INDEX "SchoolStaffAssignment_schoolId_teacherId_isActive_idx"
ON "SchoolStaffAssignment"("schoolId", "teacherId", "isActive");

CREATE INDEX "SchoolStaffAssignment_departmentId_role_isActive_idx"
ON "SchoolStaffAssignment"("departmentId", "role", "isActive");

CREATE INDEX "SchoolStaffAssignment_academicYearId_isActive_idx"
ON "SchoolStaffAssignment"("academicYearId", "isActive");

ALTER TABLE "SchoolStaffAssignment"
ADD CONSTRAINT "SchoolStaffAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffAssignment"
ADD CONSTRAINT "SchoolStaffAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffAssignment"
ADD CONSTRAINT "SchoolStaffAssignment_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffAssignment"
ADD CONSTRAINT "SchoolStaffAssignment_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill users who have historically submitted Guru Piket reports so
-- existing operational access is not lost. Empty dutyDays means flexible/all days.
INSERT INTO "SchoolStaffAssignment" (
  "id", "schoolId", "teacherId", "role", "unitName", "dutyDays",
  "notes", "isActive", "createdAt", "updatedAt"
)
SELECT
  d."schoolId" || '-' || d."dutyTeacherId" || '-legacy-duty',
  d."schoolId",
  d."dutyTeacherId",
  'DUTY_TEACHER'::"SchoolStaffAssignmentRole",
  'Guru Piket',
  ARRAY[]::TEXT[],
  'Migrasi otomatis dari riwayat laporan Guru Piket.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DutyTeacherReport" d
JOIN "User" u ON u."id" = d."dutyTeacherId"
WHERE u."schoolId" = d."schoolId"
GROUP BY d."schoolId", d."dutyTeacherId"
ON CONFLICT ("id") DO NOTHING;
