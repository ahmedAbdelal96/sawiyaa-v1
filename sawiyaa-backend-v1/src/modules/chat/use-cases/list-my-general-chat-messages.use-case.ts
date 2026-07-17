import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListGeneralChatMessagesDto } from '../dto/list-general-chat-messages.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { MessagingUseCase } from '@modules/messaging/use-cases/messaging.use-case';

@Injectable()
export class ListMyGeneralChatMessagesUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
    private readonly messagingUseCase: MessagingUseCase,
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

    const page = Math.max(1, input.query.page ?? 1);
    const limit = Math.min(50, Math.max(1, input.query.limit ?? 30));
    const canonicalConversation = await this.messagingUseCase.getConversation(
      input.authenticatedUser,
      input.conversationId,
    );
    const result = await this.messagingUseCase.listMessages(
      input.authenticatedUser,
      input.conversationId,
      page,
      limit,
    );

    return {
      items: result.items.map((message) => ({
        messageId: message.id,
        conversationId: input.conversationId,
        senderUserId: message.sender.userId,
        messageType: message.messageType,
        status: message.status,
        contentText: message.body,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        attachments: message.attachments.map((attachment) => ({
          fileId: attachment.id,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize ?? null,
          originalName: attachment.originalName ?? null,
        })),
        conversationLatestActivityAt: canonicalConversation.item.updatedAt,
        senderIdentity: message.sender,
      })),
      pagination: result.pagination,
    };
  }
}
