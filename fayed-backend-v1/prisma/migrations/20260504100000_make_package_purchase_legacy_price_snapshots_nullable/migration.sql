-- Make legacy package-purchase currency snapshot columns nullable so standardized purchase creation
-- can preserve "unknown/not provided" without faking currency values.
ALTER TABLE "PatientPackagePurchase"
ALTER COLUMN "priceEgpSnapshot" DROP NOT NULL,
ALTER COLUMN "priceUsdSnapshot" DROP NOT NULL;
