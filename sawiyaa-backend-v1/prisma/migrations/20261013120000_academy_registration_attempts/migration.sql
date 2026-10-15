-- Academy registration attempts are additive. They preserve every public
-- registration attempt without creating a login account or duplicating a
-- program enrollment.
CREATE TYPE "AcademyRegistrationAttemptStatus" AS ENUM (
  'SUBMITTED',
  'REQUIRES_LOGIN',
  'PENDING_PAYMENT',
  'PAYMENT_ISSUE',
  'CONVERTED',
  'DUPLICATE',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE "AcademyRegistrationAttemptResolution" AS ENUM (
  'NEW_GUEST',
  'EXISTING_LEARNER',
  'AUTHENTICATED_ACCOUNT',
  'EXISTING_ACCOUNT_REQUIRES_LOGIN',
  'EXISTING_ENROLLMENT',
  'CONFLICT'
);

CREATE TABLE "AcademyRegistrationAttempt" (
  "id" UUID NOT NULL,
  "academyProgramId" UUID NOT NULL,
  "academyLearnerId" UUID,
  "academyEnrollmentId" UUID,
  "userId" UUID,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "fullName" VARCHAR(191) NOT NULL,
  "phoneNumber" VARCHAR(50) NOT NULL,
  "normalizedPhoneNumber" VARCHAR(50) NOT NULL,
  "whatsappNumber" VARCHAR(50),
  "email" VARCHAR(191),
  "normalizedEmail" VARCHAR(191),
  "sourceLabel" VARCHAR(191),
  "paymentMethod" VARCHAR(30),
  "status" "AcademyRegistrationAttemptStatus" NOT NULL DEFAULT 'SUBMITTED',
  "resolution" "AcademyRegistrationAttemptResolution" NOT NULL DEFAULT 'NEW_GUEST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "convertedAt" TIMESTAMP(3),
  CONSTRAINT "AcademyRegistrationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyRegistrationAttempt_idempotencyKey_key" ON "AcademyRegistrationAttempt"("idempotencyKey");
CREATE INDEX "AcademyRegistrationAttempt_academyProgramId_status_createdAt_idx" ON "AcademyRegistrationAttempt"("academyProgramId", "status", "createdAt");
CREATE INDEX "AcademyRegistrationAttempt_academyProgramId_normalizedEmail_idx" ON "AcademyRegistrationAttempt"("academyProgramId", "normalizedEmail");
CREATE INDEX "AcademyRegistrationAttempt_academyProgramId_normalizedPhoneNumber_idx" ON "AcademyRegistrationAttempt"("academyProgramId", "normalizedPhoneNumber");
CREATE INDEX "AcademyRegistrationAttempt_academyLearnerId_createdAt_idx" ON "AcademyRegistrationAttempt"("academyLearnerId", "createdAt");
CREATE INDEX "AcademyRegistrationAttempt_academyEnrollmentId_createdAt_idx" ON "AcademyRegistrationAttempt"("academyEnrollmentId", "createdAt");

ALTER TABLE "AcademyRegistrationAttempt" ADD CONSTRAINT "AcademyRegistrationAttempt_academyProgramId_fkey" FOREIGN KEY ("academyProgramId") REFERENCES "AcademyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyRegistrationAttempt" ADD CONSTRAINT "AcademyRegistrationAttempt_academyLearnerId_fkey" FOREIGN KEY ("academyLearnerId") REFERENCES "AcademyLearner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyRegistrationAttempt" ADD CONSTRAINT "AcademyRegistrationAttempt_academyEnrollmentId_fkey" FOREIGN KEY ("academyEnrollmentId") REFERENCES "AcademyProgramEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyRegistrationAttempt" ADD CONSTRAINT "AcademyRegistrationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
