import {
  Prisma,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  SessionJoinBlockedReason,
  SessionPresentationFilter,
} from '../types/session-video.types';

export const SESSION_JOIN_LEAD_MINUTES = 2;
export const SESSION_JOIN_LAG_MINUTES = 0;
export const SESSION_POST_END_RECONNECT_GRACE_MINUTES = 10;
export const DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES = 24 * 60;

/** @deprecated Canonical Session.status is now the display lifecycle state. */
export type SessionPresentationStatus = SessionStatus;

export interface SessionJoinPolicyInput {
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
  /** Kept only until every caller stops sending this obsolete field. */
  finalManualDecision?: unknown;
}

export interface SessionJoinPolicyResolution {
  canPrepareRuntime: boolean;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  prepareOpensAt: Date | null;
  joinOpensAt: Date | null;
  joinClosesAt: Date | null;
}

export interface SessionJoinAvailabilityViewModel {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
}

export interface SessionPresentationResolution {
  presentationStatus: SessionPresentationStatus;
  joinAvailability: SessionJoinAvailabilityViewModel;
}

export interface SessionPresentationSummaryInput {
  status: SessionStatus;
  sessionMode: SessionMode;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  videoRoomClosedAt?: Date | null;
}

export interface SessionPresentationSummaryCounts {
  totalItems: number;
  upcoming: number;
  joinable: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  awaitingConfirmation: number;
  unavailable: number;
}

const joinablePresentationStatuses: SessionStatus[] = [
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
];

const finishedPresentationStatuses: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
];

const joinAllowedStatuses = new Set<SessionStatus>([
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
]);

export function resolveSessionJoinPolicy(
  input: SessionJoinPolicyInput,
): SessionJoinPolicyResolution {
  if (input.sessionMode !== SessionMode.VIDEO) {
    return {
      canPrepareRuntime: false,
      canJoin: false,
      blockedReason: 'SESSION_NOT_VIDEO_MODE',
      prepareOpensAt: null,
      joinOpensAt: null,
      joinClosesAt: null,
    };
  }

  if (!joinAllowedStatuses.has(input.status)) {
    return {
      canPrepareRuntime: false,
      canJoin: false,
      blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
      prepareOpensAt: null,
      joinOpensAt: null,
      joinClosesAt: null,
    };
  }

  if (!input.scheduledStartAt || !input.scheduledEndAt) {
    return {
      canPrepareRuntime: false,
      canJoin: false,
      blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
      prepareOpensAt: null,
      joinOpensAt: null,
      joinClosesAt: null,
    };
  }

  const prepareLeadMinutes =
    input.runtimePrepareLeadMinutes ?? DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES;
  const prepareOpensAt = new Date(
    input.scheduledStartAt.getTime() - prepareLeadMinutes * 60_000,
  );
  const joinOpensAt = new Date(
    input.scheduledStartAt.getTime() - SESSION_JOIN_LEAD_MINUTES * 60_000,
  );
  const joinClosesAt = new Date(
    input.scheduledEndAt.getTime() + SESSION_JOIN_LAG_MINUTES * 60_000,
  );

  const canPrepareRuntime =
    input.now >= prepareOpensAt && input.now <= joinClosesAt;
  const runtimePrepared =
    input.provider !== SessionProvider.NONE &&
    Boolean(input.providerRoomId) &&
    Boolean(input.providerSessionRef);

  if (input.videoRoomClosedAt) {
    return {
      canPrepareRuntime: false,
      canJoin: false,
      blockedReason: 'SESSION_ROOM_CLOSED',
      prepareOpensAt,
      joinOpensAt,
      joinClosesAt,
    };
  }

  if (input.now > joinClosesAt) {
    return {
      canPrepareRuntime,
      canJoin: false,
      blockedReason: 'SESSION_JOIN_WINDOW_CLOSED',
      prepareOpensAt,
      joinOpensAt,
      joinClosesAt,
    };
  }

  if (input.now < joinOpensAt) {
    return {
      canPrepareRuntime,
      canJoin: false,
      blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
      prepareOpensAt,
      joinOpensAt,
      joinClosesAt,
    };
  }

  if (!runtimePrepared) {
    return {
      canPrepareRuntime,
      canJoin: false,
      blockedReason: 'SESSION_RUNTIME_NOT_PREPARED',
      prepareOpensAt,
      joinOpensAt,
      joinClosesAt,
    };
  }

  return {
    canPrepareRuntime,
    canJoin: true,
    blockedReason: null,
    prepareOpensAt,
    joinOpensAt,
    joinClosesAt,
  };
}

export function buildSessionJoinAvailabilityViewModel(
  input: SessionJoinPolicyInput,
): SessionJoinAvailabilityViewModel {
  const resolution = resolveSessionJoinPolicy(input);

  return {
    canJoin: resolution.canJoin,
    blockedReason: resolution.blockedReason,
    availableAt: resolution.joinOpensAt?.toISOString() ?? null,
    expiresAt: resolution.joinClosesAt?.toISOString() ?? null,
  };
}

