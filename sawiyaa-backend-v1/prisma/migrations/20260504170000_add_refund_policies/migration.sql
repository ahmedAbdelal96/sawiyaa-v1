-- CreateEnum
CREATE TYPE "RefundPolicyType" AS ENUM ('SESSION', 'PACKAGE');

-- CreateEnum
CREATE TYPE "RefundPolicyVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "RefundPolicy" (
    "id" UUID NOT NULL,
    "policyType" "RefundPolicyType" NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "activeVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundPolicyVersion" (
    "id" UUID NOT NULL,
    "refundPolicyId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "titleByLocaleJson" JSONB NOT NULL,
    "summaryByLocaleJson" JSONB NOT NULL,
    "localizedContentJson" JSONB NOT NULL,
    "clausesJson" JSONB NOT NULL,
    "rulesJson" JSONB NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "status" "RefundPolicyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedByAdminId" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundPolicyAcceptance" (
    "id" UUID NOT NULL,
    "refundPolicyVersionId" UUID NOT NULL,
    "refundPolicyType" "RefundPolicyType" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedByUserId" UUID NOT NULL,
    "paymentId" UUID,
    "sessionId" UUID,
    "packagePurchaseId" UUID,
    "policyVersionNumberSnapshot" INTEGER NOT NULL,
    "policyTitleSnapshotJson" JSONB NOT NULL,
    "policySummarySnapshotJson" JSONB NOT NULL,
    "clausesSnapshotJson" JSONB NOT NULL,
    "rulesSnapshotJson" JSONB NOT NULL,
    "contentHashSnapshot" VARCHAR(64) NOT NULL,
    "displayLocale" VARCHAR(20) NOT NULL,
    "userAgent" VARCHAR(500),
    "ipAddress" VARCHAR(100),
    "consentTextHash" VARCHAR(64),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundPolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicy_policyType_key" ON "RefundPolicy"("policyType");

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicy_key_key" ON "RefundPolicy"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicy_activeVersionId_key" ON "RefundPolicy"("activeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicyVersion_refundPolicyId_versionNumber_key" ON "RefundPolicyVersion"("refundPolicyId", "versionNumber");

-- CreateIndex
CREATE INDEX "RefundPolicyVersion_refundPolicyId_status_versionNumber_idx" ON "RefundPolicyVersion"("refundPolicyId", "status", "versionNumber");

-- CreateIndex
CREATE INDEX "RefundPolicyVersion_refundPolicyId_publishedAt_idx" ON "RefundPolicyVersion"("refundPolicyId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicyAcceptance_paymentId_key" ON "RefundPolicyAcceptance"("paymentId");

-- CreateIndex
CREATE INDEX "RefundPolicyAcceptance_refundPolicyVersionId_acceptedAt_idx" ON "RefundPolicyAcceptance"("refundPolicyVersionId", "acceptedAt");

-- CreateIndex
CREATE INDEX "RefundPolicyAcceptance_refundPolicyType_acceptedAt_idx" ON "RefundPolicyAcceptance"("refundPolicyType", "acceptedAt");

-- CreateIndex
CREATE INDEX "RefundPolicyAcceptance_sessionId_idx" ON "RefundPolicyAcceptance"("sessionId");

-- CreateIndex
CREATE INDEX "RefundPolicyAcceptance_packagePurchaseId_idx" ON "RefundPolicyAcceptance"("packagePurchaseId");

-- AddForeignKey
ALTER TABLE "RefundPolicy" ADD CONSTRAINT "RefundPolicy_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "RefundPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPolicyVersion" ADD CONSTRAINT "RefundPolicyVersion_refundPolicyId_fkey" FOREIGN KEY ("refundPolicyId") REFERENCES "RefundPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPolicyAcceptance" ADD CONSTRAINT "RefundPolicyAcceptance_refundPolicyVersionId_fkey" FOREIGN KEY ("refundPolicyVersionId") REFERENCES "RefundPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPolicyAcceptance" ADD CONSTRAINT "RefundPolicyAcceptance_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
