-- CBT Gen2 additive foundation. Legacy LmsAssessment/LmsAssessmentQuestion/
-- LmsAssessmentResult rows remain compatible and are not rewritten.

ALTER TABLE "LmsAssessment"
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "attemptLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 75,
  ADD COLUMN "requireToken" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accessToken" TEXT,
  ADD COLUMN "showScoreMode" TEXT NOT NULL DEFAULT 'IMMEDIATE',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LmsAssessmentQuestion"
  ADD COLUMN "bankItemId" TEXT,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LmsAssessmentResult"
  ADD COLUMN "attemptId" TEXT;

CREATE TABLE "LmsQuestionBankItem" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "questionType" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "imageUrl" TEXT,
  "options" JSONB,
  "points" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
  "tags" JSONB,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LmsQuestionBankItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LmsAssessmentAttempt" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "attemptNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "scoreAuto" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scoreManual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scoreTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "passed" BOOLEAN,
  "gradingStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "questionOrder" JSONB,
  "optionOrder" JSONB,
  "lastSavedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LmsAssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LmsAssessmentAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionId" TEXT,
  "answerText" TEXT,
  "autoScore" DOUBLE PRECISION,
  "manualScore" DOUBLE PRECISION,
  "feedback" TEXT,
  "gradedById" TEXT,
  "gradedAt" TIMESTAMP(3),
  "answeredAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LmsAssessmentAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LmsAssessmentEvent" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "attemptId" TEXT,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LmsAssessmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LmsAssessment_courseId_status_startTime_idx" ON "LmsAssessment"("courseId", "status", "startTime");
CREATE INDEX "LmsAssessmentQuestion_assessmentId_position_idx" ON "LmsAssessmentQuestion"("assessmentId", "position");
CREATE INDEX "LmsAssessmentQuestion_bankItemId_idx" ON "LmsAssessmentQuestion"("bankItemId");
CREATE UNIQUE INDEX "LmsAssessmentResult_attemptId_key" ON "LmsAssessmentResult"("attemptId");
CREATE INDEX "LmsQuestionBankItem_schoolId_courseId_updatedAt_idx" ON "LmsQuestionBankItem"("schoolId", "courseId", "updatedAt");
CREATE INDEX "LmsQuestionBankItem_courseId_questionType_difficulty_idx" ON "LmsQuestionBankItem"("courseId", "questionType", "difficulty");
CREATE UNIQUE INDEX "LmsAssessmentAttempt_assessmentId_studentId_attemptNo_key" ON "LmsAssessmentAttempt"("assessmentId", "studentId", "attemptNo");
CREATE INDEX "LmsAssessmentAttempt_assessmentId_status_updatedAt_idx" ON "LmsAssessmentAttempt"("assessmentId", "status", "updatedAt");
CREATE INDEX "LmsAssessmentAttempt_studentId_updatedAt_idx" ON "LmsAssessmentAttempt"("studentId", "updatedAt");
CREATE UNIQUE INDEX "LmsAssessmentAnswer_attemptId_questionId_key" ON "LmsAssessmentAnswer"("attemptId", "questionId");
CREATE INDEX "LmsAssessmentAnswer_questionId_gradedAt_idx" ON "LmsAssessmentAnswer"("questionId", "gradedAt");
CREATE INDEX "LmsAssessmentAnswer_gradedById_gradedAt_idx" ON "LmsAssessmentAnswer"("gradedById", "gradedAt");
CREATE INDEX "LmsAssessmentEvent_assessmentId_createdAt_idx" ON "LmsAssessmentEvent"("assessmentId", "createdAt");
CREATE INDEX "LmsAssessmentEvent_attemptId_createdAt_idx" ON "LmsAssessmentEvent"("attemptId", "createdAt");
CREATE INDEX "LmsAssessmentEvent_actorId_createdAt_idx" ON "LmsAssessmentEvent"("actorId", "createdAt");
CREATE INDEX "LmsAssessmentEvent_eventType_createdAt_idx" ON "LmsAssessmentEvent"("eventType", "createdAt");

ALTER TABLE "LmsQuestionBankItem" ADD CONSTRAINT "LmsQuestionBankItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsQuestionBankItem" ADD CONSTRAINT "LmsQuestionBankItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsQuestionBankItem" ADD CONSTRAINT "LmsQuestionBankItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentQuestion" ADD CONSTRAINT "LmsAssessmentQuestion_bankItemId_fkey" FOREIGN KEY ("bankItemId") REFERENCES "LmsQuestionBankItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentAttempt" ADD CONSTRAINT "LmsAssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "LmsAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentAttempt" ADD CONSTRAINT "LmsAssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentAnswer" ADD CONSTRAINT "LmsAssessmentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LmsAssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentAnswer" ADD CONSTRAINT "LmsAssessmentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LmsAssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentAnswer" ADD CONSTRAINT "LmsAssessmentAnswer_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentResult" ADD CONSTRAINT "LmsAssessmentResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LmsAssessmentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentEvent" ADD CONSTRAINT "LmsAssessmentEvent_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "LmsAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentEvent" ADD CONSTRAINT "LmsAssessmentEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LmsAssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LmsAssessmentEvent" ADD CONSTRAINT "LmsAssessmentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LmsAssessment"
  ADD CONSTRAINT "LmsAssessment_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  ADD CONSTRAINT "LmsAssessment_attemptLimit_check" CHECK ("attemptLimit" BETWEEN 1 AND 10),
  ADD CONSTRAINT "LmsAssessment_passingScore_check" CHECK ("passingScore" >= 0 AND "passingScore" <= 100),
  ADD CONSTRAINT "LmsAssessment_showScoreMode_check" CHECK ("showScoreMode" IN ('IMMEDIATE', 'AFTER_END', 'HIDDEN'));

ALTER TABLE "LmsQuestionBankItem"
  ADD CONSTRAINT "LmsQuestionBankItem_questionType_check" CHECK ("questionType" IN ('MULTIPLE_CHOICE', 'ESSAY')),
  ADD CONSTRAINT "LmsQuestionBankItem_difficulty_check" CHECK ("difficulty" IN ('EASY', 'MEDIUM', 'HARD')),
  ADD CONSTRAINT "LmsQuestionBankItem_points_check" CHECK ("points" > 0);

ALTER TABLE "LmsAssessmentAttempt"
  ADD CONSTRAINT "LmsAssessmentAttempt_attemptNo_check" CHECK ("attemptNo" >= 1),
  ADD CONSTRAINT "LmsAssessmentAttempt_status_check" CHECK ("status" IN ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'GRADED')),
  ADD CONSTRAINT "LmsAssessmentAttempt_gradingStatus_check" CHECK ("gradingStatus" IN ('NOT_REQUIRED', 'PENDING', 'COMPLETE')),
  ADD CONSTRAINT "LmsAssessmentAttempt_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100);
