-- CreateTable
CREATE TABLE "SchoolDailyAttendance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dateOnly" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolDailyAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolDailyAttendance_schoolId_studentId_dateOnly_key"
ON "SchoolDailyAttendance"("schoolId", "studentId", "dateOnly");

CREATE INDEX "SchoolDailyAttendance_schoolId_dateOnly_idx"
ON "SchoolDailyAttendance"("schoolId", "dateOnly");

CREATE INDEX "SchoolDailyAttendance_schoolId_classRoomId_dateOnly_idx"
ON "SchoolDailyAttendance"("schoolId", "classRoomId", "dateOnly");

CREATE INDEX "SchoolDailyAttendance_studentId_dateOnly_idx"
ON "SchoolDailyAttendance"("studentId", "dateOnly");

CREATE INDEX "SchoolDailyAttendance_recordedById_idx"
ON "SchoolDailyAttendance"("recordedById");

ALTER TABLE "SchoolDailyAttendance"
ADD CONSTRAINT "SchoolDailyAttendance_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolDailyAttendance"
ADD CONSTRAINT "SchoolDailyAttendance_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolDailyAttendance"
ADD CONSTRAINT "SchoolDailyAttendance_classRoomId_fkey"
FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolDailyAttendance"
ADD CONSTRAINT "SchoolDailyAttendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolDailyAttendance"
ADD CONSTRAINT "SchoolDailyAttendance_recordedById_fkey"
FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
