ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'ACADEMY_PROGRAM_ENROLLMENT';

CREATE TYPE "AcademyProgramEnrollmentStatus" AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "AcademyProgramEnrollment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "academyProgramId" UUID NOT NULL,
  "academyLearnerId" UUID NOT NULL,
  "userId" UUID,
  "publicAccessToken" VARCHAR(80) NOT NULL,
  "status" "AcademyProgramEnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "paymentId" UUID,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "seatReservedAt" TIMESTAMP(3),
  "seatReservationExpiresAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "selectedCurrencyCode" VARCHAR(3) NOT NULL,
  "selectedAmountSnapshot" DECIMAL(18, 2) NOT NULL,
  "submittedCountry" VARCHAR(3),
  "lockedCountry" VARCHAR(3),
  "lockedCountrySource" VARCHAR(30),
  "contactFullName" VARCHAR(191) NOT NULL,
  "contactEmail" VARCHAR(191),
  "contactPhone" VARCHAR(50) NOT NULL,
  "contactWhatsapp" VARCHAR(50),
  "contactCountry" VARCHAR(3),
  "contactNotes" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AcademyProgramEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyProgramPaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "academyProgramId" UUID NOT NULL,
  "academyProgramEnrollmentId" UUID NOT NULL,
  "paymentId" UUID,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "amountSubtotal" DECIMAL(18, 2) NOT NULL,
  "amountDiscount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "amountTotal" DECIMAL(18, 2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "providerPaymentRef" VARCHAR(191),
  "providerOrderRef" VARCHAR(191),
  "providerCustomerRef" VARCHAR(191),
  "checkoutUrl" VARCHAR(500),
  "clientSecret" VARCHAR(500),
  "failureReason" VARCHAR(500),
  "expiresAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AcademyProgramPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyProgramEnrollment_publicAccessToken_key" ON "AcademyProgramEnrollment"("publicAccessToken");
CREATE UNIQUE INDEX "AcademyProgramEnrollment_academyProgramId_academyLearnerId_key" ON "AcademyProgramEnrollment"("academyProgramId", "academyLearnerId");
CREATE UNIQUE INDEX "AcademyProgramEnrollment_paymentId_key" ON "AcademyProgramEnrollment"("paymentId");
CREATE INDEX "AcademyProgramEnrollment_academyProgramId_status_registeredAt_idx" ON "AcademyProgramEnrollment"("academyProgramId", "status", "registeredAt");
CREATE INDEX "AcademyProgramEnrollment_academyProgramId_seatReservationExpiresAt_idx" ON "AcademyProgramEnrollment"("academyProgramId", "seatReservationExpiresAt");
CREATE INDEX "AcademyProgramEnrollment_academyLearnerId_status_idx" ON "AcademyProgramEnrollment"("academyLearnerId", "status");
CREATE INDEX "AcademyProgramEnrollment_userId_status_idx" ON "AcademyProgramEnrollment"("userId", "status");
CREATE INDEX "AcademyProgramEnrollment_paymentStatus_idx" ON "AcademyProgramEnrollment"("paymentStatus");
CREATE INDEX "AcademyProgramEnrollment_paymentId_idx" ON "AcademyProgramEnrollment"("paymentId");

CREATE UNIQUE INDEX "AcademyProgramPaymentAttempt_paymentId_key" ON "AcademyProgramPaymentAttempt"("paymentId");
CREATE INDEX "AcademyProgramPaymentAttempt_academyProgramId_status_createdAt_idx" ON "AcademyProgramPaymentAttempt"("academyProgramId", "status", "createdAt");
CREATE INDEX "AcademyProgramPaymentAttempt_academyProgramEnrollmentId_createdAt_idx" ON "AcademyProgramPaymentAttempt"("academyProgramEnrollmentId", "createdAt");
CREATE INDEX "AcademyProgramPaymentAttempt_providerPaymentRef_idx" ON "AcademyProgramPaymentAttempt"("providerPaymentRef");

ALTER TABLE "AcademyProgramEnrollment"
  ADD CONSTRAINT "AcademyProgramEnrollment_academyProgramId_fkey"
  FOREIGN KEY ("academyProgramId") REFERENCES "AcademyProgram"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramEnrollment"
  ADD CONSTRAINT "AcademyProgramEnrollment_academyLearnerId_fkey"
  FOREIGN KEY ("academyLearnerId") REFERENCES "AcademyLearner"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramEnrollment"
  ADD CONSTRAINT "AcademyProgramEnrollment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramEnrollment"
  ADD CONSTRAINT "AcademyProgramEnrollment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramPaymentAttempt"
  ADD CONSTRAINT "AcademyProgramPaymentAttempt_academyProgramId_fkey"
  FOREIGN KEY ("academyProgramId") REFERENCES "AcademyProgram"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramPaymentAttempt"
  ADD CONSTRAINT "AcademyProgramPaymentAttempt_academyProgramEnrollmentId_fkey"
  FOREIGN KEY ("academyProgramEnrollmentId") REFERENCES "AcademyProgramEnrollment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramPaymentAttempt"
  ADD CONSTRAINT "AcademyProgramPaymentAttempt_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
