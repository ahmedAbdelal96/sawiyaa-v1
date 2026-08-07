ALTER TABLE "SessionEarningReview"
  ADD COLUMN "suggestedPractitionerPercentage" DECIMAL(5,2),
  ADD COLUMN "accountantApprovedSourceAmount" DECIMAL(18,2),
  ADD COLUMN "accountingAdjustmentAmount" DECIMAL(18,2),
  ADD COLUMN "accountingAdjustmentType" VARCHAR(30),
  ADD COLUMN "accountingAdjustmentReason" VARCHAR(1000),
  ADD COLUMN "accountingNotes" VARCHAR(2000);
