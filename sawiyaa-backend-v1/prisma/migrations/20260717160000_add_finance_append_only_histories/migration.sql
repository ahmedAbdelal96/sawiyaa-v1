-- Append-only finance histories. No financial projections or historical rows are modified.
CREATE TYPE "RefundEventType" AS ENUM ('REQUESTED', 'PROCESSING', 'WALLET_POSTED', 'PROVIDER_PENDING', 'SUCCEEDED', 'FAILED', 'RETRIED');
CREATE TYPE "LedgerClassificationActionType" AS ENUM ('ASSIGNED_TO_SETTLEMENT', 'RELEASED_FROM_SETTLEMENT', 'BALANCE_BUCKET_CHANGED');
CREATE TYPE "FinanceReconciliationActionType" AS ENUM ('ISSUE_CREATED', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED', 'RUN_COMPLETED', 'RUN_FAILED');

CREATE TABLE "RefundEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "refundId" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "sessionId" UUID,
  "eventType" "RefundEventType" NOT NULL,
  "previousStatus" "RefundStatus",
  "newStatus" "RefundStatus" NOT NULL,
  "destination" "RefundDestination" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "actorType" "SecurityAuditActorType",
  "actorUserId" UUID,
  "actorRolesJson" JSONB,
  "source" VARCHAR(50),
  "reason" VARCHAR(500),
  "requestId" VARCHAR(191),
  "correlationId" VARCHAR(191),
  "idempotencyKey" VARCHAR(191),
  "commandReference" VARCHAR(191),
  "externalReference" VARCHAR(191),
  "metadataJson" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerClassificationEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ledgerEntryId" UUID NOT NULL,
  "previousSettlementId" UUID,
  "newSettlementId" UUID,
  "previousBalanceBucket" "WalletBalanceBucket",
  "newBalanceBucket" "WalletBalanceBucket",
  "actionType" "LedgerClassificationActionType" NOT NULL,
  "actorType" "SecurityAuditActorType",
  "actorUserId" UUID,
  "actorRolesJson" JSONB,
  "source" VARCHAR(50),
  "reason" VARCHAR(500),
  "requestId" VARCHAR(191),
  "correlationId" VARCHAR(191),
  "idempotencyKey" VARCHAR(191),
  "commandReference" VARCHAR(191),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerClassificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceReconciliationAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "issueId" UUID,
  "runId" UUID,
  "reviewId" UUID,
  "actionType" "FinanceReconciliationActionType" NOT NULL,
  "previousStatus" VARCHAR(50),
  "newStatus" VARCHAR(50),
  "actorType" "SecurityAuditActorType",
  "actorUserId" UUID,
  "actorRolesJson" JSONB,
  "source" VARCHAR(50),
  "reason" VARCHAR(1000),
  "requestId" VARCHAR(191),
  "correlationId" VARCHAR(191),
  "metadataJson" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceReconciliationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundEvent_refundId_occurredAt_idx" ON "RefundEvent"("refundId", "occurredAt");
CREATE INDEX "RefundEvent_paymentId_occurredAt_idx" ON "RefundEvent"("paymentId", "occurredAt");
CREATE INDEX "RefundEvent_actorUserId_occurredAt_idx" ON "RefundEvent"("actorUserId", "occurredAt");
CREATE INDEX "LedgerClassificationEvent_ledgerEntryId_occurredAt_idx" ON "LedgerClassificationEvent"("ledgerEntryId", "occurredAt");
CREATE INDEX "LedgerClassificationEvent_newSettlementId_occurredAt_idx" ON "LedgerClassificationEvent"("newSettlementId", "occurredAt");
CREATE INDEX "LedgerClassificationEvent_actorUserId_occurredAt_idx" ON "LedgerClassificationEvent"("actorUserId", "occurredAt");
CREATE INDEX "FinanceReconciliationAction_issueId_occurredAt_idx" ON "FinanceReconciliationAction"("issueId", "occurredAt");
CREATE INDEX "FinanceReconciliationAction_runId_occurredAt_idx" ON "FinanceReconciliationAction"("runId", "occurredAt");
CREATE INDEX "FinanceReconciliationAction_reviewId_occurredAt_idx" ON "FinanceReconciliationAction"("reviewId", "occurredAt");
CREATE INDEX "FinanceReconciliationAction_actorUserId_occurredAt_idx" ON "FinanceReconciliationAction"("actorUserId", "occurredAt");

ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerClassificationEvent" ADD CONSTRAINT "LedgerClassificationEvent_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerClassificationEvent" ADD CONSTRAINT "LedgerClassificationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceReconciliationAction" ADD CONSTRAINT "FinanceReconciliationAction_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AccountingReconciliationIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceReconciliationAction" ADD CONSTRAINT "FinanceReconciliationAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AccountingReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceReconciliationAction" ADD CONSTRAINT "FinanceReconciliationAction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "FinanceReconciliationReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceReconciliationAction" ADD CONSTRAINT "FinanceReconciliationAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
