CREATE TYPE "PaymentOperationalExceptionType" AS ENUM ('LATE_PROVIDER_SUCCESS', 'WEBHOOK_CONFLICT', 'RECONCILIATION_ISSUE', 'UNKNOWN_PAYMENT_STATE');

CREATE TYPE "PaymentOperationalExceptionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE TABLE "PaymentOperationalException" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "type" "PaymentOperationalExceptionType" NOT NULL,
    "status" "PaymentOperationalExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "provider" "PaymentProvider" NOT NULL,
    "ownerUserId" UUID,
    "reason" VARCHAR(1000) NOT NULL,
    "resolutionNote" VARCHAR(2000),
    "dedupeKey" VARCHAR(191) NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOperationalException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOperationalException_dedupeKey_key" ON "PaymentOperationalException"("dedupeKey");
CREATE INDEX "PaymentOperationalException_status_type_createdAt_idx" ON "PaymentOperationalException"("status", "type", "createdAt");
CREATE INDEX "PaymentOperationalException_provider_status_createdAt_idx" ON "PaymentOperationalException"("provider", "status", "createdAt");
CREATE INDEX "PaymentOperationalException_paymentId_createdAt_idx" ON "PaymentOperationalException"("paymentId", "createdAt");
CREATE INDEX "PaymentOperationalException_ownerUserId_status_idx" ON "PaymentOperationalException"("ownerUserId", "status");

ALTER TABLE "PaymentOperationalException" ADD CONSTRAINT "PaymentOperationalException_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
