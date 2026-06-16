ALTER TABLE "InstantBookingRequest"
ADD COLUMN IF NOT EXISTS "metadataJson" JSONB;
