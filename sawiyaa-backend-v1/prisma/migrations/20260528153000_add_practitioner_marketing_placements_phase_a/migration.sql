-- CreateEnum
CREATE TYPE "PractitionerMarketingPlacementSurface" AS ENUM ('HOME', 'DISCOVERY', 'ALL');

-- CreateEnum
CREATE TYPE "PractitionerMarketingPlacementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PractitionerMarketingPlacementReason" AS ENUM ('FEATURED', 'SPONSORED', 'DISCOUNT', 'NEW_SPECIALIST', 'HIGH_AVAILABILITY', 'EDITORIAL_PICK');

-- CreateEnum
CREATE TYPE "PractitionerMarketingPlacementHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'PAUSED', 'RESUMED', 'EXPIRED', 'DELETED', 'PRIORITY_CHANGED', 'DATE_CHANGED');

-- CreateTable
CREATE TABLE "PractitionerMarketingPlacement" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "surface" "PractitionerMarketingPlacementSurface" NOT NULL,
    "status" "PractitionerMarketingPlacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "badgeLabelAr" VARCHAR(191),
    "badgeLabelEn" VARCHAR(191),
    "reason" "PractitionerMarketingPlacementReason" NOT NULL DEFAULT 'FEATURED',
    "campaignName" VARCHAR(191),
    "notesInternal" VARCHAR(2000),
    "createdByAdminId" UUID,
    "pausedByAdminId" UUID,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerMarketingPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerMarketingPlacementHistory" (
    "id" UUID NOT NULL,
    "placementId" UUID NOT NULL,
    "action" "PractitionerMarketingPlacementHistoryAction" NOT NULL,
    "actorUserId" UUID,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerMarketingPlacementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PractitionerMarketingPlacement_surface_status_startsAt_endsAt_pr_idx" ON "PractitionerMarketingPlacement"("surface", "status", "startsAt", "endsAt", "priority");

-- CreateIndex
CREATE INDEX "PractitionerMarketingPlacement_practitionerId_idx" ON "PractitionerMarketingPlacement"("practitionerId");

-- CreateIndex
CREATE INDEX "PractitionerMarketingPlacement_status_startsAt_endsAt_idx" ON "PractitionerMarketingPlacement"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PractitionerMarketingPlacementHistory_placementId_createdAt_idx" ON "PractitionerMarketingPlacementHistory"("placementId", "createdAt");

-- CreateIndex
CREATE INDEX "PractitionerMarketingPlacementHistory_actorUserId_createdAt_idx" ON "PractitionerMarketingPlacementHistory"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "PractitionerMarketingPlacement" ADD CONSTRAINT "PractitionerMarketingPlacement_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerMarketingPlacement" ADD CONSTRAINT "PractitionerMarketingPlacement_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerMarketingPlacement" ADD CONSTRAINT "PractitionerMarketingPlacement_pausedByAdminId_fkey" FOREIGN KEY ("pausedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerMarketingPlacementHistory" ADD CONSTRAINT "PractitionerMarketingPlacementHistory_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "PractitionerMarketingPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerMarketingPlacementHistory" ADD CONSTRAINT "PractitionerMarketingPlacementHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
