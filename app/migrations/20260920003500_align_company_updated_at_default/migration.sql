-- Align the legacy Company backfill migration with Prisma @updatedAt semantics.
-- Safe and idempotent even when the database default was already removed.
ALTER TABLE "Company" ALTER COLUMN "updatedAt" DROP DEFAULT;
