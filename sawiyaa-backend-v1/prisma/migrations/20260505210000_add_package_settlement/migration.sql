CREATE TYPE "PackageSettlementStatus" AS ENUM (
  'HELD',
  'READY_TO_RELEASE',
  'PARTIALLY_RELEASED',
  'RELEASED',
  'NEEDS_REVIEW',
  'REFUNDED_OR_ADJUSTED'
);

CREATE TABLE "PackageSettlement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchaseId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "status" "PackageSettlementStatus" NOT NULL DEFAULT 'HELD',
  "sessionCount" INTEGER NOT NULL,
  "completedSessionsCount" INTEGER NOT NULL DEFAULT 0,
  "heldPractitionerAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "heldPlatformAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "releasablePractitionerAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "releasedPractitionerAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "normalEquivalentUsedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discountAppliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByAdminId" UUID,
  "releasedAt" TIMESTAMP(3),
  "releasedByAdminId" UUID,
  "decision" VARCHAR(100),
  "notes" VARCHAR(1000),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PackageSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackageSettlement_purchaseId_key" ON "PackageSettlement"("purchaseId");
CREATE INDEX "PackageSettlement_practitionerId_status_createdAt_idx" ON "PackageSettlement"("practitionerId", "status", "createdAt");
CREATE INDEX "PackageSettlement_patientId_status_createdAt_idx" ON "PackageSettlement"("patientId", "status", "createdAt");
CREATE INDEX "PackageSettlement_status_createdAt_idx" ON "PackageSettlement"("status", "createdAt");
CREATE INDEX "PackageSettlement_currencyCode_status_createdAt_idx" ON "PackageSettlement"("currencyCode", "status", "createdAt");

ALTER TABLE "PackageSettlement"
  ADD CONSTRAINT "PackageSettlement_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "PatientPackagePurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageSettlement"
  ADD CONSTRAINT "PackageSettlement_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageSettlement"
  ADD CONSTRAINT "PackageSettlement_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
