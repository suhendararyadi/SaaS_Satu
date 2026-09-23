CREATE TABLE "SchoolNotificationState" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolNotificationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolNotificationState_schoolId_userId_notificationKey_key"
  ON "SchoolNotificationState"("schoolId", "userId", "notificationKey");
CREATE INDEX "SchoolNotificationState_schoolId_userId_readAt_idx"
  ON "SchoolNotificationState"("schoolId", "userId", "readAt");

ALTER TABLE "SchoolNotificationState"
  ADD CONSTRAINT "SchoolNotificationState_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolNotificationState"
  ADD CONSTRAINT "SchoolNotificationState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
