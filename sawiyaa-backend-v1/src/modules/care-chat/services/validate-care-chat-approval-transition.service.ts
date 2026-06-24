import { ConflictException, Injectable } from '@nestjs/common';
import { ChatApprovalStatus } from '@prisma/client';
import { CareChatRequestDecision } from '../types/care-chat.types';

@Injectable()
export class ValidateCareChatApprovalTransitionService {
  assertDecisionAllowed(input: {
    currentStatus: ChatApprovalStatus;
    decision: CareChatRequestDecision;
  }) {
    if (input.currentStatus !== ChatApprovalStatus.PENDING) {
      throw new ConflictException({
        messageKey: 'careChat.errors.invalidApprovalDecisionTransition',
        error: 'CARE_CHAT_INVALID_DECISION_TRANSITION',
      });
    }

    if (input.decision !== 'APPROVE' && input.decision !== 'REJECT') {
      throw new ConflictException({
        messageKey: 'careChat.errors.invalidApprovalDecisionTransition',
        error: 'CARE_CHAT_INVALID_DECISION_TRANSITION',
      });
    }
  }

  assertRevokeAllowed(currentStatus: ChatApprovalStatus) {
    if (currentStatus !== ChatApprovalStatus.APPROVED) {
      throw new ConflictException({
        messageKey: 'careChat.errors.invalidRevokeTransition',
        error: 'CARE_CHAT_INVALID_REVOKE_TRANSITION',
      });
    }
  }
}
