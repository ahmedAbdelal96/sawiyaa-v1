import { PresenceStatus } from '@prisma/client';
import { PresenceMapper } from './presence.mapper';

describe('PresenceMapper', () => {
  const mapper = new PresenceMapper();
  const referenceTime = new Date('2026-05-07T12:00:00.000Z');

  it('returns explicit offline defaults when no persistence record exists', () => {
    expect(mapper.toViewModel(null, referenceTime)).toEqual({
      status: PresenceStatus.OFFLINE,
      isInstantBookingEnabled: false,
      lastSeenAt: null,
      lastHeartbeatAt: null,
      manuallySetAt: null,
      updatedAt: null,
    });
  });

  it('treats stale presence as offline', () => {
    expect(
      mapper.toViewModel(
        {
          status: PresenceStatus.ONLINE,
          isInstantBookingEnabled: true,
          lastSeenAtUtc: new Date('2026-05-07T11:55:00.000Z'),
          lastHeartbeatAtUtc: new Date('2026-05-07T11:55:00.000Z'),
          manuallySetAtUtc: new Date('2026-05-07T11:55:00.000Z'),
          updatedAt: new Date('2026-05-07T11:55:00.000Z'),
        } as never,
        referenceTime,
      ),
    ).toMatchObject({
      status: PresenceStatus.OFFLINE,
      isInstantBookingEnabled: true,
      lastSeenAt: '2026-05-07T11:55:00.000Z',
    });
  });

  it('keeps fresh presence status intact', () => {
    expect(
      mapper.toViewModel(
        {
          status: PresenceStatus.BUSY,
          isInstantBookingEnabled: false,
          lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
          lastHeartbeatAtUtc: new Date('2026-05-07T11:59:30.000Z'),
          manuallySetAtUtc: new Date('2026-05-07T11:59:30.000Z'),
          updatedAt: new Date('2026-05-07T11:59:30.000Z'),
        } as never,
        referenceTime,
      ),
    ).toMatchObject({
      status: PresenceStatus.BUSY,
      isInstantBookingEnabled: false,
      lastSeenAt: '2026-05-07T11:59:30.000Z',
    });
  });
});
