ALTER TABLE "Session" ADD COLUMN "earningEntitlementId" UUID;
UPDATE "Session" SET "earningEntitlementId" = gen_random_uuid() WHERE "earningEntitlementId" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "earningEntitlementId" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "earningEntitlementId" SET DEFAULT gen_random_uuid();
CREATE INDEX "Session_earningEntitlementId_idx" ON "Session"("earningEntitlementId");

ALTER TABLE "SessionEarningReview" ADD COLUMN "earningEntitlementId" UUID;
UPDATE "SessionEarningReview" AS review
SET "earningEntitlementId" = session."earningEntitlementId"
FROM "Session" AS session
WHERE session."id" = review."sessionId";
ALTER TABLE "SessionEarningReview" ALTER COLUMN "earningEntitlementId" SET NOT NULL;
CREATE INDEX "SessionEarningReview_earningEntitlementId_reviewStatus_idx"
  ON "SessionEarningReview"("earningEntitlementId", "reviewStatus");
CREATE UNIQUE INDEX "SessionEarningReview_active_entitlement_key"
  ON "SessionEarningReview"("earningEntitlementId")
  WHERE "reviewStatus" IN ('PENDING_REVIEW', 'APPROVED');
