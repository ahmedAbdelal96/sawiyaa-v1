-- Keep only non-terminal reminders in the claim-order index. The claim query
-- selects one fixed reminder type at a time, allowing PostgreSQL to use
-- reminderType/dueAt/id order without sorting the entire eligible backlog.
CREATE INDEX "SessionReminderQueue_active_reminderType_dueAt_id_idx"
  ON "SessionReminderQueue"("reminderType", "dueAt", "id")
  WHERE "sentAt" IS NULL AND "cancelledAt" IS NULL;
