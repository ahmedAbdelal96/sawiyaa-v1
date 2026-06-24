ALTER TABLE "RefundPolicyAcceptance"
  ADD COLUMN IF NOT EXISTS "policyTypeSnapshot" "RefundPolicyType";

UPDATE "RefundPolicyAcceptance" acceptance
SET "policyTypeSnapshot" = policy."policyType"
FROM "RefundPolicy" policy
WHERE acceptance."policyId" = policy."id"
  AND acceptance."policyTypeSnapshot" IS NULL;
