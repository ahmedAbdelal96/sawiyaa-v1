import { NotificationRetryPolicyService } from './notification-retry-policy.service';

describe('NotificationRetryPolicyService', () => {
  const service = new NotificationRetryPolicyService();

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
    });
  });
});
