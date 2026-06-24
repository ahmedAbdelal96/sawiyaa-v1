/*
  Warnings:

  - The `nextSessionStatus` column on the `SessionAdminDecision` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `decisionType` on the `SessionAdminDecision` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `previousSessionStatus` on the `SessionAdminDecision` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SessionAdminDecisionType" AS ENUM ('MARK_COMPLETED', 'MARK_PATIENT_NO_SHOW', 'MARK_PRACTITIONER_NO_SHOW', 'MARK_BOTH_NO_SHOW', 'MARK_TECHNICAL_REVIEW', 'MARK_INSUFFICIENT_EVIDENCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ModerationReportTargetType" ADD VALUE 'GENERAL_CHAT_CONVERSATION';
ALTER TYPE "ModerationReportTargetType" ADD VALUE 'GENERAL_CHAT_MESSAGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionEventType" ADD VALUE 'JOIN_ATTEMPTED';
ALTER TYPE "SessionEventType" ADD VALUE 'JOIN_ALLOWED';
ALTER TYPE "SessionEventType" ADD VALUE 'JOIN_BLOCKED';
ALTER TYPE "SessionEventType" ADD VALUE 'JOIN_TOKEN_ISSUED';
ALTER TYPE "SessionEventType" ADD VALUE 'JOIN_TOKEN_FAILED';
ALTER TYPE "SessionEventType" ADD VALUE 'MEETING_STARTED';
ALTER TYPE "SessionEventType" ADD VALUE 'MEETING_ENDED';
ALTER TYPE "SessionEventType" ADD VALUE 'ADMIN_MANUAL_DECISION_CREATED';
ALTER TYPE "SessionEventType" ADD VALUE 'ADMIN_MANUAL_DECISION_SUPERSEDED';

-- DropForeignKey
ALTER TABLE "RefundPolicyAcceptance" DROP CONSTRAINT "RefundPolicyAcceptance_refundPolicyVersionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAdminDecision" DROP CONSTRAINT "fk_decided_by";

-- DropForeignKey
ALTER TABLE "SessionAdminDecision" DROP CONSTRAINT "fk_session";

-- DropForeignKey
ALTER TABLE "SessionAdminDecision" DROP CONSTRAINT "fk_supersedes";

-- DropForeignKey
ALTER TABLE "SessionCancellationRecord" DROP CONSTRAINT "SessionCancellationRecord_cancelledPaymentId_fkey";

-- DropForeignKey
ALTER TABLE "SessionCancellationRecord" DROP CONSTRAINT "SessionCancellationRecord_generatedRefundId_fkey";

-- AlterTable
ALTER TABLE "CorporateBenefitCode" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "reservedUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "usedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateBenefitPlan" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateBenefitPlanPractitioner" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CorporateBenefitPlanSpecialty" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CorporateCodeBatch" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "exportedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateContract" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateLedger" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateOrganization" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CorporateSessionSponsorship" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FinanceReconciliationReview" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HelpCategory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HelpQuestion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PackageSettlement" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PatientPractitionerView" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerManualPayout" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerPayoutDestination" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerSettlementPayout" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PractitionerSettlementPayoutProof" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RefundPolicyClause" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SecurityAuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionAdminDecision" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "decisionType",
ADD COLUMN     "decisionType" "SessionAdminDecisionType" NOT NULL,
DROP COLUMN "previousSessionStatus",
ADD COLUMN     "previousSessionStatus" "SessionStatus" NOT NULL,
DROP COLUMN "nextSessionStatus",
ADD COLUMN     "nextSessionStatus" "SessionStatus",
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SessionCancellationPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionCancellationPolicyRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionCancellationRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionReminderQueue" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrainingEnrollmentPaymentAttempt" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "RefundPolicyAcceptance_paymentId_idx" ON "RefundPolicyAcceptance"("paymentId");

-- AddForeignKey
ALTER TABLE "RefundPolicyAcceptance" ADD CONSTRAINT "RefundPolicyAcceptance_refundPolicyVersionId_fkey" FOREIGN KEY ("refundPolicyVersionId") REFERENCES "RefundPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAdminDecision" ADD CONSTRAINT "SessionAdminDecision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAdminDecision" ADD CONSTRAINT "SessionAdminDecision_supersedesDecisionId_fkey" FOREIGN KEY ("supersedesDecisionId") REFERENCES "SessionAdminDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAdminDecision" ADD CONSTRAINT "SessionAdminDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CorporateBenefitPlanPractitioner_planId_practitionerId_idx" RENAME TO "CorporateBenefitPlanPractitioner_planId_practitionerId_key";

-- RenameIndex
ALTER INDEX "CorporateBenefitPlanSpecialty_planId_specialtyId_idx" RENAME TO "CorporateBenefitPlanSpecialty_planId_specialtyId_key";

-- RenameIndex
ALTER INDEX "idx_course_createdByUserId_createdAt" RENAME TO "Course_createdByUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_course_publishedByUserId_publishedAt" RENAME TO "Course_publishedByUserId_publishedAt_idx";

-- RenameIndex
ALTER INDEX "idx_courseSchedule_createdByUserId_createdAt" RENAME TO "CourseSchedule_createdByUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_courseSession_createdByUserId_createdAt" RENAME TO "CourseSession_createdByUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "PractitionerMarketingPlacement_surface_status_startsAt_endsAt_p" RENAME TO "PractitionerMarketingPlacement_surface_status_startsAt_ends_idx";

-- RenameIndex
ALTER INDEX "idx_session_admin_decision_decided_by" RENAME TO "SessionAdminDecision_decidedByUserId_idx";

-- RenameIndex
ALTER INDEX "idx_session_admin_decision_session_created" RENAME TO "SessionAdminDecision_sessionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_session_admin_decision_session_is_final" RENAME TO "SessionAdminDecision_sessionId_isFinal_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_trainingEnrollmentPaymentAttempt_enrollmentId_status_create" RENAME TO "TrainingEnrollmentPaymentAttempt_enrollmentId_status_create_idx";

-- RenameIndex
ALTER INDEX "idx_trainingEnrollmentPaymentAttempt_providerPaymentRef" RENAME TO "TrainingEnrollmentPaymentAttempt_providerPaymentRef_idx";
