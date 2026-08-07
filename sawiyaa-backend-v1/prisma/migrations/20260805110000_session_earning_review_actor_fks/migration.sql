-- Review decision actors are financial history and cannot be deleted while referenced.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SessionEarningReview" r
    LEFT JOIN "User" u ON u."id" = r."reviewedByUserId"
    WHERE r."reviewedByUserId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add reviewedByUserId FK: orphaned review actor exists';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "SessionEarningReview" r
    LEFT JOIN "User" u ON u."id" = r."approvedByUserId"
    WHERE r."approvedByUserId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add approvedByUserId FK: orphaned review actor exists';
  END IF;
END $$;

ALTER TABLE "SessionEarningReview"
  ADD CONSTRAINT "SessionEarningReview_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SessionEarningReview_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
