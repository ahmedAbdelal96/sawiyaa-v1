-- Forward-only persistence for safe schedule repetition and idempotent retries.
CREATE TYPE "AvailabilityScheduleRepeatOperationStatus" AS ENUM ('PREVIEWED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

CREATE TABLE "AvailabilityScheduleRepeatOperation" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "sourceWeekId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "requestFingerprint" VARCHAR(128) NOT NULL,
    "sourceFingerprint" VARCHAR(128) NOT NULL,
    "selectedTargetWeekDates" JSONB NOT NULL,
    "previewPayload" JSONB,
    "resultPayload" JSONB,
    "safeErrorMetadata" JSONB,
    "status" "AvailabilityScheduleRepeatOperationStatus" NOT NULL DEFAULT 'PREVIEWED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AvailabilityScheduleRepeatOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvailabilityScheduleRepeatOperation_practitionerId_idempotencyKey_key"
ON "AvailabilityScheduleRepeatOperation"("practitionerId", "idempotencyKey");
CREATE INDEX "AvailabilityScheduleRepeatOperation_practitionerId_createdAt_idx"
ON "AvailabilityScheduleRepeatOperation"("practitionerId", "createdAt");
CREATE INDEX "AvailabilityScheduleRepeatOperation_sourceWeekId_idx"
ON "AvailabilityScheduleRepeatOperation"("sourceWeekId");

ALTER TABLE "AvailabilityScheduleRepeatOperation"
ADD CONSTRAINT "AvailabilityScheduleRepeatOperation_practitionerId_fkey"
FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvailabilityScheduleRepeatOperation"
ADD CONSTRAINT "AvailabilityScheduleRepeatOperation_sourceWeekId_fkey"
FOREIGN KEY ("sourceWeekId") REFERENCES "PractitionerAvailabilityWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
