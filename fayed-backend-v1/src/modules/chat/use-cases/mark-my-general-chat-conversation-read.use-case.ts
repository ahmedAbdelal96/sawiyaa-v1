import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const requestedLastReadMessageId = input.dto.lastReadMessageId ?? null;
    const fallbackLatestMessage = conversation.messages[0] ?? null;
    const nextLastReadMessageId =
      requestedLastReadMessageId ?? fallbackLatestMessage?.id ?? null;

    let effectiveLastReadMessageId = participant.lastReadMessageId;
    let effectiveLastReadAt = participant.lastReadAt;

    if (
      nextLastReadMessageId &&
      participant.lastReadMessageId !== nextLastReadMessageId
    ) {
      const readTarget =
        await this.generalChatRepository.findAccessibleMessageInConversationScope(
          {
            conversationId: input.conversationId,
            messageId: nextLastReadMessageId,
            userId: input.authenticatedUser.id,
          },
        );

      if (!readTarget) {
        throw new NotFoundException({
          messageKey: 'chat.errors.messageNotFound',
          errorCode: GENERAL_CHAT_ERROR_CODES.messageNotFound,
        });
      }

      // Read cursor only advances on incoming messages.
      if (readTarget.senderUserId !== input.authenticatedUser.id) {
        let canAdvanceReadCursor = true;

        if (participant.lastReadMessageId) {
          const currentReadCursor =
            await this.generalChatRepository.findAccessibleMessageInConversationScope(
              {
                conversationId: input.conversationId,
                messageId: participant.lastReadMessageId,
                userId: input.authenticatedUser.id,
              },
            );

          if (currentReadCursor) {
            canAdvanceReadCursor =
              readTarget.sentAt.getTime() >
                currentReadCursor.sentAt.getTime() ||
              (readTarget.sentAt.getTime() ===
                currentReadCursor.sentAt.getTime() &&
                readTarget.id !== currentReadCursor.id);
          }
        }

        if (canAdvanceReadCursor) {
          const now = new Date();
          await this.generalChatRepository.markConversationReadCursor({
            conversationId: input.conversationId,
            userId: input.authenticatedUser.id,
            lastReadMessageId: nextLastReadMessageId,
            lastReadAt: now,
          });
          await this.generalChatRepository.markConversationMessagesReadForRecipient(
            {
              conversationId: input.conversationId,
              recipientUserId: input.authenticatedUser.id,
              lastReadMessageSentAt: readTarget.sentAt,
              readAt: now,
            },
          );
          effectiveLastReadMessageId = nextLastReadMessageId;
          effectiveLastReadAt = now;
        }
      }
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
        lastReadAt: effectiveLastReadAt
          ? effectiveLastReadAt.toISOString()
          : null,
        unreadCount,
        hasUnread: unreadCount > 0,
      },
    };
  }
}
