-- Add instant-booking-specific pricing fields to practitioner profiles.

ALTER TABLE "PractitionerProfile"
  ADD COLUMN "instantBookingPrice30Egp" DECIMAL(18,2),
  ADD COLUMN "instantBookingPrice30Usd" DECIMAL(18,2),
  ADD COLUMN "instantBookingPrice60Egp" DECIMAL(18,2),
  ADD COLUMN "instantBookingPrice60Usd" DECIMAL(18,2);
