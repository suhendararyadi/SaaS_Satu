-- AlterTable
ALTER TABLE "SchoolSite" ADD COLUMN "landingSections" JSONB;

-- CreateTable
CREATE TABLE "SchoolSiteRevision" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSiteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolSiteRevision_schoolId_createdAt_idx" ON "SchoolSiteRevision"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolSiteRevision_schoolId_resourceType_resourceId_createdAt_idx" ON "SchoolSiteRevision"("schoolId", "resourceType", "resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "SchoolSiteRevision" ADD CONSTRAINT "SchoolSiteRevision_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
