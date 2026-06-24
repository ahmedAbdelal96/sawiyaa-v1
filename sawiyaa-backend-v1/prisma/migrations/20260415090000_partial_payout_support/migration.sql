-- Partial payout support for practitioner settlements.
-- Notes:
-- - Allows multiple payout records per settlement row by dropping the unique index on settlementId.
-- - Tracks paid-to-date on the settlement row so remaining due can be computed truthfully.

ALTER TABLE "PractitionerSettlement"
ADD COLUMN IF NOT EXISTS "amountPaidTotal" DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Rename the payout amount column for clarity (old migrations used amountNet).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'PractitionerSettlementPayout'
      AND column_name = 'amountNet'
  ) THEN
    ALTER TABLE "PractitionerSettlementPayout" RENAME COLUMN "amountNet" TO "amountPaid";
  END IF;
END $$;

-- If the column didn't exist (fresh schema), ensure it exists.
ALTER TABLE "PractitionerSettlementPayout"
ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Drop the unique index that previously enforced one payout per settlement.
DROP INDEX IF EXISTS "PractitionerSettlementPayout_settlementId_key";
