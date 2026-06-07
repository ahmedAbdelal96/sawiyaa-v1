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
import {
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
  resolveSessionPresentationStatus,
} from '@modules/sessions/utils/session-join-policy.util';

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
      const presentationStatus = resolveSessionPresentationStatus({
        status: input.linkedSession.status,
        sessionMode: input.linkedSession.sessionMode,
        scheduledStartAt: input.linkedSession.scheduledStartAt,
        scheduledEndAt: input.linkedSession.scheduledEndAt,
        provider: input.linkedSession.provider,
        providerRoomId: input.linkedSession.providerRoomId,
        providerSessionRef: input.linkedSession.providerSessionRef,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      });

      if (presentationStatus === 'JOINABLE' || presentationStatus === 'IN_PROGRESS') {
        return {
          canRead: true,
          canSend: true,
          readOnly: false,
          reason: GENERAL_CHAT_AVAILABILITY_REASONS.allowed,
        };
      }

      if (presentationStatus === 'COMPLETED' || presentationStatus === 'ENDED') {
        return {
          canRead: true,
          canSend: false,
          readOnly: true,
          reason: GENERAL_CHAT_AVAILABILITY_REASONS.sessionEnded,
        };
      }

      if (presentationStatus === 'CANCELLED') {
        return {
          canRead: true,
          canSend: false,
          readOnly: true,
          reason: GENERAL_CHAT_AVAILABILITY_REASONS.sessionCancelled,
        };
      }

      return {
        canRead: false,
        canSend: false,
        readOnly: true,
        reason: GENERAL_CHAT_AVAILABILITY_REASONS.sessionNotStarted,
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
