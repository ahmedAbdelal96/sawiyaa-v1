-- Store references to chat evidence without copying message history.
CREATE TYPE "ModerationChatType" AS ENUM ('SESSION_CHAT', 'CARE_CHAT', 'GENERAL_CHAT');

ALTER TABLE "ModerationReport"
  ADD COLUMN "conversationId" UUID,
  ADD COLUMN "reportedMessageId" UUID,
  ADD COLUMN "targetUserId" UUID,
  ADD COLUMN "chatType" "ModerationChatType";

ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ModerationReport_reportedMessageId_fkey"
  FOREIGN KEY ("reportedMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ModerationReport_reportedByUserId_fkey"
  FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ModerationReport_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ModerationReport_conversationId_createdAt_idx"
  ON "ModerationReport"("conversationId", "createdAt");
CREATE INDEX "ModerationReport_reportedMessageId_createdAt_idx"
  ON "ModerationReport"("reportedMessageId", "createdAt");
CREATE INDEX "ModerationReport_targetUserId_createdAt_idx"
  ON "ModerationReport"("targetUserId", "createdAt");

ALTER TYPE "ModerationCaseActionType" ADD VALUE IF NOT EXISTS 'ENFORCE_USER_WARNING';
ALTER TYPE "ModerationCaseActionType" ADD VALUE IF NOT EXISTS 'ENFORCE_USER_RESTRICTION';
ALTER TYPE "ModerationCaseActionType" ADD VALUE IF NOT EXISTS 'ENFORCE_USER_SUSPENSION';

CREATE TYPE "ModerationUserEnforcementType" AS ENUM ('WARNING', 'RESTRICTION', 'SUSPENSION');

CREATE TABLE "ModerationUserEnforcement" (
  "id" UUID NOT NULL,
  "targetUserId" UUID NOT NULL,
  "moderationReportId" UUID NOT NULL,
  "actedByUserId" UUID NOT NULL,
  "type" "ModerationUserEnforcementType" NOT NULL,
  "reason" VARCHAR(300),
  "note" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationUserEnforcement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ModerationUserEnforcement"
  ADD CONSTRAINT "ModerationUserEnforcement_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ModerationUserEnforcement_moderationReportId_fkey" FOREIGN KEY ("moderationReportId") REFERENCES "ModerationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ModerationUserEnforcement_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ModerationUserEnforcement_targetUserId_createdAt_idx" ON "ModerationUserEnforcement"("targetUserId", "createdAt");
CREATE INDEX "ModerationUserEnforcement_moderationReportId_createdAt_idx" ON "ModerationUserEnforcement"("moderationReportId", "createdAt");
CREATE INDEX "ModerationUserEnforcement_type_createdAt_idx" ON "ModerationUserEnforcement"("type", "createdAt");

-- Ensure moderation notifications work on deployments that do not run the full seed.
INSERT INTO "NotificationType" ("id", "slug", "displayName", "description", "category", "defaultEnabled", "supportsEmail", "supportsSms", "supportsPush", "supportsInApp", "isMandatory", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'moderation.report-created', 'Moderation Report Created', 'Notification for authorized moderation reviewers', 'SECURITY', true, false, false, false, true, false, now(), now()),
  (gen_random_uuid(), 'moderation.report-reviewed', 'Moderation Report Reviewed', 'Safe notification to the report creator after review', 'SECURITY', true, false, false, false, true, false, now(), now())
ON CONFLICT ("slug") DO UPDATE SET "supportsInApp" = EXCLUDED."supportsInApp", "defaultEnabled" = true, "updatedAt" = now();

INSERT INTO "NotificationTemplate" ("id", "notificationTypeId", "channel", "slug", "isActive", "isSystemTemplate", "version", "createdAt", "updatedAt")
SELECT gen_random_uuid(), nt."id", 'IN_APP', nt."slug" || '.in-app.v1', true, true, 1, now(), now()
FROM "NotificationType" nt
WHERE nt."slug" IN ('moderation.report-created', 'moderation.report-reviewed')
  AND NOT EXISTS (
    SELECT 1 FROM "NotificationTemplate" t WHERE t."slug" = nt."slug" || '.in-app.v1'
  );

INSERT INTO "NotificationTemplateTranslation" ("id", "notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t."id", v."locale", v."title", v."body", now(), now()
FROM "NotificationTemplate" t
JOIN (VALUES
  ('moderation.report-created.in-app.v1', 'en', 'New moderation report', 'A new report is ready for authorized review.'),
  ('moderation.report-created.in-app.v1', 'ar', 'بلاغ إشراف جديد', 'يوجد بلاغ جديد يحتاج إلى مراجعة من الفريق المختص.'),
  ('moderation.report-reviewed.in-app.v1', 'en', 'Report reviewed', 'Your report has been reviewed by the moderation team.'),
  ('moderation.report-reviewed.in-app.v1', 'ar', 'تمت مراجعة البلاغ', 'تمت مراجعة البلاغ من فريق الإشراف.')
) AS v("slug", "locale", "title", "body") ON v."slug" = t."slug"
WHERE NOT EXISTS (
  SELECT 1 FROM "NotificationTemplateTranslation" tt
  WHERE tt."notificationTemplateId" = t."id" AND tt."locale" = v."locale"
);
