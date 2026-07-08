ALTER TABLE "AcademyProgramEnrollment"
  ADD COLUMN IF NOT EXISTS "certificateFileStoragePath" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "certificateFileName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "certificateUploadedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "certificateUploadedByUserId" UUID;

DO $$
BEGIN
  ALTER TABLE "AcademyProgramEnrollment"
    ADD CONSTRAINT "AcademyProgramEnrollment_certificateUploadedByUserId_fkey"
    FOREIGN KEY ("certificateUploadedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AcademyProgramEnrollment_certificateUploadedByUserId_idx"
  ON "AcademyProgramEnrollment"("certificateUploadedByUserId");
