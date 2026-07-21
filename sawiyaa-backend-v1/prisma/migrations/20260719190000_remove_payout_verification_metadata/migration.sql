-- Corrective forward-only migration: payout destinations keep their manually
-- collected details; only the obsolete verification architecture is removed.
DROP INDEX IF EXISTS "PractitionerPayoutDestination_verificationStatus_idx";

ALTER TABLE "PractitionerPayoutDestination"
  DROP COLUMN IF EXISTS "verificationReason",
  DROP COLUMN IF EXISTS "verificationMetadata",
  DROP COLUMN IF EXISTS "verifiedAt",
  DROP COLUMN IF EXISTS "verifiedByUserId",
  DROP COLUMN IF EXISTS "verificationStatus";

DROP TYPE IF EXISTS "PractitionerPayoutVerificationStatus";
