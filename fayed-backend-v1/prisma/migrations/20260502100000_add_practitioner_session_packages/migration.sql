-- CreateEnum
CREATE TYPE "PractitionerPackageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED_BY_PRACTITIONER', 'DISABLED_BY_ADMIN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PatientPackagePurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PackageSchedulePolicy" AS ENUM ('REQUIRE_ALL_SESSIONS_AT_PURCHASE', 'ALLOW_SCHEDULE_LATER');

-- CreateEnum
CREATE TYPE "SessionPaymentCoverageType" AS ENUM ('DIRECT_PAYMENT', 'PACKAGE');

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'SESSION_PACKAGE_PURCHASE';

-- CreateTable
CREATE TABLE "PractitionerPackage" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(4000),
    "sessionCount" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL,
    "sessionMode" "SessionMode" NOT NULL,
    "priceEgp" DECIMAL(18,2) NOT NULL,
    "priceUsd" DECIMAL(18,2) NOT NULL,
    "status" "PractitionerPackageStatus" NOT NULL DEFAULT 'DRAFT',
    "schedulePolicy" "PackageSchedulePolicy" NOT NULL DEFAULT 'REQUIRE_ALL_SESSIONS_AT_PURCHASE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "disabledReason" VARCHAR(500),
    "statusBeforeAdminDisable" "PractitionerPackageStatus",
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPackagePurchase" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "paymentId" UUID,
    "status" "PatientPackagePurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentInitiatedAt" TIMESTAMP(3),
    "paymentExpiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "titleSnapshot" VARCHAR(191) NOT NULL,
    "descriptionSnapshot" VARCHAR(4000),
    "slugSnapshot" VARCHAR(191) NOT NULL,
    "packageVersionSnapshot" INTEGER NOT NULL,
    "sessionCountSnapshot" INTEGER NOT NULL,
    "sessionDurationMinutesSnapshot" INTEGER NOT NULL,
    "sessionModeSnapshot" "SessionMode" NOT NULL,
    "schedulePolicySnapshot" "PackageSchedulePolicy" NOT NULL,
    "priceEgpSnapshot" DECIMAL(18,2) NOT NULL,
    "priceUsdSnapshot" DECIMAL(18,2) NOT NULL,
    "selectedCurrencyCode" VARCHAR(3) NOT NULL,
    "selectedAmountSnapshot" DECIMAL(18,2) NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPackagePurchase_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "packagePurchaseId" UUID,
ADD COLUMN     "packageSessionCount" INTEGER,
ADD COLUMN     "packageSessionIndex" INTEGER,
ADD COLUMN     "packageTemplateId" UUID,
ADD COLUMN     "paymentCoverageType" "SessionPaymentCoverageType" NOT NULL DEFAULT 'DIRECT_PAYMENT';

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerPackage_practitionerId_slug_key" ON "PractitionerPackage"("practitionerId", "slug");

-- CreateIndex
CREATE INDEX "PractitionerPackage_practitionerId_status_idx" ON "PractitionerPackage"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "PractitionerPackage_practitionerId_archivedAt_idx" ON "PractitionerPackage"("practitionerId", "archivedAt");

-- CreateIndex
CREATE INDEX "PractitionerPackage_status_archivedAt_idx" ON "PractitionerPackage"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "PractitionerPackage_practitionerId_version_idx" ON "PractitionerPackage"("practitionerId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPackagePurchase_paymentId_key" ON "PatientPackagePurchase"("paymentId");

-- CreateIndex
CREATE INDEX "PatientPackagePurchase_packageId_status_createdAt_idx" ON "PatientPackagePurchase"("packageId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientPackagePurchase_practitionerId_status_createdAt_idx" ON "PatientPackagePurchase"("practitionerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientPackagePurchase_patientId_status_createdAt_idx" ON "PatientPackagePurchase"("patientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientPackagePurchase_status_paymentExpiresAt_idx" ON "PatientPackagePurchase"("status", "paymentExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_packagePurchaseId_packageSessionIndex_key" ON "Session"("packagePurchaseId", "packageSessionIndex");

-- CreateIndex
CREATE INDEX "Session_packageTemplateId_status_scheduledStartAt_idx" ON "Session"("packageTemplateId", "status", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "Session_paymentCoverageType_status_idx" ON "Session"("paymentCoverageType", "status");

-- AddForeignKey
ALTER TABLE "PractitionerPackage" ADD CONSTRAINT "PractitionerPackage_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PractitionerPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_packagePurchaseId_fkey" FOREIGN KEY ("packagePurchaseId") REFERENCES "PatientPackagePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "PractitionerPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
