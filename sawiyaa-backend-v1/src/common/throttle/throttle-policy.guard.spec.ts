import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlePolicyGuard } from './throttle-policy.guard';
import { ThrottleStoreService } from './throttle-store.service';

function buildContext(overrides: {
  policyKey?: string;
  userId?: string;
  ip?: string;
  forwardedFor?: string;
}): {
  context: ExecutionContext;
  setHeader: jest.Mock;
} {
  const setHeader = jest.fn();
  const request: Record<string, any> = {
    user: overrides.userId ? { id: overrides.userId } : undefined,
    headers: overrides.forwardedFor
      ? { 'x-forwarded-for': overrides.forwardedFor }
      : {},
    socket: { remoteAddress: overrides.ip ?? '127.0.0.1' },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;

  return { context, setHeader };
}

describe('ThrottlePolicyGuard', () => {
  let store: ThrottleStoreService;
  const getAllAndOverride = jest.fn();

  beforeEach(() => {
    store = new ThrottleStoreService({ get: jest.fn() } as any);
    getAllAndOverride.mockReset();
  });

  function makeGuard() {
    return new ThrottlePolicyGuard(
      { getAllAndOverride } as unknown as Reflector,
      store,
    );
  }

  it('is a no-op when no @ThrottlePolicy metadata is present', async () => {
    getAllAndOverride.mockReturnValue(undefined);
    const guard = makeGuard();
    const { context } = buildContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('is a no-op when policy key does not exist in config', async () => {
    getAllAndOverride.mockReturnValue('unknown-policy-key');
    const guard = makeGuard();
    const { context } = buildContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows requests within the limit', async () => {
    getAllAndOverride.mockReturnValue('auth-patient-login'); // limit: 10
    const guard = makeGuard();
    const { context } = buildContext({ ip: '10.0.0.1' });
    for (let i = 0; i < 10; i++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('throws 429 when limit is exceeded and sets Retry-After header', async () => {
    getAllAndOverride.mockReturnValue('auth-patient-register'); // limit: 5
    const guard = makeGuard();
    const { context, setHeader } = buildContext({ ip: '10.0.0.2' });

    for (let i = 0; i < 5; i++) {
      await guard.canActivate(context);
    }

    await expect(guard.canActivate(context)).rejects.toEqual(
      new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('keys authenticated users by user ID, not IP', async () => {
    getAllAndOverride.mockReturnValue('auth-patient-login'); // limit: 10
    const guard = makeGuard();
    const { context: contextA } = buildContext({
      userId: 'user-1',
      ip: '10.0.0.1',
    });
    const { context: contextB } = buildContext({
      userId: 'user-2',
      ip: '10.0.0.1',
    });

    // Fill user-1's budget
    for (let i = 0; i < 10; i++) {
      await guard.canActivate(contextA);
    }
    // user-2 starts fresh even though same IP
    await expect(guard.canActivate(contextB)).resolves.toBe(true);
  });

  it('reads IP from x-forwarded-for header', async () => {
    getAllAndOverride.mockReturnValue('auth-admin-login'); // limit: 10
    const guard = makeGuard();
    const { context } = buildContext({ forwardedFor: '203.0.113.5, 10.0.0.1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    // Fill remaining budget
    for (let i = 1; i < 10; i++) await guard.canActivate(context);

    const { context: context2 } = buildContext({
      forwardedFor: '203.0.113.5, 10.0.0.1',
    });
    await expect(guard.canActivate(context2)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
