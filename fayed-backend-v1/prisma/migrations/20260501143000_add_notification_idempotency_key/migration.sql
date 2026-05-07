-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "idempotencyKey" VARCHAR(191);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");
