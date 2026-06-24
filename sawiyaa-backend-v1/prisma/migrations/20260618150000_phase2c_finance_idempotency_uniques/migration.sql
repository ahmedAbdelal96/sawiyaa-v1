BEGIN;

CREATE UNIQUE INDEX "Payment_provider_providerOrderRef_unique_idx"
ON "Payment" ("provider", "providerOrderRef")
WHERE "providerOrderRef" IS NOT NULL;

CREATE UNIQUE INDEX "Refund_providerRefundRef_unique_idx"
ON "Refund" ("providerRefundRef")
WHERE "providerRefundRef" IS NOT NULL;

CREATE UNIQUE INDEX "CustomerWalletEntry_refundId_entryType_unique_idx"
ON "CustomerWalletEntry" ("refundId", "entryType")
WHERE "refundId" IS NOT NULL AND "entryType" = 'REFUND_CREDIT';

COMMIT;
