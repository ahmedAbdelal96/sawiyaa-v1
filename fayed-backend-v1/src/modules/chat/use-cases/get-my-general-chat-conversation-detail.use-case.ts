import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

@Injectable()
export class GetMyGeneralChatConversationDetailUseCase {
  constructor(private readonly generalChatRepository: GeneralChatRepository) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
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

    const viewerParticipant = conversation.participants.find(
      (participant) => participant.userId === input.authenticatedUser.id,
    );

    if (!viewerParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationAccessDenied',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
      });
    }

    const latestMessage = conversation.messages[0] ?? null;
    const latestActivityAt = latestMessage
      ? latestMessage.sentAt
      : conversation.updatedAt;
    const unreadCount =
      await this.generalChatRepository.countUnreadMessagesForParticipant({
        conversationId: input.conversationId,
        userId: input.authenticatedUser.id,
        lastReadAt: viewerParticipant.lastReadAt,
      });

    return {
      item: {
        conversationId: conversation.id,
        conversationRef: conversation.conversationRef ?? '',
        status: conversation.status,
        linkedSessionId: conversation.sessionId,
        participants: conversation.participants.map((participant) => ({
          userId: participant.userId,
          role: participant.participantRole,
        })),
        createdAt: conversation.createdAt.toISOString(),
        latestActivityAt: latestActivityAt.toISOString(),
        latestMessage: latestMessage
          ? {
              messageId: latestMessage.id,
              senderUserId: latestMessage.senderUserId,
              messageType: latestMessage.messageType,
              previewText: latestMessage.contentText,
              sentAt: latestMessage.sentAt.toISOString(),
            }
          : null,
        hasMessages: Boolean(latestMessage),
        unreadCount,
        hasUnread: unreadCount > 0,
        lastReadMessageId: viewerParticipant.lastReadMessageId,
        lastReadAt: viewerParticipant.lastReadAt
          ? viewerParticipant.lastReadAt.toISOString()
          : null,
      },
    };
  }
}
