-- Remove legacy Training-only storage that is no longer part of the schema.
ALTER TABLE "Course" DROP COLUMN IF EXISTS "primaryInstructorId";

DROP TABLE IF EXISTS "TrainingEnrollmentPaymentAttempt";
DROP TABLE IF EXISTS "TrainingInstructor";
