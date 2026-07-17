-- Migration: add_session_earning_review_and_payout_currency
-- Adds the session-level practitioner earning review foundation and a payout currency default for practitioners.
-- Prisma migration timestamp: 2026-07-11

BEGIN;

CREATE TYPE "SessionEarningReviewSourceType" AS ENUM (
  'DIRECT_SESSION',
  'PACKAGE_SESSION'
);

CREATE TYPE "SessionEarningReviewStatus" AS ENUM (
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXCLUDED_FROM_PAYOUT'
);

CREATE TYPE "SessionEarningReviewDecision" AS ENUM (
  'AUTO_CREATED',
  'APPROVED_AS_IS',
  'EDITED_AND_APPROVED',
  'REJECTED_PAYOUT',
  'EXCLUDED_FROM_PAYOUT'
);

ALTER TABLE "PractitionerProfile"
ADD COLUMN "preferredPayoutCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'EGP';

CREATE TABLE "SessionEarningReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "paymentId" UUID,
  "packagePurchaseId" UUID,
  "packageSettlementId" UUID,
  "practitionerId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "sourceType" "SessionEarningReviewSourceType" NOT NULL,
  "reviewStatus" "SessionEarningReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewDecision" "SessionEarningReviewDecision" NOT NULL DEFAULT 'AUTO_CREATED',
  "paymentAmount" DECIMAL(18, 2) NOT NULL,
  "paymentCurrencyCode" VARCHAR(3) NOT NULL,
  "suggestedPractitionerAmount" DECIMAL(18, 2) NOT NULL,
  "suggestedPlatformAmount" DECIMAL(18, 2) NOT NULL,
  "suggestedCurrencyCode" VARCHAR(3) NOT NULL,
  "finalPractitionerAmount" DECIMAL(18, 2),
  "finalPlatformAmount" DECIMAL(18, 2),
  "finalCurrencyCode" VARCHAR(3),
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "approvedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "internalReason" VARCHAR(1000),
  "practitionerFacingNote" VARCHAR(1000),
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionEarningReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionEarningReview_sessionId_sourceType_key"
  ON "SessionEarningReview"("sessionId", "sourceType");
CREATE UNIQUE INDEX "SessionEarningReview_idempotencyKey_key"
  ON "SessionEarningReview"("idempotencyKey");
CREATE INDEX "SessionEarningReview_practitionerId_reviewStatus_createdAt_idx"
  ON "SessionEarningReview"("practitionerId", "reviewStatus", "createdAt");
CREATE INDEX "SessionEarningReview_patientId_createdAt_idx"
  ON "SessionEarningReview"("patientId", "createdAt");
CREATE INDEX "SessionEarningReview_paymentId_idx"
  ON "SessionEarningReview"("paymentId");
CREATE INDEX "SessionEarningReview_packagePurchaseId_idx"
  ON "SessionEarningReview"("packagePurchaseId");
CREATE INDEX "SessionEarningReview_packageSettlementId_idx"
  ON "SessionEarningReview"("packageSettlementId");
CREATE INDEX "SessionEarningReview_reviewedByUserId_reviewedAt_idx"
  ON "SessionEarningReview"("reviewedByUserId", "reviewedAt");
CREATE INDEX "SessionEarningReview_approvedByUserId_approvedAt_idx"
  ON "SessionEarningReview"("approvedByUserId", "approvedAt");

ALTER TABLE "LedgerEntry"
ADD COLUMN "sessionEarningReviewId" UUID;

ALTER TABLE "LedgerEntry"
ADD CONSTRAINT "LedgerEntry_sessionEarningReviewId_fkey"
FOREIGN KEY ("sessionEarningReviewId") REFERENCES "SessionEarningReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LedgerEntry_sessionEarningReviewId_idx"
  ON "LedgerEntry"("sessionEarningReviewId");

CREATE UNIQUE INDEX "LedgerEntry_sessionEarningReviewId_entryType_direction_key"
  ON "LedgerEntry"("sessionEarningReviewId", "entryType", "direction");

COMMIT;
