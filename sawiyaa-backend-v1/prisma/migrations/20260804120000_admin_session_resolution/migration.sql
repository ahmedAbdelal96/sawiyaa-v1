ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'AWAITING_ADMIN_RESOLUTION';
CREATE TYPE "SessionResolutionCaseStatus" AS ENUM ('OPEN', 'EXECUTED', 'CANCELLED');
CREATE TYPE "SessionResolutionPatientRemedy" AS ENUM ('KEEP_ORIGINAL', 'RESTORE_PACKAGE', 'CREDIT_WALLET', 'CREATE_REPLACEMENT_SESSION');
CREATE TYPE "SessionResolutionPractitionerRemedy" AS ENUM ('NO_EARNING', 'CREATE_EARNING_REVIEW');
CREATE TYPE "SessionFundingSource" AS ENUM ('ORIGINAL', 'ADMIN_REPLACEMENT');

ALTER TABLE "Session" ADD COLUMN "fundingSource" "SessionFundingSource" NOT NULL DEFAULT 'ORIGINAL';
ALTER TABLE "Session" ADD COLUMN "originalSessionId" UUID;
CREATE INDEX "Session_originalSessionId_idx" ON "Session"("originalSessionId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_originalSessionId_fkey" FOREIGN KEY ("originalSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SessionResolutionCase" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "status" "SessionResolutionCaseStatus" NOT NULL DEFAULT 'OPEN',
  "suggestedOutcome" "SessionStatus" NOT NULL,
  "suggestedPatientRemedy" "SessionResolutionPatientRemedy" NOT NULL,
  "suggestedPractitionerRemedy" "SessionResolutionPractitionerRemedy" NOT NULL,
  "evidenceSnapshotJson" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionResolutionCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionResolutionCase_sessionId_key" ON "SessionResolutionCase"("sessionId");
CREATE INDEX "SessionResolutionCase_status_openedAt_idx" ON "SessionResolutionCase"("status", "openedAt");
CREATE INDEX "SessionResolutionCase_suggestedOutcome_status_idx" ON "SessionResolutionCase"("suggestedOutcome", "status");
ALTER TABLE "SessionResolutionCase" ADD CONSTRAINT "SessionResolutionCase_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SessionResolution" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "attendanceOutcome" "SessionStatus" NOT NULL,
  "patientRemedy" "SessionResolutionPatientRemedy" NOT NULL,
  "practitionerRemedy" "SessionResolutionPractitionerRemedy" NOT NULL,
  "reasonCode" VARCHAR(100) NOT NULL,
  "adminNotes" VARCHAR(2000) NOT NULL,
  "actedByAdminId" UUID NOT NULL,
  "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" VARCHAR(191) NOT NULL,
  "evidenceSnapshotJson" JSONB NOT NULL,
  "effectsSnapshotJson" JSONB NOT NULL,
  "replacementSessionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionResolution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionResolution_requestId_key" ON "SessionResolution"("requestId");
CREATE UNIQUE INDEX "SessionResolution_replacementSessionId_key" ON "SessionResolution"("replacementSessionId");
CREATE INDEX "SessionResolution_sessionId_actedAt_idx" ON "SessionResolution"("sessionId", "actedAt");
CREATE INDEX "SessionResolution_actedByAdminId_actedAt_idx" ON "SessionResolution"("actedByAdminId", "actedAt");
ALTER TABLE "SessionResolution" ADD CONSTRAINT "SessionResolution_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SessionResolutionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionResolution" ADD CONSTRAINT "SessionResolution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionResolution" ADD CONSTRAINT "SessionResolution_actedByAdminId_fkey" FOREIGN KEY ("actedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionResolution" ADD CONSTRAINT "SessionResolution_replacementSessionId_fkey" FOREIGN KEY ("replacementSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
