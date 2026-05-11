import { ThrottleStoreService } from './throttle-store.service';

describe('ThrottleStoreService', () => {
  let service: ThrottleStoreService;

  beforeEach(() => {
    service = new ThrottleStoreService();
  });

  describe('increment', () => {
    it('starts at count 1 for a new key', () => {
      const { count } = service.increment('key:a', 60_000);
      expect(count).toBe(1);
    });

    it('accumulates count within the same window', () => {
      service.increment('key:b', 60_000);
      service.increment('key:b', 60_000);
      const { count } = service.increment('key:b', 60_000);
      expect(count).toBe(3);
    });

    it('resets count after the window expires', () => {
      // Seed with a past-expiry entry by directly calling with a 0ms window
      service.increment('key:c', 0);
      // After expiry the next call should reset to 1
      const { count } = service.increment('key:c', 60_000);
      expect(count).toBe(1);
    });

    it('returns a resetAt value in the future', () => {
      const before = Date.now();
      const { resetAt } = service.increment('key:d', 10_000);
      expect(resetAt).toBeGreaterThanOrEqual(before + 10_000 - 5);
    });

    it('maintains separate windows for different keys', () => {
      service.increment('key:x', 60_000);
      service.increment('key:x', 60_000);
      const { count } = service.increment('key:y', 60_000);
      expect(count).toBe(1);
    });
  });

  describe('reset', () => {
    it('clears the key so the next increment starts fresh', () => {
      service.increment('key:z', 60_000);
      service.increment('key:z', 60_000);
      service.reset('key:z');
      const { count } = service.increment('key:z', 60_000);
      expect(count).toBe(1);
    });

    it('is a no-op for unknown keys', () => {
      expect(() => service.reset('key:nonexistent')).not.toThrow();
    });
  });
});
