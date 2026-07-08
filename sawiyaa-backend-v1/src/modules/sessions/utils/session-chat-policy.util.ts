import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import {
  GENERAL_CHAT_AVAILABILITY_REASONS,
  type GeneralChatAvailabilityReason,
  type GeneralChatAvailabilityViewModel,
} from '@modules/chat/types/general-chat.types';
import {
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
  resolveSessionPresentationStatus,
} from './session-join-policy.util';

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

function resolveSessionChatReason(
  presentationStatus:
    | 'UPCOMING'
    | 'JOINABLE'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'ENDED'
    | 'UNAVAILABLE'
    | 'NO_SHOW'
    | 'UNDER_REVIEW',
): GeneralChatAvailabilityReason {
  switch (presentationStatus) {
    case 'JOINABLE':
    case 'IN_PROGRESS':
      return GENERAL_CHAT_AVAILABILITY_REASONS.allowed;
    case 'COMPLETED':
    case 'ENDED':
    case 'NO_SHOW':
    case 'UNDER_REVIEW':
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionEnded;
    case 'CANCELLED':
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionCancelled;
    case 'UPCOMING':
    case 'UNAVAILABLE':
    default:
      return GENERAL_CHAT_AVAILABILITY_REASONS.sessionNotStarted;
  }
}

export function resolveSessionChatAvailability(
  input: SessionChatPolicyInput,
): GeneralChatAvailabilityViewModel {
  const presentationStatus = resolveSessionPresentationStatus({
    status: input.status,
    sessionMode: input.sessionMode,
    scheduledStartAt: input.scheduledStartAt,
    scheduledEndAt: input.scheduledEndAt,
    provider: input.provider,
    providerRoomId: input.providerRoomId,
    providerSessionRef: input.providerSessionRef,
    videoRoomClosedAt: input.videoRoomClosedAt,
    now: input.now,
    runtimePrepareLeadMinutes:
      input.runtimePrepareLeadMinutes ?? DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
  });

  const canSend =
    presentationStatus === 'JOINABLE' || presentationStatus === 'IN_PROGRESS';
  const canRead =
    presentationStatus === 'JOINABLE' ||
    presentationStatus === 'IN_PROGRESS' ||
    presentationStatus === 'COMPLETED' ||
    presentationStatus === 'ENDED' ||
    presentationStatus === 'CANCELLED';

  return {
    canRead,
    canSend,
    readOnly: !canSend,
    reason: resolveSessionChatReason(presentationStatus),
  };
}
