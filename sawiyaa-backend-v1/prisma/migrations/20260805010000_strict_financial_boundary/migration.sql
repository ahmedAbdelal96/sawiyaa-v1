-- AlterEnum
ALTER TYPE "SessionEarningReviewStatus" ADD VALUE IF NOT EXISTS 'DECISION_APPROVED';

-- AlterTable Session
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "patientCountrySnapshot" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "practitionerCountrySnapshot" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "countryRelationshipSnapshot" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "suggestedPractitionerPercentageSnapshot" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "pricingPolicySnapshotJson" JSONB;

-- AlterTable SessionEarningReview
ALTER TABLE "SessionEarningReview" ADD COLUMN IF NOT EXISTS "patientCountrySnapshot" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "practitionerCountrySnapshot" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "countryRelationshipSnapshot" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "policySnapshotJson" JSONB,
ADD COLUMN IF NOT EXISTS "calculatedPractitionerAmount" DECIMAL(18, 2),
ADD COLUMN IF NOT EXISTS "overrideReason" VARCHAR(1000);

-- CreateTable PractitionerEarningAdjustment
CREATE TABLE IF NOT EXISTS "PractitionerEarningAdjustment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionEarningReviewId" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "reason" VARCHAR(1000),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerEarningAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "PractitionerEarningAdjustment_sessionEarningReviewId_idx" ON "PractitionerEarningAdjustment"("sessionEarningReviewId");
CREATE INDEX IF NOT EXISTS "PractitionerEarningAdjustment_type_category_idx" ON "PractitionerEarningAdjustment"("type", "category");

-- AddForeignKey
ALTER TABLE "PractitionerEarningAdjustment" DROP CONSTRAINT IF EXISTS "PractitionerEarningAdjustment_sessionEarningReviewId_fkey";
ALTER TABLE "PractitionerEarningAdjustment" ADD CONSTRAINT "PractitionerEarningAdjustment_sessionEarningReviewId_fkey" FOREIGN KEY ("sessionEarningReviewId") REFERENCES "SessionEarningReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
