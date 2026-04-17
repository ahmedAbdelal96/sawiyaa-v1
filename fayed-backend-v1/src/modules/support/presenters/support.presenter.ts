import { Injectable } from '@nestjs/common';
import {
  ConversationParticipantRole,
  SupportTicketPriority,
} from '@prisma/client';

@Injectable()
export class SupportPresenter {
  presentTicketList(input: {
    items: Array<{
      id: string;
      ticketType: string;
      subject: string;
      status: string;
      priority: SupportTicketPriority;
      assignedToUserId: string | null;
      relatedSessionId: string | null;
      relatedPaymentId: string | null;
      relatedInstantBookingRequestId: string | null;
      relatedMatchingSessionId: string | null;
      relatedAssessmentSubmissionId: string | null;
      lastMessageAt: Date | null;
      resolvedAt: Date | null;
      closedAt: Date | null;
      createdAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }) {
    return {
      items: input.items.map((item) => this.baseTicket(item)),
      pagination: input.pagination,
    };
  }

  presentUserTicketDetails(ticket: {
    id: string;
    ticketType: string;
    subject: string;
    status: string;
    priority: SupportTicketPriority;
    assignedToUserId: string | null;
    description: string | null;
    relatedSessionId: string | null;
    relatedPaymentId: string | null;
    relatedInstantBookingRequestId: string | null;
    relatedMatchingSessionId: string | null;
    relatedAssessmentSubmissionId: string | null;
    lastMessageAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    conversation: {
      participants: Array<{
        userId: string;
        participantRole: ConversationParticipantRole;
      }>;
      messages: Array<{
        id: string;
        senderUserId: string | null;
        contentText: string | null;
        sentAt: Date;
      }>;
    };
  }) {
    const roleMap = new Map(
      ticket.conversation.participants.map((participant) => [
        participant.userId,
        participant.participantRole,
      ]),
    );

    return {
      ...this.baseTicket(ticket),
      description: ticket.description,
      messages: ticket.conversation.messages
        .map((message) => ({
          id: message.id,
          senderRole: message.senderUserId
            ? (roleMap.get(message.senderUserId) ?? ConversationParticipantRole.SYSTEM)
            : ConversationParticipantRole.SYSTEM,
          message: message.contentText ?? '',
          createdAt: message.sentAt.toISOString(),
        }))
        .filter((message) => Boolean(message.message.trim())),
    };
  }

  presentAdminTicketDetails(ticket: {
    id: string;
    ticketType: string;
    subject: string;
    status: string;
    priority: SupportTicketPriority;
    assignedToUserId: string | null;
    description: string | null;
    relatedSessionId: string | null;
    relatedPaymentId: string | null;
    relatedInstantBookingRequestId: string | null;
    relatedMatchingSessionId: string | null;
    relatedAssessmentSubmissionId: string | null;
    lastMessageAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    conversation: {
      participants: Array<{
        userId: string;
        participantRole: ConversationParticipantRole;
      }>;
      messages: Array<{
        id: string;
        senderUserId: string | null;
        contentText: string | null;
        sentAt: Date;
      }>;
      internalNotes: Array<{
        id: string;
        noteText: string;
        createdAt: Date;
      }>;
    };
  }) {
    return {
      ...this.presentUserTicketDetails(ticket),
      internalNotes: ticket.conversation.internalNotes.map((note) => ({
        id: note.id,
        note: note.noteText,
        createdAt: note.createdAt.toISOString(),
      })),
    };
  }

  private baseTicket(ticket: {
    id: string;
    ticketType: string;
    subject: string;
    status: string;
    priority: SupportTicketPriority;
    assignedToUserId: string | null;
    relatedSessionId: string | null;
    relatedPaymentId: string | null;
    relatedInstantBookingRequestId: string | null;
    relatedMatchingSessionId: string | null;
    relatedAssessmentSubmissionId: string | null;
    lastMessageAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: ticket.id,
      category: ticket.ticketType,
      subject: ticket.subject,
      status: ticket.status,
      priority:
        ticket.priority === SupportTicketPriority.MEDIUM
          ? SupportTicketPriority.NORMAL
          : ticket.priority,
      assignedAdminUserId: ticket.assignedToUserId,
      relatedSessionId: ticket.relatedSessionId,
      relatedPaymentId: ticket.relatedPaymentId,
      relatedInstantBookingRequestId: ticket.relatedInstantBookingRequestId,
      relatedMatchingSessionId: ticket.relatedMatchingSessionId,
      relatedAssessmentSubmissionId: ticket.relatedAssessmentSubmissionId,
      lastMessageAt: ticket.lastMessageAt?.toISOString() ?? null,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
