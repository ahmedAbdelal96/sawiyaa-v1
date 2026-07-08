ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "videoRoomClosedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "videoRoomClosedByUserId" UUID,
ADD COLUMN IF NOT EXISTS "videoRoomCloseReason" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "videoRoomCloseNote" VARCHAR(1000);

CREATE INDEX IF NOT EXISTS "Session_videoRoomClosedAt_idx" ON "Session"("videoRoomClosedAt");
