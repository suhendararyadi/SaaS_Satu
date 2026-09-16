-- Add Dapodik-aligned PTK profile fields without modifying existing teacher data.
ALTER TABLE "TeacherProfile"
ADD COLUMN "nuptk" TEXT,
ADD COLUMN "gender" TEXT,
ADD COLUMN "birthPlace" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "nik" TEXT,
ADD COLUMN "employmentStatus" TEXT,
ADD COLUMN "ptkType" TEXT,
ADD COLUMN "frontTitle" TEXT,
ADD COLUMN "backTitle" TEXT,
ADD COLUMN "educationLevel" TEXT,
ADD COLUMN "educationMajor" TEXT,
ADD COLUMN "certification" TEXT,
ADD COLUMN "workStartDate" TIMESTAMP(3),
ADD COLUMN "additionalDuties" TEXT,
ADD COLUMN "subjectsTaught" TEXT,
ADD COLUMN "additionalDutyHours" INTEGER,
ADD COLUMN "teachingHours" INTEGER,
ADD COLUMN "totalTeachingHours" INTEGER,
ADD COLUMN "studentLoad" TEXT,
ADD COLUMN "competencies" TEXT,
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "dapodikImportedAt" TIMESTAMP(3);

CREATE INDEX "TeacherProfile_nip_idx" ON "TeacherProfile"("nip");
CREATE INDEX "TeacherProfile_nuptk_idx" ON "TeacherProfile"("nuptk");
CREATE INDEX "TeacherProfile_nik_idx" ON "TeacherProfile"("nik");
