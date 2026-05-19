import { ThrottleStoreService } from './throttle-store.service';

describe('ThrottleStoreService', () => {
  let service: ThrottleStoreService;

  beforeEach(() => {
    service = new ThrottleStoreService({ get: jest.fn() } as any);
  });

  describe('increment', () => {
    it('starts at count 1 for a new key', async () => {
      const { count } = await service.increment('key:a', 60_000);
      expect(count).toBe(1);
    });

    it('accumulates count within the same window', async () => {
      await service.increment('key:b', 60_000);
      await service.increment('key:b', 60_000);
      const { count } = await service.increment('key:b', 60_000);
      expect(count).toBe(3);
    });

    it('resets count after the window expires', async () => {
      // Seed with a past-expiry entry by directly calling with a 0ms window
      await service.increment('key:c', 0);
      // After expiry the next call should reset to 1
      const { count } = await service.increment('key:c', 60_000);
      expect(count).toBe(1);
    });

    it('returns a resetAt value in the future', async () => {
      const before = Date.now();
      const { resetAt } = await service.increment('key:d', 10_000);
      expect(resetAt).toBeGreaterThanOrEqual(before + 10_000 - 5);
    });

    it('maintains separate windows for different keys', async () => {
      await service.increment('key:x', 60_000);
      await service.increment('key:x', 60_000);
      const { count } = await service.increment('key:y', 60_000);
      expect(count).toBe(1);
    });
  });

  describe('reset', () => {
    it('clears the key so the next increment starts fresh', async () => {
      await service.increment('key:z', 60_000);
      await service.increment('key:z', 60_000);
      await service.reset('key:z');
      const { count } = await service.increment('key:z', 60_000);
      expect(count).toBe(1);
    });

    it('is a no-op for unknown keys', async () => {
      await expect(service.reset('key:nonexistent')).resolves.toBeUndefined();
    });
  });
});
