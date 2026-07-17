-- Additive finance audit context. No historical financial values or statuses are changed.
ALTER TABLE "PaymentEvent"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID,
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "reason" VARCHAR(500),
  ADD COLUMN "previousStatus" "PaymentStatus",
  ADD COLUMN "newStatus" "PaymentStatus",
  ADD COLUMN "commandReference" VARCHAR(191),
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Refund"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID,
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "previousStatus" "RefundStatus",
  ADD COLUMN "newStatus" "RefundStatus",
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CustomerWalletEntry"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID,
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "reason" VARCHAR(500),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "externalReference" VARCHAR(191),
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PractitionerSettlementPayout"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID,
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "reason" VARCHAR(500),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "previousStatus" "PractitionerSettlementStatus",
  ADD COLUMN "newStatus" "PractitionerSettlementStatus",
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PractitionerRecoveryAction"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorUserId" UUID,
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "previousStatus" "PractitionerRecoveryStatus",
  ADD COLUMN "newStatus" "PractitionerRecoveryStatus",
  ADD COLUMN "previousRemainingAmount" DECIMAL(18,2),
  ADD COLUMN "newRemainingAmount" DECIMAL(18,2),
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "PaymentEvent_actorUserId_occurredAt_idx" ON "PaymentEvent"("actorUserId", "occurredAt");
CREATE INDEX "PaymentEvent_requestId_occurredAt_idx" ON "PaymentEvent"("requestId", "occurredAt");
CREATE INDEX "Refund_actorUserId_occurredAt_idx" ON "Refund"("actorUserId", "occurredAt");
CREATE INDEX "CustomerWalletEntry_actorUserId_occurredAt_idx" ON "CustomerWalletEntry"("actorUserId", "occurredAt");
CREATE INDEX "PractitionerSettlementPayout_actorUserId_occurredAt_idx" ON "PractitionerSettlementPayout"("actorUserId", "occurredAt");
CREATE INDEX "PractitionerRecoveryAction_actorUserId_occurredAt_idx" ON "PractitionerRecoveryAction"("actorUserId", "occurredAt");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PaymentEvent" e LEFT JOIN "User" u ON u."id" = e."actorUserId" WHERE e."actorUserId" IS NOT NULL AND u."id" IS NULL) THEN RAISE EXCEPTION 'Cannot add PaymentEvent actor foreign key: orphan actorUserId values exist'; END IF;
  IF EXISTS (SELECT 1 FROM "Refund" e LEFT JOIN "User" u ON u."id" = e."actorUserId" WHERE e."actorUserId" IS NOT NULL AND u."id" IS NULL) THEN RAISE EXCEPTION 'Cannot add Refund actor foreign key: orphan actorUserId values exist'; END IF;
  IF EXISTS (SELECT 1 FROM "CustomerWalletEntry" e LEFT JOIN "User" u ON u."id" = e."actorUserId" WHERE e."actorUserId" IS NOT NULL AND u."id" IS NULL) THEN RAISE EXCEPTION 'Cannot add CustomerWalletEntry actor foreign key: orphan actorUserId values exist'; END IF;
  IF EXISTS (SELECT 1 FROM "PractitionerSettlementPayout" e LEFT JOIN "User" u ON u."id" = e."actorUserId" WHERE e."actorUserId" IS NOT NULL AND u."id" IS NULL) THEN RAISE EXCEPTION 'Cannot add PractitionerSettlementPayout actor foreign key: orphan actorUserId values exist'; END IF;
  IF EXISTS (SELECT 1 FROM "PractitionerRecoveryAction" e LEFT JOIN "User" u ON u."id" = e."actorUserId" WHERE e."actorUserId" IS NOT NULL AND u."id" IS NULL) THEN RAISE EXCEPTION 'Cannot add PractitionerRecoveryAction actor foreign key: orphan actorUserId values exist'; END IF;
END $$;

ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_auditActorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletEntry" ADD CONSTRAINT "CustomerWalletEntry_auditActorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerSettlementPayout" ADD CONSTRAINT "PractitionerSettlementPayout_auditActorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerRecoveryAction" ADD CONSTRAINT "PractitionerRecoveryAction_auditActorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
