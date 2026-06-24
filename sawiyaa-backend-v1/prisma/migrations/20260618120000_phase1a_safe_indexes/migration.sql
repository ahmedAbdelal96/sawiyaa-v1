-- Phase 1A: safe Prisma indexes only

CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

CREATE INDEX "Session_patientId_status_scheduledStartAt_idx" ON "Session"("patientId", "status", "scheduledStartAt");
CREATE INDEX "Session_practitionerId_status_scheduledStartAt_idx" ON "Session"("practitionerId", "status", "scheduledStartAt");
CREATE INDEX "Session_status_scheduledStartAt_idx" ON "Session"("status", "scheduledStartAt");
CREATE INDEX "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");
CREATE INDEX "Session_status_joinOpenAt_idx" ON "Session"("status", "joinOpenAt");

CREATE INDEX "InstantBookingRequest_practitionerId_status_expiresAt_createdAt_idx" ON "InstantBookingRequest"("practitionerId", "status", "expiresAt", "createdAt");
CREATE INDEX "InstantBookingRequest_patientId_status_createdAt_idx" ON "InstantBookingRequest"("patientId", "status", "createdAt");

CREATE INDEX "Payment_provider_providerOrderRef_idx" ON "Payment"("provider", "providerOrderRef");
CREATE INDEX "PaymentEvent_providerEventRef_idx" ON "PaymentEvent"("providerEventRef");
CREATE INDEX "Refund_providerRefundRef_idx" ON "Refund"("providerRefundRef");
CREATE INDEX "Refund_paymentId_requestedAt_idx" ON "Refund"("paymentId", "requestedAt");
CREATE INDEX "CustomerWalletEntry_refundId_entryType_idx" ON "CustomerWalletEntry"("refundId", "entryType");

CREATE INDEX "Notification_userId_channel_status_scheduledFor_createdAt_idx" ON "Notification"("userId", "channel", "status", "scheduledFor", "createdAt");

CREATE INDEX "Conversation_conversationType_status_updatedAt_idx" ON "Conversation"("conversationType", "status", "updatedAt");

CREATE INDEX "SupportTicket_status_ticketType_priority_updatedAt_idx" ON "SupportTicket"("status", "ticketType", "priority", "updatedAt");
CREATE INDEX "SupportTicket_assignedToUserId_status_updatedAt_idx" ON "SupportTicket"("assignedToUserId", "status", "updatedAt");
CREATE INDEX "SupportTicket_patientId_status_updatedAt_idx" ON "SupportTicket"("patientId", "status", "updatedAt");
CREATE INDEX "SupportTicket_practitionerId_status_updatedAt_idx" ON "SupportTicket"("practitionerId", "status", "updatedAt");
