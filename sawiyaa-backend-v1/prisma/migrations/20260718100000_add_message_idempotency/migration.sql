-- Additive, backward-compatible message idempotency metadata.
ALTER TABLE "Message"
  ADD COLUMN "clientMessageId" VARCHAR(191),
  ADD COLUMN "clientMessagePayloadHash" CHAR(64);

CREATE INDEX "Message_conversationId_senderUserId_clientMessageId_idx"
  ON "Message"("conversationId", "senderUserId", "clientMessageId");

-- Historical messages remain nullable. Only keyed user sends participate in
-- the atomic uniqueness guarantee.
CREATE UNIQUE INDEX "Message_conversationId_senderUserId_clientMessageId_key"
  ON "Message"("conversationId", "senderUserId", "clientMessageId")
  WHERE "clientMessageId" IS NOT NULL;
