import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';

@Injectable()
export class DisableAdminGeneralChatConversationUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
  ) {}

  async execute(input: {
    conversationId: string;
    userId: string;
    reason: string;
    note?: string;
  }) {
    const updated = await this.adminGeneralChatRepository.updateConversationModeration(
      {
        conversationId: input.conversationId,
        data: {
          adminSendingDisabledAt: new Date(),
          adminSendingDisabledByUserId: input.userId,
          adminSendingDisabledReason: input.reason,
        },
      },
    );

    if (!updated) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: 'GENERAL_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    return updated;
  }
}

