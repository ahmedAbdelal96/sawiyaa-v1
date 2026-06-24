import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfProtectionGuard } from './csrf-protection.guard';

function buildContext(overrides?: {
  method?: string;
  authTransport?: 'bearer' | 'cookie' | 'body';
  cookie?: string | null;
  header?: string | null;
}): ExecutionContext {
  const request = {
    method: overrides?.method ?? 'POST',
    authTransport: overrides?.authTransport ?? 'cookie',
    cookies: overrides?.cookie ? { sawiyaa_csrf_token: overrides.cookie } : {},
    headers: overrides?.header ? { 'x-csrf-token': overrides.header } : {},
  };

  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

describe('CsrfProtectionGuard', () => {
  it('allows bearer-auth requests without CSRF', () => {
    const guard = new CsrfProtectionGuard({
      get: jest.fn().mockReturnValue({
        cookieAuthEnabled: true,
        csrf: { enforcementEnabled: true },
      }),
    } as unknown as ConfigService);

    expect(guard.canActivate(buildContext({ authTransport: 'bearer' }))).toBe(
      true,
    );
  });

  it('rejects cookie-auth unsafe requests without matching CSRF token', () => {
    const guard = new CsrfProtectionGuard({
      get: jest.fn().mockReturnValue({
        cookieAuthEnabled: true,
        csrf: { enforcementEnabled: true, cookieName: 'sawiyaa_csrf_token' },
      }),
    } as unknown as ConfigService);

    expect(() =>
      guard.canActivate(
        buildContext({
          authTransport: 'cookie',
          cookie: 'expected',
          header: 'wrong',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows cookie-auth unsafe requests with matching CSRF token', () => {
    const guard = new CsrfProtectionGuard({
      get: jest.fn().mockReturnValue({
        cookieAuthEnabled: true,
        csrf: { enforcementEnabled: true, cookieName: 'sawiyaa_csrf_token' },
      }),
    } as unknown as ConfigService);

    expect(
      guard.canActivate(
        buildContext({
          authTransport: 'cookie',
          cookie: 'same-token',
          header: 'same-token',
        }),
      ),
    ).toBe(true);
  });
});
