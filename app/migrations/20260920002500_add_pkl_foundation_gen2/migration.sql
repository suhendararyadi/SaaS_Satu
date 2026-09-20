-- PKL Foundation Generasi Kedua
-- Additive migration: existing Company/Placement rows remain valid.

ALTER TABLE "Company"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "partnershipStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "partnershipStartDate" TIMESTAMP(3),
  ADD COLUMN "partnershipEndDate" TIMESTAMP(3),
  ADD COLUMN "mouNumber" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing Company rows need a value during the additive ALTER, but Prisma
-- @updatedAt is application-managed and has no database default.
ALTER TABLE "Company" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "PklPeriod" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PklPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyDepartment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PklCompanyCapacity" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "quota" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PklCompanyCapacity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DudiMentorProfile" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "position" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DudiMentorProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Placement" ADD COLUMN "pklPeriodId" TEXT;

CREATE UNIQUE INDEX "Company_schoolId_code_key" ON "Company"("schoolId", "code");
CREATE INDEX "Company_schoolId_isActive_partnershipStatus_idx" ON "Company"("schoolId", "isActive", "partnershipStatus");

CREATE UNIQUE INDEX "PklPeriod_schoolId_name_key" ON "PklPeriod"("schoolId", "name");
CREATE INDEX "PklPeriod_schoolId_isActive_startDate_idx" ON "PklPeriod"("schoolId", "isActive", "startDate");
CREATE INDEX "PklPeriod_academicYearId_idx" ON "PklPeriod"("academicYearId");

CREATE UNIQUE INDEX "CompanyDepartment_companyId_departmentId_key" ON "CompanyDepartment"("companyId", "departmentId");
CREATE INDEX "CompanyDepartment_schoolId_departmentId_isActive_idx" ON "CompanyDepartment"("schoolId", "departmentId", "isActive");

CREATE UNIQUE INDEX "PklCompanyCapacity_periodId_companyId_departmentId_key" ON "PklCompanyCapacity"("periodId", "companyId", "departmentId");
CREATE INDEX "PklCompanyCapacity_schoolId_periodId_idx" ON "PklCompanyCapacity"("schoolId", "periodId");
CREATE INDEX "PklCompanyCapacity_schoolId_companyId_departmentId_idx" ON "PklCompanyCapacity"("schoolId", "companyId", "departmentId");

CREATE UNIQUE INDEX "DudiMentorProfile_userId_key" ON "DudiMentorProfile"("userId");
CREATE INDEX "DudiMentorProfile_schoolId_companyId_isActive_idx" ON "DudiMentorProfile"("schoolId", "companyId", "isActive");

CREATE INDEX "Placement_schoolId_pklPeriodId_status_idx" ON "Placement"("schoolId", "pklPeriodId", "status");
CREATE INDEX "Placement_schoolId_dudiMentorId_idx" ON "Placement"("schoolId", "dudiMentorId");

ALTER TABLE "PklPeriod"
  ADD CONSTRAINT "PklPeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PklPeriod_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyDepartment"
  ADD CONSTRAINT "CompanyDepartment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CompanyDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CompanyDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PklCompanyCapacity"
  ADD CONSTRAINT "PklCompanyCapacity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PklCompanyCapacity_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PklPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PklCompanyCapacity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PklCompanyCapacity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DudiMentorProfile"
  ADD CONSTRAINT "DudiMentorProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DudiMentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DudiMentorProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_pklPeriodId_fkey" FOREIGN KEY ("pklPeriodId") REFERENCES "PklPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
