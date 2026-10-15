import { NotificationRetryPolicyService } from './notification-retry-policy.service';

describe('NotificationRetryPolicyService', () => {
  const service = new NotificationRetryPolicyService({
    get: (key: string) =>
      key === 'notificationQueue.retryJitterMs' ? 0 : undefined,
  } as never);

  it('classifies retryable failures with deterministic backoff', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const decision = service.evaluate({
      errorCode: 'MAIL_SEND_FAILED',
      attemptNumber: 1,
      now,
    });

    expect(decision).toEqual({
      kind: 'RETRY',
      maxAttempts: 3,
      reasonCode: 'MAIL_SEND_FAILED',
      errorCategory: 'TRANSIENT',
      delayMs: 300_000,
      nextRetryAt: new Date('2026-06-01T10:05:00.000Z'),
    });
  });

  it('classifies non-retryable failures as terminal', () => {
    const decision = service.evaluate({
      errorCode: 'EMAIL_TARGET_MISSING',
      attemptNumber: 1,
      now: new Date('2026-06-01T10:00:00.000Z'),
    });

    expect(decision).toEqual({
      kind: 'TERMINAL',
      maxAttempts: 3,
      reasonCode: 'EMAIL_TARGET_MISSING',
      errorCategory: 'PERMANENT',
    });
  });

  it('treats invalid email target as terminal', () => {
    const decision = service.evaluate({
      errorCode: 'EMAIL_TARGET_INVALID',
      attemptNumber: 1,
      now: new Date('2026-06-01T10:00:00.000Z'),
    });

    expect(decision).toEqual({
      kind: 'TERMINAL',
      maxAttempts: 3,
      reasonCode: 'EMAIL_TARGET_INVALID',
      errorCategory: 'RECIPIENT_INVALID',
    });
  });

  it('cuts off retries at max attempts', () => {
    const decision = service.evaluate({
      errorCode: 'MAIL_SEND_FAILED',
      attemptNumber: 3,
      now: new Date('2026-06-01T10:00:00.000Z'),
    });

    expect(decision).toEqual({
      kind: 'TERMINAL',
      maxAttempts: 3,
      reasonCode: 'MAX_ATTEMPTS_REACHED',
      errorCategory: 'TRANSIENT',
    });
  });

  it.each([
    ['TRANSIENT', 'RETRY'],
    ['RATE_LIMITED', 'RETRY'],
    ['PERMANENT', 'TERMINAL'],
    ['CONFIGURATION', 'TERMINAL'],
    ['RECIPIENT_INVALID', 'TERMINAL'],
    ['UNKNOWN_OUTCOME', 'TERMINAL'],
  ] as const)('classifies %s as %s', (errorCategory, expectedKind) => {
    const decision = service.evaluate({
      errorCategory,
      errorCode: 'PROVIDER_ERROR',
      attemptNumber: 1,
      now: new Date('2026-06-01T10:00:00.000Z'),
      jitterSeed: errorCategory,
    });
    expect(decision.kind).toBe(expectedKind);
    expect(decision.errorCategory).toBe(errorCategory);
  });

  it('never schedules before a provider Retry-After instruction', () => {
    const decision = service.evaluate({
      errorCategory: 'RATE_LIMITED',
      errorCode: 'HTTP_429',
      retryAfterMs: 900_000,
      attemptNumber: 1,
      now: new Date('2026-06-01T10:00:00.000Z'),
      jitterSeed: 'rate-limit-1',
    });
    expect(decision.kind).toBe('RETRY');
    if (decision.kind === 'RETRY') {
      expect(decision.retryAfterMs).toBe(900_000);
      expect(decision.nextRetryAt.getTime()).toBeGreaterThanOrEqual(
        new Date('2026-06-01T10:15:00.000Z').getTime(),
      );
    }
  });

  it('stops a stale session reminder instead of retrying it', () => {
    const now = new Date('2026-06-01T10:20:00.000Z');
    const decision = service.evaluate({
      errorCategory: 'TRANSIENT',
      errorCode: 'EXPO_PUSH_SEND_FAILED',
      notificationTypeSlug: 'sessions.session-reminder-15',
      scheduledFor: new Date('2026-06-01T10:00:00.000Z'),
      attemptNumber: 1,
      now,
    });
    expect(decision).toMatchObject({
      kind: 'TERMINAL',
      reasonCode: 'SESSION_REMINDER_STALE',
    });
  });

  it.each([1_000, 10_000])(
    'spreads %d transient retries deterministically with jitter',
    (count) => {
      const now = new Date('2026-06-01T10:00:00.000Z');
      const retryTimes = new Set<number>();
      for (let index = 0; index < count; index += 1) {
        const decision = new NotificationRetryPolicyService().evaluate({
          errorCategory: 'TRANSIENT',
          errorCode: 'MAIL_SEND_FAILED',
          attemptNumber: 1,
          now,
          jitterSeed: `notification-${index}`,
        });
        if (decision.kind === 'RETRY')
          retryTimes.add(decision.nextRetryAt.getTime());
      }
      expect(retryTimes.size).toBeGreaterThan(100);
      expect(retryTimes.size).toBeLessThanOrEqual(count);
    },
  );

  it('does not synchronize a 429 retry storm before Retry-After', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const retryTimes: number[] = [];
    for (let index = 0; index < 1_000; index += 1) {
      const decision = new NotificationRetryPolicyService().evaluate({
        errorCategory: 'RATE_LIMITED',
        errorCode: 'HTTP_429',
        retryAfterMs: 30_000,
        attemptNumber: 1,
        now,
        jitterSeed: `rate-limit-${index}`,
      });
      if (decision.kind === 'RETRY')
        retryTimes.push(decision.nextRetryAt.getTime());
    }
    expect(new Set(retryTimes).size).toBeGreaterThan(100);
    expect(Math.min(...retryTimes)).toBeGreaterThanOrEqual(
      now.getTime() + 30_000,
    );
  });
});
