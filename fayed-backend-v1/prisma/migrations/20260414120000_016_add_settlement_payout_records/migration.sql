CREATE TYPE "SettlementPayoutMethod" AS ENUM (
  'MANUAL_BANK_TRANSFER',
  'WALLET_TRANSFER',
  'CASH',
  'OTHER'
);

CREATE TYPE "SettlementPayoutSource" AS ENUM (
  'BATCH_CLOSEOUT',
  'MANUAL_EXCEPTION'
);

CREATE TABLE "PractitionerSettlementPayout" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "settlementId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "amountNet" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "payoutMethod" "SettlementPayoutMethod" NOT NULL,
  "payoutSource" "SettlementPayoutSource" NOT NULL,
  "payoutMethodSnapshot" JSONB,
  "externalPayoutRef" VARCHAR(191),
  "notes" VARCHAR(500),
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "processedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PractitionerSettlementPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerSettlementPayout_settlementId_key" ON "PractitionerSettlementPayout"("settlementId");
CREATE INDEX "PractitionerSettlementPayout_practitionerId_effectiveAt_idx" ON "PractitionerSettlementPayout"("practitionerId", "effectiveAt");
CREATE INDEX "PractitionerSettlementPayout_batchId_effectiveAt_idx" ON "PractitionerSettlementPayout"("batchId", "effectiveAt");
CREATE INDEX "PractitionerSettlementPayout_settlementId_createdAt_idx" ON "PractitionerSettlementPayout"("settlementId", "createdAt");
CREATE INDEX "PractitionerSettlementPayout_payoutSource_payoutMethod_idx" ON "PractitionerSettlementPayout"("payoutSource", "payoutMethod");

ALTER TABLE "PractitionerSettlementPayout"
  ADD CONSTRAINT "PractitionerSettlementPayout_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "SettlementBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlementPayout"
  ADD CONSTRAINT "PractitionerSettlementPayout_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlementPayout"
  ADD CONSTRAINT "PractitionerSettlementPayout_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlementPayout"
  ADD CONSTRAINT "PractitionerSettlementPayout_processedByUserId_fkey"
  FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
