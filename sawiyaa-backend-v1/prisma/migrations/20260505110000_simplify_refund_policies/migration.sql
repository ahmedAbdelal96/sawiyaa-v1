ALTER TABLE "RefundPolicy"
  ADD COLUMN IF NOT EXISTS "titleAr" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "titleEn" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "RefundPolicyClause" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policyId" UUID NOT NULL,
  "titleAr" VARCHAR(1000),
  "titleEn" VARCHAR(1000),
  "bodyAr" VARCHAR(4000) NOT NULL,
  "bodyEn" VARCHAR(4000) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RefundPolicyClause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RefundPolicyClause_policyId_sortOrder_idx"
  ON "RefundPolicyClause" ("policyId", "sortOrder");

CREATE INDEX IF NOT EXISTS "RefundPolicyClause_policyId_isActive_sortOrder_idx"
  ON "RefundPolicyClause" ("policyId", "isActive", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RefundPolicyClause_policyId_fkey'
  ) THEN
    ALTER TABLE "RefundPolicyClause"
      ADD CONSTRAINT "RefundPolicyClause_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "RefundPolicy"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "RefundPolicyAcceptance"
  ALTER COLUMN "refundPolicyVersionId" DROP NOT NULL;
