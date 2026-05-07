import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { ResolveSessionJoinReadinessService } from './resolve-session-join-readiness.service';

describe('ResolveSessionJoinReadinessService', () => {
  const service = new ResolveSessionJoinReadinessService({
    get: () => undefined,
  } as never);
  const now = new Date('2026-04-02T10:00:00.000Z');
  const start = new Date('2026-04-02T10:10:00.000Z');
  const end = new Date('2026-04-02T10:40:00.000Z');

  it('allows join when session is video, prepared, and in join window', () => {
    const result = service.resolve({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: start,
      scheduledEndAt: end,
      provider: SessionProvider.ZOOM,
      providerRoomId: 'room_1',
      providerSessionRef: 'https://room.zoom.us/j/room_1',
      now,
    });

    expect(result.canJoin).toBe(true);
    expect(result.blockedReason).toBeNull();
  });

  it('blocks non-video sessions', () => {
    const result = service.resolve({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.AUDIO,
      scheduledStartAt: start,
      scheduledEndAt: end,
      provider: SessionProvider.ZOOM,
      providerRoomId: 'room_1',
      providerSessionRef: 'https://room.zoom.us/j/room_1',
      now,
    });

    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_NOT_VIDEO_MODE');
  });

  it('blocks join when runtime is not prepared', () => {
    const result = service.resolve({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: start,
      scheduledEndAt: end,
      provider: SessionProvider.NONE,
      providerRoomId: null,
      providerSessionRef: null,
      now,
    });

    expect(result.canPrepareRuntime).toBe(true);
    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_RUNTIME_NOT_PREPARED');
  });

  it('blocks join outside allowed time window', () => {
    const result = service.resolve({
      status: SessionStatus.UPCOMING,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: new Date('2026-04-03T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-04-03T10:30:00.000Z'),
      provider: SessionProvider.ZOOM,
      providerRoomId: 'room_1',
      providerSessionRef: 'https://room.zoom.us/j/room_1',
      now,
    });

    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_TIME_WINDOW_NOT_OPEN');
  });

  it('blocks refunded sessions from runtime prepare and join', () => {
    const result = service.resolve({
      status: SessionStatus.REFUNDED,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: start,
      scheduledEndAt: end,
      provider: SessionProvider.ZOOM,
      providerRoomId: 'room_1',
      providerSessionRef: 'https://room.zoom.us/j/room_1',
      now,
    });

    expect(result.canPrepareRuntime).toBe(false);
    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('SESSION_NOT_JOINABLE_STATUS');
  });
});
