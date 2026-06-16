import {
  Prisma,
  SessionAdminDecisionType,
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
export const DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES = 24 * 60;

export type SessionPresentationStatus =
  | 'UPCOMING'
  | 'JOINABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ENDED'
  | 'UNAVAILABLE'
  | 'NO_SHOW'
  | 'UNDER_REVIEW';

export interface SessionJoinPolicyInput {
  status: SessionStatus;
  sessionMode: SessionMode;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  now: Date;
  runtimePrepareLeadMinutes?: number;
  /** If set, a final manual admin decision exists and should override presentationStatus */
  finalManualDecision?: SessionAdminDecisionType | null;
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
}

export interface SessionPresentationSummaryCounts {
  totalItems: number;
  upcoming: number;
  joinable: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  ended: number;
  unavailable: number;
}

const joinablePresentationStatuses: SessionStatus[] = [
  SessionStatus.CONFIRMED,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
];

const finishedPresentationStatuses: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.NO_SHOW,
  SessionStatus.EXPIRED,
  SessionStatus.REFUND_PENDING,
  SessionStatus.REFUNDED,
];

const joinAllowedStatuses = new Set<SessionStatus>([
  SessionStatus.CONFIRMED,
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

export function resolveSessionPresentationStatus(
  input: SessionJoinPolicyInput,
): SessionPresentationStatus {
  // If a final manual admin decision exists, it overrides the raw status mapping.
  // This ensures admin decisions are visible in all presentation surfaces.
  if (input.finalManualDecision) {
    switch (input.finalManualDecision) {
      case SessionAdminDecisionType.MARK_PATIENT_NO_SHOW:
      case SessionAdminDecisionType.MARK_BOTH_NO_SHOW:
        return 'NO_SHOW';
      case SessionAdminDecisionType.MARK_TECHNICAL_REVIEW:
      case SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE:
        return 'UNDER_REVIEW';
      case SessionAdminDecisionType.MARK_COMPLETED:
        // Already reflects as COMPLETED via status change; this is for completeness
        return 'COMPLETED';
      case SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW:
        // Practitioner no-show without patient no-show still counts as no-show
        return 'NO_SHOW';
      default:
        break;
    }
  }

  const resolution = resolveSessionJoinPolicy(input);
  const hasScheduledWindow =
    input.scheduledStartAt !== null && input.scheduledEndAt !== null;
  const scheduledStartAt = input.scheduledStartAt;
  const scheduledEndAt = input.scheduledEndAt;
  const isWithinActualSessionWindow =
    hasScheduledWindow &&
    scheduledStartAt !== null &&
    scheduledEndAt !== null &&
    input.now >= scheduledStartAt &&
    input.now <= scheduledEndAt;

  if (
    input.status === SessionStatus.CANCELLED ||
    input.status === SessionStatus.REFUNDED
  ) {
    return 'CANCELLED';
  }

  if (
    input.status === SessionStatus.COMPLETED ||
    input.status === SessionStatus.NO_SHOW
  ) {
    return 'COMPLETED';
  }

  if (input.status === SessionStatus.EXPIRED) {
    return 'ENDED';
  }

  if (input.status === SessionStatus.REFUND_PENDING) {
    return 'ENDED';
  }

  if (!hasScheduledWindow) {
    return 'UNAVAILABLE';
  }

  if (resolution.joinClosesAt && input.now > resolution.joinClosesAt) {
    return 'ENDED';
  }

  if (resolution.joinOpensAt && input.now < resolution.joinOpensAt) {
    return 'UPCOMING';
  }

  if (input.status === SessionStatus.IN_PROGRESS && isWithinActualSessionWindow) {
    return 'IN_PROGRESS';
  }

  if (resolution.canJoin) {
    return 'JOINABLE';
  }

  if (resolution.blockedReason === 'SESSION_RUNTIME_NOT_PREPARED') {
    return 'UNAVAILABLE';
  }

  return 'UPCOMING';
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
    ended: 0,
    unavailable: 0,
  };

  for (const session of sessions) {
    const presentationStatus = resolveSessionPresentationStatus({
      ...session,
      now,
      runtimePrepareLeadMinutes,
    });

    switch (presentationStatus) {
      case 'UPCOMING':
        summary.upcoming += 1;
        break;
      case 'JOINABLE':
        summary.joinable += 1;
        break;
      case 'IN_PROGRESS':
        summary.inProgress += 1;
        break;
      case 'COMPLETED':
        summary.completed += 1;
        break;
      case 'CANCELLED':
        summary.cancelled += 1;
        break;
      case 'ENDED':
        summary.ended += 1;
        break;
      case 'UNAVAILABLE':
        summary.unavailable += 1;
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
            status: {
              in: [
                SessionStatus.DRAFT,
                SessionStatus.PENDING_PAYMENT,
                SessionStatus.PENDING_PRACTITIONER_RESPONSE,
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
        OR: [
          {
            status: {
              in: finishedPresentationStatuses,
            },
          },
          {
            scheduledEndAt: {
              not: null,
              lt: now,
            },
          },
        ],
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