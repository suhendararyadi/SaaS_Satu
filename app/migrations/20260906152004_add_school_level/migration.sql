-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('SD_MI', 'SMP_MTS', 'SMA_SMK');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "level" "SchoolLevel" NOT NULL DEFAULT 'SMA_SMK';
