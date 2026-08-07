ALTER TABLE "PractitionerSettlement"
  DROP CONSTRAINT "PractitionerSettlement_financial_snapshot_check";

ALTER TABLE "PractitionerSettlement"
  ADD CONSTRAINT "PractitionerSettlement_financial_snapshot_check"
  CHECK (
    "originalAmount" > 0
    AND length(trim("originalCurrencyCode")) > 0
    AND length(trim("walletCurrencyCode")) > 0
    AND (
      ("exchangeRate" > 0 AND "convertedAmount" > 0)
      OR "status" IN ('DRAFT', 'UNDER_REVIEW')
    )
    AND "finalWalletCredit" >= 0
  );
