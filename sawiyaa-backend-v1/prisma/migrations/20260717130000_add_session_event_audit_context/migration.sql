-- Additive audit context for immutable session transition evidence.
ALTER TABLE "SessionEvent"
  ADD COLUMN "actorType" "SecurityAuditActorType",
  ADD COLUMN "actorRolesJson" JSONB,
  ADD COLUMN "source" VARCHAR(50),
  ADD COLUMN "requestId" VARCHAR(191),
  ADD COLUMN "correlationId" VARCHAR(191),
  ADD COLUMN "reason" VARCHAR(500),
  ADD COLUMN "previousStatus" "SessionStatus",
  ADD COLUMN "newStatus" "SessionStatus",
  ADD COLUMN "occurredAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SessionEvent" event
    LEFT JOIN "User" actor ON actor."id" = event."actorUserId"
    WHERE event."actorUserId" IS NOT NULL
      AND actor."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot add SessionEvent actor foreign key: orphan actorUserId values exist';
  END IF;
END $$;

ALTER TABLE "SessionEvent"
  ADD CONSTRAINT "SessionEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SessionEvent_actorUserId_occurredAt_idx"
  ON "SessionEvent"("actorUserId", "occurredAt");
