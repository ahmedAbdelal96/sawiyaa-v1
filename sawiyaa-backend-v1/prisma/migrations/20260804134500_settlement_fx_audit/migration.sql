ALTER TABLE "PractitionerSettlement"
  ADD COLUMN "exchangeRateSource" VARCHAR(100),
  ADD COLUMN "exchangeRateAt" TIMESTAMP(3);
