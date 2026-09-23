-- Add Dapodik-aligned student profile fields without modifying existing student data.
ALTER TABLE "StudentProfile"
ADD COLUMN "birthPlace" TEXT,
ADD COLUMN "nik" TEXT,
ADD COLUMN "religion" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "rt" TEXT,
ADD COLUMN "rw" TEXT,
ADD COLUMN "hamlet" TEXT,
ADD COLUMN "village" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "residenceType" TEXT,
ADD COLUMN "transportation" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "mobilePhone" TEXT,
ADD COLUMN "skhun" TEXT,
ADD COLUMN "currentClassName" TEXT,
ADD COLUMN "nationalExamNumber" TEXT,
ADD COLUMN "diplomaSerialNumber" TEXT,
ADD COLUMN "previousSchool" TEXT,
ADD COLUMN "birthCertificateNumber" TEXT,
ADD COLUMN "receivesKps" BOOLEAN,
ADD COLUMN "kpsNumber" TEXT,
ADD COLUMN "receivesKip" BOOLEAN,
ADD COLUMN "kipNumber" TEXT,
ADD COLUMN "kipName" TEXT,
ADD COLUMN "kksNumber" TEXT,
ADD COLUMN "pipEligible" BOOLEAN,
ADD COLUMN "pipReason" TEXT,
ADD COLUMN "fatherName" TEXT,
ADD COLUMN "fatherBirthYear" INTEGER,
ADD COLUMN "fatherEducation" TEXT,
ADD COLUMN "fatherOccupation" TEXT,
ADD COLUMN "fatherIncome" TEXT,
ADD COLUMN "fatherNik" TEXT,
ADD COLUMN "motherName" TEXT,
ADD COLUMN "motherBirthYear" INTEGER,
ADD COLUMN "motherEducation" TEXT,
ADD COLUMN "motherOccupation" TEXT,
ADD COLUMN "motherIncome" TEXT,
ADD COLUMN "motherNik" TEXT,
ADD COLUMN "guardianName" TEXT,
ADD COLUMN "guardianBirthYear" INTEGER,
ADD COLUMN "guardianEducation" TEXT,
ADD COLUMN "guardianOccupation" TEXT,
ADD COLUMN "guardianIncome" TEXT,
ADD COLUMN "guardianNik" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT,
ADD COLUMN "bankAccountHolder" TEXT,
ADD COLUMN "specialNeeds" TEXT,
ADD COLUMN "birthOrder" INTEGER,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "familyCardNumber" TEXT,
ADD COLUMN "weightKg" DOUBLE PRECISION,
ADD COLUMN "heightCm" DOUBLE PRECISION,
ADD COLUMN "headCircumferenceCm" DOUBLE PRECISION,
ADD COLUMN "siblingCount" INTEGER,
ADD COLUMN "distanceToSchoolKm" DOUBLE PRECISION,
ADD COLUMN "dapodikImportedAt" TIMESTAMP(3);

CREATE INDEX "StudentProfile_nisn_idx" ON "StudentProfile"("nisn");
CREATE INDEX "StudentProfile_nik_idx" ON "StudentProfile"("nik");
CREATE INDEX "StudentProfile_nis_idx" ON "StudentProfile"("nis");

-- Preserve existing students and align their Dapodik class-name mirror with
-- the canonical School OS class relation. No synthetic personal data is added.
UPDATE "StudentProfile" AS sp
SET "currentClassName" = cr."name"
FROM "User" AS u
JOIN "ClassRoom" AS cr ON cr."id" = u."classRoomId"
WHERE sp."userId" = u."id"
  AND sp."currentClassName" IS NULL;
