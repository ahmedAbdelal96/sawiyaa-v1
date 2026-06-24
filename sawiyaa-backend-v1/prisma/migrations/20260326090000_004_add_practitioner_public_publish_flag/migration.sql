-- Adds explicit public publication flag for practitioner public profiles.
-- APPROVED state and public publication are intentionally separated concerns.
ALTER TABLE "PractitionerProfile"
ADD COLUMN "isPublicProfilePublished" BOOLEAN NOT NULL DEFAULT false;
