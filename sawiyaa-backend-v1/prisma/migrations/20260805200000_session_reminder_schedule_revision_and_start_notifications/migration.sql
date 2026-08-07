-- Durable session reminder lifecycle hardening.
-- Forward-only: existing queues remain revision 1 and are not deleted.

ALTER TYPE "SessionReminderType" ADD VALUE IF NOT EXISTS 'STARTING_NOW';
ALTER TYPE "SessionReminderType" ADD VALUE IF NOT EXISTS 'LATE_JOIN';
ALTER TYPE "SessionReminderType" ADD VALUE IF NOT EXISTS 'PRE_START';

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "scheduleRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "schedulePolicySnapshotJson" JSONB;

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "joinCloseAt" TIMESTAMP(3);

ALTER TABLE "SessionReminderQueue"
  ADD COLUMN IF NOT EXISTS "offsetMinutesSnapshot" INTEGER;

ALTER TABLE "SessionReminderQueue"
  ADD COLUMN IF NOT EXISTS "scheduleRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "recipientTimezoneSnapshot" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "recipientLocaleSnapshot" VARCHAR(10);

CREATE INDEX IF NOT EXISTS "SessionReminderQueue_sessionId_scheduleRevision_idx"
  ON "SessionReminderQueue"("sessionId", "scheduleRevision");

CREATE INDEX IF NOT EXISTS "SessionReminderQueue_dueAt_scheduleRevision_idx"
  ON "SessionReminderQueue"("dueAt", "scheduleRevision", "sentAt", "cancelledAt");

-- Register the runtime controls in the existing database-config catalog without
-- overwriting any operator-managed value.
INSERT INTO "ConfigKeyCatalog"
  ("id", "key", "slug", "displayName", "description", "configKind", "dataType", "category", "isSensitive", "isRequired", "supportsOverride", "defaultValueJson", "createdAt", "updatedAt")
