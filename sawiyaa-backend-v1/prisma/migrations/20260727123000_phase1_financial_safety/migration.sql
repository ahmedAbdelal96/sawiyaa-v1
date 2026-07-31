-- Phase 1 financial safety: settlement provenance, wallet lifecycle, and adjustments.
CREATE TYPE "PractitionerWalletStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "SettlementAdjustmentType" AS ENUM ('PLATFORM_FEE', 'ADMINISTRATIVE_FEE', 'TAX', 'MANUAL_CORRECTION');

ALTER TABLE "LedgerEntry"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID;

ALTER TABLE "PractitionerManualPayout"
  ADD COLUMN "settlementId" UUID NOT NULL;

ALTER TABLE "PractitionerSettlement"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByUserId" UUID,
  ADD COLUMN "convertedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "finalWalletCredit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "originalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "originalCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN "walletCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD';

ALTER TABLE "PractitionerWallet"
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "status" "PractitionerWalletStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "SessionEarningReview"
  ADD COLUMN "settlementId" UUID;

CREATE TABLE "SettlementAdjustment" (
  "id" UUID NOT NULL,
  "settlementId" UUID NOT NULL,
  "type" "SettlementAdjustmentType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SettlementAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SettlementAdjustment_settlementId_createdAt_idx" ON "SettlementAdjustment"("settlementId", "createdAt");
CREATE INDEX "SettlementAdjustment_type_createdAt_idx" ON "SettlementAdjustment"("type", "createdAt");
CREATE INDEX "LedgerEntry_actorUserId_effectiveAt_idx" ON "LedgerEntry"("actorUserId", "effectiveAt");
CREATE INDEX "PractitionerManualPayout_settlementId_paidAt_idx" ON "PractitionerManualPayout"("settlementId", "paidAt");
CREATE INDEX "PractitionerSettlement_approvedByUserId_approvedAt_idx" ON "PractitionerSettlement"("approvedByUserId", "approvedAt");
CREATE INDEX "SessionEarningReview_settlementId_idx" ON "SessionEarningReview"("settlementId");
CREATE UNIQUE INDEX "PractitionerWallet_one_active_per_practitioner_idx"
  ON "PractitionerWallet"("practitionerId")
  WHERE "status" = 'ACTIVE';

ALTER TABLE "SessionEarningReview"
  ADD CONSTRAINT "SessionEarningReview_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerSettlement"
  ADD CONSTRAINT "PractitionerSettlement_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettlementAdjustment"
  ADD CONSTRAINT "SettlementAdjustment_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementAdjustment"
  ADD CONSTRAINT "SettlementAdjustment_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementAdjustment"
  ADD CONSTRAINT "SettlementAdjustment_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerManualPayout"
  ADD CONSTRAINT "PractitionerManualPayout_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
