-- Dedicated audit storage separated from notification runtime tables.
CREATE TYPE "AuditEventSource" AS ENUM ('SYSTEM', 'IN_APP', 'EMAIL', 'SMS', 'PUSH');

CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "typeSlug" VARCHAR(191) NOT NULL,
    "eventFamily" VARCHAR(100) NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "source" "AuditEventSource" NOT NULL DEFAULT 'SYSTEM',
    "actorUserId" UUID,
    "targetEntityType" VARCHAR(100),
    "targetEntityId" VARCHAR(191),
    "titleSnapshot" VARCHAR(300),
    "subjectSnapshot" VARCHAR(300),
    "bodySnapshot" TEXT,
    "suppressedReason" VARCHAR(500),
    "metadataJson" JSONB,
    "notificationId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditEvent_notificationId_key" ON "AuditEvent"("notificationId");
CREATE INDEX "AuditEvent_typeSlug_occurredAt_idx" ON "AuditEvent"("typeSlug", "occurredAt");
CREATE INDEX "AuditEvent_eventFamily_occurredAt_idx" ON "AuditEvent"("eventFamily", "occurredAt");
CREATE INDEX "AuditEvent_category_occurredAt_idx" ON "AuditEvent"("category", "occurredAt");
CREATE INDEX "AuditEvent_status_occurredAt_idx" ON "AuditEvent"("status", "occurredAt");
CREATE INDEX "AuditEvent_source_occurredAt_idx" ON "AuditEvent"("source", "occurredAt");
CREATE INDEX "AuditEvent_actorUserId_occurredAt_idx" ON "AuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "AuditEvent_targetEntityType_targetEntityId_idx" ON "AuditEvent"("targetEntityType", "targetEntityId");
CREATE INDEX "AuditEvent_occurredAt_createdAt_idx" ON "AuditEvent"("occurredAt", "createdAt");

ALTER TABLE "AuditEvent"
ADD CONSTRAINT "AuditEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill only the already-classified audit-only event families/types from existing notification runtime rows.
INSERT INTO "AuditEvent" (
  "id",
  "typeSlug",
  "eventFamily",
  "category",
  "status",
  "source",
  "actorUserId",
  "targetEntityType",
  "targetEntityId",
  "titleSnapshot",
  "subjectSnapshot",
  "bodySnapshot",
  "suppressedReason",
  "metadataJson",
  "notificationId",
  "occurredAt",
  "createdAt",
  "updatedAt"
)
SELECT
  n."id",
  nt."slug",
  split_part(nt."slug", '.', 1),
  nt."category",
  n."status",
  CASE
    WHEN n."channel" = 'IN_APP' THEN 'IN_APP'::"AuditEventSource"
    WHEN n."channel" = 'EMAIL' THEN 'EMAIL'::"AuditEventSource"
    WHEN n."channel" = 'SMS' THEN 'SMS'::"AuditEventSource"
    WHEN n."channel" = 'PUSH' THEN 'PUSH'::"AuditEventSource"
    ELSE 'SYSTEM'::"AuditEventSource"
  END,
  n."userId",
  n."relatedEntityType",
  n."relatedEntityId",
  n."titleSnapshot",
  n."subjectSnapshot",
  n."bodySnapshot",
  n."suppressedReason",
  n."payloadJson",
  n."id",
  COALESCE(n."updatedAt", n."createdAt"),
  n."createdAt",
  n."updatedAt"
FROM "Notification" n
INNER JOIN "NotificationType" nt
  ON nt."id" = n."notificationTypeId"
WHERE (
    nt."slug" LIKE 'auth.%'
    OR nt."slug" IN (
      'payments.payment-succeeded',
      'payments.refund-succeeded',
      'sessions.session-confirmed',
      'sessions.session-confirmed-practitioner',
      'training.schedule-reminder',
      'training.enrollment-confirmed'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "AuditEvent" ae
    WHERE ae."notificationId" = n."id"
  );
