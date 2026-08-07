-- Forward-only financial integrity hardening.
-- Abort before changing data when an existing financial row is ambiguous.
DO $$
BEGIN
  -- Recover a source review only when the immutable earning ledger points to exactly one review.
  -- Rows without a unique authoritative source remain blocked for manual review below.
  UPDATE "PractitionerSettlement" s
  SET "sourceReviewId" = source."reviewId"
  FROM (
    SELECT "settlementId", (array_agg("sessionEarningReviewId"))[1] AS "reviewId"
    FROM "LedgerEntry"
    WHERE "settlementId" IS NOT NULL AND "sessionEarningReviewId" IS NOT NULL
    GROUP BY "settlementId"
    HAVING count(DISTINCT "sessionEarningReviewId") = 1
  ) source
  WHERE s."id" = source."settlementId" AND s."sourceReviewId" IS NULL;

  IF EXISTS (SELECT 1 FROM "PractitionerEarningAdjustment" WHERE "createdByUserId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot harden PractitionerEarningAdjustment: NULL createdByUserId requires manual financial review';
  END IF;
  IF EXISTS (SELECT 1 FROM "PractitionerEarningAdjustment" WHERE "amount" <= 0 OR btrim("description") = '' OR "reason" IS NULL OR btrim("reason") = '') THEN
    RAISE EXCEPTION 'Cannot harden PractitionerEarningAdjustment: invalid amount, description, or reason';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "PractitionerEarningAdjustment" a
    JOIN "SessionEarningReview" r ON r."id" = a."sessionEarningReviewId"
    WHERE upper(btrim(a."currencyCode")) <> upper(btrim(r."paymentCurrencyCode"))
  ) THEN
    RAISE EXCEPTION 'Cannot harden PractitionerEarningAdjustment: currency does not match source review';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "PractitionerSettlement" s
    WHERE s."originalCurrencyCode" = 'USD'
      AND s."sourceReviewId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot harden PractitionerSettlement: source-less USD rows are ambiguous';
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE "PractitionerEarningAdjustmentType" AS ENUM ('ADDITION', 'DEDUCTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FinancialOperationType" AS ENUM ('RECORD_ACCOUNTANT_DECISION', 'CREDIT_PRACTITIONER_WALLET', 'RECORD_EXTERNAL_SETTLEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PractitionerEarningAdjustment"
  ALTER COLUMN "type" TYPE "PractitionerEarningAdjustmentType"
    USING "type"::"PractitionerEarningAdjustmentType",
  ALTER COLUMN "reason" SET NOT NULL,
  ALTER COLUMN "createdByUserId" SET NOT NULL;

ALTER TABLE "PractitionerEarningAdjustment"
  DROP CONSTRAINT IF EXISTS "PractitionerEarningAdjustment_sessionEarningReviewId_fkey",
  ADD CONSTRAINT "PractitionerEarningAdjustment_sessionEarningReviewId_fkey"
    FOREIGN KEY ("sessionEarningReviewId") REFERENCES "SessionEarningReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerEarningAdjustment_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionEarningReview"
  ADD CONSTRAINT "SessionEarningReview_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerWallet"
  DROP CONSTRAINT IF EXISTS "PractitionerWallet_practitionerId_fkey",
  ADD CONSTRAINT "PractitionerWallet_practitionerId_fkey"
    FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlement"
  DROP CONSTRAINT IF EXISTS "PractitionerSettlement_batchId_fkey",
  ADD CONSTRAINT "PractitionerSettlement_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "SettlementBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlementPayout"
  DROP CONSTRAINT IF EXISTS "PractitionerSettlementPayout_batchId_fkey",
  DROP CONSTRAINT IF EXISTS "PractitionerSettlementPayout_settlementId_fkey",
  ADD CONSTRAINT "PractitionerSettlementPayout_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "SettlementBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerSettlementPayout_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SettlementAdjustment"
  DROP CONSTRAINT IF EXISTS "SettlementAdjustment_settlementId_fkey",
  ADD CONSTRAINT "SettlementAdjustment_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlementPayoutProof"
  DROP CONSTRAINT IF EXISTS "PractitionerSettlementPayoutProof_payoutId_fkey",
  ADD CONSTRAINT "PractitionerSettlementPayoutProof_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "PractitionerSettlementPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
  DROP CONSTRAINT IF EXISTS "JournalLine_journalEntryId_fkey",
  ADD CONSTRAINT "JournalLine_journalEntryId_fkey"
    FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerSettlement"
  ALTER COLUMN "originalAmount" DROP DEFAULT,
  ALTER COLUMN "originalCurrencyCode" DROP DEFAULT,
  ALTER COLUMN "walletCurrencyCode" DROP DEFAULT,
  ALTER COLUMN "convertedAmount" DROP DEFAULT,
  ALTER COLUMN "finalWalletCredit" DROP DEFAULT,
  ADD CONSTRAINT "PractitionerSettlement_financial_amounts_nonnegative_ck"
    CHECK ("originalAmount" >= 0 AND "convertedAmount" >= 0 AND "finalWalletCredit" >= 0),
  ADD CONSTRAINT "PractitionerSettlement_financial_currencies_present_ck"
    CHECK (length(btrim("originalCurrencyCode")) = 3 AND length(btrim("walletCurrencyCode")) = 3);

ALTER TABLE "PractitionerEarningAdjustment"
  ADD CONSTRAINT "PractitionerEarningAdjustment_amount_positive_ck" CHECK ("amount" > 0),
  ADD CONSTRAINT "PractitionerEarningAdjustment_reason_present_ck" CHECK (length(btrim("reason")) > 0),
  ADD CONSTRAINT "PractitionerEarningAdjustment_description_present_ck" CHECK (length(btrim("description")) > 0);

ALTER TABLE "SessionEarningReview"
  ADD CONSTRAINT "SessionEarningReview_decision_amount_required_ck"
    CHECK ("reviewStatus" NOT IN ('DECISION_APPROVED', 'APPROVED') OR "accountantApprovedSourceAmount" IS NOT NULL);

CREATE TABLE "FinancialOperationIdempotency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "earningEntitlementId" UUID NOT NULL,
  "operationType" "FinancialOperationType" NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "reviewId" UUID NOT NULL,
  "settlementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialOperationIdempotency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialOperationIdempotency_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "SessionEarningReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FinancialOperationIdempotency_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_financial_operation_entitlement_type_key"
  ON "FinancialOperationIdempotency" ("earningEntitlementId", "operationType", "idempotencyKey");
CREATE UNIQUE INDEX "uq_financial_operation_review_type"
  ON "FinancialOperationIdempotency" ("reviewId", "operationType");
CREATE INDEX "FinancialOperationIdempotency_reviewId_operationType_idx"
  ON "FinancialOperationIdempotency" ("reviewId", "operationType");

ALTER TABLE "SessionEarningReview"
  DROP CONSTRAINT IF EXISTS "SessionEarningReview_idempotencyKey_key";
CREATE INDEX IF NOT EXISTS "SessionEarningReview_idempotencyKey_idx"
  ON "SessionEarningReview" ("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "PractitionerSettlementPayout_settlementId_idempotencyKey_key"
  ON "PractitionerSettlementPayout" ("settlementId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;