VALUES
  ('2c24e5d9-6d46-4e28-8f4c-000000000001', 'SESSION_REMINDER_60_MINUTES_ENABLED', 'session-reminder-60-minutes-enabled', 'Session Reminder T-60 Enabled', 'Enable the reminder scheduled one hour before start.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000002', 'SESSION_REMINDER_15_MINUTES_ENABLED', 'session-reminder-15-minutes-enabled', 'Session Reminder T-15 Enabled', 'Enable the reminder scheduled fifteen minutes before start.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000003', 'SESSION_START_REMINDER_ENABLED', 'session-start-reminder-enabled', 'Session Start Reminder Enabled', 'Enable the reminder sent when the session starts.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000004', 'SESSION_LATE_JOIN_REMINDER_ENABLED', 'session-late-join-reminder-enabled', 'Session Late Join Reminder Enabled', 'Enable the targeted reminder after session start.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000005', 'SESSION_LATE_JOIN_REMINDER_MINUTES', 'session-late-join-reminder-minutes', 'Session Late Join Reminder Minutes', 'Delay for the targeted late-join reminder.', 'LIMIT', 'NUMBER', 'NOTIFICATION', false, false, true, '5'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000006', 'SESSION_JOIN_EARLY_MINUTES', 'session-join-early-minutes', 'Session Join Early Minutes', 'Early join window before session start.', 'POLICY', 'NUMBER', 'SESSION', false, false, true, '15'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000007', 'SESSION_JOIN_AFTER_END_GRACE_MINUTES', 'session-join-after-end-grace-minutes', 'Session Join After-End Grace Minutes', 'Post-end reconnect grace window.', 'POLICY', 'NUMBER', 'SESSION', false, false, true, '10'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000008', 'SESSION_REMINDER_OFFSETS_MINUTES', 'session-reminder-offsets-minutes', 'Session Reminder Offsets (Minutes)', 'Unique non-negative offsets before start; zero represents the start reminder.', 'POLICY', 'JSON', 'NOTIFICATION', false, false, true, '[60,15,0]'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000009', 'SESSION_LATE_REMINDER_ENABLED', 'session-late-reminder-enabled', 'Late Session Reminder Enabled', 'Enable the reminder sent after session start when a participant has not joined.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000000a', 'SESSION_LATE_REMINDER_MINUTES_AFTER_START', 'session-late-reminder-minutes-after-start', 'Late Reminder Minutes After Start', 'Positive delay after start for the late reminder.', 'LIMIT', 'NUMBER', 'NOTIFICATION', false, false, true, '5'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000000d', 'SESSION_IN_APP_REMINDERS_ENABLED', 'session-in-app-reminders-enabled', 'In-App Session Reminders Enabled', 'Enable in-app reminder delivery without affecting email.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000000e', 'SESSION_EMAIL_REMINDERS_ENABLED', 'session-email-reminders-enabled', 'Email Session Reminders Enabled', 'Enable email reminder delivery without affecting in-app notifications.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "ConfigValue" ("id", "configKeyId", "scopeType", "priority", "isActive", "valueBoolean", "valueNumber", "valueJson", "updatedAt")
SELECT md5(c."id"::text || ':global')::uuid, c."id", 'GLOBAL', 100, true,
       CASE c."key"
         WHEN 'SESSION_REMINDER_60_MINUTES_ENABLED' THEN true
         WHEN 'SESSION_REMINDER_15_MINUTES_ENABLED' THEN true
         WHEN 'SESSION_START_REMINDER_ENABLED' THEN true
         WHEN 'SESSION_LATE_JOIN_REMINDER_ENABLED' THEN true
         WHEN 'SESSION_LATE_REMINDER_ENABLED' THEN true
         WHEN 'SESSION_IN_APP_REMINDERS_ENABLED' THEN true
         WHEN 'SESSION_EMAIL_REMINDERS_ENABLED' THEN true
         ELSE NULL
       END,
       CASE c."key"
         WHEN 'SESSION_LATE_JOIN_REMINDER_MINUTES' THEN 5
         WHEN 'SESSION_JOIN_EARLY_MINUTES' THEN 15
         WHEN 'SESSION_JOIN_AFTER_END_GRACE_MINUTES' THEN 10
         WHEN 'SESSION_LATE_REMINDER_MINUTES_AFTER_START' THEN 5
         ELSE NULL
       END,
       CASE c."key"
         WHEN 'SESSION_REMINDER_OFFSETS_MINUTES' THEN '[60,15,0]'::jsonb
         ELSE NULL
       END,
       now()
FROM "ConfigKeyCatalog" c
WHERE c."key" IN (
  'SESSION_REMINDER_60_MINUTES_ENABLED',
  'SESSION_REMINDER_15_MINUTES_ENABLED',
  'SESSION_START_REMINDER_ENABLED',
  'SESSION_LATE_JOIN_REMINDER_ENABLED',
  'SESSION_LATE_JOIN_REMINDER_MINUTES',
  'SESSION_JOIN_EARLY_MINUTES',
  'SESSION_JOIN_AFTER_END_GRACE_MINUTES'
  ,'SESSION_REMINDER_OFFSETS_MINUTES'
  ,'SESSION_LATE_REMINDER_ENABLED'
  ,'SESSION_LATE_REMINDER_MINUTES_AFTER_START'
  ,'SESSION_IN_APP_REMINDERS_ENABLED'
  ,'SESSION_EMAIL_REMINDERS_ENABLED'
)
AND NOT EXISTS (
  SELECT 1 FROM "ConfigValue" v
  WHERE v."configKeyId" = c."id" AND v."scopeType" = 'GLOBAL' AND v."scopeRefId" IS NULL
);

-- Seed the two new operational notification types and their localized
-- in-app/email templates. Existing types/templates are preserved.
-- Prisma's uuid() and @updatedAt defaults are client-side in this schema.
-- Supply temporary database defaults so the idempotent SQL seed remains valid.
ALTER TABLE "NotificationType" ALTER COLUMN "id" SET DEFAULT md5(random()::text || clock_timestamp()::text)::uuid;
ALTER TABLE "NotificationType" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NotificationTemplate" ALTER COLUMN "id" SET DEFAULT md5(random()::text || clock_timestamp()::text)::uuid;
ALTER TABLE "NotificationTemplate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NotificationTemplateTranslation" ALTER COLUMN "id" SET DEFAULT md5(random()::text || clock_timestamp()::text)::uuid;
ALTER TABLE "NotificationTemplateTranslation" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
DO $$
DECLARE
  type_id UUID;
  template_id UUID;
BEGIN
  INSERT INTO "NotificationType"
    ("id", "slug", "displayName", "description", "category", "supportsEmail", "supportsPush", "supportsInApp", "createdAt", "updatedAt")
  VALUES ('2c24e5d9-6d46-4e28-8f4c-000000000101', 'sessions.session-starting-now', 'Session Starting Now', 'Reminder sent when a session starts.', 'SESSION', true, true, true, now(), now())
  ON CONFLICT ("slug") DO UPDATE SET "supportsEmail" = true, "supportsPush" = true, "supportsInApp" = true
  RETURNING "id" INTO type_id;
  IF type_id IS NULL THEN SELECT "id" INTO type_id FROM "NotificationType" WHERE "slug" = 'sessions.session-starting-now'; END IF;

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'IN_APP', 'sessions.session-starting-now.in-app.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-starting-now.in-app.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Your session is starting now', 'Your session is starting now. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'جلستك تبدأ الآن', 'جلستك تبدأ الآن. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'EMAIL', 'sessions.session-starting-now.email.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-starting-now.email.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "subjectTemplate", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Your Sawiyaa session is starting now', 'Your session is starting now', 'Your session is starting now. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'جلستك على سوايا تبدأ الآن', 'جلستك تبدأ الآن', 'جلستك تبدأ الآن. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "subjectTemplate" = EXCLUDED."subjectTemplate", "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";

  INSERT INTO "NotificationType"
    ("slug", "displayName", "description", "category", "supportsEmail", "supportsPush", "supportsInApp")
  VALUES ('sessions.session-late-join', 'Session Late Join Reminder', 'Targeted reminder for a participant who has not joined.', 'SESSION', true, true, true)
  ON CONFLICT ("slug") DO UPDATE SET "supportsEmail" = true, "supportsPush" = true, "supportsInApp" = true
  RETURNING "id" INTO type_id;
  IF type_id IS NULL THEN SELECT "id" INTO type_id FROM "NotificationType" WHERE "slug" = 'sessions.session-late-join'; END IF;

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'IN_APP', 'sessions.session-late-join.in-app.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-late-join.in-app.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Your session is waiting for you', 'Your session started a few minutes ago. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'جلستك في انتظارك', 'بدأت جلستك منذ دقائق قليلة. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'EMAIL', 'sessions.session-late-join.email.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-late-join.email.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "subjectTemplate", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Your Sawiyaa session is waiting for you', 'Your session is waiting for you', 'Your session started a few minutes ago. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'جلستك على سوايا في انتظارك', 'جلستك في انتظارك', 'بدأت جلستك منذ دقائق قليلة. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "subjectTemplate" = EXCLUDED."subjectTemplate", "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";

  INSERT INTO "NotificationType"
    ("slug", "displayName", "description", "category", "supportsEmail", "supportsPush", "supportsInApp")
  VALUES ('sessions.session-reminder-before-start', 'Session Reminder Before Start', 'Configurable pre-start session reminder.', 'SESSION', true, true, true)
  ON CONFLICT ("slug") DO UPDATE SET "supportsEmail" = true, "supportsPush" = true, "supportsInApp" = true
  RETURNING "id" INTO type_id;
  IF type_id IS NULL THEN SELECT "id" INTO type_id FROM "NotificationType" WHERE "slug" = 'sessions.session-reminder-before-start'; END IF;

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'IN_APP', 'sessions.session-reminder-before-start.in-app.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-reminder-before-start.in-app.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Session reminder', 'Your session starts in {{offsetMinutes}} minutes.', 'Open session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©', 'Ø³ØªØ¨Ø¯Ø£ Ø¬Ù„Ø³ØªÙƒ Ø®Ù„Ø§Ù„ {{offsetMinutes}} Ø¯Ù‚ÙŠÙ‚Ø©.', 'Ø§ÙØªØ­ Ø§Ù„Ø¬Ù„Ø³Ø©', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";

  INSERT INTO "NotificationTemplate" ("notificationTypeId", "channel", "slug")
  VALUES (type_id, 'EMAIL', 'sessions.session-reminder-before-start.email.v1')
  ON CONFLICT ("slug") DO UPDATE SET "isActive" = true
  RETURNING "id" INTO template_id;
  IF template_id IS NULL THEN SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug" = 'sessions.session-reminder-before-start.email.v1'; END IF;
  INSERT INTO "NotificationTemplateTranslation" ("notificationTemplateId", "locale", "subjectTemplate", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate")
  VALUES
    (template_id, 'en', 'Session reminder', 'Session reminder', 'Your session starts in {{offsetMinutes}} minutes.', 'Open session', '{{appUrl}}{{routePath}}'),
    (template_id, 'ar', 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©', 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©', 'Ø³ØªØ¨Ø¯Ø£ Ø¬Ù„Ø³ØªÙƒ Ø®Ù„Ø§Ù„ {{offsetMinutes}} Ø¯Ù‚ÙŠÙ‚Ø©.', 'Ø§ÙØªØ­ Ø§Ù„Ø¬Ù„Ø³Ø©', '{{appUrl}}{{routePath}}')
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "subjectTemplate" = EXCLUDED."subjectTemplate", "titleTemplate" = EXCLUDED."titleTemplate", "bodyTemplate" = EXCLUDED."bodyTemplate", "ctaLabel" = EXCLUDED."ctaLabel", "ctaUrlTemplate" = EXCLUDED."ctaUrlTemplate";
END $$;

ALTER TABLE "NotificationType" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "NotificationType" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationTemplate" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "NotificationTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationTemplateTranslation" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "NotificationTemplateTranslation" ALTER COLUMN "updatedAt" DROP DEFAULT;
