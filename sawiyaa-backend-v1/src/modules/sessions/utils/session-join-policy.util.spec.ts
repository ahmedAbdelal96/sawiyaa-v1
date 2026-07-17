import {
  SessionAdminDecisionType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  buildSessionJoinAvailabilityViewModel,
  buildSessionPresentationFilterWhere,
  computeSessionPostEndReconnectGraceClosesAt,
  resolveSessionPresentationStatus,
  resolveSessionJoinPolicy,
  summarizeSessionPresentations,
} from './session-join-policy.util';
import { SessionPresentationFilter } from '../types/session-video.types';

describe('session-join-policy util', () => {
  const scheduledStartAt = new Date('2026-08-02T12:00:00.000Z');
  const scheduledEndAt = new Date('2026-08-02T12:30:00.000Z');

  it('does not mark sessions joinable more than two minutes before start', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:57:30.000Z'),
    });

    expect(result).toBe(SessionStatus.UPCOMING);
  });

  it('marks sessions joinable inside the two-minute join window before start', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(result).toBe(SessionStatus.UPCOMING);
  });

  it('keeps sessions joinable during the session window when runtime is prepared', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.IN_PROGRESS,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T12:10:00.000Z'),
    });

    expect(result).toBe('IN_PROGRESS');
  });

  it('preserves the canonical status after the join window closes', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toBe(SessionStatus.UPCOMING);
  });

  it('blocks joining with SESSION_ROOM_CLOSED when the practitioner has closed the room', () => {
    const result = resolveSessionJoinPolicy({
      status: SessionStatus.IN_PROGRESS,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      videoRoomClosedAt: new Date('2026-08-02T12:12:00.000Z'),
      now: new Date('2026-08-02T12:15:00.000Z'),
    });

    expect(result.canPrepareRuntime).toBe(false);
    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_ROOM_CLOSED');
  });

  it('does not change lifecycle status when a room is closed', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.IN_PROGRESS,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      videoRoomClosedAt: new Date('2026-08-02T12:12:00.000Z'),
      now: new Date('2026-08-02T12:15:00.000Z'),
    });

    expect(result).toBe(SessionStatus.IN_PROGRESS);
  });

  it('does not infer completion from elapsed time', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.IN_PROGRESS,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toBe(SessionStatus.IN_PROGRESS);
  });

  it('does not treat stale READY_TO_JOIN sessions as joinable or in progress after the session ends', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.READY_TO_JOIN,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toBe(SessionStatus.READY_TO_JOIN);
  });

  it('never marks cancelled sessions joinable', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.CANCELLED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(result).toBe('CANCELLED');
  });

  it('summarizes sessions using the same presentation policy', () => {
    const summary = summarizeSessionPresentations(
      [
      {
        status: SessionStatus.UPCOMING,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt,
        scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
      },
      {
        status: SessionStatus.UPCOMING,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt,
        scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
      },
      {
        status: SessionStatus.CANCELLED,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt,
        scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
      },
      {
        status: SessionStatus.IN_PROGRESS,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt,
        scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
      },
      ],
      new Date('2026-08-02T12:30:01.000Z'),
    );

    expect(summary.totalItems).toBe(4);
    expect(summary.joinable + summary.upcoming + summary.cancelled + summary.inProgress).toBe(4);
    expect(summary.joinable).toBeGreaterThanOrEqual(0);
    expect(summary.inProgress).toBe(1);
  });

  it('builds a joinable filter that stays inside the join window', () => {
    const where = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.JOINABLE,
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(where).toMatchObject({
      sessionMode: SessionMode.VIDEO,
      status: {
        in: [
          SessionStatus.UPCOMING,
          SessionStatus.READY_TO_JOIN,
        ],
      },
      scheduledStartAt: {
        not: null,
        lte: new Date('2026-08-02T12:00:30.000Z'),
      },
      scheduledEndAt: {
        not: null,
        gte: new Date('2026-08-02T11:58:30.000Z'),
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
    });
  });

  it('builds presentation filters that separate upcoming, finished, and unavailable sessions', () => {
    const now = new Date('2026-08-02T11:58:30.000Z');
    const upcomingWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.UPCOMING,
      now,
    });
    const finishedWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.FINISHED,
      now,
    });
    const unavailableWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.UNAVAILABLE,
      now,
    });

    expect(upcomingWhere.OR).toHaveLength(3);
    expect(upcomingWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionMode: {
            not: SessionMode.VIDEO,
          },
        }),
        expect.objectContaining({
          sessionMode: SessionMode.VIDEO,
          status: {
            in: [
              SessionStatus.DRAFT,
              SessionStatus.PENDING_PAYMENT,
              SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
            ],
          },
        }),
        expect.objectContaining({
          sessionMode: SessionMode.VIDEO,
          status: {
            in: [
              SessionStatus.UPCOMING,
              SessionStatus.READY_TO_JOIN,
            ],
          },
          scheduledStartAt: {
            not: null,
            gt: new Date('2026-08-02T12:00:30.000Z'),
          },
        }),
      ]),
    );
    expect(finishedWhere).toEqual({
      status: {
        in: [
          SessionStatus.COMPLETED,
          SessionStatus.CANCELLED,
          SessionStatus.PATIENT_NO_SHOW,
          SessionStatus.PRACTITIONER_NO_SHOW,
          SessionStatus.BOTH_NO_SHOW,
          SessionStatus.EXPIRED,
          SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        ],
      },
    });
    expect(unavailableWhere).toMatchObject({
      OR: expect.arrayContaining([
        { scheduledStartAt: null },
        { scheduledEndAt: null },
      ]),
    });
  });

  it('does not include elapsed in-progress sessions without a canonical transition', () => {
    const now = new Date('2026-08-02T12:30:01.000Z');
    const finishedWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.FINISHED,
      now,
    });

    expect(finishedWhere).toEqual({
      status: {
        in: expect.arrayContaining([SessionStatus.AWAITING_COMPLETION_CONFIRMATION]),
      },
    });
  });

  it('builds a live filter that stays inside the actual session window', () => {
    const now = new Date('2026-08-02T12:10:00.000Z');
    const liveWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.LIVE,
      now,
    });

    expect(liveWhere).toMatchObject({
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
    });
  });

  it('builds join availability from UTC scheduled times only', () => {
    const joinAvailability = buildSessionJoinAvailabilityViewModel({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: scheduledStartAt,
      scheduledEndAt: scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(joinAvailability).toEqual({
      canJoin: true,
      blockedReason: null,
      availableAt: '2026-08-02T11:58:00.000Z',
      expiresAt: '2026-08-02T12:30:00.000Z',
    });
  });

  it('blocks runtime preparation and joining after a final completed decision', () => {
    const result = resolveSessionJoinPolicy({
      status: SessionStatus.COMPLETED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.NONE,
      providerRoomId: null,
      providerSessionRef: null,
      finalManualDecision: SessionAdminDecisionType.MARK_COMPLETED,
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(result.canPrepareRuntime).toBe(false);
    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_NOT_JOINABLE_STATUS');
  });

  it('computes reconnect grace close time from scheduled end', () => {
    expect(
      computeSessionPostEndReconnectGraceClosesAt(scheduledEndAt)?.toISOString(),
    ).toBe('2026-08-02T12:40:00.000Z');
  });
});
