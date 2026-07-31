-- Phase 2A: accountant settlement workflow.
-- Existing rows remain valid; new fields are nullable for historical data.
ALTER TYPE "PractitionerSettlementStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "PractitionerSettlement"
  ADD COLUMN "sourceReviewId" UUID,
  ADD COLUMN "rejectionReason" VARCHAR(1000),
  ADD COLUMN "rejectedByUserId" UUID,
  ADD COLUMN "rejectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PractitionerSettlement_sourceReviewId_key"
  ON "PractitionerSettlement"("sourceReviewId");
CREATE INDEX "PractitionerSettlement_rejectedByUserId_rejectedAt_idx"
  ON "PractitionerSettlement"("rejectedByUserId", "rejectedAt");

ALTER TABLE "PractitionerSettlement"
  ADD CONSTRAINT "PractitionerSettlement_sourceReviewId_fkey"
  FOREIGN KEY ("sourceReviewId") REFERENCES "SessionEarningReview"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlement"
  ADD CONSTRAINT "PractitionerSettlement_rejectedByUserId_fkey"
  FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
