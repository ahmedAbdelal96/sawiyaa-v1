ALTER TABLE "Course"
ADD COLUMN IF NOT EXISTS "createdByUserId" UUID,
ADD COLUMN IF NOT EXISTS "publishedByUserId" UUID;

ALTER TABLE "CourseSchedule"
ADD COLUMN IF NOT EXISTS "createdByUserId" UUID,
ADD COLUMN IF NOT EXISTS "plannedDurationDays" INTEGER,
ADD COLUMN IF NOT EXISTS "plannedLectureCount" INTEGER;

ALTER TABLE "CourseSession"
ADD COLUMN IF NOT EXISTS "createdByUserId" UUID;

CREATE TABLE IF NOT EXISTS "TrainingEnrollmentPaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId" UUID NOT NULL,
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
  "failedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingEnrollmentPaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingEnrollmentPaymentAttempt_paymentId_key" UNIQUE ("paymentId")
);

UPDATE "CourseSchedule" cs
SET
  "plannedLectureCount" = COALESCE(session_counts.session_count, 1),
  "plannedDurationDays" = COALESCE(
    GREATEST(
      1,
      (DATE_PART('day', COALESCE(cs."endsAt", cs."startsAt") - cs."startsAt")::int + 1)
    ),
    1
  )
FROM (
  SELECT "courseScheduleId", COUNT(*)::int AS session_count
  FROM "CourseSession"
  GROUP BY "courseScheduleId"
) AS session_counts
WHERE cs."id" = session_counts."courseScheduleId"
  AND cs."plannedLectureCount" IS NULL
  AND cs."startsAt" IS NOT NULL
  AND cs."endsAt" IS NOT NULL;

UPDATE "CourseSchedule" cs
SET
  "plannedLectureCount" = 1,
  "plannedDurationDays" = COALESCE(
    GREATEST(
      1,
      (DATE_PART('day', COALESCE(cs."endsAt", cs."startsAt") - cs."startsAt")::int + 1)
    ),
    1
  )
WHERE cs."plannedLectureCount" IS NULL
  AND cs."startsAt" IS NOT NULL
  AND cs."endsAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "CourseSession" s
    WHERE s."courseScheduleId" = cs."id"
  );

INSERT INTO "CourseSession" (
  "id",
  "courseScheduleId",
  "createdByUserId",
  "sessionTitle",
  "sessionOrder",
  "startsAt",
  "endsAt",
  "externalRoomProvider",
  "externalRoomJoinUrl",
  "externalRoomHostUrl",
  "attendanceTrackingEnabled",
  "isMandatory",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  cs."id",
  cs."createdByUserId",
  COALESCE(ct."title", 'Training lecture 1'),
  1,
  cs."startsAt",
  cs."endsAt",
  cs."externalRoomProvider",
  cs."externalRoomJoinUrl",
  cs."externalRoomHostUrl",
  TRUE,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CourseSchedule" cs
LEFT JOIN LATERAL (
  SELECT ct1."title"
  FROM "CourseTranslation" ct1
  WHERE ct1."courseId" = cs."courseId"
  ORDER BY CASE WHEN ct1."locale" = 'ar' THEN 0 ELSE 1 END, ct1."createdAt" ASC
  LIMIT 1
) ct ON TRUE
WHERE cs."startsAt" IS NOT NULL
  AND cs."endsAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "CourseSession" s
    WHERE s."courseScheduleId" = cs."id"
  );

CREATE INDEX IF NOT EXISTS "idx_course_createdByUserId_createdAt"
  ON "Course" ("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_course_publishedByUserId_publishedAt"
  ON "Course" ("publishedByUserId", "publishedAt");

CREATE INDEX IF NOT EXISTS "idx_courseSchedule_createdByUserId_createdAt"
  ON "CourseSchedule" ("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_courseSession_createdByUserId_createdAt"
  ON "CourseSession" ("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_trainingEnrollmentPaymentAttempt_enrollmentId_status_createdAt"
  ON "TrainingEnrollmentPaymentAttempt" ("enrollmentId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_trainingEnrollmentPaymentAttempt_providerPaymentRef"
  ON "TrainingEnrollmentPaymentAttempt" ("providerPaymentRef");

ALTER TABLE "Course"
ADD CONSTRAINT "Course_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Course"
ADD CONSTRAINT "Course_publishedByUserId_fkey"
FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CourseSchedule"
ADD CONSTRAINT "CourseSchedule_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CourseSession"
ADD CONSTRAINT "CourseSession_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrainingEnrollmentPaymentAttempt"
ADD CONSTRAINT "TrainingEnrollmentPaymentAttempt_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingEnrollmentPaymentAttempt"
ADD CONSTRAINT "TrainingEnrollmentPaymentAttempt_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
