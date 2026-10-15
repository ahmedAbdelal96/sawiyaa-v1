ALTER TABLE "SessionReminderQueue"
  ADD COLUMN "claimToken" VARCHAR(64),
  ADD COLUMN "claimUntil" TIMESTAMP(3);

CREATE INDEX "SessionReminderQueue_dueAt_sentAt_cancelledAt_claimUntil_idx"
  ON "SessionReminderQueue"("dueAt", "sentAt", "cancelledAt", "claimUntil");
