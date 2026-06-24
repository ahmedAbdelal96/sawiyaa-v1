-- CreateEnum
CREATE TYPE "AcademyEnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "AcademyCourse" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "shortDescription" VARCHAR(1000),
    "fullDescription" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "CourseVisibility" NOT NULL DEFAULT 'PUBLIC',
    "coverImageUrl" VARCHAR(500),
    "thumbnailUrl" VARCHAR(500),
    "priceAmount" DECIMAL(18,2),
    "currencyCode" VARCHAR(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "meetingUrl" VARCHAR(500),
    "whatsappGroupUrl" VARCHAR(500),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyLearner" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(191) NOT NULL,
    "phoneNumber" VARCHAR(50) NOT NULL,
    "whatsappNumber" VARCHAR(50),
    "email" VARCHAR(191),
    "countryCode" VARCHAR(10),
    "sourceLabel" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyLearner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEnrollment" (
    "id" UUID NOT NULL,
    "academyCourseId" UUID NOT NULL,
    "academyLearnerId" UUID NOT NULL,
    "publicAccessToken" VARCHAR(80) NOT NULL,
    "enrollmentStatus" "AcademyEnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" VARCHAR(50),
    "paymentId" UUID,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failedReason" VARCHAR(500),
    "notesInternal" VARCHAR(1000),

    CONSTRAINT "AcademyEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyPaymentAttempt" (
    "id" UUID NOT NULL,
    "academyCourseId" UUID NOT NULL,
    "academyEnrollmentId" UUID NOT NULL,
    "paymentId" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountSubtotal" DECIMAL(18,2) NOT NULL,
    "amountDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "providerPaymentRef" VARCHAR(191),
    "providerOrderRef" VARCHAR(191),
    "providerCustomerRef" VARCHAR(191),
    "checkoutUrl" VARCHAR(500),
    "clientSecret" VARCHAR(500),
    "failureReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEnrollmentActivityLog" (
    "id" UUID NOT NULL,
    "academyCourseId" UUID NOT NULL,
    "academyEnrollmentId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "note" VARCHAR(1000),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyEnrollmentActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyCourse_slug_key" ON "AcademyCourse"("slug");

-- CreateIndex
CREATE INDEX "AcademyCourse_status_visibility_publishedAt_idx" ON "AcademyCourse"("status", "visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "AcademyCourse_startsAt_endsAt_idx" ON "AcademyCourse"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLearner_phoneNumber_key" ON "AcademyLearner"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLearner_whatsappNumber_key" ON "AcademyLearner"("whatsappNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLearner_email_key" ON "AcademyLearner"("email");

-- CreateIndex
CREATE INDEX "AcademyLearner_fullName_idx" ON "AcademyLearner"("fullName");

-- CreateIndex
CREATE INDEX "AcademyLearner_sourceLabel_idx" ON "AcademyLearner"("sourceLabel");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyEnrollment_publicAccessToken_key" ON "AcademyEnrollment"("publicAccessToken");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_academyCourseId_enrollmentStatus_register_idx" ON "AcademyEnrollment"("academyCourseId", "enrollmentStatus", "registeredAt");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_academyLearnerId_enrollmentStatus_idx" ON "AcademyEnrollment"("academyLearnerId", "enrollmentStatus");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_paymentStatus_idx" ON "AcademyEnrollment"("paymentStatus");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_paymentId_idx" ON "AcademyEnrollment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyEnrollment_academyCourseId_academyLearnerId_key" ON "AcademyEnrollment"("academyCourseId", "academyLearnerId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyEnrollment_paymentId_key" ON "AcademyEnrollment"("paymentId");

-- CreateIndex
CREATE INDEX "AcademyPaymentAttempt_academyCourseId_status_createdAt_idx" ON "AcademyPaymentAttempt"("academyCourseId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyPaymentAttempt_academyEnrollmentId_createdAt_idx" ON "AcademyPaymentAttempt"("academyEnrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyPaymentAttempt_providerPaymentRef_idx" ON "AcademyPaymentAttempt"("providerPaymentRef");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyPaymentAttempt_paymentId_key" ON "AcademyPaymentAttempt"("paymentId");

-- CreateIndex
CREATE INDEX "AcademyEnrollmentActivityLog_academyCourseId_createdAt_idx" ON "AcademyEnrollmentActivityLog"("academyCourseId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyEnrollmentActivityLog_academyEnrollmentId_createdAt_idx" ON "AcademyEnrollmentActivityLog"("academyEnrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyEnrollmentActivityLog_action_createdAt_idx" ON "AcademyEnrollmentActivityLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_academyCourseId_fkey" FOREIGN KEY ("academyCourseId") REFERENCES "AcademyCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_academyLearnerId_fkey" FOREIGN KEY ("academyLearnerId") REFERENCES "AcademyLearner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyPaymentAttempt" ADD CONSTRAINT "AcademyPaymentAttempt_academyCourseId_fkey" FOREIGN KEY ("academyCourseId") REFERENCES "AcademyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyPaymentAttempt" ADD CONSTRAINT "AcademyPaymentAttempt_academyEnrollmentId_fkey" FOREIGN KEY ("academyEnrollmentId") REFERENCES "AcademyEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyPaymentAttempt" ADD CONSTRAINT "AcademyPaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollmentActivityLog" ADD CONSTRAINT "AcademyEnrollmentActivityLog_academyCourseId_fkey" FOREIGN KEY ("academyCourseId") REFERENCES "AcademyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollmentActivityLog" ADD CONSTRAINT "AcademyEnrollmentActivityLog_academyEnrollmentId_fkey" FOREIGN KEY ("academyEnrollmentId") REFERENCES "AcademyEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
