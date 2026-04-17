-- CreateEnum
CREATE TYPE "SupportTicketEventType" AS ENUM ('TICKET_CREATED', 'MESSAGE_ADDED', 'INTERNAL_NOTE_ADDED', 'STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED');

-- AlterEnum
ALTER TYPE "SupportTicketPriority" ADD VALUE 'NORMAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SupportTicketType" ADD VALUE 'BOOKING';
ALTER TYPE "SupportTicketType" ADD VALUE 'MATCHING';
ALTER TYPE "SupportTicketType" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "createdByRole" "ConversationParticipantRole",
ADD COLUMN     "description" VARCHAR(2000),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "relatedAssessmentSubmissionId" UUID,
ADD COLUMN     "relatedInstantBookingRequestId" UUID,
ADD COLUMN     "relatedMatchingSessionId" UUID,
ADD COLUMN     "relatedPaymentId" UUID,
ADD COLUMN     "relatedSessionId" UUID;

UPDATE "SupportTicket"
SET "createdByRole" = CASE
  WHEN "practitionerId" IS NOT NULL THEN 'PRACTITIONER'::"ConversationParticipantRole"
  ELSE 'PATIENT'::"ConversationParticipantRole"
END
WHERE "createdByRole" IS NULL;

UPDATE "SupportTicket"
SET "subject" = COALESCE("subject", 'Support ticket')
WHERE "subject" IS NULL;

ALTER TABLE "SupportTicket"
ALTER COLUMN "createdByRole" SET NOT NULL,
ALTER COLUMN "subject" SET NOT NULL;

-- CreateTable
CREATE TABLE "SupportTicketEvent" (
    "id" UUID NOT NULL,
    "supportTicketId" UUID NOT NULL,
    "eventType" "SupportTicketEventType" NOT NULL,
    "actorUserId" UUID,
    "actorRole" "ConversationParticipantRole",
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicketEvent_supportTicketId_createdAt_idx" ON "SupportTicketEvent"("supportTicketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_eventType_createdAt_idx" ON "SupportTicketEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_actorUserId_createdAt_idx" ON "SupportTicketEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_relatedSessionId_idx" ON "SupportTicket"("relatedSessionId");

-- CreateIndex
CREATE INDEX "SupportTicket_relatedPaymentId_idx" ON "SupportTicket"("relatedPaymentId");

-- CreateIndex
CREATE INDEX "SupportTicket_relatedInstantBookingRequestId_idx" ON "SupportTicket"("relatedInstantBookingRequestId");

-- CreateIndex
CREATE INDEX "SupportTicket_relatedMatchingSessionId_idx" ON "SupportTicket"("relatedMatchingSessionId");

-- CreateIndex
CREATE INDEX "SupportTicket_relatedAssessmentSubmissionId_idx" ON "SupportTicket"("relatedAssessmentSubmissionId");

-- CreateIndex
CREATE INDEX "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
