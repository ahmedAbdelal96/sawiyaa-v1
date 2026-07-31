-- Additive immutable FX snapshot fields for canonical practitioner settlement payouts.
ALTER TABLE "PractitionerSettlementPayout"
  ADD COLUMN "sourceAmount" DECIMAL(18,2),
  ADD COLUMN "sourceCurrencyCode" VARCHAR(3),
  ADD COLUMN "payoutCurrencyCode" VARCHAR(3),
  ADD COLUMN "exchangeRateEgpPerUsd" DECIMAL(18,8),
  ADD COLUMN "calculatedPayoutAmount" DECIMAL(18,2),
  ADD COLUMN "actualPayoutAmount" DECIMAL(18,2),
  ADD COLUMN "differenceAmount" DECIMAL(18,2),
  ADD COLUMN "overrideReason" VARCHAR(500);

CREATE INDEX "PractitionerSettlementPayout_payoutCurrencyCode_effectiveAt_idx"
  ON "PractitionerSettlementPayout"("payoutCurrencyCode", "effectiveAt");
