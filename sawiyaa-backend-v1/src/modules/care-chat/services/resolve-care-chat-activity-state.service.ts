import { Injectable } from '@nestjs/common';
import { ChatApprovalStatus, ConversationStatus } from '@prisma/client';
import { CareChatActivityState } from '../types/care-chat.types';

@Injectable()
export class ResolveCareChatActivityStateService {
  resolve(input: {
    conversationStatus: ConversationStatus;
    approvalStatus: ChatApprovalStatus;
    expiresAt: Date | null;
    now: Date;
  }): CareChatActivityState {
    if (
      input.approvalStatus === ChatApprovalStatus.REVOKED ||
      input.conversationStatus === ConversationStatus.SUSPENDED
    ) {
      return 'REVOKED';
    }

    if (
      input.conversationStatus === ConversationStatus.CLOSED ||
      input.approvalStatus === ChatApprovalStatus.CANCELLED
    ) {
      return 'CLOSED';
    }

    if (
      input.conversationStatus === ConversationStatus.EXPIRED ||
      input.approvalStatus === ChatApprovalStatus.EXPIRED ||
      (input.expiresAt !== null && input.expiresAt <= input.now)
    ) {
      return 'EXPIRED';
    }

    return 'ACTIVE';
  }
}
