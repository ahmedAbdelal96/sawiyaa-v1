import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MarkGeneralChatConversationReadDto } from '../dto/mark-general-chat-conversation-read.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

@Injectable()
export class MarkMyGeneralChatConversationReadUseCase {
  constructor(private readonly generalChatRepository: GeneralChatRepository) {}

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

    void input.dto;

    const latestMessage = conversation.messages[0] ?? null;
    const nextLastReadMessageId = latestMessage?.id ?? null;
    const shouldAdvanceReadCursor =
      nextLastReadMessageId !== null &&
      participant.lastReadMessageId !== nextLastReadMessageId;

    let effectiveLastReadMessageId = participant.lastReadMessageId;
    let effectiveLastReadAt = participant.lastReadAt;

    if (shouldAdvanceReadCursor) {
      const now = new Date();
      await this.generalChatRepository.markConversationReadCursor({
        conversationId: input.conversationId,
        userId: input.authenticatedUser.id,
        lastReadMessageId: nextLastReadMessageId,
        lastReadAt: now,
      });
      effectiveLastReadMessageId = nextLastReadMessageId;
      effectiveLastReadAt = now;
    }

    const unreadCount =
      await this.generalChatRepository.countUnreadMessagesForParticipant({
        conversationId: input.conversationId,
        userId: input.authenticatedUser.id,
        lastReadAt: effectiveLastReadAt,
      });

    return {
      item: {
        conversationId: input.conversationId,
        lastReadMessageId: effectiveLastReadMessageId,
        lastReadAt: effectiveLastReadAt ? effectiveLastReadAt.toISOString() : null,
        unreadCount,
        hasUnread: unreadCount > 0,
      },
    };
  }
}
