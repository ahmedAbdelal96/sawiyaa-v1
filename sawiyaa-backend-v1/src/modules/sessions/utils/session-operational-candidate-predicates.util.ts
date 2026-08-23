import { Prisma, SessionMode, SessionStatus } from '@prisma/client';

/**
 * Persisted-fact prefilter for next-session selection. This intentionally does
 * not reproduce the interpreter: candidate rows are always interpreted before
 * presentation. It only excludes rows that can never be normal actionable
 * sessions (terminal lifecycle, room closure, cancellation, replacement).
 */
export const OPERATIONAL_ACTIONABLE_STATUSES: SessionStatus[] = [
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
];

export function buildOperationalNextSessionCandidateWhere(now: Date): Prisma.SessionWhereInput {
  return {
    status: { in: OPERATIONAL_ACTIONABLE_STATUSES },
    sessionMode: SessionMode.VIDEO,
    cancelledAt: null,
    videoRoomClosedAt: null,
    scheduledStartAt: { not: null },
    AND: [
      {
        OR: [
          { joinCloseAt: { gte: now } },
          { joinCloseAt: null, scheduledEndAt: { gte: now } },
        ],
      },
      {
        OR: [
          { originalSessionId: null },
          { originalSession: { is: null } },
        ],
      },
    ],
    replacementSessions: { none: { status: { in: OPERATIONAL_ACTIONABLE_STATUSES } } },
  };
}
