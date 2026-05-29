-- Remove legacy practitioner-specific package system in favor of global package-plans

-- Drop foreign keys that point to legacy PractitionerPackage
ALTER TABLE "PatientPackagePurchase"
DROP CONSTRAINT IF EXISTS "PatientPackagePurchase_packageId_fkey";

ALTER TABLE "Session"
DROP CONSTRAINT IF EXISTS "Session_packageTemplateId_fkey";

-- Drop indexes tied to removed legacy columns
DROP INDEX IF EXISTS "PatientPackagePurchase_packageId_status_createdAt_idx";
DROP INDEX IF EXISTS "Session_packageTemplateId_status_scheduledStartAt_idx";

-- Drop legacy columns
ALTER TABLE "PatientPackagePurchase"
DROP COLUMN IF EXISTS "packageId";

ALTER TABLE "Session"
DROP COLUMN IF EXISTS "packageTemplateId";

-- Drop legacy table and enum
DROP TABLE IF EXISTS "PractitionerPackage";
DROP TYPE IF EXISTS "PractitionerPackageStatus";
