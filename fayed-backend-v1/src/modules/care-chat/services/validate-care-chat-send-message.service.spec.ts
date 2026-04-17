import { ChatApprovalStatus, ConversationStatus } from '@prisma/client';
import { ResolveCareChatActivityStateService } from './resolve-care-chat-activity-state.service';
import { ValidateCareChatSendMessageService } from './validate-care-chat-send-message.service';

describe('ValidateCareChatSendMessageService', () => {
  const service = new ValidateCareChatSendMessageService(
    new ResolveCareChatActivityStateService(),
  );

  it('allows sending when conversation is active', () => {
    expect(() =>
      service.assertCanSend({
        conversationStatus: ConversationStatus.OPEN,
        approvalStatus: ChatApprovalStatus.APPROVED,
        expiresAt: new Date(Date.now() + 3600_000),
        now: new Date(),
      }),
    ).not.toThrow();
  });

  it('blocks sending for revoked approval', () => {
    expect(() =>
      service.assertCanSend({
        conversationStatus: ConversationStatus.SUSPENDED,
        approvalStatus: ChatApprovalStatus.REVOKED,
        expiresAt: null,
        now: new Date(),
      }),
    ).toThrow();
  });
});
