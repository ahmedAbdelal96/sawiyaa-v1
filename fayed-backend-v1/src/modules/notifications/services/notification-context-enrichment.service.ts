import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationContext, NotificationPrimaryAction } from '../types/user-notifications.types';

// ---------------------------------------------------------------------------
// Safe payload helpers — prevent Map.get(unknown) type errors
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value != null &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

// ---------------------------------------------------------------------------
// Helper to build a practitioner display name from PractitionerProfile.
// PractitionerProfile has NO displayName — use professionalTitle or user.displayName.
// ---------------------------------------------------------------------------

function buildPractitionerName(practitioner: {
  professionalTitle: string | null;
  user: { displayName: string | null };
} | null | undefined): string | undefined {
  if (!practitioner) return undefined;
  return (
    practitioner.professionalTitle?.trim() ||
    practitioner.user.displayName?.trim() ||
    undefined
  );
}

// ---------------------------------------------------------------------------
// Input type — covers both user notification rows and admin ops rows
// ---------------------------------------------------------------------------

type InputNotification = {
  id: string;
  userId: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  payloadJson?: unknown;
  payload?: unknown;
  typeSlug?: string;
  notificationType?: { slug: string };
};

@Injectable()
export class NotificationContextEnrichmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enrichOne(row: InputNotification): Promise<{ context: NotificationContext; primaryAction: NotificationPrimaryAction }> {
    const map = await this.enrichMany([row]);
    return map.get(row.id) ?? { context: {}, primaryAction: { kind: 'details' } };
  }

  async enrichMany(
    rows: InputNotification[],
  ): Promise<Map<string, { context: NotificationContext; primaryAction: NotificationPrimaryAction }>> {
    const enrichmentMap = new Map<string, { context: NotificationContext; primaryAction: NotificationPrimaryAction }>();
    if (!rows || rows.length === 0) {
      return enrichmentMap;
    }

    // -----------------------------------------------------------------------
    // Pass 1: collect all entity IDs from structured fields + parsed payload
    // -----------------------------------------------------------------------

    const sessionIds = new Set<string>();
    const supportTicketIds = new Set<string>();
    const conversationIds = new Set<string>();
    const messageIds = new Set<string>();
    const userIds = new Set<string>();
    const paymentIds = new Set<string>();

    for (const row of rows) {
      if (row.userId) {
        userIds.add(row.userId);
      }

      const payload = asRecord(row.payloadJson ?? row.payload);
      const slug = row.typeSlug ?? row.notificationType?.slug ?? '';
      const entityType = row.relatedEntityType;
      const entityId = asString(row.relatedEntityId);

      if (entityId) {
        if (entityType === 'SESSION') {
          sessionIds.add(entityId);
        } else if (entityType === 'SUPPORT_TICKET' || entityType === 'SUPPORT') {
          supportTicketIds.add(entityId);
        } else if (
          entityType === 'GENERAL_CHAT_MESSAGE' ||
          entityType === 'SUPPORT_MESSAGE' ||
          entityType === 'CARE_CHAT_MESSAGE'
        ) {
          messageIds.add(entityId);
        } else if (entityType === 'PAYMENT' || entityType === 'REFUND') {
          paymentIds.add(entityId);
        }
      }

      if (slug.startsWith('messages.') && entityId && !entityType) {
        messageIds.add(entityId);
      }

      const payloadSessionId = asString(payload.sessionId);
      if (payloadSessionId) sessionIds.add(payloadSessionId);

      const payloadTicketId = asString(payload.supportTicketId);
      if (payloadTicketId) supportTicketIds.add(payloadTicketId);

      const payloadConvId = asString(payload.conversationId);
      if (payloadConvId) conversationIds.add(payloadConvId);

      const payloadThreadId = asString(payload.threadId);
      if (payloadThreadId) conversationIds.add(payloadThreadId);

      const payloadCareRequestId = asString(payload.careRequestId);
      if (payloadCareRequestId) conversationIds.add(payloadCareRequestId);
    }

    try {
      // ---------------------------------------------------------------------
      // Batch query 1: Messages
      // ---------------------------------------------------------------------
      const messages =
        messageIds.size > 0
          ? await this.prisma.message.findMany({
              where: { id: { in: Array.from(messageIds) } },
              select: { id: true, conversationId: true, senderUserId: true },
            })
          : [];
      const messagesMap = new Map(messages.map((m) => [m.id, m]));
      for (const m of messages) {
        if (m.conversationId) conversationIds.add(m.conversationId);
        if (m.senderUserId) userIds.add(m.senderUserId);
      }

      // ---------------------------------------------------------------------
      // Batch query 2: Payments
      // ---------------------------------------------------------------------
      const payments =
        paymentIds.size > 0
          ? await this.prisma.payment.findMany({
              where: { id: { in: Array.from(paymentIds) } },
              select: { id: true, sessionId: true },
            })
          : [];
      const paymentsMap = new Map(payments.map((p) => [p.id, p]));
      for (const p of payments) {
        if (p.sessionId) sessionIds.add(p.sessionId);
      }

      // ---------------------------------------------------------------------
      // Batch query 3: Conversations
      // PractitionerProfile has no displayName — select professionalTitle + user.displayName
      // supportTicket is a reverse relation — must be selected explicitly
      // ---------------------------------------------------------------------
      const conversations =
        conversationIds.size > 0
          ? await this.prisma.conversation.findMany({
              where: { id: { in: Array.from(conversationIds) } },
              select: {
                id: true,
                conversationType: true,
                sessionId: true,
                supportTicketId: true,
                patient: {
                  select: {
                    displayName: true,
                    user: { select: { displayName: true } },
                  },
                },
                practitioner: {
                  select: {
                    professionalTitle: true,
                    user: { select: { displayName: true } },
                  },
                },
                supportTicket: {
                  select: { id: true, subject: true, status: true },
                },
              },
            })
          : [];
      const conversationsMap = new Map(conversations.map((c) => [c.id, c]));
      for (const c of conversations) {
        if (c.sessionId) sessionIds.add(c.sessionId);
        if (c.supportTicketId) supportTicketIds.add(c.supportTicketId);
      }

      // ---------------------------------------------------------------------
      // Batch query 4: Users (recipients, senders)
      // ---------------------------------------------------------------------
      const users =
        userIds.size > 0
          ? await this.prisma.user.findMany({
              where: { id: { in: Array.from(userIds) } },
              select: {
                id: true,
                displayName: true,
                roles: { select: { role: true } },
              },
            })
          : [];
      const usersMap = new Map(users.map((u) => [u.id, u]));

      // ---------------------------------------------------------------------
      // Batch query 5: Sessions
      // PractitionerProfile has no displayName — select professionalTitle + user.displayName
      // ---------------------------------------------------------------------
      const sessions =
        sessionIds.size > 0
          ? await this.prisma.session.findMany({
              where: { id: { in: Array.from(sessionIds) } },
              select: {
                id: true,
                status: true,
                scheduledStartAt: true,
                patient: {
                  select: {
                    displayName: true,
                    user: { select: { displayName: true } },
                  },
                },
                practitioner: {
                  select: {
                    professionalTitle: true,
                    user: { select: { displayName: true } },
                  },
                },
              },
            })
          : [];
      const sessionsMap = new Map(sessions.map((s) => [s.id, s]));

      // ---------------------------------------------------------------------
      // Batch query 6: Support Tickets
      // PractitionerProfile has no displayName — select professionalTitle + user.displayName
      // ---------------------------------------------------------------------
      const tickets =
        supportTicketIds.size > 0
          ? await this.prisma.supportTicket.findMany({
              where: { id: { in: Array.from(supportTicketIds) } },
              select: {
                id: true,
                subject: true,
                status: true,
                conversationId: true,
                patient: {
                  select: {
                    displayName: true,
                    user: { select: { displayName: true } },
                  },
                },
                practitioner: {
                  select: {
                    professionalTitle: true,
                    user: { select: { displayName: true } },
                  },
                },
              },
            })
          : [];
      const ticketsMap = new Map(tickets.map((t) => [t.id, t]));

      // ---------------------------------------------------------------------
      // Pass 2: resolve context + primaryAction per notification
      // ---------------------------------------------------------------------
      for (const row of rows) {
        const context: NotificationContext = {};
        const primaryAction: NotificationPrimaryAction = { kind: 'details' };

        const payload = asRecord(row.payloadJson ?? row.payload);
        const slug = row.typeSlug ?? row.notificationType?.slug ?? '';
        const entityType = row.relatedEntityType;
        const entityId = asString(row.relatedEntityId);

        // Recipient info
        context.recipientId = row.userId;
        context.relatedEntityId = entityId;
        const recipient = usersMap.get(row.userId);
        if (recipient) {
          context.recipientName = asString(recipient.displayName);
          context.recipientRole = recipient.roles?.[0]?.role ?? undefined;
        }

        // Message / Chat context
        const isMessageSlug = slug.startsWith('messages.') || slug === 'GENERAL_CHAT_MESSAGE';
        const isMessageEntity =
          entityType === 'GENERAL_CHAT_MESSAGE' ||
          entityType === 'SUPPORT_MESSAGE' ||
          entityType === 'CARE_CHAT_MESSAGE';

        if (isMessageSlug || isMessageEntity) {
          const msg = entityId ? messagesMap.get(entityId) : undefined;
          const rawConvId =
            msg?.conversationId ??
            asString(payload.conversationId) ??
            asString(payload.threadId) ??
            asString(payload.careRequestId);
          const conversation = rawConvId ? conversationsMap.get(rawConvId) : undefined;

          const senderId = msg?.senderUserId ?? asString(payload.senderUserId);
          if (senderId) {
            const sender = usersMap.get(senderId);
            context.senderName = asString(sender?.displayName);
          }

          if (conversation) {
            context.patientName =
              asString(conversation.patient?.displayName) ??
              asString(conversation.patient?.user?.displayName);
            context.practitionerName = buildPractitionerName(conversation.practitioner);

            if (conversation.supportTicket) {
              context.supportTicketSubject = asString(conversation.supportTicket.subject);
            }

            const sessId = conversation.sessionId ?? asString(payload.sessionId);
            const session = sessId ? sessionsMap.get(sessId) : undefined;
            if (session) {
              context.patientName =
                asString(session.patient?.displayName) ??
                asString(session.patient?.user?.displayName) ??
                context.patientName;
              context.practitionerName =
                buildPractitionerName(session.practitioner) ?? context.practitionerName;
              context.sessionStartAt = session.scheduledStartAt?.toISOString();
              context.sessionStatus = session.status;
            }

            primaryAction.kind = 'messages';
            // Infer lane by relationships first, then fall back to conversationType
            if (
              slug === 'messages.support-message-received' ||
              conversation.conversationType === 'SUPPORT' ||
              conversation.supportTicketId
            ) {
              primaryAction.lane = 'support';
              primaryAction.id = conversation.supportTicketId ?? conversation.id;
            } else if (
              slug === 'messages.follow-up-message-received' ||
              conversation.conversationType === 'CARE_APPROVED'
            ) {
              primaryAction.lane = 'care';
              primaryAction.id = conversation.id;
            } else {
              primaryAction.lane = 'session';
              primaryAction.id = conversation.sessionId ?? conversation.id;
            }
          }
        }
        // Session context
        else if (slug.startsWith('sessions.') || entityType === 'SESSION') {
          const sessionId = entityId ?? asString(payload.sessionId);
          const session = sessionId ? sessionsMap.get(sessionId) : undefined;
          if (session) {
            context.patientName =
              asString(session.patient?.displayName) ??
              asString(session.patient?.user?.displayName);
            context.practitionerName = buildPractitionerName(session.practitioner);
            context.sessionStartAt = session.scheduledStartAt?.toISOString();
            context.sessionStatus = session.status;

            primaryAction.kind = 'session';
            primaryAction.id = session.id;
          }
        }
        // Support ticket context
        else if (slug.startsWith('support.') || entityType === 'SUPPORT_TICKET' || entityType === 'SUPPORT') {
          const ticketId =
            entityId ??
            asString(payload.supportTicketId) ??
            asString(payload.ticketId);
          const ticket = ticketId ? ticketsMap.get(ticketId) : undefined;
          if (ticket) {
            context.supportTicketSubject = asString(ticket.subject);
            context.patientName =
              asString(ticket.patient?.displayName) ??
              asString(ticket.patient?.user?.displayName);
            context.practitionerName = buildPractitionerName(ticket.practitioner);

            primaryAction.kind = 'support';
            primaryAction.id = ticket.id;
          }
        }
        // Payment context
        else if (slug.startsWith('payments.') || entityType === 'PAYMENT' || entityType === 'REFUND') {
          const pay = entityId ? paymentsMap.get(entityId) : undefined;
          const sessionId = pay?.sessionId ?? asString(payload.sessionId);
          const session = sessionId ? sessionsMap.get(sessionId) : undefined;
          if (session) {
            context.patientName =
              asString(session.patient?.displayName) ??
              asString(session.patient?.user?.displayName);
            context.practitionerName = buildPractitionerName(session.practitioner);
            context.sessionStartAt = session.scheduledStartAt?.toISOString();
            context.sessionStatus = session.status;

            primaryAction.kind = 'session';
            primaryAction.id = session.id;
          }
        }

        enrichmentMap.set(row.id, { context, primaryAction });
      }
    } catch {
      // Graceful fallback — never fail the request due to enrichment errors
      for (const row of rows) {
        if (!enrichmentMap.has(row.id)) {
          enrichmentMap.set(row.id, { context: {}, primaryAction: { kind: 'details' } });
        }
      }
    }

    return enrichmentMap;
  }
}
