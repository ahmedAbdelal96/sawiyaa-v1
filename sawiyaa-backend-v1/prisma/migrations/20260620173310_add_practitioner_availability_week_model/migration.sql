-- CreateEnum
CREATE TYPE "AvailabilityWeekStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "AvailabilityException" ADD COLUMN     "availabilityWeekId" UUID;

-- CreateTable
CREATE TABLE "PractitionerAvailabilityWeek" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "status" "AvailabilityWeekStatus" NOT NULL DEFAULT 'DRAFT',
    "copiedFromWeekId" UUID,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerAvailabilityWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerAvailabilityWeekSlot" (
    "id" UUID NOT NULL,
    "weekId" UUID NOT NULL,
    "weekday" "AvailabilityWeekday" NOT NULL,
    "startMinuteOfDay" INTEGER NOT NULL,
    "endMinuteOfDay" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerAvailabilityWeekSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PractitionerAvailabilityWeek_practitionerId_status_weekStar_idx" ON "PractitionerAvailabilityWeek"("practitionerId", "status", "weekStartDate");

-- CreateIndex
CREATE INDEX "PractitionerAvailabilityWeek_status_weekStartDate_idx" ON "PractitionerAvailabilityWeek"("status", "weekStartDate");

-- CreateIndex
CREATE INDEX "PractitionerAvailabilityWeek_copiedFromWeekId_idx" ON "PractitionerAvailabilityWeek"("copiedFromWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_practitioner_availability_week" ON "PractitionerAvailabilityWeek"("practitionerId", "weekStartDate");

-- CreateIndex
CREATE INDEX "PractitionerAvailabilityWeekSlot_weekId_weekday_startMinute_idx" ON "PractitionerAvailabilityWeekSlot"("weekId", "weekday", "startMinuteOfDay");

-- CreateIndex
CREATE INDEX "PractitionerAvailabilityWeekSlot_weekId_weekday_durationMin_idx" ON "PractitionerAvailabilityWeekSlot"("weekId", "weekday", "durationMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "uq_practitioner_availability_week_slot" ON "PractitionerAvailabilityWeekSlot"("weekId", "weekday", "startMinuteOfDay", "endMinuteOfDay");

-- CreateIndex
CREATE INDEX "AvailabilityException_availabilityWeekId_startsAtUtc_endsAt_idx" ON "AvailabilityException"("availabilityWeekId", "startsAtUtc", "endsAtUtc");

-- CreateIndex
CREATE INDEX "AvailabilityException_availabilityWeekId_type_isActive_idx" ON "AvailabilityException"("availabilityWeekId", "type", "isActive");

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_availabilityWeekId_fkey" FOREIGN KEY ("availabilityWeekId") REFERENCES "PractitionerAvailabilityWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerAvailabilityWeek" ADD CONSTRAINT "PractitionerAvailabilityWeek_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerAvailabilityWeek" ADD CONSTRAINT "PractitionerAvailabilityWeek_copiedFromWeekId_fkey" FOREIGN KEY ("copiedFromWeekId") REFERENCES "PractitionerAvailabilityWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerAvailabilityWeekSlot" ADD CONSTRAINT "PractitionerAvailabilityWeekSlot_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "PractitionerAvailabilityWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
