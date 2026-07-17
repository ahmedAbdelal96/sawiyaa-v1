/*
  Warnings:

  - The values [TRAINING] on the enum `ConfigCategory` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRAINING] on the enum `NotificationCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConfigCategory_new" AS ENUM ('PLATFORM', 'BRANDING', 'LOCALE', 'SESSION', 'BOOKING', 'CANCELLATION', 'PAYMENT', 'PAYOUT', 'COUPON', 'CHAT', 'SUPPORT', 'NOTIFICATION', 'SECURITY', 'SYSTEM');
ALTER TABLE "ConfigKeyCatalog" ALTER COLUMN "category" TYPE "ConfigCategory_new" USING ("category"::text::"ConfigCategory_new");
ALTER TYPE "ConfigCategory" RENAME TO "ConfigCategory_old";
ALTER TYPE "ConfigCategory_new" RENAME TO "ConfigCategory";
DROP TYPE "public"."ConfigCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationCategory_new" AS ENUM ('SECURITY', 'SESSION', 'PAYMENT', 'CONTENT', 'SUPPORT', 'CHAT', 'SYSTEM', 'MARKETING');
ALTER TABLE "public"."AuditEvent" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "NotificationType" ALTER COLUMN "category" TYPE "NotificationCategory_new" USING ("category"::text::"NotificationCategory_new");
ALTER TABLE "AuditEvent" ALTER COLUMN "category" TYPE "NotificationCategory_new" USING ("category"::text::"NotificationCategory_new");
ALTER TYPE "NotificationCategory" RENAME TO "NotificationCategory_old";
ALTER TYPE "NotificationCategory_new" RENAME TO "NotificationCategory";
DROP TYPE "public"."NotificationCategory_old";
ALTER TABLE "AuditEvent" ALTER COLUMN "category" SET DEFAULT 'SYSTEM';
COMMIT;

-- DropIndex
DROP INDEX "AcademyProgramEnrollment_certificateUploadedByUserId_idx";

-- AlterTable
ALTER TABLE "AcademyProgram" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AcademyProgramEnrollment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AcademyProgramPaymentAttempt" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AcademyProgramSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AcademyProgramSessionAttendance" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerRecovery" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerRecoveryAction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionEarningReview" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionPackageEntitlementDecision" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "SessionPackageEntitlementDecision" RENAME CONSTRAINT "SessionPackageEntitlementDecision_resultingSessionEarningReview" TO "SessionPackageEntitlementDecision_resultingSessionEarningR_fkey";

-- RenameIndex
ALTER INDEX "AcademyProgramEnrollment_academyProgramId_seatReservationExpire" RENAME TO "AcademyProgramEnrollment_academyProgramId_seatReservationEx_idx";

-- RenameIndex
ALTER INDEX "AcademyProgramEnrollment_academyProgramId_status_registeredAt_i" RENAME TO "AcademyProgramEnrollment_academyProgramId_status_registered_idx";

-- RenameIndex
ALTER INDEX "AcademyProgramPaymentAttempt_academyProgramEnrollmentId_created" RENAME TO "AcademyProgramPaymentAttempt_academyProgramEnrollmentId_cre_idx";

-- RenameIndex
ALTER INDEX "AcademyProgramPaymentAttempt_academyProgramId_status_createdAt_" RENAME TO "AcademyProgramPaymentAttempt_academyProgramId_status_create_idx";

-- RenameIndex
ALTER INDEX "AcademyProgramSessionAttendance_enrollment_status_idx" RENAME TO "AcademyProgramSessionAttendance_academyProgramEnrollmentId__idx";

-- RenameIndex
ALTER INDEX "AcademyProgramSessionAttendance_session_enrollment_key" RENAME TO "AcademyProgramSessionAttendance_academyProgramSessionId_aca_key";

-- RenameIndex
ALTER INDEX "AcademyProgramSessionAttendance_session_status_idx" RENAME TO "AcademyProgramSessionAttendance_academyProgramSessionId_att_idx";

-- RenameIndex
ALTER INDEX "PractitionerRecovery_practitionerId_currencyCode_status_created" RENAME TO "PractitionerRecovery_practitionerId_currencyCode_status_cre_idx";

-- RenameIndex
ALTER INDEX "SessionPackageEntitlementDecision_packagePurchaseId_decidedAt_i" RENAME TO "SessionPackageEntitlementDecision_packagePurchaseId_decided_idx";

-- RenameIndex
ALTER INDEX "SessionPackageEntitlementDecision_resultingSessionEarningReview" RENAME TO "SessionPackageEntitlementDecision_resultingSessionEarningRe_key";
