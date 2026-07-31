-- Settlement snapshots are required for auditability. Keep rejected settlements
-- valid with a zero final credit, but never allow missing/zero source snapshots.
ALTER TABLE "PractitionerSettlement"
  ADD CONSTRAINT "PractitionerSettlement_financial_snapshot_check"
  CHECK (
    "originalAmount" > 0
    AND length(trim("originalCurrencyCode")) > 0
    AND length(trim("walletCurrencyCode")) > 0
    AND "exchangeRate" > 0
    AND "convertedAmount" > 0
    AND "finalWalletCredit" >= 0
  );
