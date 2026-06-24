import { SessionProvider } from '@prisma/client';
import { SessionVideoProviderResolverService } from './session-video-provider-resolver.service';

describe('SessionVideoProviderResolverService', () => {
  it('falls back to Daily when session has no provider and config is ZOOM (rejected)', () => {
    // ZOOM is rejected at config load time; normalizeProvider returns null for
    // unknown values, so resolveDefaultProvider falls back to DAILY.
    const service = new SessionVideoProviderResolverService({
      get: jest.fn().mockReturnValue('ZOOM'),
    } as never);

    expect(
      service.resolveDefaultProviderForSession({
        provider: SessionProvider.NONE,
      }),
    ).toBe(SessionProvider.DAILY);
  });

  it('keeps the session provider when already set', () => {
    const service = new SessionVideoProviderResolverService({
      get: jest.fn().mockReturnValue('ZOOM'),
    } as never);

    expect(
      service.resolvePreparedProviderForSession({
        provider: SessionProvider.DAILY,
      }),
    ).toBe(SessionProvider.DAILY);
  });

  it('falls back to Daily when config is missing or invalid', () => {
    const service = new SessionVideoProviderResolverService({
      get: jest.fn().mockReturnValue('NOT_A_PROVIDER'),
    } as never);

    expect(service.resolveDefaultProvider()).toBe(SessionProvider.DAILY);
  });
});
