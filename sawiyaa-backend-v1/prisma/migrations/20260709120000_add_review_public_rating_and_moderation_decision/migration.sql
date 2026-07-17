CREATE TYPE "SessionReviewModerationDecision" AS ENUM (
    'AUTO_APPROVED_POSITIVE',
    'APPROVED_AS_IS',
    'EDITED_AND_APPROVED',
    'REJECTED_PUBLISHING',
    'INTERNAL_NOTE_ONLY',
    'EXCLUDED_FROM_PUBLIC_AVERAGE'
);

ALTER TABLE "SessionReview"
ADD COLUMN "publicRatingValue" INTEGER,
ADD COLUMN "moderationDecision" "SessionReviewModerationDecision",
ADD COLUMN "moderatedByUserId" UUID,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderationReason" VARCHAR(1000),
ADD COLUMN "countsInPublicAverage" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SessionReview"
ADD CONSTRAINT "SessionReview_moderatedByUserId_fkey"
FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "SessionReview"
SET
  "publicRatingValue" = "ratingValue",
  "countsInPublicAverage" = true,
  "moderationDecision" = 'APPROVED_AS_IS',
  "moderatedAt" = COALESCE("publishedAt", "submittedAt", "updatedAt")
WHERE "reviewStatus" = 'PUBLISHED';
