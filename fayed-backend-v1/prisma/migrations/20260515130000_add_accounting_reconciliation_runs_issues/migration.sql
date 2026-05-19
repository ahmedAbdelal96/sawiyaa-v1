-- CreateEnum
CREATE TYPE "AccountingReconciliationScope" AS ENUM ('PAYMENTS', 'WALLETS', 'SETTLEMENTS', 'REFUNDS', 'PACKAGE_SETTLEMENTS', 'FULL');

-- CreateEnum
CREATE TYPE "AccountingReconciliationRunTrigger" AS ENUM ('MANUAL', 'ADMIN', 'SCHEDULED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AccountingReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ISSUES', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountingReconciliationIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "AccountingReconciliationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "AccountingReconciliationRun" (
    "id" UUID NOT NULL,
    "scope" "AccountingReconciliationScope" NOT NULL,
    "trigger" "AccountingReconciliationRunTrigger" NOT NULL,
    "status" "AccountingReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "entityType" VARCHAR(100),
    "entityId" VARCHAR(191),
    "currencyCode" VARCHAR(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalChecked" INTEGER NOT NULL DEFAULT 0,
    "totalPassed" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalWarnings" INTEGER NOT NULL DEFAULT 0,
    "totalCritical" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" JSONB,
    "metadataJson" JSONB,
    "triggeredByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingReconciliationIssue" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "scope" "AccountingReconciliationScope" NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(191) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "issueCode" VARCHAR(100) NOT NULL,
    "severity" "AccountingReconciliationSeverity" NOT NULL,
    "status" "AccountingReconciliationIssueStatus" NOT NULL DEFAULT 'OPEN',
    "message" VARCHAR(1000) NOT NULL,
    "expectedValue" VARCHAR(191),
    "actualValue" VARCHAR(191),
    "metadataJson" JSONB,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "ignoredAt" TIMESTAMP(3),
    "ignoredByUserId" UUID,
    "resolutionNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_scope_startedAt_idx" ON "AccountingReconciliationRun"("scope", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_status_startedAt_idx" ON "AccountingReconciliationRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_trigger_startedAt_idx" ON "AccountingReconciliationRun"("trigger", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_currencyCode_startedAt_idx" ON "AccountingReconciliationRun"("currencyCode", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_entityType_entityId_idx" ON "AccountingReconciliationRun"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AccountingReconciliationRun_triggeredByUserId_startedAt_idx" ON "AccountingReconciliationRun"("triggeredByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_runId_idx" ON "AccountingReconciliationIssue"("runId");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_scope_status_severity_currenc_idx" ON "AccountingReconciliationIssue"("scope", "status", "severity", "currencyCode");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_entityType_entityId_idx" ON "AccountingReconciliationIssue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_issueCode_status_idx" ON "AccountingReconciliationIssue"("issueCode", "status");

-- CreateIndex
CREATE INDEX "AccountingReconciliationIssue_lastDetectedAt_idx" ON "AccountingReconciliationIssue"("lastDetectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_accounting_reconciliation_issue" ON "AccountingReconciliationIssue"("scope", "entityType", "entityId", "issueCode", "currencyCode");

-- AddForeignKey
ALTER TABLE "AccountingReconciliationRun" ADD CONSTRAINT "AccountingReconciliationRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AccountingReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingReconciliationIssue" ADD CONSTRAINT "AccountingReconciliationIssue_ignoredByUserId_fkey" FOREIGN KEY ("ignoredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
