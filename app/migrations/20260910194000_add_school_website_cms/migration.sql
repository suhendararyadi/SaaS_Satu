-- CreateEnum
CREATE TYPE "SchoolSiteStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CmsContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CmsContentType" AS ENUM ('PAGE', 'NEWS', 'EVENT', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "SchoolSiteNavLocation" AS ENUM ('HEADER', 'FOOTER');

-- CreateEnum
CREATE TYPE "SchoolSiteNavType" AS ENUM ('PAGE', 'ROUTE', 'EXTERNAL');

-- CreateTable
CREATE TABLE "SchoolSite" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "SchoolSiteStatus" NOT NULL DEFAULT 'DRAFT',
    "siteTitle" TEXT NOT NULL,
    "tagline" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrl" TEXT,
    "defaultSeoTitle" TEXT,
    "defaultSeoDescription" TEXT,
    "themePreset" TEXT NOT NULL DEFAULT 'CLEAN_SCHOOL',
    "robotsIndex" BOOLEAN NOT NULL DEFAULT false,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "socialLinks" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSiteContent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "CmsContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentBlocks" JSONB NOT NULL,
    "coverImageUrl" TEXT,
    "category" TEXT,
    "status" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
    "navigationLabel" TEXT,
    "navigationOrder" INTEGER,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSiteNavItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "location" "SchoolSiteNavLocation" NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SchoolSiteNavType" NOT NULL,
    "contentId" TEXT,
    "href" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSiteNavItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSiteMedia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fileId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSiteMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSite_schoolId_key" ON "SchoolSite"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSiteContent_schoolId_type_slug_key" ON "SchoolSiteContent"("schoolId", "type", "slug");

-- CreateIndex
CREATE INDEX "SchoolSiteContent_schoolId_type_status_idx" ON "SchoolSiteContent"("schoolId", "type", "status");

-- CreateIndex
CREATE INDEX "SchoolSiteContent_schoolId_status_scheduledAt_idx" ON "SchoolSiteContent"("schoolId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SchoolSiteContent_schoolId_publishedAt_idx" ON "SchoolSiteContent"("schoolId", "publishedAt");

-- CreateIndex
CREATE INDEX "SchoolSiteNavItem_schoolId_location_order_idx" ON "SchoolSiteNavItem"("schoolId", "location", "order");

-- CreateIndex
CREATE INDEX "SchoolSiteMedia_schoolId_createdAt_idx" ON "SchoolSiteMedia"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "SchoolSite" ADD CONSTRAINT "SchoolSite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSiteContent" ADD CONSTRAINT "SchoolSiteContent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSiteNavItem" ADD CONSTRAINT "SchoolSiteNavItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSiteMedia" ADD CONSTRAINT "SchoolSiteMedia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
