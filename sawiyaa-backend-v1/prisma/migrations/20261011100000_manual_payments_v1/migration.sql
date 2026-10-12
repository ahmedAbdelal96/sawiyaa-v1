-- Manual Payments V1 is an additive, reusable payment path. No existing
-- payment/provider tables are rewritten and no business data is migrated.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'MANUAL';
ALTER TYPE "StoredFilePurpose" ADD VALUE IF NOT EXISTS 'MANUAL_PAYMENT_PROOF';

CREATE TYPE "ManualPaymentMethodType" AS ENUM ('INSTAPAY', 'PAYPAL', 'ELECTRONIC_WALLET', 'CUSTOM');
CREATE TYPE "ManualPaymentAvailabilityMode" AS ENUM ('ALL', 'SELECTED');
CREATE TYPE "ManualPaymentSubmissionStatus" AS ENUM ('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TABLE "ManualPaymentMethod" (
  "id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "type" "ManualPaymentMethodType" NOT NULL,
  "displayNameAr" VARCHAR(191) NOT NULL,
  "displayNameEn" VARCHAR(191) NOT NULL,
  "accountHolderName" VARCHAR(191) NOT NULL,
  "accountIdentifier" VARCHAR(191) NOT NULL,
  "instructionsAr" VARCHAR(2000),
  "instructionsEn" VARCHAR(2000),
  "availabilityMode" "ManualPaymentAvailabilityMode" NOT NULL DEFAULT 'ALL',
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "disabledAt" TIMESTAMP(3),
  CONSTRAINT "ManualPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualPaymentMethod_code_key" ON "ManualPaymentMethod"("code");
CREATE INDEX "ManualPaymentMethod_isEnabled_sortOrder_idx" ON "ManualPaymentMethod"("isEnabled", "sortOrder");
CREATE INDEX "ManualPaymentMethod_type_isEnabled_idx" ON "ManualPaymentMethod"("type", "isEnabled");

CREATE TABLE "ManualPaymentMethodCountry" (
  "id" UUID NOT NULL,
  "manualPaymentMethodId" UUID NOT NULL,
  "countryIsoCode" CHAR(2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManualPaymentMethodCountry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualPaymentMethodCountry_manualPaymentMethodId_countryIsoCode_key" ON "ManualPaymentMethodCountry"("manualPaymentMethodId", "countryIsoCode");
CREATE INDEX "ManualPaymentMethodCountry_countryIsoCode_manualPaymentMethodId_idx" ON "ManualPaymentMethodCountry"("countryIsoCode", "manualPaymentMethodId");

CREATE TABLE "ManualPaymentSubmission" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "manualPaymentMethodId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "status" "ManualPaymentSubmissionStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
  "senderAccountName" VARCHAR(191) NOT NULL,
  "proofStoredFileId" UUID NOT NULL,
  "notes" VARCHAR(1000),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" UUID,
  "rejectionReason" VARCHAR(1000),
  "resubmitUntil" TIMESTAMP(3),
  "paymentAmountSnapshot" DECIMAL(18,2) NOT NULL,
  "paymentCurrencySnapshot" VARCHAR(3) NOT NULL,
  "methodTypeSnapshot" "ManualPaymentMethodType" NOT NULL,
  "methodDisplayNameArSnapshot" VARCHAR(191) NOT NULL,
  "methodDisplayNameEnSnapshot" VARCHAR(191) NOT NULL,
  "accountHolderSnapshot" VARCHAR(191) NOT NULL,
  "accountIdentifierSnapshot" VARCHAR(191) NOT NULL,
  "instructionsArSnapshot" VARCHAR(2000),
  "instructionsEnSnapshot" VARCHAR(2000),
  "countrySnapshot" CHAR(2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualPaymentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualPaymentSubmission_proofStoredFileId_key" ON "ManualPaymentSubmission"("proofStoredFileId");
CREATE INDEX "ManualPaymentSubmission_paymentId_status_createdAt_idx" ON "ManualPaymentSubmission"("paymentId", "status", "createdAt");
CREATE INDEX "ManualPaymentSubmission_status_submittedAt_idx" ON "ManualPaymentSubmission"("status", "submittedAt");
CREATE INDEX "ManualPaymentSubmission_manualPaymentMethodId_status_idx" ON "ManualPaymentSubmission"("manualPaymentMethodId", "status");

ALTER TABLE "ManualPaymentMethodCountry" ADD CONSTRAINT "ManualPaymentMethodCountry_manualPaymentMethodId_fkey" FOREIGN KEY ("manualPaymentMethodId") REFERENCES "ManualPaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_manualPaymentMethodId_fkey" FOREIGN KEY ("manualPaymentMethodId") REFERENCES "ManualPaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_proofStoredFileId_fkey" FOREIGN KEY ("proofStoredFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
