import { PresenceStatus } from '@prisma/client';
import { PresenceMapper } from './presence.mapper';

describe('PresenceMapper', () => {
  const mapper = new PresenceMapper();

  it('returns explicit offline defaults when no persistence record exists', () => {
    expect(mapper.toViewModel(null)).toEqual({
      status: PresenceStatus.OFFLINE,
      isInstantBookingEnabled: false,
      lastSeenAt: null,
      lastHeartbeatAt: null,
      manuallySetAt: null,
      updatedAt: null,
    });
  });
});
