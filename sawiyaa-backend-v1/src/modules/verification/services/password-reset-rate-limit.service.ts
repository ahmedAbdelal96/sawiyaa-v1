import { Injectable, Logger } from '@nestjs/common';
import { ThrottleStoreService } from '@common/throttle/throttle-store.service';

/**
 * Enforces per-email+role OTP send limits for PASSWORD_RESET challenges.
 *
 * Limits:
 *   - max 3 requests per email+role per 15 minutes
 *   - max 8 requests per email+role per 24 hours
 *
 * The IP-level throttle ({ limit: 5, windowMs: 60*60_000 }) is enforced
 * separately by ThrottlePolicyGuard and covers the "10 per IP per hour" requirement.
 *
 * Uses the same ThrottleStoreService (memory or Redis) to stay consistent
 * with the rest of the platform's rate-limiting infrastructure.
 */
@Injectable()
export class PasswordResetRateLimitService {
  private readonly logger = new Logger(PasswordResetRateLimitService.name);

  constructor(private readonly store: ThrottleStoreService) {}

  private buildKey(email: string, role: string, window: string): string {
    return `pwreset:${role}:${email.toLowerCase().trim()}:${window}`;
  }

  /**
   * Check all rate limits for the given email+role.
   *
   * Returns { allowed: true } if within all limits.
   * Returns { allowed: false, reason, retryAfterSeconds, retryAfterMs }
   *   - reason: 'EMAIL_ROLE_LIMIT_15MIN' | 'EMAIL_ROLE_LIMIT_24H'
   */
  async check(
    email: string,
    role: string,
  ): Promise<
    | { allowed: true }
    | {
        allowed: false;
        reason: 'EMAIL_ROLE_LIMIT_15MIN' | 'EMAIL_ROLE_LIMIT_24H';
        retryAfterSeconds: number;
        retryAfterMs: number;
      }
  > {
    // Limit 1: max 3 per email+role per 15 minutes
    const key15m = this.buildKey(email, role, '15m');
    const result15m = await this.store.increment(key15m, 15 * 60 * 1000);
    if (result15m.count > 3) {
      const retryAfterMs = result15m.resetAt - Date.now();
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      this.logger.warn(
        `Password reset rate limit (15min) exceeded for ${this.maskEmail(email)}`,
      );
      return {
        allowed: false,
        reason: 'EMAIL_ROLE_LIMIT_15MIN',
        retryAfterSeconds,
        retryAfterMs,
      };
    }

    // Limit 2: max 8 per email+role per 24 hours
    const key24h = this.buildKey(email, role, '24h');
    const result24h = await this.store.increment(key24h, 24 * 60 * 60 * 1000);
    if (result24h.count > 8) {
      const retryAfterMs = result24h.resetAt - Date.now();
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      this.logger.warn(
        `Password reset rate limit (24h) exceeded for ${this.maskEmail(email)}`,
      );
      return {
        allowed: false,
        reason: 'EMAIL_ROLE_LIMIT_24H',
        retryAfterSeconds,
        retryAfterMs,
      };
    }

    return { allowed: true };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal =
      local.length <= 2
        ? `${local[0] ?? ''}*`
        : `${local.slice(0, 2)}***${local.slice(-1)}`;
    return `${maskedLocal}@${domain}`;
  }
}
