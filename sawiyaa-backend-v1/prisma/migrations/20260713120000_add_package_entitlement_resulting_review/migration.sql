-- Add the resulting accounting review link for package entitlement decisions.
ALTER TABLE "SessionPackageEntitlementDecision"
ADD COLUMN "resultingSessionEarningReviewId" UUID;

CREATE UNIQUE INDEX "SessionPackageEntitlementDecision_resultingSessionEarningReviewId_key"
ON "SessionPackageEntitlementDecision"("resultingSessionEarningReviewId");

ALTER TABLE "SessionPackageEntitlementDecision"
ADD CONSTRAINT "SessionPackageEntitlementDecision_resultingSessionEarningReviewId_fkey"
FOREIGN KEY ("resultingSessionEarningReviewId")
REFERENCES "SessionEarningReview"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
