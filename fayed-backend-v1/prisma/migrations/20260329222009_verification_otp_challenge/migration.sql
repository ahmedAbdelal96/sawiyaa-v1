-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OtpPurpose" ADD VALUE 'PRACTITIONER_LOGIN';
ALTER TYPE "OtpPurpose" ADD VALUE 'PATIENT_LOGIN';
ALTER TYPE "OtpPurpose" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "OtpPurpose" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "OtpPurpose" ADD VALUE 'PHONE_VERIFICATION';
ALTER TYPE "OtpPurpose" ADD VALUE 'ADMIN_STEP_UP';
ALTER TYPE "OtpPurpose" ADD VALUE 'SENSITIVE_ACTION_CONFIRMATION';
ALTER TYPE "OtpPurpose" ADD VALUE 'SETTLEMENT_CONFIRMATION';

-- AlterTable
ALTER TABLE "AvailabilityException" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AvailabilitySlot" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OtpChallenge" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionId" UUID;
