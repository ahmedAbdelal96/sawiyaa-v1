-- Widen practitioner avatar storage so review-gated avatar snapshots can persist safely.
ALTER TABLE "PractitionerProfile"
ALTER COLUMN "avatarUrl" TYPE TEXT
USING "avatarUrl"::TEXT;
