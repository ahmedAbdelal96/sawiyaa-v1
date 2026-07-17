import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { resolveSessionChatAvailability } from './session-chat-policy.util';

describe('session-chat-policy util', () => {
  const scheduledStartAt = new Date('2026-08-02T12:00:00.000Z');
  const scheduledEndAt = new Date('2026-08-02T12:30:00.000Z');

  const baseInput = {
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt,
    scheduledEndAt,
    provider: SessionProvider.DAILY,
    providerRoomId: 'room-1',
    providerSessionRef: 'room-ref-1',
    now: new Date('2026-08-02T12:10:00.000Z'),
  } as const;

  it('allows chat during joinable and in-progress states', () => {
    const joinable = resolveSessionChatAvailability({
      ...baseInput,
      status: SessionStatus.READY_TO_JOIN,
      now: new Date('2026-08-02T11:58:30.000Z'),
    });
    const inProgress = resolveSessionChatAvailability({
      ...baseInput,
      status: SessionStatus.IN_PROGRESS,
    });

    expect(joinable).toEqual({
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: 'ALLOWED',
    });
    expect(inProgress).toEqual({
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: 'ALLOWED',
    });
  });

  it('keeps ended sessions readable but read-only', () => {
    const result = resolveSessionChatAvailability({
      ...baseInput,
      status: SessionStatus.COMPLETED,
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_ENDED',
    });
  });

  it('keeps cancelled sessions readable but read-only', () => {
    const result = resolveSessionChatAvailability({
      ...baseInput,
      status: SessionStatus.CANCELLED,
      now: new Date('2026-08-02T11:58:30.000Z'),
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_CANCELLED',
    });
  });

  it('blocks unreadable sessions before start', () => {
    const result = resolveSessionChatAvailability({
      ...baseInput,
      status: SessionStatus.UPCOMING,
      now: new Date('2026-08-02T11:55:00.000Z'),
    });

    expect(result).toEqual({
      canRead: false,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_NOT_STARTED',
    });
  });
});
