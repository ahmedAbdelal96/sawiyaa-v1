ALTER TABLE "InstantBookingRequest"
ADD COLUMN IF NOT EXISTS "responseReason" VARCHAR(500);
