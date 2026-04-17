DROP TABLE IF EXISTS "AvailabilityException";
DROP TABLE IF EXISTS "AvailabilitySlot";

DROP TYPE IF EXISTS "AvailabilityExceptionSource";
DROP TYPE IF EXISTS "AvailabilityExceptionType";
DROP TYPE IF EXISTS "SlotType";
DROP TYPE IF EXISTS "AvailabilityWeekday";

CREATE TYPE "AvailabilityWeekday" AS ENUM (
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
);

CREATE TYPE "AvailabilityExceptionType" AS ENUM ('BLOCK', 'OPEN_EXTRA');
CREATE TYPE "AvailabilityExceptionSource" AS ENUM ('MANUAL', 'ADMIN', 'SYSTEM');

CREATE TABLE "AvailabilitySlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practitionerId" UUID NOT NULL,
  "weekday" "AvailabilityWeekday" NOT NULL,
  "startMinuteOfDay" INTEGER NOT NULL,
  "endMinuteOfDay" INTEGER NOT NULL,
  "timezone" VARCHAR(50) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" DATE,
  "effectiveTo" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvailabilityException" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practitionerId" UUID NOT NULL,
  "type" "AvailabilityExceptionType" NOT NULL,
  "startsAtUtc" TIMESTAMP(3) NOT NULL,
  "endsAtUtc" TIMESTAMP(3) NOT NULL,
  "reason" VARCHAR(500),
  "source" "AvailabilityExceptionSource" NOT NULL DEFAULT 'MANUAL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvailabilitySlot_practitionerId_weekday_isActive_idx"
ON "AvailabilitySlot"("practitionerId", "weekday", "isActive");

CREATE INDEX "AvailabilitySlot_practitionerId_isActive_idx"
ON "AvailabilitySlot"("practitionerId", "isActive");

CREATE INDEX "AvailabilityException_practitionerId_startsAtUtc_endsAtUtc_idx"
ON "AvailabilityException"("practitionerId", "startsAtUtc", "endsAtUtc");

CREATE INDEX "AvailabilityException_practitionerId_type_isActive_idx"
ON "AvailabilityException"("practitionerId", "type", "isActive");

CREATE INDEX "AvailabilityException_practitionerId_isActive_idx"
ON "AvailabilityException"("practitionerId", "isActive");

ALTER TABLE "AvailabilitySlot"
ADD CONSTRAINT "AvailabilitySlot_practitionerId_fkey"
FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvailabilityException"
ADD CONSTRAINT "AvailabilityException_practitionerId_fkey"
FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