export function computeSessionPostEndReconnectGraceClosesAt(
  scheduledEndAt: Date | null,
): Date | null {
  if (!scheduledEndAt) {
    return null;
  }

  return new Date(
    scheduledEndAt.getTime() +
      SESSION_POST_END_RECONNECT_GRACE_MINUTES * 60_000,
  );
}

export function resolveSessionPresentationStatus(
  input: SessionJoinPolicyInput,
): SessionPresentationStatus {
  // Compatibility helper only. It must never derive another lifecycle state.
  return input.status;
}

export function summarizeSessionPresentations(
  sessions: SessionPresentationSummaryInput[],
  now = new Date(),
  runtimePrepareLeadMinutes = DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
): SessionPresentationSummaryCounts {
  const summary = {
    totalItems: sessions.length,
    upcoming: 0,
    joinable: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    awaitingConfirmation: 0,
    unavailable: 0,
  };

  for (const session of sessions) {
    const presentationStatus = resolveSessionPresentationStatus({
      ...session,
      now,
      runtimePrepareLeadMinutes,
    });

    switch (presentationStatus) {
      case SessionStatus.UPCOMING:
        summary.upcoming += 1;
        break;
      case SessionStatus.READY_TO_JOIN:
        summary.joinable += 1;
        break;
      case SessionStatus.IN_PROGRESS:
        summary.inProgress += 1;
        break;
      case SessionStatus.COMPLETED:
        summary.completed += 1;
        break;
      case SessionStatus.CANCELLED:
        summary.cancelled += 1;
        break;
      case SessionStatus.AWAITING_COMPLETION_CONFIRMATION:
        summary.awaitingConfirmation += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function buildSessionPresentationFilterWhere(input: {
  presentationFilter?: SessionPresentationFilter;
  now?: Date;
}): Prisma.SessionWhereInput {
  const presentationFilter =
    input.presentationFilter ?? SessionPresentationFilter.ALL;
  const now = input.now ?? new Date();
  const joinWindowOpenThreshold = new Date(
    now.getTime() + SESSION_JOIN_LEAD_MINUTES * 60_000,
  );

  switch (presentationFilter) {
    case SessionPresentationFilter.JOINABLE:
      return {
        sessionMode: SessionMode.VIDEO,
        videoRoomClosedAt: null,
        status: {
          in: joinablePresentationStatuses,
        },
        scheduledStartAt: {
          not: null,
          lte: joinWindowOpenThreshold,
        },
        scheduledEndAt: {
          not: null,
          gte: now,
        },
        provider: {
          not: SessionProvider.NONE,
        },
        providerRoomId: {
          not: null,
        },
        providerSessionRef: {
          not: null,
        },
      };

    case SessionPresentationFilter.LIVE:
      return {
        sessionMode: SessionMode.VIDEO,
        videoRoomClosedAt: null,
        status: SessionStatus.IN_PROGRESS,
        scheduledStartAt: {
          not: null,
          lte: now,
        },
        scheduledEndAt: {
          not: null,
          gte: now,
        },
      };

    case SessionPresentationFilter.UPCOMING:
      return {
        OR: [
          {
            sessionMode: {
              not: SessionMode.VIDEO,
            },
            videoRoomClosedAt: null,
            status: {
              notIn: [...finishedPresentationStatuses, SessionStatus.IN_PROGRESS],
            },
            scheduledStartAt: {
              not: null,
            },
            scheduledEndAt: {
              not: null,
              gte: now,
            },
          },
          {
            sessionMode: SessionMode.VIDEO,
            videoRoomClosedAt: null,
            status: {
              in: [
                SessionStatus.DRAFT,
                SessionStatus.PENDING_PAYMENT,
                SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
              ],
            },
            scheduledStartAt: {
              not: null,
            },
            scheduledEndAt: {
              not: null,
              gte: now,
            },
          },
          {
            sessionMode: SessionMode.VIDEO,
            videoRoomClosedAt: null,
            status: {
              in: joinablePresentationStatuses,
            },
            scheduledStartAt: {
              not: null,
              gt: joinWindowOpenThreshold,
            },
            scheduledEndAt: {
              not: null,
              gte: now,
            },
          },
        ],
      };

    case SessionPresentationFilter.FINISHED:
      return {
        status: {
          in: [
            ...finishedPresentationStatuses,
            SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
          ],
        },
      };

    case SessionPresentationFilter.UNAVAILABLE:
      return {
        OR: [
          {
            scheduledStartAt: null,
          },
          {
            scheduledEndAt: null,
          },
          {
            sessionMode: SessionMode.VIDEO,
            videoRoomClosedAt: null,
            status: {
              in: joinablePresentationStatuses,
            },
            scheduledStartAt: {
              not: null,
              lte: joinWindowOpenThreshold,
            },
            scheduledEndAt: {
              not: null,
              gte: now,
            },
            OR: [
              {
                provider: SessionProvider.NONE,
              },
              {
                providerRoomId: null,
              },
              {
                providerSessionRef: null,
              },
            ],
          },
        ],
      };

    case SessionPresentationFilter.ALL:
    default:
      return {};
  }
}
