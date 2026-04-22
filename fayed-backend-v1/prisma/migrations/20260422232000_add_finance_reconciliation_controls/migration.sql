DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ReconciliationReviewStatus'
  ) THEN
    CREATE TYPE "ReconciliationReviewStatus" AS ENUM (
      'PENDING_REVIEW',
      'MATCHED',
      'MISMATCH',
      'MISSING_PROOF',
      'REQUIRES_ADJUSTMENT',
      'RESOLVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FinanceReconciliationReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceType" "JournalEntrySourceType" NOT NULL,
  "sourceId" VARCHAR(191) NOT NULL,
  "status" "ReconciliationReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "note" VARCHAR(1000),
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceReconciliationReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_finance_reconciliation_source"
  ON "FinanceReconciliationReview" ("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "FinanceReconciliationReview_status_updatedAt_idx"
  ON "FinanceReconciliationReview" ("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "FinanceReconciliationReview_reviewedByUserId_reviewedAt_idx"
  ON "FinanceReconciliationReview" ("reviewedByUserId", "reviewedAt");

ALTER TABLE "FinanceReconciliationReview"
  ADD CONSTRAINT "FinanceReconciliationReview_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
