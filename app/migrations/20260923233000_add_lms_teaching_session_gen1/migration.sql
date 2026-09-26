-- AlterTable
ALTER TABLE "LmsAgenda" ADD COLUMN     "method" TEXT,
ADD COLUMN     "teachingSessionId" TEXT;

-- AlterTable
ALTER TABLE "LmsAttendanceSession" ADD COLUMN     "teachingSessionId" TEXT;

-- CreateTable
CREATE TABLE "LmsTeachingSchedule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "roomLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsTeachingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsTeachingSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "dateOnly" TEXT NOT NULL,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "teacherCheckInAt" TIMESTAMP(3),
    "teacherCheckOutAt" TIMESTAMP(3),
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "checkInAccuracy" DOUBLE PRECISION,
    "checkInDistanceM" DOUBLE PRECISION,
    "checkInGeofence" TEXT,
    "checkInEvidenceKey" TEXT,
    "checkOutLatitude" DOUBLE PRECISION,
    "checkOutLongitude" DOUBLE PRECISION,
    "checkOutAccuracy" DOUBLE PRECISION,
    "checkOutDistanceM" DOUBLE PRECISION,
    "checkOutGeofence" TEXT,
    "checkOutEvidenceKey" TEXT,
    "absenceType" TEXT,
    "absenceReason" TEXT,
    "dutyInstruction" TEXT,
    "dutyFileUrl" TEXT,
    "delegatedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsTeachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsEngagementScore" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "tags" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsEngagementScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsTeachingSessionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT,
    "actionType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsTeachingSessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LmsTeachingSchedule_courseId_dayOfWeek_isActive_idx" ON "LmsTeachingSchedule"("courseId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LmsTeachingSchedule_courseId_dayOfWeek_startTime_endTime_key" ON "LmsTeachingSchedule"("courseId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "LmsTeachingSession_courseId_dateOnly_status_idx" ON "LmsTeachingSession"("courseId", "dateOnly", "status");

-- CreateIndex
CREATE INDEX "LmsTeachingSession_dateOnly_status_idx" ON "LmsTeachingSession"("dateOnly", "status");

-- CreateIndex
CREATE INDEX "LmsTeachingSession_deliveredById_deliveredAt_idx" ON "LmsTeachingSession"("deliveredById", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "LmsTeachingSession_scheduleId_dateOnly_key" ON "LmsTeachingSession"("scheduleId", "dateOnly");

-- CreateIndex
CREATE INDEX "LmsEngagementScore_studentId_recordedAt_idx" ON "LmsEngagementScore"("studentId", "recordedAt");

-- CreateIndex
CREATE INDEX "LmsEngagementScore_recordedById_recordedAt_idx" ON "LmsEngagementScore"("recordedById", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LmsEngagementScore_sessionId_studentId_key" ON "LmsEngagementScore"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "LmsTeachingSessionEvent_sessionId_createdAt_idx" ON "LmsTeachingSessionEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "LmsTeachingSessionEvent_actorId_createdAt_idx" ON "LmsTeachingSessionEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "LmsTeachingSessionEvent_actionType_createdAt_idx" ON "LmsTeachingSessionEvent"("actionType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LmsAgenda_teachingSessionId_key" ON "LmsAgenda"("teachingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsAttendanceSession_teachingSessionId_key" ON "LmsAttendanceSession"("teachingSessionId");

-- AddForeignKey
ALTER TABLE "LmsAgenda" ADD CONSTRAINT "LmsAgenda_teachingSessionId_fkey" FOREIGN KEY ("teachingSessionId") REFERENCES "LmsTeachingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsAttendanceSession" ADD CONSTRAINT "LmsAttendanceSession_teachingSessionId_fkey" FOREIGN KEY ("teachingSessionId") REFERENCES "LmsTeachingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSchedule" ADD CONSTRAINT "LmsTeachingSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSession" ADD CONSTRAINT "LmsTeachingSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSession" ADD CONSTRAINT "LmsTeachingSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "LmsTeachingSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSession" ADD CONSTRAINT "LmsTeachingSession_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEngagementScore" ADD CONSTRAINT "LmsEngagementScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LmsTeachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEngagementScore" ADD CONSTRAINT "LmsEngagementScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEngagementScore" ADD CONSTRAINT "LmsEngagementScore_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSessionEvent" ADD CONSTRAINT "LmsTeachingSessionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LmsTeachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsTeachingSessionEvent" ADD CONSTRAINT "LmsTeachingSessionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Teaching Session integrity guards.
ALTER TABLE "LmsTeachingSchedule"
  ADD CONSTRAINT "LmsTeachingSchedule_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "LmsTeachingSchedule_time_check" CHECK (
    "startTime" ~ '^[0-2][0-9]:[0-5][0-9]$'
    AND "endTime" ~ '^[0-2][0-9]:[0-5][0-9]$'
    AND "startTime" < "endTime"
  );

ALTER TABLE "LmsTeachingSession"
  ADD CONSTRAINT "LmsTeachingSession_status_check" CHECK (
    "status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELEGATED', 'ABSENT', 'CANCELLED')
  ),
  ADD CONSTRAINT "LmsTeachingSession_dateOnly_check" CHECK (
    "dateOnly" ~ '^\d{4}-\d{2}-\d{2}$'
  );

ALTER TABLE "LmsEngagementScore"
  ADD CONSTRAINT "LmsEngagementScore_score_check" CHECK ("score" >= 0 AND "score" <= 100);
