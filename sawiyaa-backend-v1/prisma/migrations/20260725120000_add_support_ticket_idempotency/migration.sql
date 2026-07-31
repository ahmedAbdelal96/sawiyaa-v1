ALTER TABLE "SupportTicket" ADD COLUMN "idempotencyKey" VARCHAR(191);

CREATE UNIQUE INDEX "SupportTicket_idempotencyKey_key" ON "SupportTicket"("idempotencyKey");
