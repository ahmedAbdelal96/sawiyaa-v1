import { Injectable } from '@nestjs/common';
import {
  ConversationStatus,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  GENERAL_CHAT_AVAILABILITY_REASONS,
  GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS,
  type GeneralChatAvailabilityViewModel,
} from '../types/general-chat.types';
import { GeneralChatModerationStateService } from './general-chat-moderation-state.service';
import { resolveSessionChatAvailability } from '@modules/sessions/utils/session-chat-policy.util';

type ModerationSnapshot = {
  status: ConversationStatus;
  closedAt: Date | null;
  adminLock: {
    disabledAt: Date | null;
    disabledByUserId: string | null;
    disabledReason: string | null;
    enabledAt: Date | null;
    enabledByUserId: string | null;
  };
  practitionerLock: {
    disabledAt: Date | null;
    disabledByUserId: string | null;
    disabledReason: string | null;
    enabledAt: Date | null;
    enabledByUserId: string | null;
  };
};

type SessionSnapshot = {
  status: SessionStatus;
  sessionMode: SessionMode;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
};

type GeneralChatAvailabilityInput = {
  conversation: ModerationSnapshot;
  linkedSession: SessionSnapshot | null;
  now?: Date;
};

@Injectable()
export class GeneralChatAvailabilityService {
  constructor(
    private readonly generalChatModerationStateService: GeneralChatModerationStateService,
  ) {}

  resolveAvailability(
    input: GeneralChatAvailabilityInput,
  ): GeneralChatAvailabilityViewModel {
    const now = input.now ?? new Date();
    const moderationState =
      this.generalChatModerationStateService.resolveConversationState(
        input.conversation,
      );

    if (moderationState.adminLockState.isActive) {
      return {
        canRead: true,
        canSend: false,
        readOnly: true,
        reason: GENERAL_CHAT_AVAILABILITY_REASONS.moderationLocked,
      };
    }

    if (moderationState.practitionerLockState.isActive) {
      return {
        canRead: true,
        canSend: false,
        readOnly: true,
        reason: GENERAL_CHAT_AVAILABILITY_REASONS.moderationLocked,
      };
    }

    if (input.linkedSession) {
      const sessionAvailability = resolveSessionChatAvailability({
        ...input.linkedSession,
        now,
      });
      return {
        canRead: true,
        canSend: sessionAvailability.canSend,
        readOnly: !sessionAvailability.canSend,
        reason: sessionAvailability.reason,
      };
    }

    if (moderationState.status === 'ARCHIVED') {
      return {
        canRead: true,
        canSend: false,
        readOnly: true,
        reason: GENERAL_CHAT_AVAILABILITY_REASONS.conversationClosed,
      };
    }

    const conversationIsOpen =
      GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS.includes(
        input.conversation.status as (typeof GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS)[number],
      );

    return {
      canRead: true,
      canSend: conversationIsOpen && moderationState.canSendMessage,
      readOnly: !(conversationIsOpen && moderationState.canSendMessage),
      reason: conversationIsOpen
        ? GENERAL_CHAT_AVAILABILITY_REASONS.allowed
        : GENERAL_CHAT_AVAILABILITY_REASONS.conversationClosed,
    };
  }
}
