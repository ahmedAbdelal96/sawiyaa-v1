-- Complete the durable session schedule-policy storage after the original
-- revision migration. This migration is intentionally idempotent because
-- local environments may have the revision column while missing the rest.

ALTER TYPE "SessionReminderType" ADD VALUE IF NOT EXISTS 'PRE_START';

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "schedulePolicySnapshotJson" JSONB,
  ADD COLUMN IF NOT EXISTS "joinCloseAt" TIMESTAMP(3);

ALTER TABLE "SessionReminderQueue"
  ADD COLUMN IF NOT EXISTS "offsetMinutesSnapshot" INTEGER;

CREATE INDEX IF NOT EXISTS "SessionReminderQueue_sessionId_scheduleRevision_idx"
  ON "SessionReminderQueue"("sessionId", "scheduleRevision");
CREATE INDEX IF NOT EXISTS "SessionReminderQueue_dueAt_scheduleRevision_idx"
  ON "SessionReminderQueue"("dueAt", "scheduleRevision", "sentAt", "cancelledAt");

INSERT INTO "ConfigKeyCatalog"
  ("id", "key", "slug", "displayName", "description", "configKind", "dataType", "category", "isSensitive", "isRequired", "supportsOverride", "defaultValueJson", "createdAt", "updatedAt")
