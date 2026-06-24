import { Injectable } from '@nestjs/common';
import {
  MessageStatus,
  MessageType,
  MessageVisibility,
  ConversationParticipantRole,
  ConversationStatus,
  ConversationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { GeneralChatParticipantDirectoryRecord } from '../helpers/general-chat-identity.mapper';

const generalConversationReadSelect =
  Prisma.validator<Prisma.ConversationSelect>()({
    id: true,
    conversationRef: true,
    conversationType: true,
    status: true,
    sessionId: true,
    closedAt: true,
    adminSendingDisabledAt: true,
    adminSendingDisabledByUserId: true,
    adminSendingDisabledReason: true,
    adminSendingEnabledAt: true,
    adminSendingEnabledByUserId: true,
    practitionerSendingDisabledAt: true,
    practitionerSendingDisabledByUserId: true,
    practitionerSendingDisabledReason: true,
    practitionerSendingEnabledAt: true,
    practitionerSendingEnabledByUserId: true,
    createdAt: true,
    updatedAt: true,
    supportTicket: {
      select: {
        id: true,
      },
    },
    chatApprovalRequest: {
      select: {
        id: true,
      },
    },
    session: {
      select: {
        id: true,
        status: true,
        sessionMode: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        provider: true,
        providerRoomId: true,
        providerSessionRef: true,
      },
    },
    participants: {
      where: { isActive: true },
      select: {
        userId: true,
        participantRole: true,
        lastReadMessageId: true,
        lastReadAt: true,
      },
      orderBy: [{ participantRole: 'asc' }, { userId: 'asc' }],
    },
    messages: {
      where: {
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
      },
      orderBy: [{ sentAt: 'desc' }, { id: 'asc' }],
      take: 1,
      select: {
        id: true,
        senderUserId: true,
        messageType: true,
        contentText: true,
        sentAt: true,
      },
    },
  });

const generalChatParticipantDirectorySelect =
  Prisma.validator<Prisma.UserSelect>()({
    id: true,
    displayName: true,
    status: true,
    patientProfile: {
      select: {
        displayName: true,
      },
    },
    practitionerProfile: {
      select: {
        avatarUrl: true,
        professionalTitle: true,
        status: true,
        isPublicProfilePublished: true,
        primarySpecialtyCategory: {
          select: {
            name: true,
          },
        },
      },
    },
  });

@Injectable()
export class GeneralChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generalBoundaryWhere() {
    return {
      conversationType: ConversationType.SYSTEM,
      supportTicketId: null,
      chatApprovalRequestId: null,
    } as const;
  }

  findByConversationRef(conversationRef: string) {
    return this.prisma.conversation.findUnique({
      where: { conversationRef },
      select: generalConversationReadSelect,
    });
  }

  listOwnedConversations(input: {
    userId: string;
    page: number;
    limit: number;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where = {
      ...this.generalBoundaryWhere(),
      participants: {
        some: {
          userId: input.userId,
          isActive: true,
        },
      },
    };

    return this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: generalConversationReadSelect,
      }),
      this.prisma.conversation.count({ where }),
    ]);
  }

  findConversationByIdInGeneralScope(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        ...this.generalBoundaryWhere(),
        id: conversationId,
      },
      select: generalConversationReadSelect,
    });
  }

  findAccessibleMessageInConversationScope(input: {
    conversationId: string;
    messageId: string;
    userId: string;
  }) {
    return this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        conversation: {
          ...this.generalBoundaryWhere(),
          participants: {
            some: {
              userId: input.userId,
              isActive: true,
            },
          },
        },
      },
      select: {
        id: true,
        conversationId: true,
        senderUserId: true,
        sentAt: true,
      },
    });
  }

  createConversation(input: {
    conversationRef: string;
    patientProfileId: string;
    practitionerProfileId: string;
    patientUserId: string;
    practitionerUserId: string;
    linkedSessionId?: string | null;
  }) {
    return this.prisma.conversation.create({
      data: {
        conversationType: ConversationType.SYSTEM,
        status: ConversationStatus.OPEN,
        conversationRef: input.conversationRef,
        patientId: input.patientProfileId,
        practitionerId: input.practitionerProfileId,
        sessionId: input.linkedSessionId ?? null,
        supportTicketId: null,
        chatApprovalRequestId: null,
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
      select: generalConversationReadSelect,
    });
  }

  async appendMessageInGeneralConversation(input: {
    conversationId: string;
    senderUserId: string;
    contentText: string;
    attachments: Array<{
      fileId: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      originalName?: string;
    }>;
    sentAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderUserId: input.senderUserId,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT,
          visibility: MessageVisibility.NORMAL,
          contentText: input.contentText,
          sentAt: input.sentAt,
        },
      });

      if (input.attachments.length > 0) {
        await tx.messageAttachment.createMany({
          data: input.attachments.map((attachment) => ({
            messageId: message.id,
            fileUrl: attachment.fileUrl,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize ?? null,
            originalName: attachment.originalName ?? null,
            storageProvider: `ref:${attachment.fileId}`,
          })),
        });
      }

      const updatedConversation = await tx.conversation.update({
        where: { id: input.conversationId },
        data: {
          updatedAt: input.sentAt,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      const persistedAttachments = await tx.messageAttachment.findMany({
        where: { messageId: message.id },
        orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
        select: {
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          originalName: true,
          storageProvider: true,
        },
      });

      return {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderUserId: message.senderUserId,
          messageType: message.messageType,
          status: message.status,
          contentText: message.contentText,
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
        },
        attachments: persistedAttachments,
        conversationLatestActivityAt: updatedConversation.updatedAt,
      };
    });
  }

  async markMessageDelivered(input: {
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

  async markConversationMessagesDeliveredForRecipient(input: {
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

  async markConversationMessagesReadForRecipient(input: {
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

  markConversationReadCursor(input: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string | null;
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

  countUnreadMessagesForParticipant(input: {
    conversationId: string;
    userId: string;
    lastReadAt: Date | null;
  }) {
    return this.prisma.message.count({
      where: {
        conversationId: input.conversationId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        senderUserId: {
          not: input.userId,
        },
        ...(input.lastReadAt ? { sentAt: { gt: input.lastReadAt } } : {}),
      },
    });
  }

  updateConversationStatus(input: {
    conversationId: string;
    data: Prisma.ConversationUpdateInput | Prisma.ConversationUncheckedUpdateInput;
  }) {
    return this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: input.data,
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async countSessionUnreadForUser(input: { userId: string }) {
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
        ...this.generalBoundaryWhere(),
        sessionId: {
          not: null,
        },
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

  loadParticipantIdentityRecords(userIds: string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([] as GeneralChatParticipantDirectoryRecord[]);
    }

    return this.prisma.user.findMany({
      where: {
        id: {
          in: [...new Set(userIds)],
        },
      },
      select: generalChatParticipantDirectorySelect,
    }) as Promise<GeneralChatParticipantDirectoryRecord[]>;
  }

  loadParticipantIdentityRecord(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: generalChatParticipantDirectorySelect,
    }) as Promise<GeneralChatParticipantDirectoryRecord | null>;
  }
}
