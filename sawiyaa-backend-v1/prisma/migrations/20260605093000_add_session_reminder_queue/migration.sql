-- Session reminder outbox: scheduled reminder rows for confirmed sessions.

CREATE TYPE "SessionReminderType" AS ENUM ('REMINDER_60', 'REMINDER_15');

CREATE TABLE "SessionReminderQueue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "recipientRole" "UserRoleType" NOT NULL,
    "reminderType" "SessionReminderType" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionReminderQueue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SessionReminderQueue"
  ADD CONSTRAINT "SessionReminderQueue_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionReminderQueue"
  ADD CONSTRAINT "SessionReminderQueue_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SessionReminderQueue_idempotencyKey_key"
  ON "SessionReminderQueue"("idempotencyKey");

CREATE INDEX "SessionReminderQueue_dueAt_sentAt_cancelledAt_idx"
  ON "SessionReminderQueue"("dueAt", "sentAt", "cancelledAt");

CREATE INDEX "SessionReminderQueue_sessionId_idx"
  ON "SessionReminderQueue"("sessionId");
