CREATE TYPE "SessionReconciliationStatus" AS ENUM ('CONFIRMED', 'PARTIAL', 'UNAVAILABLE', 'FAILED', 'NOT_FOUND');
CREATE TYPE "SessionReconciliationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNTRUSTED');

CREATE TABLE "SessionOutcomePolicySnapshot" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "completionOverlapPercent" INTEGER NOT NULL,
    "minimumOverlapMinutes" INTEGER NOT NULL,
    "patientNoShowGraceMinutes" INTEGER NOT NULL,
    "practitionerNoShowGraceMinutes" INTEGER NOT NULL,
    "finalizationGraceMinutes" INTEGER NOT NULL,
    "lateEvidenceWaitingMinutes" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionOutcomePolicySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessionAttendanceReconciliation" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "provider" "SessionProvider" NOT NULL,
    "observationVersion" INTEGER NOT NULL,
    "status" "SessionReconciliationStatus" NOT NULL,
    "roomFound" BOOLEAN NOT NULL,
    "meetingStarted" BOOLEAN,
    "meetingEnded" BOOLEAN,
    "patientIdentityConfirmed" BOOLEAN NOT NULL,
    "patientJoined" BOOLEAN NOT NULL,
    "patientTotalPresenceSeconds" INTEGER NOT NULL,
    "patientFirstJoinedAt" TIMESTAMP(3),
    "patientLastLeftAt" TIMESTAMP(3),
    "practitionerIdentityConfirmed" BOOLEAN NOT NULL,
    "practitionerJoined" BOOLEAN NOT NULL,
    "practitionerTotalPresenceSeconds" INTEGER NOT NULL,
    "practitionerFirstJoinedAt" TIMESTAMP(3),
    "practitionerLastLeftAt" TIMESTAMP(3),
    "unknownParticipantCount" INTEGER NOT NULL,
    "providerMeetingId" VARCHAR(191),
    "reconciledAt" TIMESTAMP(3) NOT NULL,
    "providerDataObservedUntil" TIMESTAMP(3),
    "confidence" "SessionReconciliationConfidence" NOT NULL,
    "reasonCodesJson" JSONB NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "requestStatus" VARCHAR(40) NOT NULL,
    "failureCategory" VARCHAR(100),
    "eligibleForAutomaticFinalization" BOOLEAN NOT NULL,
    "evaluationStale" BOOLEAN NOT NULL DEFAULT false,
    "staleReason" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionAttendanceReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionOutcomePolicySnapshot_sessionId_key" ON "SessionOutcomePolicySnapshot"("sessionId");
CREATE INDEX "SessionOutcomePolicySnapshot_capturedAt_idx" ON "SessionOutcomePolicySnapshot"("capturedAt");
CREATE UNIQUE INDEX "SessionAttendanceReconciliation_sessionId_provider_observationVersion_key" ON "SessionAttendanceReconciliation"("sessionId", "provider", "observationVersion");
CREATE INDEX "SessionAttendanceReconciliation_sessionId_createdAt_idx" ON "SessionAttendanceReconciliation"("sessionId", "createdAt");
CREATE INDEX "SessionAttendanceReconciliation_status_reconciledAt_idx" ON "SessionAttendanceReconciliation"("status", "reconciledAt");
CREATE INDEX "SessionAttendanceReconciliation_eligibleForAutomaticFinalization_reconciledAt_idx" ON "SessionAttendanceReconciliation"("eligibleForAutomaticFinalization", "reconciledAt");

ALTER TABLE "SessionOutcomePolicySnapshot" ADD CONSTRAINT "SessionOutcomePolicySnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendanceReconciliation" ADD CONSTRAINT "SessionAttendanceReconciliation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionOutcomePolicySnapshot" ADD CONSTRAINT "SessionOutcomePolicySnapshot_values_check" CHECK (
  "version" > 0 AND "completionOverlapPercent" BETWEEN 0 AND 100 AND
  "minimumOverlapMinutes" >= 0 AND "patientNoShowGraceMinutes" >= 0 AND
  "practitionerNoShowGraceMinutes" >= 0 AND "finalizationGraceMinutes" >= 0 AND
  "lateEvidenceWaitingMinutes" >= 0
);
ALTER TABLE "SessionAttendanceReconciliation" ADD CONSTRAINT "SessionAttendanceReconciliation_values_check" CHECK (
  "observationVersion" > 0 AND "patientTotalPresenceSeconds" >= 0 AND
  "practitionerTotalPresenceSeconds" >= 0 AND "unknownParticipantCount" >= 0 AND
  "attemptNumber" > 0
);
