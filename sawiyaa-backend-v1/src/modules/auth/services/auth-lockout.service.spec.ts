import { AuthLockoutService } from './auth-lockout.service';
import { AUTH_LOCKOUT_CONTEXTS } from '../types/auth-lockout.types';

describe('AuthLockoutService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.lockout.maxAttempts') return 5;
      if (key === 'auth.lockout.durationMinutes') return 15;
      if (key === 'auth.lockout.password.maxAttempts') return 4;
      if (key === 'auth.lockout.password.durationMinutes') return 10;
      if (key === 'auth.lockout.otp.maxAttempts') return 3;
      if (key === 'auth.lockout.otp.durationMinutes') return 8;
      return undefined;
    }),
  };

  const service = new AuthLockoutService(configService as any);

  beforeEach(async () => {
    jest.clearAllMocks();
    await service.clear(AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN, 'user:1');
    await service.clear(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:2',
    );
  });

  it('increments failures and locks after the configured max attempts', async () => {
    const first = await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );
    expect(first.attemptCount).toBe(1);
    expect(first.remainingAttempts).toBe(3);
    expect(first.isLocked).toBe(false);
    expect(first.retryAfterSeconds).toBeNull();

    await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );
    const locked = await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );

    expect(locked.attemptCount).toBe(3);
    expect(locked.maxAttempts).toBe(4);
    expect(locked.remainingAttempts).toBe(1);
    expect(locked.isLocked).toBe(false);

    const finalState = await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );

    expect(finalState.attemptCount).toBe(4);
    expect(finalState.isLocked).toBe(true);
    expect(finalState.remainingAttempts).toBe(0);
    expect(finalState.lockedUntil).toBeInstanceOf(Date);
    expect(finalState.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('uses the OTP policy override for practitioner OTP verification', async () => {
    const first = await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:2',
    );
    expect(first.maxAttempts).toBe(3);
    expect(first.remainingAttempts).toBe(2);

    await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:2',
    );
    const locked = await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:2',
    );

    expect(locked.isLocked).toBe(true);
    expect(locked.maxAttempts).toBe(3);
  });

  it('clears lockout state on demand', async () => {
    await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );
    await service.clear(AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN, 'user:1');

    const state = await service.getState(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'user:1',
    );

    expect(state.attemptCount).toBe(0);
    expect(state.isLocked).toBe(false);
    expect(state.remainingAttempts).toBe(4);
    expect(state.retryAfterSeconds).toBeNull();
  });

  it('never stores raw subjects in lockout keys when no hash secret is configured', async () => {
    await service.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      'email:test@example.com',
    );

    const keys = [...(service as any).store.keys()] as string[];
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((key) => key.includes('test@example.com'))).toBe(false);
    expect(keys.some((key) => key.includes('email:'))).toBe(false);
  });
});
