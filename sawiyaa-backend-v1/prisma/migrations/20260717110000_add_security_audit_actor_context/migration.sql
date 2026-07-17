-- Additive actor context for reliable security audit attribution.
CREATE TYPE "SecurityAuditActorType" AS ENUM (
  'USER',
  'SYSTEM',
  'SCHEDULED_JOB',
  'PAYMENT_WEBHOOK',
  'MIGRATION',
  'SEED_QA'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SecurityAuditLog" audit
    LEFT JOIN "User" actor ON actor."id" = audit."actorUserId"
    WHERE audit."actorUserId" IS NOT NULL
      AND actor."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot add SecurityAuditLog actor foreign key: orphan actorUserId values exist';
  END IF;
END $$;

ALTER TABLE "SecurityAuditLog"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "requestId" VARCHAR(191);

ALTER TABLE "SecurityAuditLog"
  ADD CONSTRAINT "SecurityAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SecurityAuditLog_requestId_occurredAt_idx"
  ON "SecurityAuditLog"("requestId", "occurredAt");
