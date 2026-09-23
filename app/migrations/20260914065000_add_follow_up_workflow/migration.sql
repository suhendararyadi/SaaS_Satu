CREATE TYPE "FollowUpStatus" AS ENUM ('FINDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELED');
CREATE TYPE "FollowUpSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "FollowUpSourceType" AS ENUM ('ATTENDANCE', 'PKL_EWS', 'DUTY_TEACHER', 'HOMEROOM', 'WAKASEK', 'SYSTEM', 'MANUAL');
CREATE TYPE "FollowUpEventType" AS ENUM ('CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'COMMENT', 'UPDATED');

CREATE TABLE "SchoolFollowUpCase" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "sourceType" "FollowUpSourceType" NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "FollowUpSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "FollowUpStatus" NOT NULL DEFAULT 'FINDING',
  "subjectStudentId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "resolutionNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFollowUpCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolFollowUpEvent" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "FollowUpEventType" NOT NULL,
  "fromStatus" "FollowUpStatus",
  "toStatus" "FollowUpStatus",
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFollowUpEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolFollowUpCase_schoolId_sourceType_sourceKey_key"
ON "SchoolFollowUpCase"("schoolId", "sourceType", "sourceKey");
CREATE INDEX "SchoolFollowUpCase_schoolId_status_severity_idx"
ON "SchoolFollowUpCase"("schoolId", "status", "severity");
CREATE INDEX "SchoolFollowUpCase_schoolId_assignedToId_status_idx"
ON "SchoolFollowUpCase"("schoolId", "assignedToId", "status");
CREATE INDEX "SchoolFollowUpCase_schoolId_subjectStudentId_status_idx"
ON "SchoolFollowUpCase"("schoolId", "subjectStudentId", "status");
CREATE INDEX "SchoolFollowUpCase_schoolId_createdAt_idx"
ON "SchoolFollowUpCase"("schoolId", "createdAt");
CREATE INDEX "SchoolFollowUpEvent_caseId_createdAt_idx"
ON "SchoolFollowUpEvent"("caseId", "createdAt");
CREATE INDEX "SchoolFollowUpEvent_actorId_createdAt_idx"
ON "SchoolFollowUpEvent"("actorId", "createdAt");

ALTER TABLE "SchoolFollowUpCase"
ADD CONSTRAINT "SchoolFollowUpCase_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpCase"
ADD CONSTRAINT "SchoolFollowUpCase_subjectStudentId_fkey"
FOREIGN KEY ("subjectStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpCase"
ADD CONSTRAINT "SchoolFollowUpCase_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpCase"
ADD CONSTRAINT "SchoolFollowUpCase_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpCase"
ADD CONSTRAINT "SchoolFollowUpCase_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpEvent"
ADD CONSTRAINT "SchoolFollowUpEvent_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "SchoolFollowUpCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolFollowUpEvent"
ADD CONSTRAINT "SchoolFollowUpEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
