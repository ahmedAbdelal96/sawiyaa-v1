-- CreateEnum
CREATE TYPE "ModerationReportTargetType" AS ENUM (
  'CARE_CHAT_CONVERSATION',
  'CARE_CHAT_MESSAGE',
  'REVIEW',
  'ARTICLE',
  'SUPPORT_TICKET',
  'SUPPORT_MESSAGE'
);

-- CreateEnum
CREATE TYPE "ModerationReportReason" AS ENUM (
  'ABUSE',
  'HARASSMENT',
  'SPAM',
  'SCAM',
  'INAPPROPRIATE_CONTENT',
  'PRIVACY_BREACH',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "ModerationReporterRole" AS ENUM (
  'PATIENT',
  'PRACTITIONER',
  'SUPPORT_AGENT',
  'ADMIN'
);

-- CreateEnum
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN');

-- CreateEnum
CREATE TYPE "ModerationAuditEventType" AS ENUM ('REPORT_CREATED');

-- CreateTable
CREATE TABLE "ModerationReport" (
  "id" UUID NOT NULL,
  "targetType" "ModerationReportTargetType" NOT NULL,
  "targetId" UUID NOT NULL,
  "reason" "ModerationReportReason" NOT NULL,
  "note" VARCHAR(1000),
  "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
  "reportedByUserId" UUID,
  "reportedByRole" "ModerationReporterRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationReportAuditEvent" (
  "id" UUID NOT NULL,
  "moderationReportId" UUID NOT NULL,
  "eventType" "ModerationAuditEventType" NOT NULL,
  "actorUserId" UUID,
  "actorRole" "ModerationReporterRole" NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModerationReportAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationReport_targetType_targetId_status_createdAt_idx"
ON "ModerationReport"("targetType", "targetId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReport_reportedByUserId_reportedByRole_createdAt_idx"
ON "ModerationReport"("reportedByUserId", "reportedByRole", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReportAuditEvent_moderationReportId_createdAt_idx"
ON "ModerationReportAuditEvent"("moderationReportId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReportAuditEvent_actorUserId_actorRole_createdAt_idx"
ON "ModerationReportAuditEvent"("actorUserId", "actorRole", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReportAuditEvent_eventType_createdAt_idx"
ON "ModerationReportAuditEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "ModerationReportAuditEvent"
ADD CONSTRAINT "ModerationReportAuditEvent_moderationReportId_fkey"
FOREIGN KEY ("moderationReportId") REFERENCES "ModerationReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

