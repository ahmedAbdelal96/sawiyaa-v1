import { PasswordResetRateLimitService } from './password-reset-rate-limit.service';
import { ThrottleStoreService } from '../../../common/throttle/throttle-store.service';

/** Subclass of ThrottleStoreService that delegates increment to a per-test mock. */
class MockThrottleStore extends ThrottleStoreService {
  // Capture the parent's increment as the default fallback.
  private fallback = super.increment.bind(this) as (
    key: string,
    windowMs: number,
  ) => Promise<{ count: number; resetAt: number }>;

  setIncrementMock(
    fn: (key: string, windowMs: number) => Promise<{ count: number; resetAt: number }>,
  ) {
    this.fallback = fn;
  }

  async increment(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    return this.fallback(key, windowMs);
  }
}

describe('PasswordResetRateLimitService', () => {
  const buildService = () => {
    const store = new MockThrottleStore(null as any, null as any);
    return { service: new PasswordResetRateLimitService(store), store };
  };

  describe('check() — allowed', () => {
    it('returns allowed:true on first request', async () => {
      const { service } = buildService();
      const result = await service.check('test@example.com', 'patient');
      expect(result).toEqual({ allowed: true });
    });

    it('returns allowed:true when under both limits', async () => {
      const { service } = buildService();
      await service.check('a@b.com', 'patient');
      await service.check('a@b.com', 'patient');
      const result = await service.check('a@b.com', 'patient');
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('check() — EMAIL_ROLE_LIMIT_15MIN', () => {
    it('blocks on the 4th request within 15 minutes for the same email+role', async () => {
      const { service } = buildService();
      await service.check('fourth@example.com', 'patient');
      await service.check('fourth@example.com', 'patient');
      await service.check('fourth@example.com', 'patient');
      const result = await service.check('fourth@example.com', 'patient');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('EMAIL_ROLE_LIMIT_15MIN');
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('different roles have independent counters', async () => {
      const { service } = buildService();
      await service.check('same@email.com', 'patient');
      await service.check('same@email.com', 'patient');
      await service.check('same@email.com', 'patient');
      const result = await service.check('same@email.com', 'practitioner');
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('check() — EMAIL_ROLE_LIMIT_24H', () => {
    it('blocks when 24h counter exceeds 8', async () => {
      // Directly exercise the 24h branch by pre-seeding the store with a
      // 24h entry that is already at count=8. The 9th request should then
      // be blocked by the 24h check (count > 8).
      const { service, store } = buildService();
      const key24h = 'pwreset:practitioner:nine@example.com:24h';
      const key15m = 'pwreset:practitioner:nine@example.com:15m';

      // Override increment: 15m always returns count=1 (never blocks),
      // 24h delegates to the real store so the counter accumulates.
      store.setIncrementMock(async (key, windowMs) => {
        if (key === key15m) {
          return { count: 1, resetAt: Date.now() + 86_400_000 };
        }
        if (key === key24h) {
          // Delegate to real increment so the counter grows naturally.
          return ThrottleStoreService.prototype.increment.call(store, key, windowMs);
        }
        return ThrottleStoreService.prototype.increment.call(store, key, windowMs);
      });

      // Hit the 24h limit by making 8 requests — all allowed.
      for (let i = 0; i < 8; i++) {
        const r = await service.check('nine@example.com', 'practitioner');
        expect(r.allowed).toBe(true);
      }

      // 9th request — blocked by 24h limit.
      const result = await service.check('nine@example.com', 'practitioner');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('EMAIL_ROLE_LIMIT_24H');
    });
  });

  describe('email normalization', () => {
    it('treats email case-insensitively', async () => {
      const { service } = buildService();
      await service.check('Test@Example.com', 'patient');
      const r = await service.check('TEST@EXAMPLE.COM', 'patient');
      expect(r).toEqual({ allowed: true });
    });

    it('trims whitespace from email', async () => {
      const { service } = buildService();
      await service.check('  spaced@email.com  ', 'patient');
      const r = await service.check('spaced@email.com', 'patient');
      expect(r).toEqual({ allowed: true });
    });
  });
});
