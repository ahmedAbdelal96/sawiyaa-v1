ALTER TABLE "SessionResolution"
  ADD COLUMN "findingCode" VARCHAR(80) NOT NULL DEFAULT 'PATIENT_NO_SHOW',
  ADD COLUMN "customReasonNote" VARCHAR(2000);

ALTER TABLE "SessionResolution"
  ALTER COLUMN "findingCode" DROP DEFAULT;
