-- Add explicit dual-currency pricing fields for practitioner sessions.
ALTER TABLE "PractitionerProfile"
ADD COLUMN "sessionPrice30Egp" DECIMAL(18,2),
ADD COLUMN "sessionPrice30Usd" DECIMAL(18,2),
ADD COLUMN "sessionPrice60Egp" DECIMAL(18,2),
ADD COLUMN "sessionPrice60Usd" DECIMAL(18,2);
