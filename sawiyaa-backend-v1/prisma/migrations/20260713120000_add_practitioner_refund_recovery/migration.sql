-- Add practitioner refund recovery tracking for post-approval / post-payout refund shortfalls.

CREATE TYPE "PractitionerRecoveryStatus" AS ENUM ('OPEN', 'PARTIALLY_RECOVERED', 'RECOVERED', 'WAIVED');
CREATE TYPE "PractitionerRecoveryReasonCode" AS ENUM ('REFUND_AFTER_PAYOUT', 'REFUND_AFTER_APPROVAL', 'MANUAL_FINANCE_CORRECTION', 'ADMIN_EXCEPTION');
CREATE TYPE "PractitionerRecoveryActionType" AS ENUM ('APPLIED_TO_PAYOUT', 'MANUALLY_COLLECTED', 'WAIVED');

CREATE TABLE "PractitionerRecovery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "practitionerId" UUID NOT NULL,
    "sessionId" UUID,
    "paymentId" UUID,
    "refundId" UUID NOT NULL,
    "sessionEarningReviewId" UUID,
    "settlementId" UUID,
    "payoutId" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "recoveredAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currencyCode" VARCHAR(3) NOT NULL,
    "status" "PractitionerRecoveryStatus" NOT NULL DEFAULT 'OPEN',
    "reasonCode" "PractitionerRecoveryReasonCode" NOT NULL,
    "internalReason" VARCHAR(1000),
    "practitionerFacingNote" VARCHAR(1000),
    "createdByUserId" UUID,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PractitionerRecovery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PractitionerRecoveryAction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recoveryId" UUID NOT NULL,
    "actionType" "PractitionerRecoveryActionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payoutId" UUID,
    "reason" VARCHAR(1000),
    "performedByUserId" UUID,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PractitionerRecoveryAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerRecovery_refundId_key" ON "PractitionerRecovery"("refundId");
CREATE UNIQUE INDEX "PractitionerRecovery_idempotencyKey_key" ON "PractitionerRecovery"("idempotencyKey");
CREATE INDEX "PractitionerRecovery_practitionerId_currencyCode_status_createdAt_idx" ON "PractitionerRecovery"("practitionerId", "currencyCode", "status", "createdAt");
CREATE INDEX "PractitionerRecovery_paymentId_idx" ON "PractitionerRecovery"("paymentId");
CREATE INDEX "PractitionerRecovery_sessionId_idx" ON "PractitionerRecovery"("sessionId");
CREATE INDEX "PractitionerRecovery_sessionEarningReviewId_idx" ON "PractitionerRecovery"("sessionEarningReviewId");
CREATE INDEX "PractitionerRecovery_settlementId_idx" ON "PractitionerRecovery"("settlementId");

CREATE UNIQUE INDEX "PractitionerRecoveryAction_idempotencyKey_key" ON "PractitionerRecoveryAction"("idempotencyKey");
CREATE INDEX "PractitionerRecoveryAction_recoveryId_createdAt_idx" ON "PractitionerRecoveryAction"("recoveryId", "createdAt");
CREATE INDEX "PractitionerRecoveryAction_payoutId_idx" ON "PractitionerRecoveryAction"("payoutId");

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_practitionerId_fkey"
FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_refundId_fkey"
FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_sessionEarningReviewId_fkey"
FOREIGN KEY ("sessionEarningReviewId") REFERENCES "SessionEarningReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_settlementId_fkey"
FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecovery"
ADD CONSTRAINT "PractitionerRecovery_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecoveryAction"
ADD CONSTRAINT "PractitionerRecoveryAction_recoveryId_fkey"
FOREIGN KEY ("recoveryId") REFERENCES "PractitionerRecovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PractitionerRecoveryAction"
ADD CONSTRAINT "PractitionerRecoveryAction_performedByUserId_fkey"
FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
