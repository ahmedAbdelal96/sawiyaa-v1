-- Add device registration metadata so mobile push-capable devices can be linked
-- to the authenticated user and active role without exposing raw tokens back out.
CREATE TYPE "PushProvider" AS ENUM ('EXPO', 'FCM', 'APNS');

ALTER TABLE "NotificationDevice"
ADD COLUMN "role" "UserRoleType",
ADD COLUMN "provider" "PushProvider",
ADD COLUMN "locale" VARCHAR(10),
ADD COLUMN "timezone" VARCHAR(50);

CREATE INDEX "NotificationDevice_userId_role_isActive_idx"
ON "NotificationDevice"("userId", "role", "isActive");

CREATE INDEX "NotificationDevice_provider_isActive_idx"
ON "NotificationDevice"("provider", "isActive");