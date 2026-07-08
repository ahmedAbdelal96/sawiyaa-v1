import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
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
      status: SessionStatus.CONFIRMED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:57:30.000Z'),
    });

    expect(result).toBe('UPCOMING');
  });

  it('marks sessions joinable inside the two-minute join window before start', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.CONFIRMED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(result).toBe('JOINABLE');
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

  it('marks sessions as ended after the join window closes', () => {
    const result = resolveSessionPresentationStatus({
      status: SessionStatus.CONFIRMED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt,
      scheduledEndAt,
      provider: SessionProvider.DAILY,
      providerRoomId: 'room-1',
      providerSessionRef: 'room-ref-1',
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toBe('ENDED');
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

  it('treats room-closed sessions as ended for presentation status', () => {
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

    expect(result).toBe('ENDED');
  });

  it('does not report stale in-progress sessions as in progress after the session ends', () => {
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

    expect(result).toBe('ENDED');
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

    expect(result).toBe('ENDED');
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
        status: SessionStatus.CONFIRMED,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt,
        scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
      },
      {
        status: SessionStatus.CONFIRMED,
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
    expect(summary.joinable + summary.upcoming + summary.cancelled + summary.ended).toBe(4);
    expect(summary.joinable).toBeGreaterThanOrEqual(0);
    expect(summary.inProgress).toBe(0);
    expect(summary.ended).toBeGreaterThanOrEqual(1);
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
          SessionStatus.CONFIRMED,
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
              SessionStatus.PENDING_PRACTITIONER_RESPONSE,
            ],
          },
        }),
        expect.objectContaining({
          sessionMode: SessionMode.VIDEO,
          status: {
            in: [
              SessionStatus.CONFIRMED,
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
    expect(finishedWhere).toMatchObject({
      OR: expect.arrayContaining([
        expect.objectContaining({
          status: {
            in: [
              SessionStatus.COMPLETED,
              SessionStatus.CANCELLED,
              SessionStatus.NO_SHOW,
              SessionStatus.EXPIRED,
              SessionStatus.REFUND_PENDING,
              SessionStatus.REFUNDED,
            ],
          },
        }),
        expect.objectContaining({
          scheduledEndAt: {
            not: null,
            lt: new Date('2026-08-02T11:58:30.000Z'),
          },
        }),
      ]),
    });
    expect(finishedWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          videoRoomClosedAt: {
            not: null,
          },
        }),
        expect.objectContaining({
          scheduledEndAt: {
            not: null,
            lt: new Date('2026-08-02T11:58:30.000Z'),
          },
        }),
      ]),
    );
    expect(unavailableWhere).toMatchObject({
      OR: expect.arrayContaining([
        { scheduledStartAt: null },
        { scheduledEndAt: null },
      ]),
    });
  });

  it('includes stale in-progress sessions in the finished presentation filter after the session ends', () => {
    const now = new Date('2026-08-02T12:30:01.000Z');
    const finishedWhere = buildSessionPresentationFilterWhere({
      presentationFilter: SessionPresentationFilter.FINISHED,
      now,
    });

    expect(finishedWhere).toMatchObject({
      OR: expect.arrayContaining([
        expect.objectContaining({
          scheduledEndAt: {
            not: null,
            lt: now,
          },
        }),
      ]),
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
      status: SessionStatus.CONFIRMED,
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

  it('computes reconnect grace close time from scheduled end', () => {
    expect(
      computeSessionPostEndReconnectGraceClosesAt(scheduledEndAt)?.toISOString(),
    ).toBe('2026-08-02T12:40:00.000Z');
  });
});
