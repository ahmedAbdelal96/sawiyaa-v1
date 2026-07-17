import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConversationParticipantRole,
  ConversationType,
  MessageStatus,
  MessageType,
  MessageVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MessagingActor, MessagingConversationRecord } from '../types/messaging.types';

@Injectable()
export class MessagingRepository {
  constructor(private readonly prisma: PrismaService) {}

  static async createInitialMessage(
    tx: Prisma.TransactionClient,
    input: {
      conversationId: string;
      senderUserId: string | null;
      messageType?: MessageType;
      contentText: string;
    },
  ) {
    const contentText = input.contentText.trim();
    if (!contentText) {
      throw new Error('MESSAGING_INITIAL_MESSAGE_REQUIRED');
    }
    const message = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        senderUserId: input.senderUserId,
        messageType: input.messageType ?? MessageType.TEXT,
        status: MessageStatus.SENT,
        visibility: MessageVisibility.NORMAL,
        contentText,
      },
      select: {
        id: true,
        conversationId: true,
        senderUserId: true,
        messageType: true,
        status: true,
        contentText: true,
        sentAt: true,
      },
    });
    await tx.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: message.sentAt },
    });
    return message;
  }

  async findConversation(conversationId: string): Promise<MessagingConversationRecord | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: this.conversationSelect(),
    }) as unknown as Promise<MessagingConversationRecord | null>;
  }

  async listConversations(actor: MessagingActor, page: number, limit: number) {
    const isSupportStaff = actor.roles.some((role) =>
      [
        'ADMIN' as never,
        'SUPER_ADMIN' as never,
        'SUPPORT_AGENT' as never,
      ].includes(role as never),
    );
    const where: Prisma.ConversationWhereInput = isSupportStaff
      ? { conversationType: ConversationType.SUPPORT }
      : { participants: { some: { userId: actor.id, isActive: true } } };
    const skip = (page - 1) * limit;
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: this.conversationSelect(),
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { items: items as unknown as MessagingConversationRecord[], totalItems };
  }

  async listMessages(conversationId: string, page: number, limit: number) {
    const where = {
      conversationId,
      deletedAt: null,
      visibility: MessageVisibility.NORMAL,
    } as const;
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          conversationId: true,
          senderUserId: true,
          messageType: true,
          status: true,
          contentText: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          attachments: {
            orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              fileUrl: true,
              mimeType: true,
              fileSize: true,
              originalName: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);
    return { items, totalItems };
  }

  async appendMessage(input: {
    conversationId: string;
    senderUserId: string;
    senderRole: ConversationParticipantRole;
    message: string;
    attachments?: Array<{
      fileId: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      originalName?: string;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderUserId: input.senderUserId,
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT,
          visibility: MessageVisibility.NORMAL,
          contentText: input.message,
        },
        select: {
          id: true,
          conversationId: true,
          senderUserId: true,
          messageType: true,
          status: true,
          contentText: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
        },
      });
      if (input.attachments?.length) {
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
      await tx.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: message.sentAt },
      });
      if (input.senderRole !== ConversationParticipantRole.SUPPORT_AGENT &&
          input.senderRole !== ConversationParticipantRole.ADMIN) {
        await tx.conversationParticipant.updateMany({
          where: { conversationId: input.conversationId, userId: input.senderUserId, isActive: true },
          data: { lastReadMessageId: message.id, lastReadAt: message.sentAt },
        });
      }
      return message;
    });
  }

  async markRead(input: { conversationId: string; userId: string; messageId: string }) {
    const target = await this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
      },
      select: { id: true, senderUserId: true, sentAt: true },
    });
    if (!target) throw new NotFoundException({ messageKey: 'messages.errors.messageNotFound', errorCode: 'MESSAGING_MESSAGE_NOT_FOUND' });
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId: input.conversationId, userId: input.userId, isActive: true },
      select: { lastReadMessageId: true, lastReadAt: true },
    });
    if (!participant) return { lastReadMessageId: null, lastReadAt: null, unreadCount: 0 };
    const current = participant.lastReadAt?.getTime() ?? -1;
    if (target.senderUserId !== input.userId && target.sentAt.getTime() > current) {
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.conversationParticipant.updateMany({
          where: { conversationId: input.conversationId, userId: input.userId, isActive: true },
          data: { lastReadMessageId: target.id, lastReadAt: now },
        }),
        this.prisma.message.updateMany({
          where: {
            conversationId: input.conversationId,
            senderUserId: { not: input.userId },
            status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
            deletedAt: null,
            visibility: MessageVisibility.NORMAL,
            sentAt: { lte: target.sentAt },
          },
          data: { status: MessageStatus.READ, deliveredAt: now, readAt: now },
        }),
      ]);
      return { lastReadMessageId: target.id, lastReadAt: now };
    }
    return { lastReadMessageId: participant.lastReadMessageId, lastReadAt: participant.lastReadAt };
  }

  async markMessageDelivered(input: {
    conversationId: string;
    messageId: string;
    deliveredAt: Date;
  }) {
    const message = await this.prisma.message.findFirst({
      where: { id: input.messageId, conversationId: input.conversationId },
      select: { id: true, status: true },
    });
    if (!message || message.status !== MessageStatus.SENT) return null;
    return this.prisma.message.update({
      where: { id: input.messageId },
      data: { status: MessageStatus.DELIVERED, deliveredAt: input.deliveredAt },
      select: { id: true, conversationId: true, deliveredAt: true },
    });
  }

  async markMessagesDeliveredForRecipient(input: {
    conversationId: string;
    recipientUserId: string;
    deliveredAt: Date;
  }) {
    const pending = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        senderUserId: { not: input.recipientUserId },
        status: MessageStatus.SENT,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
      },
      select: { id: true },
      orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
    });
    if (pending.length === 0) return [];
    await this.prisma.message.updateMany({
      where: { id: { in: pending.map((item) => item.id) } },
      data: { status: MessageStatus.DELIVERED, deliveredAt: input.deliveredAt },
    });
    return pending.map((item) => ({
      messageId: item.id,
      conversationId: input.conversationId,
      deliveredAt: input.deliveredAt,
    }));
  }

  async countUnread(conversationId: string, userId: string, lastReadAt: Date | null) {
    return this.prisma.message.count({
      where: {
        conversationId,
        senderUserId: { not: userId },
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        ...(lastReadAt ? { sentAt: { gt: lastReadAt } } : {}),
      },
    });
  }

  async countSupportNeedsReply() {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        conversationType: ConversationType.SUPPORT,
        status: { notIn: ['CLOSED'] },
        supportTicket: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
      },
      select: {
        messages: {
          where: { deletedAt: null, visibility: MessageVisibility.NORMAL },
          orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { senderUserId: true },
        },
        participants: {
          where: { isActive: true },
          select: { userId: true, participantRole: true },
        },
      },
    });

    return (conversations as Array<{
      messages: Array<{ senderUserId: string | null }>;
      participants: Array<{
        userId: string;
        participantRole: ConversationParticipantRole;
      }>;
    }>).filter((conversation) => {
      const latestSenderId = conversation.messages[0]?.senderUserId;
      if (!latestSenderId) return true;
      const sender = conversation.participants.find(
        (participant) => participant.userId === latestSenderId,
      );
      return sender?.participantRole === ConversationParticipantRole.PATIENT ||
        sender?.participantRole === ConversationParticipantRole.PRACTITIONER;
    }).length;
  }

  async loadUsers(userIds: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        displayName: true,
        patientProfile: { select: { displayName: true } },
        practitionerProfile: { select: { avatarUrl: true, professionalTitle: true } },
      },
    });
  }

  private conversationSelect(): any {
    return {
      id: true,
      conversationType: true,
      status: true,
      sessionId: true,
      supportTicketId: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      expiresAt: true,
      adminSendingDisabledAt: true,
      adminSendingEnabledAt: true,
      practitionerSendingDisabledAt: true,
      practitionerSendingEnabledAt: true,
      participants: {
        where: { isActive: true },
        select: { userId: true, participantRole: true, lastReadMessageId: true, lastReadAt: true },
      },
      messages: {
        where: { deletedAt: null, visibility: MessageVisibility.NORMAL },
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        take: 50,
        select: { id: true, senderUserId: true, messageType: true, status: true, contentText: true, sentAt: true, deliveredAt: true, readAt: true },
      },
      session: { select: { status: true } },
      supportTicket: { select: { status: true, subject: true } },
      chatApprovalRequest: { select: { status: true, expiresAt: true } },
    };
  }
}
