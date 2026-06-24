-- Add step-up (re-auth) verification timestamps to sessions.
ALTER TABLE "UserSession"
ADD COLUMN     "stepUpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "stepUpExpiresAt" TIMESTAMP(3);

-- Index to allow efficient "has active step-up?" checks and cleanup queries.
CREATE INDEX "UserSession_stepUpExpiresAt_idx" ON "UserSession"("stepUpExpiresAt");
