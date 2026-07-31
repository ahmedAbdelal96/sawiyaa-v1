-- CreateEnum
CREATE TYPE "PractitionerOperationalStatus" AS ENUM ('ACTIVE', 'LIMITED', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PractitionerComplianceState" AS ENUM ('VERIFIED', 'REVIEW_REQUIRED', 'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'REMEDIATION_REQUIRED');

-- CreateEnum
CREATE TYPE "ReviewCaseType" AS ENUM ('ONBOARDING', 'PRACTITIONER_CHANGE', 'ADMIN_REMEDIATION', 'CREDENTIAL_RENEWAL', 'PERIODIC_COMPLIANCE');

-- CreateEnum
CREATE TYPE "ReviewCaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewSection" AS ENUM ('PROFILE', 'SPECIALTIES', 'IDENTITY', 'ACADEMIC_CREDENTIALS', 'PROFESSIONAL_CREDENTIALS', 'BANKING', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "ReviewSectionStatus" AS ENUM ('UNCHANGED', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewRequirementStatus" AS ENUM ('OPEN', 'SUBMITTED', 'SATISFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewRequirementSeverity" AS ENUM ('INFO', 'WARNING', 'BLOCKING');

-- CreateEnum
CREATE TYPE "ReviewOperationalImpact" AS ENUM ('NONE', 'BLOCK_PUBLIC_PROFILE', 'BLOCK_NEW_BOOKINGS', 'BLOCK_SESSIONS', 'BLOCK_PAYOUTS', 'SUSPEND_ACCOUNT');

-- CreateEnum
CREATE TYPE "CredentialLifecycleState" AS ENUM ('ACTIVE', 'REPLACEMENT_PENDING', 'REPLACED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "PractitionerCredential" ADD COLUMN     "lifecycleState" "CredentialLifecycleState" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "PractitionerProfile" ADD COLUMN     "complianceState" "PractitionerComplianceState" NOT NULL DEFAULT 'REVIEW_REQUIRED',
ADD COLUMN     "operationalStatus" "PractitionerOperationalStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PractitionerReviewCase" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "caseType" "ReviewCaseType" NOT NULL,
    "status" "ReviewCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "proposedSnapshot" JSONB,
    "previousSnapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "decisionReason" VARCHAR(1000),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerReviewCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerReviewSection" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "section" "ReviewSection" NOT NULL,
    "status" "ReviewSectionStatus" NOT NULL DEFAULT 'UNCHANGED',
    "beforeSnapshot" JSONB,
    "proposedSnapshot" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "decisionReason" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerReviewSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerReviewRequirement" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "section" "ReviewSection" NOT NULL,
    "fieldPath" VARCHAR(191),
    "credentialType" "CredentialType",
    "title" VARCHAR(191) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "instructions" VARCHAR(2000),
    "dueAt" TIMESTAMP(3),
    "severity" "ReviewRequirementSeverity" NOT NULL DEFAULT 'BLOCKING',
    "operationalImpact" "ReviewOperationalImpact"[] DEFAULT ARRAY[]::"ReviewOperationalImpact"[],
    "status" "ReviewRequirementStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" UUID NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerReviewRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PractitionerReviewCase_practitionerId_caseType_status_updat_idx" ON "PractitionerReviewCase"("practitionerId", "caseType", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "PractitionerReviewCase_status_dueAt_idx" ON "PractitionerReviewCase"("status", "dueAt");

-- CreateIndex
CREATE INDEX "PractitionerReviewSection_section_status_idx" ON "PractitionerReviewSection"("section", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerReviewSection_caseId_section_key" ON "PractitionerReviewSection"("caseId", "section");

-- CreateIndex
CREATE INDEX "PractitionerReviewRequirement_caseId_status_idx" ON "PractitionerReviewRequirement"("caseId", "status");

-- CreateIndex
CREATE INDEX "PractitionerReviewRequirement_credentialType_status_idx" ON "PractitionerReviewRequirement"("credentialType", "status");

-- CreateIndex
CREATE INDEX "PractitionerReviewRequirement_dueAt_status_idx" ON "PractitionerReviewRequirement"("dueAt", "status");

-- AddForeignKey
ALTER TABLE "PractitionerReviewCase" ADD CONSTRAINT "PractitionerReviewCase_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerReviewSection" ADD CONSTRAINT "PractitionerReviewSection_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PractitionerReviewCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerReviewRequirement" ADD CONSTRAINT "PractitionerReviewRequirement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PractitionerReviewCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
