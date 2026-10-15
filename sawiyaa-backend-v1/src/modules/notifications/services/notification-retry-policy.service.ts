import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionReminderType } from '@prisma/client';
import { NotificationProviderErrorCategory } from './notification-provider-outcome';
import { isSessionReminderStale } from './session-reminder-freshness-policy';

export type RetryDecisionInput = {
  errorCode?: string;
  providerErrorCode?: string;
  errorCategory?: NotificationProviderErrorCategory;
  attemptNumber: number;
  now: Date;
  retryAfterMs?: number;
  jitterSeed?: string;
  notificationTypeSlug?: string;
  scheduledFor?: Date | null;
};

export type RetryDecision =
  | {
      kind: 'RETRY';
      nextRetryAt: Date;
      maxAttempts: number;
      reasonCode: string;
      errorCategory: NotificationProviderErrorCategory;
      delayMs: number;
      retryAfterMs?: number;
    }
  | {
      kind: 'TERMINAL';
      maxAttempts: number;
      reasonCode: string;
      errorCategory: NotificationProviderErrorCategory;
    };

const SESSION_REMINDER_TYPES: Record<string, SessionReminderType> = {
  'sessions.session-reminder-60': SessionReminderType.REMINDER_60,
  'sessions.session-reminder-15': SessionReminderType.REMINDER_15,
  'sessions.session-reminder-before-start': SessionReminderType.PRE_START,
  'sessions.session-starting-now': SessionReminderType.STARTING_NOW,
  'sessions.session-late-join': SessionReminderType.LATE_JOIN,
};

@Injectable()
export class NotificationRetryPolicyService {
  private readonly defaults = {
    maxAttempts: 3,
    baseDelayMs: 300_000,
    maxDelayMs: 1_800_000,
    jitterMs: 30_000,
    retryAfterMaxMs: 1_800_000,
  };

  constructor(@Optional() private readonly configService?: ConfigService) {}

  evaluate(input: RetryDecisionInput): RetryDecision {
    const errorCode = (input.errorCode ?? 'DELIVERY_FAILED').toUpperCase();
    const errorCategory = this.normalizeCategory(input);
    const maxAttempts = this.readConfig(
      'retryMaxAttempts',
      this.defaults.maxAttempts,
    );

    if (this.isStaleSessionReminder(input)) {
      return {
        kind: 'TERMINAL',
        maxAttempts,
        reasonCode: 'SESSION_REMINDER_STALE',
        errorCategory: 'PERMANENT',
      };
    }

    if (input.attemptNumber >= maxAttempts) {
      return {
        kind: 'TERMINAL',
        maxAttempts,
        reasonCode: 'MAX_ATTEMPTS_REACHED',
        errorCategory,
      };
    }

    if (!this.isRetryable(errorCategory)) {
      return {
        kind: 'TERMINAL',
        maxAttempts,
        reasonCode: this.reasonCode(errorCode, input.providerErrorCode),
        errorCategory,
      };
    }

    const baseDelayMs = Math.min(
      this.readConfig('retryMaxDelayMs', this.defaults.maxDelayMs),
      this.readConfig('retryBaseDelayMs', this.defaults.baseDelayMs) *
        Math.pow(2, Math.max(0, input.attemptNumber - 1)),
    );
    const retryAfterMs = this.clampRetryAfter(input.retryAfterMs);
    const jitterMs = this.deterministicJitterMs(
      input.jitterSeed ?? `${errorCode}:${input.attemptNumber}`,
      input.attemptNumber,
    );
    const delayMs = Math.max(baseDelayMs, retryAfterMs ?? 0) + jitterMs;

    return {
      kind: 'RETRY',
      maxAttempts,
      reasonCode: this.reasonCode(errorCode, input.providerErrorCode),
      errorCategory,
      delayMs,
      nextRetryAt: new Date(input.now.getTime() + delayMs),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    };
  }

  private normalizeCategory(
    input: RetryDecisionInput,
  ): NotificationProviderErrorCategory {
    if (input.errorCategory) return input.errorCategory;
    const code =
      `${input.providerErrorCode ?? ''} ${input.errorCode ?? ''}`.toUpperCase();
    if (code.includes('UNKNOWN') || code.includes('TIMEOUT'))
      return 'UNKNOWN_OUTCOME';
    if (code.includes('NOT_CONFIGURED') || code.includes('UNSUPPORTED'))
      return 'CONFIGURATION';
    if (code.includes('TARGET_INVALID') || code.includes('NOT_REGISTERED'))
      return 'RECIPIENT_INVALID';
    if (code.includes('RATE_LIMIT') || code.includes('429'))
      return 'RATE_LIMITED';
    if (code.includes('MISSING') || code.includes('INVALID'))
      return 'PERMANENT';
    return 'TRANSIENT';
  }

  private isRetryable(category: NotificationProviderErrorCategory): boolean {
    return category === 'TRANSIENT' || category === 'RATE_LIMITED';
  }

  private reasonCode(errorCode: string, providerErrorCode?: string): string {
    return (providerErrorCode ?? errorCode).slice(0, 100);
  }

  private isStaleSessionReminder(input: RetryDecisionInput): boolean {
    const reminderType = input.notificationTypeSlug
      ? SESSION_REMINDER_TYPES[input.notificationTypeSlug]
      : undefined;
    if (!reminderType || !input.scheduledFor) return false;
    return isSessionReminderStale({
      reminderType,
      dueAt: input.scheduledFor,
      now: input.now,
    });
  }

  private clampRetryAfter(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    return Math.min(
      this.readConfig('retryAfterMaxMs', this.defaults.retryAfterMaxMs),
      Math.max(0, Math.floor(value)),
    );
  }

  private deterministicJitterMs(seed: string, attemptNumber: number): number {
    const configured = this.readConfig('retryJitterMs', this.defaults.jitterMs);
    if (configured <= 0) return 0;
    let hash = 2166136261;
    for (const char of `${seed}:${attemptNumber}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) % (configured + 1);
  }

  private readConfig(key: string, fallback: number): number {
    const value = this.configService?.get<number>(`notificationQueue.${key}`);
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : fallback;
  }
}
