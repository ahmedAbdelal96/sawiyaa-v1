import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import {
  GENERAL_CHAT_AVAILABILITY_REASONS,
  type GeneralChatAvailabilityReason,
  type GeneralChatAvailabilityViewModel,
} from '@modules/chat/types/general-chat.types';

export interface SessionChatPolicyInput {
  status: SessionStatus;
  sessionMode: SessionMode;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  videoRoomClosedAt?: Date | null;
  now: Date;
  runtimePrepareLeadMinutes?: number;
}

function resolveSessionChatReason(status: SessionStatus): GeneralChatAvailabilityReason {
  switch (status) {
    case SessionStatus.READY_TO_JOIN:
    case SessionStatus.IN_PROGRESS:
      return GENERAL_CHAT_AVAILABILITY_REASONS.allowed;
    case SessionStatus.COMPLETED:
    case SessionStatus.AWAITING_COMPLETION_CONFIRMATION:
    case SessionStatus.PATIENT_NO_SHOW:
    case SessionStatus.PRACTITIONER_NO_SHOW:
    case SessionStatus.BOTH_NO_SHOW:
    case SessionStatus.EXPIRED:
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionEnded;
    case SessionStatus.CANCELLED:
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionCancelled;
    default:
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionNotStarted;
  }
}

export function resolveSessionChatAvailability(
  input: SessionChatPolicyInput,
): GeneralChatAvailabilityViewModel {
  const canSend =
    input.status === SessionStatus.READY_TO_JOIN || input.status === SessionStatus.IN_PROGRESS;
  // Reading is broader than sending, but it still requires a confirmed session
  // lifecycle. The caller separately enforces that the viewer is a participant.
  const canRead = ([
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
    SessionStatus.IN_PROGRESS,
    SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
    SessionStatus.AWAITING_ADMIN_RESOLUTION,
    SessionStatus.COMPLETED,
    SessionStatus.CANCELLED,
    SessionStatus.PATIENT_NO_SHOW,
    SessionStatus.PRACTITIONER_NO_SHOW,
    SessionStatus.BOTH_NO_SHOW,
    SessionStatus.EXPIRED,
  ] as SessionStatus[]).includes(input.status);

  return {
    canRead,
    canSend,
    readOnly: !canSend,
    reason: resolveSessionChatReason(input.status),
  };
}
