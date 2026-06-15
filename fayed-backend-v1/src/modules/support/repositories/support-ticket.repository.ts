import { Injectable } from '@nestjs/common';
import {
  ConversationParticipantRole,
  ConversationType,
  MessageStatus,
  MessageType,
  MessageVisibility,
  SupportTicketEventType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppRole } from '@common/enums/app-role.enum';
import { SupportActorKind } from '../types/support.types';

@Injectable()
export class SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(input: {
    openedByUserId: string;
    createdByRole: 'PATIENT' | 'PRACTITIONER';
    actorKind: SupportActorKind;
    patientProfileId?: string;
    practitionerProfileId?: string;
    category: SupportTicketType;
    subject: string;
    description: string;
    priority: SupportTicketPriority;
    relatedSessionId?: string;
    relatedPaymentId?: string;
    relatedInstantBookingRequestId?: string;
    relatedMatchingSessionId?: string;
    relatedAssessmentSubmissionId?: string;
    seedInitialMessage?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const seedInitialMessage = input.seedInitialMessage ?? true;
      const conversation = await tx.conversation.create({
        data: {
          conversationType: ConversationType.SUPPORT,
          patientId: input.patientProfileId ?? null,
          practitionerId: input.practitionerProfileId ?? null,
        },
      });

      await tx.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: input.openedByUserId,
          participantRole: input.createdByRole,
        },
      });

      const ticket = await tx.supportTicket.create({
        data: {
          openedByUserId: input.openedByUserId,
          createdByRole: input.createdByRole,
          patientId: input.patientProfileId ?? null,
          practitionerId: input.practitionerProfileId ?? null,
          conversationId: conversation.id,
          ticketType: input.category,
          status: SupportTicketStatus.OPEN,
          priority: input.priority,
          subject: input.subject,
          description: input.description,
          lastMessageAt: seedInitialMessage ? new Date() : null,
          relatedSessionId: input.relatedSessionId ?? null,
          relatedPaymentId: input.relatedPaymentId ?? null,
          relatedInstantBookingRequestId:
            input.relatedInstantBookingRequestId ?? null,
          relatedMatchingSessionId: input.relatedMatchingSessionId ?? null,
          relatedAssessmentSubmissionId:
            input.relatedAssessmentSubmissionId ?? null,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          supportTicketId: ticket.id,
        },
      });

      if (seedInitialMessage) {
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderUserId: input.openedByUserId,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            visibility: MessageVisibility.NORMAL,
            contentText: input.description,
          },
        });
      }

      await tx.supportTicketEvent.create({
        data: {
          supportTicketId: ticket.id,
          eventType: SupportTicketEventType.TICKET_CREATED,
          actorUserId: input.openedByUserId,
          actorRole: input.createdByRole,
          payloadJson: {
            category: input.category,
          },
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: {
          id: ticket.id,
        },
        include: this.detailsInclude(),
      });
    });
  }

  listByOwner(input: {
    actorKind: SupportActorKind;
    profileId: string;
    page: number;
    limit: number;
    status?: SupportTicketStatus;
    category?: SupportTicketType;
    priority?: SupportTicketPriority;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where = {
      ...(input.actorKind === 'PATIENT'
        ? { patientId: input.profileId }
        : { practitionerId: input.profileId }),
      ...(input.status ? { status: input.status } : {}),
      ...(input.category ? { ticketType: input.category } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    };

    return Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
  }

  findByOwner(input: {
    actorKind: SupportActorKind;
    profileId: string;
    ticketId: string;
  }) {
    return this.prisma.supportTicket.findFirst({
      where: {
        id: input.ticketId,
        ...(input.actorKind === 'PATIENT'
          ? { patientId: input.profileId }
          : { practitionerId: input.profileId }),
      },
      include: this.detailsInclude(),
    });
  }

  listForAdmin(input: {
    userId: string;
    page: number;
    limit: number;
    status?: SupportTicketStatus;
    category?: SupportTicketType;
    priority?: SupportTicketPriority;
    assignedToMe?: boolean;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.category ? { ticketType: input.category } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.assignedToMe ? { assignedToUserId: input.userId } : {}),
    };

    return Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
  }

  findByIdForAdmin(ticketId: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: this.detailsInclude(),
    });
  }

  async addMessage(input: {
    ticketId: string;
    senderUserId: string;
    senderRole: ConversationParticipantRole;
    message: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: ticket.conversationId,
            userId: input.senderUserId,
          },
        },
        create: {
          conversationId: ticket.conversationId,
          userId: input.senderUserId,
          participantRole: input.senderRole,
        },
        update: {
          participantRole: input.senderRole,
          isActive: true,
          leftAt: null,
        },
      });

      await tx.message.create({
        data: {
          conversationId: ticket.conversationId,
          senderUserId: input.senderUserId,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT,
          visibility: MessageVisibility.NORMAL,
          contentText: input.message,
        },
      });

      await tx.supportTicket.update({
        where: { id: input.ticketId },
        data: {
          lastMessageAt: new Date(),
        },
      });

      await tx.supportTicketEvent.create({
        data: {
          supportTicketId: input.ticketId,
          eventType: SupportTicketEventType.MESSAGE_ADDED,
          actorUserId: input.senderUserId,
          actorRole: input.senderRole,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: input.ticketId },
        include: this.detailsInclude(),
      });
    });
  }

  findByIdWithConversationMeta(ticketId: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
        conversationId: true,
        conversation: {
          select: {
            id: true,
            participants: {
              where: { isActive: true },
              select: {
                userId: true,
                participantRole: true,
              },
            },
          },
        },
      },
    });
  }

  async canUserAccessSupportTicket(input: {
    ticketId: string;
    userId: string;
    roles: AppRole[];
  }) {
    const ticket = await this.findByIdWithConversationMeta(input.ticketId);
    if (!ticket) {
      return null;
    }

    const isAdminLike =
      input.roles.includes(AppRole.ADMIN) ||
      input.roles.includes(AppRole.SUPPORT_AGENT);

    if (isAdminLike) {
      return ticket;
    }

    const isParticipant = ticket.conversation.participants.some(
      (participant) => participant.userId === input.userId,
    );

    return isParticipant ? ticket : null;
  }

  findSupportMessageInConversation(input: {
    conversationId: string;
    messageId: string;
  }) {
    return this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
      },
      select: {
        id: true,
        senderUserId: true,
        sentAt: true,
      },
    });
  }

  async markSupportMessageDelivered(input: {
    conversationId: string;
    messageId: string;
    deliveredAt: Date;
  }) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!message || message.status !== MessageStatus.SENT) {
      return null;
    }

    return this.prisma.message.update({
      where: { id: input.messageId },
      data: {
        status: MessageStatus.DELIVERED,
        deliveredAt: input.deliveredAt,
      },
      select: {
        id: true,
        conversationId: true,
        deliveredAt: true,
      },
    });
  }

  async markSupportMessagesDeliveredForRecipient(input: {
    conversationId: string;
    recipientUserId: string;
    deliveredAt: Date;
  }) {
    const pending = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        senderUserId: {
          not: input.recipientUserId,
        },
        status: MessageStatus.SENT,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
      },
      select: {
        id: true,
      },
      orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
    });

    if (pending.length === 0) {
      return [];
    }

    await this.prisma.message.updateMany({
      where: {
        id: {
          in: pending.map((item) => item.id),
        },
      },
      data: {
        status: MessageStatus.DELIVERED,
        deliveredAt: input.deliveredAt,
      },
    });

    return pending.map((item) => ({
      messageId: item.id,
      conversationId: input.conversationId,
      deliveredAt: input.deliveredAt,
    }));
  }

  async markSupportMessagesReadForRecipient(input: {
    conversationId: string;
    recipientUserId: string;
    lastReadMessageSentAt: Date;
    readAt: Date;
  }) {
    const pending = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        senderUserId: {
          not: input.recipientUserId,
        },
        status: {
          in: [MessageStatus.SENT, MessageStatus.DELIVERED],
        },
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        sentAt: {
          lte: input.lastReadMessageSentAt,
        },
      },
      select: {
        id: true,
      },
      orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
    });

    if (pending.length === 0) {
      return [];
    }

    await this.prisma.message.updateMany({
      where: {
        id: {
          in: pending.map((item) => item.id),
        },
      },
      data: {
        status: MessageStatus.READ,
        deliveredAt: input.readAt,
        readAt: input.readAt,
      },
    });

    return pending.map((item) => ({
      messageId: item.id,
      conversationId: input.conversationId,
      readAt: input.readAt,
    }));
  }

  markSupportConversationReadCursor(input: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
    lastReadAt: Date;
  }) {
    return this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: input.conversationId,
        userId: input.userId,
        isActive: true,
      },
      data: {
        lastReadMessageId: input.lastReadMessageId,
        lastReadAt: input.lastReadAt,
      },
    });
  }

  async addInternalNote(input: {
    ticketId: string;
    actorUserId: string;
    actorRole: ConversationParticipantRole;
    note: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUniqueOrThrow({
        where: { id: input.ticketId },
      });

      await tx.internalConversationNote.create({
        data: {
          conversationId: ticket.conversationId,
          createdByUserId: input.actorUserId,
          noteText: input.note,
        },
      });

      await tx.supportTicketEvent.create({
        data: {
          supportTicketId: input.ticketId,
          eventType: SupportTicketEventType.INTERNAL_NOTE_ADDED,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: input.ticketId },
        include: this.detailsInclude(),
      });
    });
  }

  async updateStatus(input: {
    ticketId: string;
    status: SupportTicketStatus;
    actorUserId: string;
    actorRole: ConversationParticipantRole;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.supportTicket.findUniqueOrThrow({
        where: { id: input.ticketId },
        select: {
          status: true,
          resolvedAt: true,
          closedAt: true,
        },
      });

      const now = new Date();
      const updated = await tx.supportTicket.update({
        where: { id: input.ticketId },
        data: {
          status: input.status,
          resolvedAt:
            input.status === SupportTicketStatus.RESOLVED
              ? (previous.resolvedAt ?? now)
              : previous.resolvedAt,
          closedAt:
            input.status === SupportTicketStatus.CLOSED
              ? (previous.closedAt ?? now)
              : previous.closedAt,
        },
      });

      await tx.supportTicketEvent.create({
        data: {
          supportTicketId: input.ticketId,
          eventType: SupportTicketEventType.STATUS_CHANGED,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          payloadJson: {
            previousStatus: previous.status,
            nextStatus: input.status,
          },
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.detailsInclude(),
      });
    });
  }

  async assignTicket(input: {
    ticketId: string;
    assignedToUserId: string | null;
    actorUserId: string;
    actorRole: ConversationParticipantRole;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: input.ticketId },
        data: {
          assignedToUserId: input.assignedToUserId,
        },
      });

      await tx.supportTicketEvent.create({
        data: {
          supportTicketId: input.ticketId,
          eventType: input.assignedToUserId
            ? SupportTicketEventType.ASSIGNED
            : SupportTicketEventType.UNASSIGNED,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          payloadJson: {
            assignedToUserId: input.assignedToUserId,
          },
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.detailsInclude(),
      });
    });
  }

  async countUnreadForUser(input: { userId: string; adminLike: boolean }) {
    const accessScope = input.adminLike
      ? {}
      : {
          participants: {
            some: {
              userId: input.userId,
              isActive: true,
            },
          },
        };

    const unreadWhere: Prisma.MessageWhereInput = {
      senderUserId: {
        not: input.userId,
      },
      status: {
        in: [MessageStatus.SENT, MessageStatus.DELIVERED],
      },
      deletedAt: null,
      visibility: MessageVisibility.NORMAL,
      conversation: {
        conversationType: ConversationType.SUPPORT,
        ...accessScope,
      },
    };

    const [unreadMessages, unreadConversationRows] =
      await this.prisma.$transaction([
        this.prisma.message.count({
          where: unreadWhere,
        }),
        this.prisma.message.findMany({
          where: unreadWhere,
          select: {
            conversationId: true,
          },
          distinct: ['conversationId'],
        }),
      ]);

    return {
      unreadMessages,
      unreadConversations: unreadConversationRows.length,
    };
  }

  async countUnreadByConversationIdsForUser(input: {
    userId: string;
    conversationIds: string[];
  }) {
    const uniqueConversationIds = Array.from(
      new Set(input.conversationIds),
    ).filter(Boolean);
    if (uniqueConversationIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: uniqueConversationIds },
        senderUserId: {
          not: input.userId,
        },
        status: {
          in: [MessageStatus.SENT, MessageStatus.DELIVERED],
        },
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        conversation: {
          conversationType: ConversationType.SUPPORT,
        },
      },
      _count: {
        _all: true,
      },
    });

    return new Map(rows.map((row) => [row.conversationId, row._count._all]));
  }

  private detailsInclude() {
    return {
      conversation: {
        include: {
          participants: {
            where: { isActive: true },
            select: {
              userId: true,
              participantRole: true,
            },
          },
          messages: {
            where: {
              deletedAt: null,
              visibility: MessageVisibility.NORMAL,
            },
            orderBy: {
              sentAt: 'asc',
            },
            select: {
              id: true,
              senderUserId: true,
              contentText: true,
              status: true,
              sentAt: true,
              deliveredAt: true,
              readAt: true,
            },
          },
          internalNotes: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              noteText: true,
              createdAt: true,
            },
          },
        },
      },
    } as const;
  }
}
