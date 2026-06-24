import { ForbiddenException, Injectable } from '@nestjs/common';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

/**
 * Object-level authorization for general chat Conversation resources.
 *
 * Centralises the inline participant checks that are repeated across:
 * - ListMyGeneralChatMessagesUseCase
 * - GetMyGeneralChatConversationDetailUseCase
 * - SendGeneralChatMessageUseCase
 * - ReportGeneralChatTargetUseCase
 */
@Injectable()
export class ConversationAccessPolicy {
  assertParticipant(input: {
    participants: { userId: string }[];
    requesterId: string;
  }): void {
    const isParticipant = input.participants.some(
      (p) => p.userId === input.requesterId,
    );
    if (!isParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationAccessDenied',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
      });
    }
  }
}
