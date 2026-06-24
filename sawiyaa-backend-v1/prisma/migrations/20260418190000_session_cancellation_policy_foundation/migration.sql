-- Session cancellation policy foundation
-- Typed domain models for cancellation policy/rules and immutable cancellation decision records.

CREATE TYPE "SessionCancellationBookingType" AS ENUM ('STANDARD', 'INSTANT');
CREATE TYPE "SessionCancellationRefundMode" AS ENUM ('NONE', 'PERCENTAGE');

CREATE TABLE "SessionCancellationPolicy" (
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

CREATE UNIQUE INDEX "SessionCancellationPolicy_bookingType_key"
  ON "SessionCancellationPolicy"("bookingType");

CREATE TABLE "SessionCancellationPolicyRule" (
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

CREATE UNIQUE INDEX "SessionCancellationPolicyRule_policyId_code_key"
  ON "SessionCancellationPolicyRule"("policyId", "code");

CREATE INDEX "SessionCancellationPolicyRule_policyId_isActive_priority_idx"
  ON "SessionCancellationPolicyRule"("policyId", "isActive", "priority");

CREATE TABLE "SessionCancellationRecord" (
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

CREATE UNIQUE INDEX "SessionCancellationRecord_sessionId_key"
  ON "SessionCancellationRecord"("sessionId");

CREATE INDEX "SessionCancellationRecord_policyId_evaluatedAt_idx"
  ON "SessionCancellationRecord"("policyId", "evaluatedAt");

CREATE INDEX "SessionCancellationRecord_bookingType_evaluatedAt_idx"
  ON "SessionCancellationRecord"("bookingType", "evaluatedAt");

ALTER TABLE "SessionCancellationPolicyRule"
  ADD CONSTRAINT "SessionCancellationPolicyRule_policyId_fkey"
  FOREIGN KEY ("policyId")
  REFERENCES "SessionCancellationPolicy"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionCancellationRecord"
  ADD CONSTRAINT "SessionCancellationRecord_sessionId_fkey"
  FOREIGN KEY ("sessionId")
  REFERENCES "Session"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionCancellationRecord"
  ADD CONSTRAINT "SessionCancellationRecord_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SessionCancellationRecord"
  ADD CONSTRAINT "SessionCancellationRecord_policyId_fkey"
  FOREIGN KEY ("policyId")
  REFERENCES "SessionCancellationPolicy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SessionCancellationRecord"
  ADD CONSTRAINT "SessionCancellationRecord_policyRuleId_fkey"
  FOREIGN KEY ("policyRuleId")
  REFERENCES "SessionCancellationPolicyRule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Default policy bootstrap:
-- STANDARD: cancellable up to 24h before start with 70% refund, otherwise not cancellable.
-- INSTANT: not cancellable.
INSERT INTO "SessionCancellationPolicy" (
  "id",
  "bookingType",
  "displayName",
  "isActive",
  "defaultRefundDestination",
  "version"
)
VALUES
  (
    '11111111-2222-4333-8444-555555555551',
    'STANDARD',
    'Standard Booking Cancellation Policy',
    true,
    'CUSTOMER_WALLET',
    1
  ),
  (
    '11111111-2222-4333-8444-555555555552',
    'INSTANT',
    'Instant Booking Cancellation Policy',
    true,
    'CUSTOMER_WALLET',
    1
  );

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
  70.00,
  true
FROM "SessionCancellationPolicy" p
WHERE p."bookingType" = 'STANDARD';

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
  NULL,
  23,
  false,
  'NONE',
  NULL,
  true
FROM "SessionCancellationPolicy" p
WHERE p."bookingType" = 'STANDARD';

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
  '11111111-2222-4333-8444-555555555563',
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
WHERE p."bookingType" = 'INSTANT';
