CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "AcademyProgramStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "AcademyProgramDeliveryMethod" AS ENUM (
  'ZOOM',
  'WHATSAPP',
  'GOOGLE_MEET',
  'OFFLINE',
  'OTHER'
);

CREATE TABLE "AcademyProgram" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(191) NOT NULL,
  "titleAr" VARCHAR(191) NOT NULL,
  "titleEn" VARCHAR(191) NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "coverImageUrl" VARCHAR(500),
  "categoryId" UUID,
  "priceEgp" DECIMAL(18, 2),
  "priceUsd" DECIMAL(18, 2),
  "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
  "maxSeats" INTEGER,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "status" "AcademyProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" UUID,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AcademyProgram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyProgram_slug_key" ON "AcademyProgram"("slug");
CREATE INDEX "AcademyProgram_status_publishedAt_idx" ON "AcademyProgram"("status", "publishedAt");
CREATE INDEX "AcademyProgram_categoryId_status_idx" ON "AcademyProgram"("categoryId", "status");
CREATE INDEX "AcademyProgram_registrationOpen_status_idx" ON "AcademyProgram"("registrationOpen", "status");
CREATE INDEX "AcademyProgram_startAt_endAt_idx" ON "AcademyProgram"("startAt", "endAt");
CREATE INDEX "AcademyProgram_createdByUserId_createdAt_idx" ON "AcademyProgram"("createdByUserId", "createdAt");

CREATE TABLE "AcademyProgramSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "academyProgramId" UUID NOT NULL,
  "titleAr" VARCHAR(191) NOT NULL,
  "titleEn" VARCHAR(191) NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "deliveryMethod" "AcademyProgramDeliveryMethod" NOT NULL,
  "internalDeliveryNote" TEXT,
  "internalDeliveryLink" VARCHAR(500),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AcademyProgramSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcademyProgramSession_academyProgramId_sortOrder_idx" ON "AcademyProgramSession"("academyProgramId", "sortOrder");
CREATE INDEX "AcademyProgramSession_academyProgramId_startsAt_idx" ON "AcademyProgramSession"("academyProgramId", "startsAt");
CREATE INDEX "AcademyProgramSession_isPublished_startsAt_idx" ON "AcademyProgramSession"("isPublished", "startsAt");
CREATE INDEX "AcademyProgramSession_createdByUserId_createdAt_idx" ON "AcademyProgramSession"("createdByUserId", "createdAt");

ALTER TABLE "AcademyProgram"
  ADD CONSTRAINT "AcademyProgram_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcademyProgram"
  ADD CONSTRAINT "AcademyProgram_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramSession"
  ADD CONSTRAINT "AcademyProgramSession_academyProgramId_fkey"
  FOREIGN KEY ("academyProgramId") REFERENCES "AcademyProgram"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramSession"
  ADD CONSTRAINT "AcademyProgramSession_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
