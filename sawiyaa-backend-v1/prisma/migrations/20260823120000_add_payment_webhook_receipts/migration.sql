CREATE TABLE "PaymentWebhookReceipt" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventRef" VARCHAR(191) NOT NULL,
    "paymentId" UUID NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_payment_webhook_receipt_provider_event"
ON "PaymentWebhookReceipt"("provider", "providerEventRef");

CREATE INDEX "PaymentWebhookReceipt_paymentId_idx"
ON "PaymentWebhookReceipt"("paymentId");

ALTER TABLE "PaymentWebhookReceipt"
ADD CONSTRAINT "PaymentWebhookReceipt_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
