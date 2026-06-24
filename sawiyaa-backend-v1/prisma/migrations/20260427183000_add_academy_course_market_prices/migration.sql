ALTER TABLE "AcademyCourse"
ADD COLUMN IF NOT EXISTS "priceAmountEgp" DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS "priceAmountUsd" DECIMAL(18,2);

UPDATE "AcademyCourse"
SET "priceAmountEgp" = COALESCE("priceAmountEgp", "priceAmount")
WHERE "priceAmount" IS NOT NULL
  AND COALESCE("currencyCode", '') IN ('', 'EGP');

UPDATE "AcademyCourse"
SET "priceAmountUsd" = COALESCE("priceAmountUsd", "priceAmount")
WHERE "priceAmount" IS NOT NULL
  AND "currencyCode" = 'USD';
