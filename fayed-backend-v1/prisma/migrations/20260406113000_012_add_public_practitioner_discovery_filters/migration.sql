DO $$ BEGIN
  CREATE TYPE "PractitionerGender" AS ENUM ('MALE', 'FEMALE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "PractitionerProfile"
  ADD COLUMN IF NOT EXISTS "practitionerGender" "PractitionerGender",
  ADD COLUMN IF NOT EXISTS "acceptsPackages" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PractitionerProfile_practitionerGender_status_idx"
  ON "PractitionerProfile"("practitionerGender", "status");
