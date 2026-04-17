import { ConflictException, Injectable } from '@nestjs/common';
import { ResolveCareChatActivityStateService } from './resolve-care-chat-activity-state.service';

@Injectable()
export class ValidateCareChatSendMessageService {
  constructor(
    private readonly resolveCareChatActivityStateService: ResolveCareChatActivityStateService,
  ) {}

  assertCanSend(input: {
    conversationStatus: import('@prisma/client').ConversationStatus;
    approvalStatus: import('@prisma/client').ChatApprovalStatus;
    expiresAt: Date | null;
    now: Date;
  }) {
    const state = this.resolveCareChatActivityStateService.resolve(input);
    if (state !== 'ACTIVE') {
      throw new ConflictException({
        messageKey: 'careChat.errors.conversationInactiveForSend',
        error: 'CARE_CHAT_CONVERSATION_INACTIVE',
        messageParams: {
          state,
        },
      });
    }
  }
}
