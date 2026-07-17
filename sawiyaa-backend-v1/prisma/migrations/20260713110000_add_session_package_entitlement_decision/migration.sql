-- Create the package entitlement decision table required by the package-session finance flow.
-- This migration intentionally creates only the base table.
-- A follow-up migration adds the resultingSessionEarningReviewId relation column.

BEGIN;

CREATE TABLE "SessionPackageEntitlementDecision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "packagePurchaseId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "sessionStatusSnapshot" "SessionStatus" NOT NULL,
  "decisionType" VARCHAR(50) NOT NULL,
  "reasonCode" VARCHAR(100) NOT NULL,
  "adminNote" VARCHAR(2000),
  "decidedByUserId" UUID NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionPackageEntitlementDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionPackageEntitlementDecision_sessionId_key"
  ON "SessionPackageEntitlementDecision"("sessionId");

CREATE UNIQUE INDEX "SessionPackageEntitlementDecision_idempotencyKey_key"
  ON "SessionPackageEntitlementDecision"("idempotencyKey");

CREATE INDEX "SessionPackageEntitlementDecision_packagePurchaseId_decidedAt_idx"
  ON "SessionPackageEntitlementDecision"("packagePurchaseId", "decidedAt");

CREATE INDEX "SessionPackageEntitlementDecision_practitionerId_decidedAt_idx"
  ON "SessionPackageEntitlementDecision"("practitionerId", "decidedAt");

CREATE INDEX "SessionPackageEntitlementDecision_patientId_decidedAt_idx"
  ON "SessionPackageEntitlementDecision"("patientId", "decidedAt");

CREATE INDEX "SessionPackageEntitlementDecision_decidedByUserId_decidedAt_idx"
  ON "SessionPackageEntitlementDecision"("decidedByUserId", "decidedAt");

ALTER TABLE "SessionPackageEntitlementDecision"
  ADD CONSTRAINT "SessionPackageEntitlementDecision_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionPackageEntitlementDecision"
  ADD CONSTRAINT "SessionPackageEntitlementDecision_packagePurchaseId_fkey"
  FOREIGN KEY ("packagePurchaseId") REFERENCES "PatientPackagePurchase"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionPackageEntitlementDecision"
  ADD CONSTRAINT "SessionPackageEntitlementDecision_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionPackageEntitlementDecision"
  ADD CONSTRAINT "SessionPackageEntitlementDecision_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionPackageEntitlementDecision"
  ADD CONSTRAINT "SessionPackageEntitlementDecision_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
