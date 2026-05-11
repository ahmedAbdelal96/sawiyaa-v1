import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageVisibility } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListGeneralChatMessagesDto } from '../dto/list-general-chat-messages.dto';
import {
  buildGeneralChatParticipantDirectoryMap,
  resolveGeneralChatMessageSenderIdentity,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

@Injectable()
export class ListMyGeneralChatMessagesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
    query: ListGeneralChatMessagesDto;
  }) {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        input.conversationId,
      );

    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotFound,
      });
    }

    this.conversationAccessPolicy.assertParticipant({
      participants: conversation.participants,
      requesterId: input.authenticatedUser.id,
    });

    const participantDirectoryRecords =
      (await this.generalChatRepository.loadParticipantIdentityRecords?.(
        conversation.participants.map((participant) => participant.userId),
      )) ?? [];
    const participantDirectory = buildGeneralChatParticipantDirectoryMap(
      participantDirectoryRecords,
    );

    const page = Math.max(1, input.query.page ?? 1);
    const limit = Math.min(50, Math.max(1, input.query.limit ?? 30));
    const skip = (page - 1) * limit;

    const where = {
      conversationId: input.conversationId,
      deletedAt: null,
      visibility: MessageVisibility.NORMAL,
    } as const;

    const [messages, totalItems] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip,
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
              fileUrl: true,
              mimeType: true,
              fileSize: true,
              originalName: true,
              storageProvider: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      items: messages.map((message) => ({
        messageId: message.id,
        conversationId: message.conversationId,
        senderUserId: message.senderUserId,
        messageType: message.messageType,
        status: message.status,
        contentText: message.contentText,
        sentAt: message.sentAt.toISOString(),
        deliveredAt: message.deliveredAt?.toISOString() ?? null,
        readAt: message.readAt?.toISOString() ?? null,
        attachments: message.attachments.map((attachment) => ({
          fileId: this.extractFileId(attachment.storageProvider),
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize ?? null,
          originalName: attachment.originalName ?? null,
        })),
        conversationLatestActivityAt: conversation.updatedAt.toISOString(),
        senderIdentity: resolveGeneralChatMessageSenderIdentity(
          message.senderUserId,
          conversation.participants,
          participantDirectory,
        ),
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  private extractFileId(storageProvider: string | null): string {
    if (!storageProvider) return '';
    if (storageProvider.startsWith('ref:')) return storageProvider.slice(4);
    return storageProvider;
  }
}
