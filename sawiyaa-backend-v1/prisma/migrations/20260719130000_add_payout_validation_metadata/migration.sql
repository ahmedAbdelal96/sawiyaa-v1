-- Additive payout validation metadata. Existing destinations remain readable and
-- intentionally start as PENDING_VERIFICATION until an existing verification
-- process marks them verified.
CREATE TYPE "PractitionerPayoutVerificationStatus" AS ENUM ('INCOMPLETE', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

ALTER TABLE "PractitionerPayoutDestination"
  ADD COLUMN "countryCode" VARCHAR(2),
  ADD COLUMN "verificationStatus" "PractitionerPayoutVerificationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  ADD COLUMN "verificationReason" VARCHAR(1000),
  ADD COLUMN "verificationMetadata" JSONB,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedByUserId" UUID;

CREATE INDEX "PractitionerPayoutDestination_verificationStatus_idx"
  ON "PractitionerPayoutDestination"("verificationStatus");
