import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { ResolveSessionChatAvailabilityService } from './resolve-session-chat-availability.service';

describe('ResolveSessionChatAvailabilityService', () => {
  const service = new ResolveSessionChatAvailabilityService();
  const facts = {
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
    scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
    provider: SessionProvider.DAILY,
    providerRoomId: 'room_1',
    providerSessionRef: 'room_1',
  };

  it.each([
    SessionStatus.UPCOMING,
    SessionStatus.IN_PROGRESS,
    SessionStatus.COMPLETED,
    SessionStatus.CANCELLED,
  ])('allows Session Chat reading for %s', (status) => {
    expect(service.resolve({ ...facts, status })).toEqual({ available: true });
  });

  it.each([
    SessionStatus.DRAFT,
    SessionStatus.PENDING_PAYMENT,
    SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  ])('denies Session Chat reading for unconfirmed %s', (status) => {
    expect(service.resolve({ ...facts, status })).toEqual({ available: false });
  });

  it('does not depend on viewer timezone or wall-clock time', () => {
    const input = { ...facts, status: SessionStatus.IN_PROGRESS };
    expect(service.resolve(input)).toEqual(service.resolve(input));
  });
});
