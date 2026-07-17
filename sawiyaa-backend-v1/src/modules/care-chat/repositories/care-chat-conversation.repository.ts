import { Injectable } from '@nestjs/common';
import {
  ConversationParticipantRole,
  ConversationStatus,
  MessageStatus,
  MessageType,
  MessageVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CareChatActorType } from '../types/care-chat.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CareChatConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createApprovedConversation(input: {
    patientId: string;
    patientUserId: string;
    practitionerId: string;
    practitionerUserId: string;
    sessionId?: string | null;
    requestId: string;
    expiresAt: Date | null;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).conversation.create({
      data: {
        conversationType: 'CARE_APPROVED',
        status: ConversationStatus.OPEN,
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        sessionId: input.sessionId ?? null,
        chatApprovalRequestId: input.requestId,
        expiresAt: input.expiresAt,
        participants: {
          create: [
            {
              userId: input.patientUserId,
              participantRole: ConversationParticipantRole.PATIENT,
            },
            {
              userId: input.practitionerUserId,
              participantRole: ConversationParticipantRole.PRACTITIONER,
            },
          ],
        },
      },
      include: this.conversationDetailsInclude(),
    });
  }

  findByIdForActor(input: {
    conversationId: string;
    actorType: Exclude<CareChatActorType, 'ADMIN'>;
    profileId: string;
  }) {
    return this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        conversationType: 'CARE_APPROVED',
        ...(input.actorType === 'PATIENT'
          ? { patientId: input.profileId }
          : { practitionerId: input.profileId }),
      },
      include: this.conversationDetailsInclude(),
    });
  }

  findByIdForAdmin(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        conversationType: 'CARE_APPROVED',
      },
      include: this.conversationDetailsInclude(),
    });
  }

  findByIdWithParticipants(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        conversationType: 'CARE_APPROVED',
      },
      select: {
        id: true,
        status: true,
        participants: {
          where: { isActive: true },
          select: {
            userId: true,
            participantRole: true,
          },
        },
      },
    });
  }

  findCareMessageInConversation(input: {
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

  async countUnreadForUser(input: { userId: string }) {
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
        conversationType: 'CARE_APPROVED',
        participants: {
          some: {
            userId: input.userId,
            isActive: true,
          },
        },
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
          conversationType: 'CARE_APPROVED',
          participants: {
            some: {
              userId: input.userId,
              isActive: true,
            },
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    return new Map(rows.map((row) => [row.conversationId, row._count._all]));
  }

  updateConversationStatus(
    conversationId: string,
    data: Prisma.ConversationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).conversation.update({
      where: { id: conversationId },
      data,
      include: this.conversationDetailsInclude(),
    });
  }

  private conversationDetailsInclude() {
    return {
      patient: {
        select: {
          id: true,
          user: {
            select: {
              displayName: true,
            },
          },
        },
      },
      practitioner: {
        select: {
          id: true,
          user: {
            select: {
              displayName: true,
            },
          },
        },
      },
      chatApprovalRequest: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          relatedSessionId: true,
          revokedAt: true,
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
      participants: {
        where: {
          isActive: true,
        },
        select: {
          userId: true,
          participantRole: true,
          lastReadAt: true,
        },
      },
    } as const;
  }
}
