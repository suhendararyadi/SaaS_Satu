ALTER TYPE "FollowUpSourceType" ADD VALUE IF NOT EXISTS 'SARPRAS';

CREATE TYPE "AssetCondition" AS ENUM ('GOOD', 'FAIR', 'DAMAGED', 'LOST', 'MAINTENANCE');
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISPOSED');
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('REPORTED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "AssetMovementType" AS ENUM ('ACQUISITION', 'TRANSFER', 'REPAIR', 'RETURN', 'DISPOSAL', 'ADJUSTMENT');

CREATE TABLE "FacilityRoom" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "building" TEXT,
  "floor" TEXT,
  "responsibleUserId" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacilityRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetCategory" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetItem" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" TEXT,
  "roomId" TEXT,
  "responsibleUserId" TEXT,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "acquisitionDate" TIMESTAMP(3),
  "acquisitionSource" TEXT,
  "acquisitionValue" DECIMAL(14,2),
  "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
  "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetMaintenance" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "issue" TEXT NOT NULL,
  "priority" "FollowUpSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'REPORTED',
  "reportedById" TEXT,
  "assignedToId" TEXT,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "vendor" TEXT,
  "estimatedCost" DECIMAL(14,2),
  "actualCost" DECIMAL(14,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetMaintenance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetMovement" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "type" "AssetMovementType" NOT NULL,
  "fromRoomId" TEXT,
  "toRoomId" TEXT,
  "performedById" TEXT,
  "note" TEXT,
  "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityRoom_schoolId_code_key" ON "FacilityRoom"("schoolId", "code");
CREATE INDEX "FacilityRoom_schoolId_isActive_idx" ON "FacilityRoom"("schoolId", "isActive");
CREATE INDEX "FacilityRoom_responsibleUserId_idx" ON "FacilityRoom"("responsibleUserId");

CREATE UNIQUE INDEX "AssetCategory_schoolId_code_key" ON "AssetCategory"("schoolId", "code");
CREATE INDEX "AssetCategory_schoolId_name_idx" ON "AssetCategory"("schoolId", "name");

CREATE UNIQUE INDEX "AssetItem_schoolId_code_key" ON "AssetItem"("schoolId", "code");
CREATE INDEX "AssetItem_schoolId_condition_status_idx" ON "AssetItem"("schoolId", "condition", "status");
CREATE INDEX "AssetItem_schoolId_roomId_idx" ON "AssetItem"("schoolId", "roomId");
CREATE INDEX "AssetItem_categoryId_idx" ON "AssetItem"("categoryId");
CREATE INDEX "AssetItem_responsibleUserId_idx" ON "AssetItem"("responsibleUserId");

CREATE INDEX "AssetMaintenance_schoolId_status_priority_idx" ON "AssetMaintenance"("schoolId", "status", "priority");
CREATE INDEX "AssetMaintenance_assetId_status_idx" ON "AssetMaintenance"("assetId", "status");
CREATE INDEX "AssetMaintenance_assignedToId_status_idx" ON "AssetMaintenance"("assignedToId", "status");

CREATE INDEX "AssetMovement_schoolId_movedAt_idx" ON "AssetMovement"("schoolId", "movedAt");
CREATE INDEX "AssetMovement_assetId_movedAt_idx" ON "AssetMovement"("assetId", "movedAt");
CREATE INDEX "AssetMovement_fromRoomId_idx" ON "AssetMovement"("fromRoomId");
CREATE INDEX "AssetMovement_toRoomId_idx" ON "AssetMovement"("toRoomId");
CREATE INDEX "AssetMovement_performedById_idx" ON "AssetMovement"("performedById");

ALTER TABLE "FacilityRoom" ADD CONSTRAINT "FacilityRoom_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacilityRoom" ADD CONSTRAINT "FacilityRoom_responsibleUserId_fkey"
FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "FacilityRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetItem" ADD CONSTRAINT "AssetItem_responsibleUserId_fkey"
FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "AssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_reportedById_fkey"
FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "AssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_fromRoomId_fkey"
FOREIGN KEY ("fromRoomId") REFERENCES "FacilityRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_toRoomId_fkey"
FOREIGN KEY ("toRoomId") REFERENCES "FacilityRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_performedById_fkey"
FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
