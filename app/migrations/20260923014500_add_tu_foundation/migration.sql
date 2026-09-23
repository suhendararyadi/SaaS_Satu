-- School OS Tata Usaha foundation: configurable starter templates, draft documents,
-- numbering register foundation, and audit trail. No official numbering or issuing is enabled here.

CREATE TYPE "AdministrationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "AdministrationDocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'RETURNED_FOR_REVISION', 'APPROVED', 'VOID');
CREATE TYPE "AdministrationDirection" AS ENUM ('OUTGOING', 'INCOMING');
CREATE TYPE "AdministrationAuditAction" AS ENUM ('MODULE_INITIALIZED', 'TEMPLATE_CREATED', 'TEMPLATE_VERSION_CREATED', 'TEMPLATE_STATUS_CHANGED', 'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_STATUS_CHANGED', 'REGISTER_UPDATED');

CREATE TABLE "AdministrationTemplate" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "status" "AdministrationTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "isStarter" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdministrationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdministrationTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "subjectTemplate" TEXT,
  "bodyHtml" TEXT NOT NULL,
  "variableSchema" JSONB NOT NULL,
  "pageConfig" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdministrationTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LetterRegister" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "direction" "AdministrationDirection" NOT NULL DEFAULT 'OUTGOING',
  "pattern" TEXT NOT NULL,
  "resetPolicy" TEXT NOT NULL DEFAULT 'YEARLY',
  "currentSequence" INTEGER NOT NULL DEFAULT 0,
  "isConfigured" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LetterRegister_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdministrationDocument" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "registerId" TEXT,
  "status" "AdministrationDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "direction" "AdministrationDirection" NOT NULL DEFAULT 'OUTGOING',
  "title" TEXT NOT NULL,
  "subject" TEXT,
  "recipientName" TEXT,
  "recipientAddress" TEXT,
  "relatedStudentId" TEXT,
  "manualData" JSONB NOT NULL DEFAULT '{}',
  "variableSnapshot" JSONB NOT NULL DEFAULT '{}',
  "renderedHtml" TEXT NOT NULL,
  "documentNumber" TEXT,
  "sequenceNumber" INTEGER,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdministrationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdministrationAuditEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "documentId" TEXT,
  "actorId" TEXT,
  "action" "AdministrationAuditAction" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdministrationAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdministrationTemplate_schoolId_code_key" ON "AdministrationTemplate"("schoolId", "code");
CREATE INDEX "AdministrationTemplate_schoolId_status_idx" ON "AdministrationTemplate"("schoolId", "status");
CREATE UNIQUE INDEX "AdministrationTemplateVersion_templateId_version_key" ON "AdministrationTemplateVersion"("templateId", "version");
CREATE INDEX "AdministrationTemplateVersion_templateId_createdAt_idx" ON "AdministrationTemplateVersion"("templateId", "createdAt");
CREATE UNIQUE INDEX "LetterRegister_schoolId_code_key" ON "LetterRegister"("schoolId", "code");
CREATE INDEX "LetterRegister_schoolId_direction_isActive_idx" ON "LetterRegister"("schoolId", "direction", "isActive");
CREATE INDEX "AdministrationDocument_schoolId_status_createdAt_idx" ON "AdministrationDocument"("schoolId", "status", "createdAt");
CREATE INDEX "AdministrationDocument_schoolId_relatedStudentId_idx" ON "AdministrationDocument"("schoolId", "relatedStudentId");
CREATE INDEX "AdministrationDocument_templateId_createdAt_idx" ON "AdministrationDocument"("templateId", "createdAt");
CREATE INDEX "AdministrationAuditEvent_schoolId_createdAt_idx" ON "AdministrationAuditEvent"("schoolId", "createdAt");
CREATE INDEX "AdministrationAuditEvent_documentId_createdAt_idx" ON "AdministrationAuditEvent"("documentId", "createdAt");

ALTER TABLE "AdministrationTemplate" ADD CONSTRAINT "AdministrationTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationTemplate" ADD CONSTRAINT "AdministrationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdministrationTemplateVersion" ADD CONSTRAINT "AdministrationTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AdministrationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationTemplateVersion" ADD CONSTRAINT "AdministrationTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LetterRegister" ADD CONSTRAINT "LetterRegister_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AdministrationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "AdministrationTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "LetterRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_relatedStudentId_fkey" FOREIGN KEY ("relatedStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrationDocument" ADD CONSTRAINT "AdministrationDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdministrationAuditEvent" ADD CONSTRAINT "AdministrationAuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationAuditEvent" ADD CONSTRAINT "AdministrationAuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AdministrationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdministrationAuditEvent" ADD CONSTRAINT "AdministrationAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
