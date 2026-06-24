-- CreateTable
CREATE TABLE "PackagePlan" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "archivedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagePlan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PatientPackagePurchase" ADD COLUMN     "baseSessionPriceEgpSnapshot" DECIMAL(18,2),
ADD COLUMN     "baseSessionPriceUsdSnapshot" DECIMAL(18,2),
ADD COLUMN     "commissionModeSnapshot" VARCHAR(50),
ADD COLUMN     "currencyCodeSnapshot" VARCHAR(3),
ADD COLUMN     "discountAmountSnapshot" DECIMAL(18,2),
ADD COLUMN     "discountPercentSnapshot" DECIMAL(5,2),
ADD COLUMN     "packagePlanId" UUID,
ADD COLUMN     "patientPayableTotalSnapshot" DECIMAL(18,2),
ADD COLUMN     "planCodeSnapshot" VARCHAR(100),
ADD COLUMN     "planIdSnapshot" UUID,
ADD COLUMN     "platformDiscountShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "platformFinalShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "platformOriginalShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "practitionerDiscountShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "practitionerFinalShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "practitionerOriginalShareSnapshot" DECIMAL(18,2),
ADD COLUMN     "selectedBaseSessionPriceSnapshot" DECIMAL(18,2),
ADD COLUMN     "undiscountedTotalSnapshot" DECIMAL(18,2),
ALTER COLUMN "packageId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "PatientPackagePurchase" DROP CONSTRAINT "PatientPackagePurchase_packageId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "PackagePlan_code_key" ON "PackagePlan"("code");

-- CreateIndex
CREATE INDEX "PackagePlan_isActive_sortOrder_idx" ON "PackagePlan"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PackagePlan_archivedAt_isActive_idx" ON "PackagePlan"("archivedAt", "isActive");

-- CreateIndex
CREATE INDEX "PackagePlan_sessionCount_discountPercent_idx" ON "PackagePlan"("sessionCount", "discountPercent");

-- CreateIndex
CREATE INDEX "PatientPackagePurchase_packagePlanId_status_createdAt_idx" ON "PatientPackagePurchase"("packagePlanId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PractitionerPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackagePurchase" ADD CONSTRAINT "PatientPackagePurchase_packagePlanId_fkey" FOREIGN KEY ("packagePlanId") REFERENCES "PackagePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
