import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'node:crypto';
import { createClient } from 'redis';
import {
  AuthLockoutContext,
  AuthLockoutPolicy,
  AuthLockoutState,
  AUTH_LOCKOUT_CONTEXTS,
} from '../types/auth-lockout.types';

interface AuthLockoutEntry {
  count: number;
  resetAt: number;
}

/**
 * Temporary auth lockout store for repeated credential / OTP failures.
 * It is intentionally reusable across login contexts and can run in-memory or Redis.
 */
@Injectable()
export class AuthLockoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthLockoutService.name);
  private readonly store = new Map<string, AuthLockoutEntry>();
  private redis: ReturnType<typeof createClient> | null = null;
  private storeMode: 'memory' | 'redis' = 'memory';
  private keyPrefix = 'sawiyaa:auth-lockout';
  private keyHashSecret = '';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const modeRaw = this.configService.get<string>('throttle.store');
    const mode = modeRaw === 'redis' ? 'redis' : 'memory';
    this.storeMode = mode;

    this.keyPrefix = this.keyPrefix.trim();
    this.keyHashSecret =
      this.configService.get<string>('throttle.keyHashSecret') ?? '';

    if (mode !== 'redis') return;

    const redisUrl = this.configService.get<string>('throttle.redisUrl');
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

      this.logger.warn(message);
      this.storeMode = 'memory';
      return;
    }

    const client = createClient({ url: redisUrl.trim() });
    client.on('error', (err) => {
      this.logger.error(`Redis auth lockout store error: ${String(err)}`);
    });

    await client.connect();
    this.redis = client;
    this.logger.log('AuthLockoutService initialized in redis mode.');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  async getState(
    context: AuthLockoutContext,
    subject: string,
  ): Promise<AuthLockoutState> {
    const policy = this.resolvePolicy(context);
    const entry = await this.readEntry(this.buildKey(context, subject));
    return this.toState(entry, policy);
  }

  async recordFailure(
    context: AuthLockoutContext,
    subject: string,
  ): Promise<AuthLockoutState> {
    const policy = this.resolvePolicy(context);
    const key = this.buildKey(context, subject);

    const updated =
      this.storeMode === 'redis' && this.redis
        ? await this.incrementRedis(key, policy.durationMinutes * 60_000)
        : this.incrementMemory(key, policy.durationMinutes * 60_000);

    return this.toState(updated, policy);
  }

  async clear(context: AuthLockoutContext, subject: string): Promise<void> {
    const key = this.buildKey(context, subject);
    if (this.storeMode === 'redis' && this.redis) {
      await this.redis.del(key);
      return;
    }

    this.store.delete(key);
  }

  private resolvePolicy(context: AuthLockoutContext): AuthLockoutPolicy {
    const defaultMaxAttempts =
      this.configService.get<number>('auth.lockout.maxAttempts') ?? 5;
    const defaultDurationMinutes =
      this.configService.get<number>('auth.lockout.durationMinutes') ?? 15;

    if (context === AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY) {
      return {
        maxAttempts:
          this.configService.get<number>(
            'auth.lockout.otp.maxAttempts',
          ) ?? defaultMaxAttempts,
        durationMinutes:
          this.configService.get<number>(
            'auth.lockout.otp.durationMinutes',
          ) ?? defaultDurationMinutes,
      };
    }

    if (
      context === AUTH_LOCKOUT_CONTEXTS.PATIENT_PASSWORD_LOGIN ||
      context === AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN ||
      context === AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN
    ) {
      return {
        maxAttempts:
          this.configService.get<number>(
            'auth.lockout.password.maxAttempts',
          ) ?? defaultMaxAttempts,
        durationMinutes:
          this.configService.get<number>(
            'auth.lockout.password.durationMinutes',
          ) ?? defaultDurationMinutes,
      };
    }

    return {
      maxAttempts: defaultMaxAttempts,
      durationMinutes: defaultDurationMinutes,
    };
  }

  private buildKey(context: AuthLockoutContext, subject: string): string {
    const safeKey = this.keyHashSecret
      ? createHmac('sha256', this.keyHashSecret)
          .update(`${context}:${subject}`, 'utf8')
          .digest('hex')
      : createHash('sha256')
          .update(`${context}:${subject}`, 'utf8')
          .digest('hex');

    return `${this.keyPrefix}:${safeKey}`;
  }

  private async readEntry(
    key: string,
  ): Promise<AuthLockoutEntry | null> {
    if (this.storeMode === 'redis' && this.redis) {
      const [countRaw, ttlRaw] = await Promise.all([
        this.redis.get(key),
        this.redis.pTTL(key),
      ]);

      if (!countRaw) return null;

      const count = Number(countRaw);
      const ttlMs = Number(ttlRaw);

      if (!Number.isFinite(count) || count <= 0 || ttlMs <= 0) {
        await this.redis.del(key);
        return null;
      }

      return {
        count,
        resetAt: Date.now() + ttlMs,
      };
    }

    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const entry = this.store.get(key) ?? null;
    if (!entry) return null;

    if (entry.resetAt <= now) {
      this.store.delete(key);
      return null;
    }

    return { ...entry };
  }

  private incrementMemory(key: string, ttlMs: number): AuthLockoutEntry {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const existing = this.store.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + ttlMs };
      this.store.set(key, entry);
      return entry;
    }

    const updated = { count: existing.count + 1, resetAt: now + ttlMs };
    this.store.set(key, updated);
    return updated;
  }

  private async incrementRedis(
    key: string,
    ttlMs: number,
  ): Promise<AuthLockoutEntry> {
    const script = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
else
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
      keys: [key],
      arguments: [String(ttlMs)],
    })) as unknown;

    const [countRaw, ttlRaw] = Array.isArray(result) ? result : [1, ttlMs];
    const count = Number(countRaw);
    const ttl = Math.max(0, Number(ttlRaw));

    return {
      count: Number.isFinite(count) && count > 0 ? count : 1,
      resetAt: now + ttl,
    };
  }

  private toState(
    entry: AuthLockoutEntry | null,
    policy: AuthLockoutPolicy,
  ): AuthLockoutState {
    if (!entry) {
      return {
        attemptCount: 0,
        maxAttempts: policy.maxAttempts,
        remainingAttempts: policy.maxAttempts,
        lockedUntil: null,
        retryAfterSeconds: null,
        isLocked: false,
      };
    }

    const now = Date.now();
    const isExpired = entry.resetAt <= now;

    if (isExpired) {
      return {
        attemptCount: 0,
        maxAttempts: policy.maxAttempts,
        remainingAttempts: policy.maxAttempts,
        lockedUntil: null,
        retryAfterSeconds: null,
        isLocked: false,
      };
    }

    const locked = entry.count >= policy.maxAttempts;
    const lockedUntil = locked ? new Date(entry.resetAt) : null;
    const retryAfterSeconds = locked
      ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      : 0;

    return {
      attemptCount: entry.count,
      maxAttempts: policy.maxAttempts,
      remainingAttempts: Math.max(0, policy.maxAttempts - entry.count),
      lockedUntil,
      retryAfterSeconds: locked ? retryAfterSeconds : null,
      isLocked: locked,
    };
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
