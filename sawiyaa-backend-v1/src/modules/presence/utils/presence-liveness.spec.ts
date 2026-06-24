import { PresenceStatus } from '@prisma/client';
import {
  isPresenceEffectivelyOnline,
  isPresenceFresh,
  resolveEffectivePresenceStatus,
} from './presence-liveness';

describe('presence-liveness', () => {
  const referenceTime = new Date('2026-05-07T12:00:00.000Z');

  it('treats recent live activity as fresh', () => {
    expect(
      isPresenceFresh(
        {
          status: PresenceStatus.ONLINE,
          lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
        } as never,
        referenceTime,
      ),
    ).toBe(true);
  });

  it('treats stale live activity as offline', () => {
    expect(
      resolveEffectivePresenceStatus(
        {
          status: PresenceStatus.ONLINE,
          lastSeenAtUtc: new Date('2026-05-07T11:55:00.000Z'),
        } as never,
        referenceTime,
      ),
    ).toBe(PresenceStatus.OFFLINE);
  });

  it('keeps busy state when activity is fresh', () => {
    expect(
      resolveEffectivePresenceStatus(
        {
          status: PresenceStatus.BUSY,
          lastSeenAtUtc: new Date('2026-05-07T11:59:15.000Z'),
        } as never,
        referenceTime,
      ),
    ).toBe(PresenceStatus.BUSY);
  });

  it('only reports online when the effective status is online', () => {
    expect(
      isPresenceEffectivelyOnline(
        {
          status: PresenceStatus.ONLINE,
          lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
        } as never,
        referenceTime,
      ),
    ).toBe(true);
  });
});
