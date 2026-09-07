-- DropForeignKey
ALTER TABLE "ClassRoom" DROP CONSTRAINT "ClassRoom_departmentId_fkey";

-- AlterTable
ALTER TABLE "ClassRoom" ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
