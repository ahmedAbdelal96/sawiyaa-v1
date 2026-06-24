-- Extend moderation case status lifecycle
ALTER TYPE "ModerationCaseStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ModerationCaseStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_ENFORCEMENT';
ALTER TYPE "ModerationCaseStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "ModerationCaseStatus" ADD VALUE IF NOT EXISTS 'DISMISSED';

-- Extend moderation audit events
ALTER TYPE "ModerationAuditEventType" ADD VALUE IF NOT EXISTS 'CASE_ACTION_EXECUTED';

-- Extend moderation reporter roles for reviewer operations
ALTER TYPE "ModerationReporterRole" ADD VALUE IF NOT EXISTS 'CONTENT_REVIEWER';

-- Create moderation action enum
CREATE TYPE "ModerationCaseActionType" AS ENUM (
  'REVIEW_CASE',
  'PREPARE_ENFORCEMENT',
  'MARK_RESOLVED',
  'DISMISS_CASE'
);

-- Create action record table
CREATE TABLE "ModerationReportAction" (
  "id" UUID NOT NULL,
  "moderationReportId" UUID NOT NULL,
  "actionType" "ModerationCaseActionType" NOT NULL,
  "previousStatus" "ModerationCaseStatus" NOT NULL,
  "nextStatus" "ModerationCaseStatus" NOT NULL,
  "reason" VARCHAR(300),
  "note" VARCHAR(1000),
  "actedByUserId" UUID,
  "actedByRole" "ModerationReporterRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModerationReportAction_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "ModerationReportAction_moderationReportId_createdAt_idx"
ON "ModerationReportAction"("moderationReportId", "createdAt");

CREATE INDEX "ModerationReportAction_actionType_createdAt_idx"
ON "ModerationReportAction"("actionType", "createdAt");

CREATE INDEX "ModerationReportAction_actedByUserId_actedByRole_createdAt_idx"
ON "ModerationReportAction"("actedByUserId", "actedByRole", "createdAt");

-- Add foreign key
ALTER TABLE "ModerationReportAction"
ADD CONSTRAINT "ModerationReportAction_moderationReportId_fkey"
FOREIGN KEY ("moderationReportId") REFERENCES "ModerationReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
