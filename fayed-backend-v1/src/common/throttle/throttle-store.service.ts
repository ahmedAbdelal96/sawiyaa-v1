import { Injectable } from '@nestjs/common';

interface ThrottleEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory TTL-based rate-limit store.
 * Single-instance safe; swap for a Redis-backed implementation by replacing
 * this service's class in ThrottleModule providers without touching the guard.
 */
@Injectable()
export class ThrottleStoreService {
  private readonly store = new Map<string, ThrottleEntry>();

  /**
   * Increments the hit count for `key` within `windowMs`.
   * Resets the window if the previous window has expired.
   * Returns the updated count and the UTC timestamp when the window resets.
   */
  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  /** Manually clears a throttle key (e.g. after a successful login for retry-budget reset). */
  reset(key: string): void {
    this.store.delete(key);
  }
}
