-- Customer wallet backend foundation
-- Adds patient wallet/account, auditable wallet entries, reservation semantics,
-- payment split fields (wallet + gateway), and refund destination tracking.

-- 1) Enums
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'INTERNAL_WALLET';

CREATE TYPE "RefundDestination" AS ENUM ('ORIGINAL_METHOD', 'CUSTOMER_WALLET');

CREATE TYPE "CustomerWalletEntryType" AS ENUM (
  'REFUND_CREDIT',
  'MANUAL_CREDIT',
  'MANUAL_DEBIT',
  'SESSION_PAYMENT_RESERVE',
  'SESSION_PAYMENT_CAPTURE',
  'SESSION_PAYMENT_RELEASE',
  'REVERSAL',
  'ADJUSTMENT'
);

CREATE TYPE "CustomerWalletEntryDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TYPE "CustomerWalletReservationStatus" AS ENUM ('ACTIVE', 'CAPTURED', 'RELEASED');

-- 2) Payment / Refund columns
ALTER TABLE "Payment"
  ADD COLUMN "amountFromWallet" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "amountFromGateway" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "Refund"
  ADD COLUMN "destination" "RefundDestination" NOT NULL DEFAULT 'ORIGINAL_METHOD',
  ADD COLUMN "customerWalletCreditedAt" TIMESTAMP(3);

CREATE INDEX "Refund_destination_status_idx" ON "Refund"("destination", "status");

-- 3) Customer wallet tables
CREATE TABLE "CustomerWallet" (
  "id" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "availableBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "reservedBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lifetimeCredited" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lifetimeDebited" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lastEntryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerWallet_patientId_currencyCode_key"
  ON "CustomerWallet"("patientId", "currencyCode");

ALTER TABLE "CustomerWallet"
  ADD CONSTRAINT "CustomerWallet_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomerWalletEntry" (
  "id" UUID NOT NULL,
  "walletId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "paymentId" UUID,
  "refundId" UUID,
  "sessionId" UUID,
  "entryType" "CustomerWalletEntryType" NOT NULL,
  "direction" "CustomerWalletEntryDirection" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "description" VARCHAR(500),
  "referenceType" VARCHAR(100),
  "referenceId" VARCHAR(191),
  "metadataJson" JSONB,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerWalletEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerWalletEntry_patientId_effectiveAt_idx"
  ON "CustomerWalletEntry"("patientId", "effectiveAt");
CREATE INDEX "CustomerWalletEntry_walletId_effectiveAt_idx"
  ON "CustomerWalletEntry"("walletId", "effectiveAt");
CREATE INDEX "CustomerWalletEntry_paymentId_idx"
  ON "CustomerWalletEntry"("paymentId");
CREATE INDEX "CustomerWalletEntry_refundId_idx"
  ON "CustomerWalletEntry"("refundId");
CREATE INDEX "CustomerWalletEntry_sessionId_idx"
  ON "CustomerWalletEntry"("sessionId");
CREATE INDEX "CustomerWalletEntry_entryType_effectiveAt_idx"
  ON "CustomerWalletEntry"("entryType", "effectiveAt");
CREATE INDEX "CustomerWalletEntry_referenceType_referenceId_idx"
  ON "CustomerWalletEntry"("referenceType", "referenceId");

ALTER TABLE "CustomerWalletEntry"
  ADD CONSTRAINT "CustomerWalletEntry_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "CustomerWallet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletEntry"
  ADD CONSTRAINT "CustomerWalletEntry_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletEntry"
  ADD CONSTRAINT "CustomerWalletEntry_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletEntry"
  ADD CONSTRAINT "CustomerWalletEntry_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "Refund"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletEntry"
  ADD CONSTRAINT "CustomerWalletEntry_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CustomerWalletReservation" (
  "id" UUID NOT NULL,
  "walletId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "status" "CustomerWalletReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "capturedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerWalletReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerWalletReservation_paymentId_key"
  ON "CustomerWalletReservation"("paymentId");
CREATE INDEX "CustomerWalletReservation_patientId_status_createdAt_idx"
  ON "CustomerWalletReservation"("patientId", "status", "createdAt");
CREATE INDEX "CustomerWalletReservation_walletId_status_createdAt_idx"
  ON "CustomerWalletReservation"("walletId", "status", "createdAt");

ALTER TABLE "CustomerWalletReservation"
  ADD CONSTRAINT "CustomerWalletReservation_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "CustomerWallet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletReservation"
  ADD CONSTRAINT "CustomerWalletReservation_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerWalletReservation"
  ADD CONSTRAINT "CustomerWalletReservation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
