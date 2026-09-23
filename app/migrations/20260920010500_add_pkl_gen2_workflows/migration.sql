-- PKL Gen2 workflow foundations. Additive migration only.

ALTER TABLE "Placement"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "readinessCheckedAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Placement_schoolId_departmentId_status_idx"
  ON "Placement"("schoolId", "departmentId", "status");

ALTER TABLE "AttendanceLog"
  ADD COLUMN "geofenceStatus" TEXT,
  ADD COLUMN "scheduleStatus" TEXT,
  ADD COLUMN "evidenceUrl" TEXT,
  ADD COLUMN "isManualCorrection" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "correctedById" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT;

CREATE INDEX "AttendanceLog_status_dateOnly_idx"
  ON "AttendanceLog"("status", "dateOnly");

ALTER TABLE "DailyJournal"
  ADD COLUMN "dateOnly" TEXT,
  ADD COLUMN "competencies" TEXT,
  ADD COLUMN "reflection" TEXT,
  ADD COLUMN "evidenceUrl" TEXT,
  ADD COLUMN "revisionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "lastRevisionAt" TIMESTAMP(3),
  ADD COLUMN "teacherReviewStatus" TEXT,
  ADD COLUMN "teacherFeedback" TEXT,
  ADD COLUMN "teacherScore" INTEGER,
  ADD COLUMN "teacherReviewedAt" TIMESTAMP(3),
  ADD COLUMN "teacherReviewedById" TEXT,
  ADD COLUMN "mentorReviewStatus" TEXT,
  ADD COLUMN "mentorFeedback" TEXT,
  ADD COLUMN "mentorScore" INTEGER,
  ADD COLUMN "mentorReviewedAt" TIMESTAMP(3),
  ADD COLUMN "mentorReviewedById" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing journals remain valid; populate dateOnly for historical rows without forcing uniqueness.
UPDATE "DailyJournal"
SET "dateOnly" = to_char("date" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
WHERE "dateOnly" IS NULL;

-- Existing submitted/approved/revision journals get a best-effort submittedAt for monitoring age.
UPDATE "DailyJournal"
SET "submittedAt" = "date"
WHERE "submittedAt" IS NULL AND "status" <> 'DRAFT';

ALTER TABLE "DailyJournal" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX "DailyJournal_placementId_dateOnly_idx"
  ON "DailyJournal"("placementId", "dateOnly");
CREATE INDEX "DailyJournal_status_submittedAt_idx"
  ON "DailyJournal"("status", "submittedAt");

CREATE TABLE "DailyJournalRevision" (
  "id" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyJournalRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyJournalRevision_journalId_revisionNo_key"
  ON "DailyJournalRevision"("journalId", "revisionNo");
CREATE INDEX "DailyJournalRevision_journalId_createdAt_idx"
  ON "DailyJournalRevision"("journalId", "createdAt");
ALTER TABLE "DailyJournalRevision"
  ADD CONSTRAINT "DailyJournalRevision_journalId_fkey"
  FOREIGN KEY ("journalId") REFERENCES "DailyJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PklWorkSchedule" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
  "checkInStart" TEXT,
  "lateAfter" TEXT,
  "checkOutStart" TEXT,
  "checkOutEnd" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PklWorkSchedule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PklWorkSchedule_periodId_companyId_key"
  ON "PklWorkSchedule"("periodId", "companyId");
CREATE INDEX "PklWorkSchedule_schoolId_periodId_companyId_idx"
  ON "PklWorkSchedule"("schoolId", "periodId", "companyId");
ALTER TABLE "PklWorkSchedule"
  ADD CONSTRAINT "PklWorkSchedule_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PklWorkSchedule"
  ADD CONSTRAINT "PklWorkSchedule_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "PklPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PklWorkSchedule"
  ADD CONSTRAINT "PklWorkSchedule_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PklPlacementEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "placementId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "snapshotBefore" JSONB,
  "snapshotAfter" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PklPlacementEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PklPlacementEvent_schoolId_placementId_createdAt_idx"
  ON "PklPlacementEvent"("schoolId", "placementId", "createdAt");
CREATE INDEX "PklPlacementEvent_schoolId_eventType_createdAt_idx"
  ON "PklPlacementEvent"("schoolId", "eventType", "createdAt");
ALTER TABLE "PklPlacementEvent"
  ADD CONSTRAINT "PklPlacementEvent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PklPlacementEvent"
  ADD CONSTRAINT "PklPlacementEvent_placementId_fkey"
  FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
