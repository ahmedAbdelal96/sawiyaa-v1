ALTER TABLE "Notification"
  ADD COLUMN "claimToken" VARCHAR(64),
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimUntil" TIMESTAMP(3);

-- Existing QUEUED rows predate leases. They are treated as abandoned at the
-- migration boundary so the new reconciler can recover them. Deployments must
-- stop old notification workers before applying this migration; old workers do
-- not understand fenced ownership.
UPDATE "Notification"
SET "claimToken" = md5("id"::text || clock_timestamp()::text),
    "claimedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
    "claimUntil" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "status" = 'QUEUED'
  AND "claimToken" IS NULL
  AND "claimUntil" IS NULL;

CREATE INDEX "Notification_status_claimUntil_scheduledFor_createdAt_idx"
  ON "Notification"("status", "claimUntil", "scheduledFor", "createdAt");

CREATE UNIQUE INDEX "NotificationDeliveryAttempt_notificationId_attemptNumber_key"
  ON "NotificationDeliveryAttempt"("notificationId", "attemptNumber");
