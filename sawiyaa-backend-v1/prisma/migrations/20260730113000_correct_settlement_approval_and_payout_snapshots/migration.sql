-- Additive financial snapshots. Existing Phase 4B.6 payout fields remain readable.
ALTER TABLE "PractitionerSettlement"
  ALTER COLUMN "exchangeRate" DROP DEFAULT,
  ALTER COLUMN "exchangeRate" DROP NOT NULL;

ALTER TABLE "PractitionerSettlement"
  ADD COLUMN "walletCreditDifferenceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "walletCreditOverrideReason" VARCHAR(500);

ALTER TABLE "PractitionerSettlementPayout"
  ADD COLUMN "transferFeeCurrencyCode" VARCHAR(3),
  ADD COLUMN "netAmountReceived" DECIMAL(18,2),
  ADD COLUMN "totalPlatformOutflow" DECIMAL(18,2);
