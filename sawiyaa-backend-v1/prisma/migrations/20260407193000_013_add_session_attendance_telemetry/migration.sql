-- CreateEnum
CREATE TYPE "SessionAttendanceEventType" AS ENUM ('JOINED', 'LEFT');

-- CreateEnum
CREATE TYPE "SessionAttendanceParticipantRole" AS ENUM ('PATIENT', 'PRACTITIONER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "SessionAttendanceEvent" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "provider" "SessionProvider" NOT NULL,
    "attendanceEventType" "SessionAttendanceEventType" NOT NULL,
    "participantRole" "SessionAttendanceParticipantRole" NOT NULL DEFAULT 'UNKNOWN',
    "participantUserId" UUID,
    "providerEventType" VARCHAR(100) NOT NULL,
    "providerEventRef" VARCHAR(191),
    "providerRoomRef" VARCHAR(191),
    "providerParticipantRef" VARCHAR(191),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "ingestionKey" VARCHAR(191) NOT NULL,
    "payloadJson" JSONB,
    "ingestionMetaJson" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionAttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendanceEvent_ingestionKey_key" ON "SessionAttendanceEvent"("ingestionKey");

-- CreateIndex
CREATE INDEX "SessionAttendanceEvent_sessionId_occurredAt_idx" ON "SessionAttendanceEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "SessionAttendanceEvent_provider_providerEventRef_idx" ON "SessionAttendanceEvent"("provider", "providerEventRef");

-- CreateIndex
CREATE INDEX "SessionAttendanceEvent_participantRole_occurredAt_idx" ON "SessionAttendanceEvent"("participantRole", "occurredAt");

-- AddForeignKey
ALTER TABLE "SessionAttendanceEvent" ADD CONSTRAINT "SessionAttendanceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
