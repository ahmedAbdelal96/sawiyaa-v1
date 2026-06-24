import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';

@Injectable()
export class EnableAdminGeneralChatConversationUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
  ) {}

  async execute(input: {
    conversationId: string;
    userId: string;
    note?: string;
  }) {
    const updated = await this.adminGeneralChatRepository.updateConversationModeration(
      {
        conversationId: input.conversationId,
        data: {
          adminSendingDisabledAt: null,
          adminSendingDisabledByUserId: null,
          adminSendingDisabledReason: null,
          adminSendingEnabledAt: new Date(),
          adminSendingEnabledByUserId: input.userId,
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

