import { ChatApprovalStatus } from '@prisma/client';
import { ValidateCareChatApprovalTransitionService } from './validate-care-chat-approval-transition.service';

describe('ValidateCareChatApprovalTransitionService', () => {
  const service = new ValidateCareChatApprovalTransitionService();

  it('allows approve/reject only from pending', () => {
    expect(() =>
      service.assertDecisionAllowed({
        currentStatus: ChatApprovalStatus.PENDING,
        decision: 'APPROVE',
      }),
    ).not.toThrow();
    expect(() =>
      service.assertDecisionAllowed({
        currentStatus: ChatApprovalStatus.PENDING,
        decision: 'REJECT',
      }),
    ).not.toThrow();
  });

  it('rejects decision when current status is not pending', () => {
    expect(() =>
      service.assertDecisionAllowed({
        currentStatus: ChatApprovalStatus.APPROVED,
        decision: 'REJECT',
      }),
    ).toThrow();
  });

  it('allows revoke only from approved', () => {
    expect(() =>
      service.assertRevokeAllowed(ChatApprovalStatus.APPROVED),
    ).not.toThrow();
    expect(() =>
      service.assertRevokeAllowed(ChatApprovalStatus.PENDING),
    ).toThrow();
  });
});
