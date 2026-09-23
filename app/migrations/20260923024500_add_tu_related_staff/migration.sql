ALTER TABLE "AdministrationDocument" ADD COLUMN "relatedStaffId" TEXT;
CREATE INDEX "AdministrationDocument_schoolId_relatedStaffId_idx" ON "AdministrationDocument"("schoolId", "relatedStaffId");
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_relatedStaffId_fkey" FOREIGN KEY ("relatedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
