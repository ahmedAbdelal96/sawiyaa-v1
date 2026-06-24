ALTER TABLE "RefundPolicyAcceptance"
  ADD COLUMN IF NOT EXISTS "policyTitleArSnapshot" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "policyTitleEnSnapshot" VARCHAR(500);

UPDATE "RefundPolicyAcceptance" acceptance
SET
  "policyTitleArSnapshot" = policy."titleAr",
  "policyTitleEnSnapshot" = policy."titleEn"
FROM "RefundPolicy" policy
WHERE acceptance."policyId" = policy."id"
  AND (
    acceptance."policyTitleArSnapshot" IS NULL
    OR acceptance."policyTitleEnSnapshot" IS NULL
  );