VALUES
  ('2c24e5d9-6d46-4e28-8f4c-000000000108', 'SESSION_REMINDER_OFFSETS_MINUTES', 'session-reminder-offsets-minutes', 'Session Reminder Offsets (Minutes)', 'Unique non-negative offsets before start; zero represents the start reminder.', 'POLICY', 'JSON', 'NOTIFICATION', false, false, true, '[60,15,0]'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000109', 'SESSION_LATE_REMINDER_ENABLED', 'session-late-reminder-enabled', 'Late Session Reminder Enabled', 'Enable the reminder sent after session start when a participant has not joined.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000010a', 'SESSION_LATE_REMINDER_MINUTES_AFTER_START', 'session-late-reminder-minutes-after-start', 'Late Reminder Minutes After Start', 'Positive delay after start for the late reminder.', 'LIMIT', 'NUMBER', 'NOTIFICATION', false, false, true, '5'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000010b', 'SESSION_IN_APP_REMINDERS_ENABLED', 'session-in-app-reminders-enabled', 'In-App Session Reminders Enabled', 'Enable in-app reminder delivery without affecting email.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-00000000010c', 'SESSION_EMAIL_REMINDERS_ENABLED', 'session-email-reminders-enabled', 'Email Session Reminders Enabled', 'Enable email reminder delivery without affecting in-app notifications.', 'FEATURE_DEFAULT', 'BOOLEAN', 'NOTIFICATION', false, false, true, 'true'::jsonb, now(), now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "ConfigValue"
  ("id", "configKeyId", "scopeType", "priority", "isActive", "valueBoolean", "valueNumber", "valueJson", "createdAt", "updatedAt")
SELECT md5(c."id"::text || ':global')::uuid, c."id", 'GLOBAL', 100, true,
  CASE c."key"
    WHEN 'SESSION_LATE_REMINDER_ENABLED' THEN true
    WHEN 'SESSION_IN_APP_REMINDERS_ENABLED' THEN true
    WHEN 'SESSION_EMAIL_REMINDERS_ENABLED' THEN true
    ELSE NULL
  END,
  CASE c."key"
    WHEN 'SESSION_LATE_REMINDER_MINUTES_AFTER_START' THEN 5
    ELSE NULL
  END,
  CASE c."key"
    WHEN 'SESSION_REMINDER_OFFSETS_MINUTES' THEN '[60,15,0]'::jsonb
    ELSE NULL
  END,
  now(), now()
FROM "ConfigKeyCatalog" c
WHERE c."key" IN (
  'SESSION_REMINDER_OFFSETS_MINUTES',
  'SESSION_LATE_REMINDER_ENABLED',
  'SESSION_LATE_REMINDER_MINUTES_AFTER_START',
  'SESSION_IN_APP_REMINDERS_ENABLED',
  'SESSION_EMAIL_REMINDERS_ENABLED'
)
AND NOT EXISTS (
  SELECT 1 FROM "ConfigValue" v
  WHERE v."configKeyId" = c."id" AND v."scopeType" = 'GLOBAL' AND v."scopeRefId" IS NULL
);

-- Legacy sessions receive one immutable revision-1 snapshot during the
-- migration. Future bookings and reschedules snapshot through the service.
WITH cfg AS (
  SELECT
    COALESCE((SELECT v."valueJson" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_REMINDER_OFFSETS_MINUTES' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), '[60,15,0]'::jsonb) AS offsets,
    COALESCE((SELECT v."valueBoolean" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_LATE_REMINDER_ENABLED' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), true) AS late_enabled,
    COALESCE((SELECT v."valueNumber" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_LATE_REMINDER_MINUTES_AFTER_START' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), 5) AS late_minutes,
    COALESCE((SELECT v."valueNumber" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_JOIN_EARLY_MINUTES' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), 15) AS join_early,
    COALESCE((SELECT v."valueNumber" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_JOIN_AFTER_END_GRACE_MINUTES' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), 10) AS join_grace,
    COALESCE((SELECT v."valueBoolean" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_IN_APP_REMINDERS_ENABLED' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), true) AS in_app,
    COALESCE((SELECT v."valueBoolean" FROM "ConfigValue" v JOIN "ConfigKeyCatalog" c ON c."id"=v."configKeyId" WHERE c."key"='SESSION_EMAIL_REMINDERS_ENABLED' AND v."scopeType"='GLOBAL' AND v."isActive" ORDER BY v."priority" DESC LIMIT 1), true) AS email
)
UPDATE "Session" s
SET
  "joinOpenAt" = s."scheduledStartAt" - (cfg.join_early * interval '1 minute'),
  "joinCloseAt" = s."scheduledEndAt" + (cfg.join_grace * interval '1 minute'),
  "schedulePolicySnapshotJson" = jsonb_build_object(
    'version', 1,
    'scheduleRevision', s."scheduleRevision",
    'capturedAt', now(),
    'reminder', jsonb_build_object(
      'reminderOffsetsMinutes', cfg.offsets,
      'lateReminderEnabled', cfg.late_enabled,
      'lateReminderMinutesAfterStart', cfg.late_minutes,
      'inAppRemindersEnabled', cfg.in_app,
      'emailRemindersEnabled', cfg.email
    ),
    'join', jsonb_build_object(
      'joinEarlyMinutes', cfg.join_early,
      'joinAfterEndGraceMinutes', cfg.join_grace
    )
  )
FROM cfg
WHERE s."schedulePolicySnapshotJson" IS NULL
  AND s."scheduledStartAt" IS NOT NULL
  AND s."scheduledEndAt" IS NOT NULL;

DO $$
DECLARE
  type_id UUID;
  template_id UUID;
BEGIN
  INSERT INTO "NotificationType"
    ("id", "slug", "displayName", "description", "category", "defaultEnabled", "supportsEmail", "supportsPush", "supportsInApp", "isMandatory", "createdAt", "updatedAt")
  VALUES
    ('2c24e5d9-6d46-4e28-8f4c-000000000111', 'sessions.session-starting-now', 'Session Starting Now', 'Reminder sent when a session starts.', 'SESSION', true, true, true, true, false, now(), now()),
    ('2c24e5d9-6d46-4e28-8f4c-000000000112', 'sessions.session-late-join', 'Session Late Reminder', 'Reminder sent after session start when a participant has not joined.', 'SESSION', true, true, true, true, false, now(), now()),
    ('2c24e5d9-6d46-4e28-8f4c-000000000113', 'sessions.session-reminder-before-start', 'Session Reminder Before Start', 'Configurable reminder sent before a session starts.', 'SESSION', true, true, true, true, false, now(), now())
  ON CONFLICT ("slug") DO UPDATE SET "supportsEmail" = true, "supportsPush" = true, "supportsInApp" = true, "updatedAt" = now();

  FOR type_id IN SELECT "id" FROM "NotificationType" WHERE "slug" IN ('sessions.session-starting-now', 'sessions.session-late-join', 'sessions.session-reminder-before-start') LOOP
    INSERT INTO "NotificationTemplate" ("id", "notificationTypeId", "channel", "slug", "isActive", "isSystemTemplate", "version", "createdAt", "updatedAt")
    VALUES
      (md5(type_id::text || ':in-app')::uuid, type_id, 'IN_APP', (SELECT "slug" FROM "NotificationType" WHERE "id"=type_id) || '.in-app.v1', true, true, 1, now(), now()),
      (md5(type_id::text || ':email')::uuid, type_id, 'EMAIL', (SELECT "slug" FROM "NotificationType" WHERE "id"=type_id) || '.email.v1', true, true, 1, now(), now())
    ON CONFLICT ("slug") DO UPDATE SET "isActive" = true, "updatedAt" = now();
  END LOOP;

  SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug"='sessions.session-starting-now.in-app.v1';
  INSERT INTO "NotificationTemplateTranslation" ("id", "notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate", "createdAt", "updatedAt")
  VALUES
    (md5(template_id::text || ':en')::uuid, template_id, 'en', 'Your session is starting now', 'Your session is starting now. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}', now(), now()),
    (md5(template_id::text || ':ar')::uuid, template_id, 'ar', 'جلستك تبدأ الآن', 'جلستك تبدأ الآن. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}', now(), now())
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate"=EXCLUDED."titleTemplate", "bodyTemplate"=EXCLUDED."bodyTemplate", "ctaLabel"=EXCLUDED."ctaLabel", "ctaUrlTemplate"=EXCLUDED."ctaUrlTemplate", "updatedAt"=now();

  SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug"='sessions.session-late-join.in-app.v1';
  INSERT INTO "NotificationTemplateTranslation" ("id", "notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate", "createdAt", "updatedAt")
  VALUES
    (md5(template_id::text || ':en')::uuid, template_id, 'en', 'Your session is waiting for you', 'Your session started a few minutes ago. Open Sawiyaa to join securely.', 'Join session', '{{appUrl}}{{routePath}}', now(), now()),
    (md5(template_id::text || ':ar')::uuid, template_id, 'ar', 'جلستك في انتظارك', 'بدأت جلستك منذ دقائق قليلة. افتح سوايا للانضمام بشكل آمن.', 'انضم للجلسة', '{{appUrl}}{{routePath}}', now(), now())
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate"=EXCLUDED."titleTemplate", "bodyTemplate"=EXCLUDED."bodyTemplate", "ctaLabel"=EXCLUDED."ctaLabel", "ctaUrlTemplate"=EXCLUDED."ctaUrlTemplate", "updatedAt"=now();

  SELECT "id" INTO template_id FROM "NotificationTemplate" WHERE "slug"='sessions.session-reminder-before-start.in-app.v1';
  INSERT INTO "NotificationTemplateTranslation" ("id", "notificationTemplateId", "locale", "titleTemplate", "bodyTemplate", "ctaLabel", "ctaUrlTemplate", "createdAt", "updatedAt")
  VALUES
    (md5(template_id::text || ':en')::uuid, template_id, 'en', 'Session reminder', 'Your session starts in {{offsetMinutes}} minutes.', 'Open session', '{{appUrl}}{{routePath}}', now(), now()),
    (md5(template_id::text || ':ar')::uuid, template_id, 'ar', 'تذكير بموعد الجلسة', 'ستبدأ جلستك بعد {{offsetMinutes}} دقيقة.', 'افتح الجلسة', '{{appUrl}}{{routePath}}', now(), now())
  ON CONFLICT ("notificationTemplateId", "locale") DO UPDATE SET "titleTemplate"=EXCLUDED."titleTemplate", "bodyTemplate"=EXCLUDED."bodyTemplate", "ctaLabel"=EXCLUDED."ctaLabel", "ctaUrlTemplate"=EXCLUDED."ctaUrlTemplate", "updatedAt"=now();
END $$;
