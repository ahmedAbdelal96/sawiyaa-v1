ALTER TABLE "RefundPolicyAcceptance"
  ADD COLUMN IF NOT EXISTS "policyId" UUID;

UPDATE "RefundPolicyAcceptance" acceptance
SET "policyId" = version."refundPolicyId"
FROM "RefundPolicyVersion" version
WHERE acceptance."refundPolicyVersionId" = version."id"
  AND acceptance."policyId" IS NULL;

ALTER TABLE "RefundPolicyAcceptance"
  ALTER COLUMN "policyId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RefundPolicyAcceptance_policyId_fkey'
  ) THEN
    ALTER TABLE "RefundPolicyAcceptance"
      ADD CONSTRAINT "RefundPolicyAcceptance_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "RefundPolicy"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RefundPolicyAcceptance_policyId_acceptedAt_idx"
  ON "RefundPolicyAcceptance" ("policyId", "acceptedAt");
