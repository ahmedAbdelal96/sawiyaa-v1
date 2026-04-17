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

const generalConversationReadSelect = Prisma.validator<Prisma.ConversationSelect>()({
  id: true,
  conversationRef: true,
  status: true,
  sessionId: true,
  createdAt: true,
  updatedAt: true,
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
      include: {
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
        participants: {
          where: { isActive: true },
          select: {
            userId: true,
            participantRole: true,
          },
          orderBy: [{ participantRole: 'asc' }, { userId: 'asc' }],
        },
      },
    });
  }

  listOwnedConversations(input: { userId: string; page: number; limit: number }) {
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
      include: {
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
        participants: {
          where: { isActive: true },
          select: {
            userId: true,
            participantRole: true,
          },
          orderBy: [{ participantRole: 'asc' }, { userId: 'asc' }],
        },
      },
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
          contentText: message.contentText,
          sentAt: message.sentAt,
        },
        attachments: persistedAttachments,
        conversationLatestActivityAt: updatedConversation.updatedAt,
      };
    });
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
}
