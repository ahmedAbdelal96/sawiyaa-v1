import { SessionMode, SessionStatus } from '@prisma/client';
import { GeneralChatAvailabilityViewModel } from '@modules/chat/types/general-chat.types';
import {
  SessionJoinBlockedReason,
  SessionPresentationStatus,
} from './session-video.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';

/**
 * Session view-model types keep API contracts stable while the persistence model remains richer for later integrations.
 */
export interface SessionListItemViewModel {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
  createdAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  patient: {
    id: string;
    displayName: string | null;
  } | null;
  joinAvailability: SessionJoinAvailabilityViewModel;
  actions: PatientSessionActionsViewModel;
  chatAvailability: GeneralChatAvailabilityViewModel;
  unreadCount?: number;
  hasUnread?: boolean;
}

export interface SessionDetailsViewModel extends SessionListItemViewModel {
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
  videoRoomClosedAt: string | null;
  videoRoomCloseReason: string | null;
  videoRoomCloseNote: string | null;
}

export interface SessionJoinAvailabilityViewModel {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
}
