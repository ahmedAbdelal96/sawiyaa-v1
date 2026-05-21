import { Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import {
  AdminGeneralChatConversationStatus,
  AdminGeneralChatLockOwner,
  AdminGeneralChatMessagePreviewType,
  GENERAL_CHAT_SENDABLE_CONVERSATION_STATUSES,
} from '../types/admin-general-chat.types';

type ModerationLockInput = {
  disabledAt: Date | null;
  disabledByUserId: string | null;
  disabledReason: string | null;
  enabledAt: Date | null;
  enabledByUserId: string | null;
};

type ConversationModerationSnapshot = {
  status: ConversationStatus;
  closedAt: Date | null;
  adminLock: ModerationLockInput;
  practitionerLock: ModerationLockInput;
};

type MessagePreviewCandidate = {
  contentText: string | null;
  attachments: Array<unknown>;
};

@Injectable()
export class GeneralChatModerationStateService {
  resolveConversationState(input: ConversationModerationSnapshot) {
    const adminLockState = this.resolveLockState(input.adminLock);
    const practitionerLockState = this.resolveLockState(
      input.practitionerLock,
    );
    const isLifecycleSendable =
      GENERAL_CHAT_SENDABLE_CONVERSATION_STATUSES.includes(input.status);

    const status = this.resolveStatus({
      status: input.status,
      adminLockState,
      practitionerLockState,
    });
    const canSendMessage =
      isLifecycleSendable &&
      !adminLockState.isActive &&
      !practitionerLockState.isActive;

    const closedBy: AdminGeneralChatLockOwner | null = adminLockState.isActive
      ? 'ADMIN'
      : practitionerLockState.isActive
        ? 'PRACTITIONER'
        : null;

    const closedAt =
      adminLockState.isActive
        ? adminLockState.disabledAt
        : practitionerLockState.isActive
          ? practitionerLockState.disabledAt
          : input.closedAt;

    const closeReason =
      adminLockState.isActive
        ? adminLockState.disabledReason
        : practitionerLockState.isActive
          ? practitionerLockState.disabledReason
          : null;

    return {
      status,
      canSendMessage,
      closedBy,
      closedAt,
      closeReason,
      adminLockState,
      practitionerLockState,
      isLifecycleSendable,
    };
  }

  resolveMessagePreviewType(
    message: MessagePreviewCandidate | null | undefined,
  ): AdminGeneralChatMessagePreviewType {
    if (!message) {
      return 'NO_MESSAGES';
    }

    const hasText = Boolean(message.contentText?.trim());
    const hasAttachments = message.attachments.length > 0;

    if (hasText && hasAttachments) {
      return 'TEXT_WITH_ATTACHMENT';
    }

    if (hasAttachments) {
      return 'ATTACHMENT';
    }

    return 'TEXT_MESSAGE';
  }

  resolveLockState(input: ModerationLockInput) {
    const isActive = Boolean(input.disabledAt);

    return {
      isActive,
      disabledAt: input.disabledAt,
      disabledByUserId: input.disabledByUserId,
      disabledReason: input.disabledReason,
      enabledAt: input.enabledAt,
      enabledByUserId: input.enabledByUserId,
    };
  }

  private resolveStatus(input: {
    status: ConversationStatus;
    adminLockState: { isActive: boolean };
    practitionerLockState: { isActive: boolean };
  }): AdminGeneralChatConversationStatus {
    if (input.adminLockState.isActive) {
      return 'SENDING_DISABLED';
    }

    if (input.practitionerLockState.isActive) {
      return 'CLOSED_BY_PRACTITIONER';
    }

    if (
      input.status === ConversationStatus.CLOSED ||
      input.status === ConversationStatus.EXPIRED ||
      input.status === ConversationStatus.SUSPENDED
    ) {
      return 'ARCHIVED';
    }

    return 'ACTIVE';
  }
}
