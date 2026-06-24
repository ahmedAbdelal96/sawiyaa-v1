import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createClient } from 'redis';

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
export class ThrottleStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThrottleStoreService.name);
  private readonly store = new Map<string, ThrottleEntry>();
  private redis: ReturnType<typeof createClient> | null = null;
  private storeMode: 'memory' | 'redis' = 'memory';
  private keyPrefix = 'sawiyaa:throttle';
  private keyHashSecret = '';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const modeRaw = this.configService.get<string>('throttle.store');
    const mode = modeRaw === 'redis' ? 'redis' : 'memory';
    this.storeMode = mode;

    this.keyPrefix =
      this.configService.get<string>('throttle.keyPrefix') ?? this.keyPrefix;
    this.keyHashSecret =
      this.configService.get<string>('throttle.keyHashSecret') ?? '';

    if (mode !== 'redis') return;

    const redisUrl = this.configService.get<string>('throttle.redisUrl');

    // Production must not silently fall back to in-memory when configured for Redis.
    if (!redisUrl?.trim()) {
      const effectiveEnv =
        this.configService.get<string>('app.nodeEnv') ??
        process.env.NODE_ENV ??
        'development';

      const message =
        'THROTTLE_STORE=redis requires REDIS_URL to be set (refusing to start with memory fallback).';

      if (effectiveEnv === 'production') {
        throw new Error(message);
      }

      // Non-production: keep running but warn loudly.
      this.logger.warn(message);
      this.storeMode = 'memory';
      return;
    }

    const client = createClient({ url: redisUrl.trim() });
    client.on('error', (err) => {
      // Do not include secrets; redis URL is not logged.
      this.logger.error(`Redis throttle store error: ${String(err)}`);
    });

    await client.connect();
    this.redis = client;
    this.logger.log('ThrottleStore initialized in redis mode.');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  /**
   * Increments the hit count for `key` within `windowMs`.
   * Resets the window if the previous window has expired.
   * Returns the updated count and the UTC timestamp when the window resets.
   */
  async increment(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    if (this.storeMode === 'redis' && this.redis) {
      return this.incrementRedis(key, windowMs);
    }

    const now = Date.now();
    this.cleanupExpiredEntries(now);
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
  async reset(key: string): Promise<void> {
    if (this.storeMode === 'redis' && this.redis) {
      const redisKey = this.buildRedisKey(key);
      await this.redis.del(redisKey);
      return;
    }

    this.store.delete(key);
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [entryKey, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(entryKey);
      }
    }
  }

  private async incrementRedis(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    const redisKey = this.buildRedisKey(key);

    // Atomic-ish increment with TTL initialization.
    // Returns {count, ttlMs}.
    const script = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

    const now = Date.now();
    const result = (await this.redis!.eval(script, {
      keys: [redisKey],
      arguments: [String(windowMs)],
    })) as unknown;

    // node-redis returns arrays for Lua multi returns.
    const [countRaw, ttlRaw] = Array.isArray(result) ? result : [1, windowMs];
    const count = Number(countRaw);
    const ttlMs = Math.max(0, Number(ttlRaw));

    return {
      count: Number.isFinite(count) ? count : 1,
      resetAt: now + ttlMs,
    };
  }

  private buildRedisKey(key: string): string {
    // Avoid putting emails/phones in raw form in keys.
    const safeKey = this.keyHashSecret
      ? createHash('sha256')
          .update(`${this.keyHashSecret}:${key}`, 'utf8')
          .digest('hex')
      : key;

    return `${this.keyPrefix}:${safeKey}`;
  }
}
