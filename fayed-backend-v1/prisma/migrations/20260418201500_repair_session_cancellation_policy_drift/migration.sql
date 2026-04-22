-- Repair drift for session cancellation policy foundation.
-- Some environments ended up with enums created but missing tables/indexes/constraints.
-- This migration is intentionally idempotent and safe to apply on:
-- - fresh DB (no objects exist)
-- - partially applied DB (enums exist, tables missing)
-- - fully applied DB (everything exists)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionCancellationBookingType') THEN
    CREATE TYPE "SessionCancellationBookingType" AS ENUM ('STANDARD', 'INSTANT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionCancellationRefundMode') THEN
    CREATE TYPE "SessionCancellationRefundMode" AS ENUM ('NONE', 'PERCENTAGE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SessionCancellationPolicy" (
  "id" UUID NOT NULL,
  "bookingType" "SessionCancellationBookingType" NOT NULL,
  "displayName" VARCHAR(191) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "defaultRefundDestination" "RefundDestination" NOT NULL DEFAULT 'CUSTOMER_WALLET',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionCancellationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionCancellationPolicy_bookingType_key"
  ON "SessionCancellationPolicy"("bookingType");

CREATE TABLE IF NOT EXISTS "SessionCancellationPolicyRule" (
  "id" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "displayName" VARCHAR(191) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "minHoursBeforeStart" INTEGER NULL,
  "maxHoursBeforeStart" INTEGER NULL,
  "isCancellationAllowed" BOOLEAN NOT NULL DEFAULT true,
  "refundMode" "SessionCancellationRefundMode" NOT NULL DEFAULT 'NONE',
  "refundPercent" DECIMAL(5,2) NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionCancellationPolicyRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionCancellationPolicyRule_policyId_code_key"
  ON "SessionCancellationPolicyRule"("policyId", "code");

CREATE INDEX IF NOT EXISTS "SessionCancellationPolicyRule_policyId_isActive_priority_idx"
  ON "SessionCancellationPolicyRule"("policyId", "isActive", "priority");

CREATE TABLE IF NOT EXISTS "SessionCancellationRecord" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "cancelledByUserId" UUID NULL,
  "policyId" UUID NULL,
  "policyRuleId" UUID NULL,
  "policyVersion" INTEGER NULL,
  "bookingType" "SessionCancellationBookingType" NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancellationAllowed" BOOLEAN NOT NULL,
  "refundMode" "SessionCancellationRefundMode" NOT NULL DEFAULT 'NONE',
  "refundPercent" DECIMAL(5,2) NULL,
  "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "refundDestination" "RefundDestination" NULL,
  "cancelledPaymentId" UUID NULL,
  "generatedRefundId" UUID NULL,
  "policySnapshotJson" JSONB NULL,
  "financialActionsSnapshotJson" JSONB NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionCancellationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionCancellationRecord_sessionId_key"
  ON "SessionCancellationRecord"("sessionId");

CREATE INDEX IF NOT EXISTS "SessionCancellationRecord_policyId_evaluatedAt_idx"
  ON "SessionCancellationRecord"("policyId", "evaluatedAt");

CREATE INDEX IF NOT EXISTS "SessionCancellationRecord_bookingType_evaluatedAt_idx"
  ON "SessionCancellationRecord"("bookingType", "evaluatedAt");

DO $$
BEGIN
  BEGIN
    ALTER TABLE "SessionCancellationPolicyRule"
      ADD CONSTRAINT "SessionCancellationPolicyRule_policyId_fkey"
      FOREIGN KEY ("policyId")
      REFERENCES "SessionCancellationPolicy"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_sessionId_fkey"
      FOREIGN KEY ("sessionId")
      REFERENCES "Session"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_cancelledByUserId_fkey"
      FOREIGN KEY ("cancelledByUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_policyId_fkey"
      FOREIGN KEY ("policyId")
      REFERENCES "SessionCancellationPolicy"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_policyRuleId_fkey"
      FOREIGN KEY ("policyRuleId")
      REFERENCES "SessionCancellationPolicyRule"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_cancelledPaymentId_fkey"
      FOREIGN KEY ("cancelledPaymentId")
      REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TABLE "SessionCancellationRecord"
      ADD CONSTRAINT "SessionCancellationRecord_generatedRefundId_fkey"
      FOREIGN KEY ("generatedRefundId")
      REFERENCES "Refund"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;
END
$$;

-- Bootstrap default policies/rules (safe to re-run).
INSERT INTO "SessionCancellationPolicy" (
  "id",
  "bookingType",
  "displayName",
  "isActive",
  "defaultRefundDestination",
  "version"
)
VALUES
  ('11111111-2222-4333-8444-555555555551', 'STANDARD', 'Standard Booking Cancellation Policy', true, 'CUSTOMER_WALLET', 1),
  ('11111111-2222-4333-8444-555555555552', 'INSTANT', 'Instant Booking Cancellation Policy', true, 'CUSTOMER_WALLET', 1)
ON CONFLICT ("bookingType") DO NOTHING;

INSERT INTO "SessionCancellationPolicyRule" (
  "id",
  "policyId",
  "code",
  "displayName",
  "priority",
  "minHoursBeforeStart",
  "maxHoursBeforeStart",
  "isCancellationAllowed",
  "refundMode",
  "refundPercent",
  "isActive"
)
SELECT
  '11111111-2222-4333-8444-555555555561',
  p."id",
  'STANDARD_24H_70',
  'Cancel at least 24h before start: 70% refund',
  10,
  24,
  NULL,
  true,
  'PERCENTAGE',
  70,
  true
FROM "SessionCancellationPolicy" p
WHERE p."id" = '11111111-2222-4333-8444-555555555551'
ON CONFLICT ("policyId", "code") DO NOTHING;

INSERT INTO "SessionCancellationPolicyRule" (
  "id",
  "policyId",
  "code",
  "displayName",
  "priority",
  "minHoursBeforeStart",
  "maxHoursBeforeStart",
  "isCancellationAllowed",
  "refundMode",
  "refundPercent",
  "isActive"
)
SELECT
  '11111111-2222-4333-8444-555555555562',
  p."id",
  'STANDARD_LATE_NO_CANCEL',
  'Late cancellation is not allowed',
  20,
  0,
  23,
  false,
  'NONE',
  NULL,
  true
FROM "SessionCancellationPolicy" p
WHERE p."id" = '11111111-2222-4333-8444-555555555551'
ON CONFLICT ("policyId", "code") DO NOTHING;

INSERT INTO "SessionCancellationPolicyRule" (
  "id",
  "policyId",
  "code",
  "displayName",
  "priority",
  "minHoursBeforeStart",
  "maxHoursBeforeStart",
  "isCancellationAllowed",
  "refundMode",
  "refundPercent",
  "isActive"
)
SELECT
  '11111111-2222-4333-8444-555555555571',
  p."id",
  'INSTANT_NO_CANCEL',
  'Instant booking cancellation is not allowed',
  10,
  NULL,
  NULL,
  false,
  'NONE',
  NULL,
  true
FROM "SessionCancellationPolicy" p
WHERE p."id" = '11111111-2222-4333-8444-555555555552'
ON CONFLICT ("policyId", "code") DO NOTHING;
