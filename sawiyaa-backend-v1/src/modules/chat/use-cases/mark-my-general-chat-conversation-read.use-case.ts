import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MarkGeneralChatConversationReadDto } from '../dto/mark-general-chat-conversation-read.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { MessagingUseCase } from '@modules/messaging/use-cases/messaging.use-case';

@Injectable()
export class MarkMyGeneralChatConversationReadUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly messagingUseCase: MessagingUseCase,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
    dto: MarkGeneralChatConversationReadDto;
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

    const participant = conversation.participants.find(
      (row) => row.userId === input.authenticatedUser.id,
    );
    if (!participant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationAccessDenied',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
      });
    }

    const requestedLastReadMessageId =
      input.dto.lastReadMessageId ?? conversation.messages[0]?.id ?? null;
    if (!requestedLastReadMessageId) {
      return {
        item: {
          conversationId: input.conversationId,
          lastReadMessageId: participant.lastReadMessageId,
          lastReadAt: participant.lastReadAt?.toISOString() ?? null,
          unreadCount: 0,
          hasUnread: false,
        },
      };
    }

    return this.messagingUseCase.markRead(
      input.authenticatedUser,
      input.conversationId,
      requestedLastReadMessageId,
    );
  }
}
