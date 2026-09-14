ALTER TYPE "FollowUpSourceType" ADD VALUE IF NOT EXISTS 'STUDENT_AFFAIRS';

CREATE TYPE "StudentViolationStatus" AS ENUM ('RECORDED', 'IN_REVIEW', 'RESOLVED', 'CANCELED');
CREATE TYPE "StudentAchievementLevel" AS ENUM ('SCHOOL', 'DISTRICT', 'REGENCY', 'PROVINCE', 'NATIONAL', 'INTERNATIONAL');
CREATE TYPE "StudentCoachingType" AS ENUM ('COACHING', 'COUNSELING', 'PARENT_MEETING');
CREATE TYPE "StudentCoachingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "StudentPermitType" AS ENUM ('EXIT', 'DISPENSATION', 'ACTIVITY', 'OTHER');
CREATE TYPE "StudentPermitStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELED');
CREATE TYPE "StudentAffairsEntityType" AS ENUM ('VIOLATION', 'ACHIEVEMENT', 'COACHING', 'PERMIT');
CREATE TYPE "StudentAffairsEventType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMMENT');

CREATE TABLE "StudentViolation" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "FollowUpSeverity" NOT NULL DEFAULT 'MEDIUM',
  "points" INTEGER NOT NULL DEFAULT 0,
  "incidentAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "status" "StudentViolationStatus" NOT NULL DEFAULT 'RECORDED',
  "reportedById" TEXT,
  "handledById" TEXT,
  "actionTaken" TEXT,
  "resolutionNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentViolation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAchievement" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "level" "StudentAchievementLevel" NOT NULL,
  "award" TEXT,
  "organizer" TEXT,
  "achievementDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "evidenceUrl" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentCoaching" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" "StudentCoachingType" NOT NULL,
  "topic" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "attendees" TEXT,
  "agreement" TEXT,
  "nextAction" TEXT,
  "nextReviewAt" TIMESTAMP(3),
  "status" "StudentCoachingStatus" NOT NULL DEFAULT 'OPEN',
  "recordedById" TEXT,
  "assignedToId" TEXT,
  "completedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentCoaching_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentPermit" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" "StudentPermitType" NOT NULL,
  "reason" TEXT NOT NULL,
  "destination" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "status" "StudentPermitStatus" NOT NULL DEFAULT 'REQUESTED',
  "recordedById" TEXT,
  "approvedById" TEXT,
  "approvalNote" TEXT,
  "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentPermit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAffairsEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "entityType" "StudentAffairsEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "type" "StudentAffairsEventType" NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAffairsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentViolation_schoolId_status_severity_idx" ON "StudentViolation"("schoolId","status","severity");
CREATE INDEX "StudentViolation_schoolId_studentId_incidentAt_idx" ON "StudentViolation"("schoolId","studentId","incidentAt");
CREATE INDEX "StudentViolation_handledById_status_idx" ON "StudentViolation"("handledById","status");
CREATE INDEX "StudentAchievement_schoolId_level_achievementDate_idx" ON "StudentAchievement"("schoolId","level","achievementDate");
CREATE INDEX "StudentAchievement_schoolId_studentId_achievementDate_idx" ON "StudentAchievement"("schoolId","studentId","achievementDate");
CREATE INDEX "StudentCoaching_schoolId_status_type_idx" ON "StudentCoaching"("schoolId","status","type");
CREATE INDEX "StudentCoaching_schoolId_studentId_createdAt_idx" ON "StudentCoaching"("schoolId","studentId","createdAt");
CREATE INDEX "StudentCoaching_assignedToId_status_idx" ON "StudentCoaching"("assignedToId","status");
CREATE INDEX "StudentPermit_schoolId_status_startAt_idx" ON "StudentPermit"("schoolId","status","startAt");
CREATE INDEX "StudentPermit_schoolId_studentId_startAt_idx" ON "StudentPermit"("schoolId","studentId","startAt");
CREATE INDEX "StudentAffairsEvent_schoolId_studentId_createdAt_idx" ON "StudentAffairsEvent"("schoolId","studentId","createdAt");
CREATE INDEX "StudentAffairsEvent_entityType_entityId_createdAt_idx" ON "StudentAffairsEvent"("entityType","entityId","createdAt");
CREATE INDEX "StudentAffairsEvent_actorId_createdAt_idx" ON "StudentAffairsEvent"("actorId","createdAt");

ALTER TABLE "StudentViolation" ADD CONSTRAINT "StudentViolation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentViolation" ADD CONSTRAINT "StudentViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentViolation" ADD CONSTRAINT "StudentViolation_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentViolation" ADD CONSTRAINT "StudentViolation_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentCoaching" ADD CONSTRAINT "StudentCoaching_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCoaching" ADD CONSTRAINT "StudentCoaching_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCoaching" ADD CONSTRAINT "StudentCoaching_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentCoaching" ADD CONSTRAINT "StudentCoaching_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPermit" ADD CONSTRAINT "StudentPermit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPermit" ADD CONSTRAINT "StudentPermit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPermit" ADD CONSTRAINT "StudentPermit_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentPermit" ADD CONSTRAINT "StudentPermit_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentAffairsEvent" ADD CONSTRAINT "StudentAffairsEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAffairsEvent" ADD CONSTRAINT "StudentAffairsEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAffairsEvent" ADD CONSTRAINT "StudentAffairsEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
