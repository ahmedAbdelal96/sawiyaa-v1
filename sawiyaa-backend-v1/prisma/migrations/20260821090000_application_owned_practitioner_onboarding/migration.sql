-- Application-owned onboarding. Existing profile-backed records are preserved;
-- new submissions can exist without an operational practitioner profile.

ALTER TYPE "PractitionerPayoutMethodType" ADD VALUE IF NOT EXISTS 'INSTAPAY';
ALTER TYPE "PractitionerPayoutMethodType" ADD VALUE IF NOT EXISTS 'PAYPAL';

ALTER TABLE "PractitionerPayoutDestination"
  ADD COLUMN IF NOT EXISTS "instapayIdentifier" VARCHAR(191),
  ADD COLUMN IF NOT EXISTS "paypalEmail" VARCHAR(191);

ALTER TABLE "PractitionerApplication"
  ADD COLUMN IF NOT EXISTS "userId" UUID;

UPDATE "PractitionerApplication" a
SET "userId" = p."userId"
FROM "PractitionerProfile" p
WHERE a."practitionerId" = p."id"
  AND a."userId" IS NULL;

ALTER TABLE "PractitionerApplication"
  ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "PractitionerApplication"
  DROP CONSTRAINT IF EXISTS "PractitionerApplication_practitionerId_fkey";

ALTER TABLE "PractitionerApplication"
  ALTER COLUMN "practitionerId" DROP NOT NULL;

ALTER TABLE "PractitionerApplication"
  ADD CONSTRAINT "PractitionerApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerApplication_practitionerId_fkey"
    FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PractitionerApplication_userId_status_updatedAt_idx"
  ON "PractitionerApplication" ("userId", "status", "updatedAt");

ALTER TABLE "PractitionerReviewCase"
  ADD COLUMN IF NOT EXISTS "userId" UUID,
  ADD COLUMN IF NOT EXISTS "applicationId" UUID;

UPDATE "PractitionerReviewCase" rc
SET "userId" = p."userId"
FROM "PractitionerProfile" p
WHERE rc."practitionerId" = p."id"
  AND rc."userId" IS NULL;

ALTER TABLE "PractitionerReviewCase"
  DROP CONSTRAINT IF EXISTS "PractitionerReviewCase_practitionerId_fkey";

ALTER TABLE "PractitionerReviewCase"
  ALTER COLUMN "practitionerId" DROP NOT NULL;

ALTER TABLE "PractitionerReviewCase"
  ADD CONSTRAINT "PractitionerReviewCase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerReviewCase_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "PractitionerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerReviewCase_practitionerId_fkey"
    FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PractitionerReviewCase_applicationId_status_updatedAt_idx"
  ON "PractitionerReviewCase" ("applicationId", "status", "updatedAt");

ALTER TABLE "PractitionerCredential"
  ADD COLUMN IF NOT EXISTS "applicationId" UUID;

ALTER TABLE "PractitionerCredential"
  DROP CONSTRAINT IF EXISTS "PractitionerCredential_practitionerId_fkey";

ALTER TABLE "PractitionerCredential"
  ALTER COLUMN "practitionerId" DROP NOT NULL;

ALTER TABLE "PractitionerCredential"
  ADD CONSTRAINT "PractitionerCredential_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "PractitionerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PractitionerCredential_practitionerId_fkey"
    FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PractitionerCredential_applicationId_reviewStatus_idx"
  ON "PractitionerCredential" ("applicationId", "reviewStatus");

ALTER TABLE "PractitionerReviewCase"
  ADD CONSTRAINT "PractitionerReviewCase_exact_owner_ck"
  CHECK (("applicationId" IS NOT NULL AND "practitionerId" IS NULL)
      OR ("applicationId" IS NULL AND "practitionerId" IS NOT NULL));

ALTER TABLE "PractitionerCredential"
  ADD CONSTRAINT "PractitionerCredential_exact_owner_ck"
  CHECK (("applicationId" IS NOT NULL AND "practitionerId" IS NULL)
      OR ("applicationId" IS NULL AND "practitionerId" IS NOT NULL));
