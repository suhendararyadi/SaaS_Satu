-- Modular Wakasek assignments.
-- Existing TeacherProfile.isWaka=true is preserved as a KURIKULUM assignment.

CREATE TYPE "WakasekRole" AS ENUM ('KURIKULUM', 'KESISWAAN', 'SARPRAS', 'HUMAS_HUBIN');

CREATE TABLE "WakasekAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "role" "WakasekRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WakasekAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WakasekAssignment_schoolId_teacherId_role_key"
ON "WakasekAssignment"("schoolId", "teacherId", "role");

CREATE INDEX "WakasekAssignment_schoolId_role_idx"
ON "WakasekAssignment"("schoolId", "role");

CREATE INDEX "WakasekAssignment_teacherId_idx"
ON "WakasekAssignment"("teacherId");

ALTER TABLE "WakasekAssignment"
ADD CONSTRAINT "WakasekAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WakasekAssignment"
ADD CONSTRAINT "WakasekAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "WakasekAssignment" ("id", "schoolId", "teacherId", "role", "createdAt", "updatedAt")
SELECT
  tp."userId" || '-waka-kurikulum',
  u."schoolId",
  tp."userId",
  'KURIKULUM'::"WakasekRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TeacherProfile" tp
JOIN "User" u ON u."id" = tp."userId"
WHERE tp."isWaka" = true
  AND u."schoolId" IS NOT NULL
ON CONFLICT ("schoolId", "teacherId", "role") DO NOTHING;
