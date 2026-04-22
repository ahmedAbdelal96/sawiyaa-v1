import { Injectable } from '@nestjs/common';

type RetryDecisionInput = {
  errorCode?: string;
  attemptNumber: number;
  now: Date;
};

type RetryDecision =
  | {
      kind: 'RETRY';
      nextRetryAt: Date;
      maxAttempts: number;
      reasonCode: string;
    }
  | {
      kind: 'TERMINAL';
      maxAttempts: number;
      reasonCode: string;
    };

@Injectable()
export class NotificationRetryPolicyService {
  private readonly maxAttempts = 3;
  private readonly baseBackoffMinutes = 5;
  private readonly retryableErrorCodes = new Set<string>(['MAIL_SEND_FAILED']);
  private readonly nonRetryableErrorCodes = new Set<string>([
    'EMAIL_TARGET_MISSING',
    'EMAIL_TARGET_INVALID',
    'CHANNEL_UNSUPPORTED',
    'MAIL_PROVIDER_UNSUPPORTED',
    'MAIL_TRANSPORT_NOT_CONFIGURED',
  ]);

  evaluate(input: RetryDecisionInput): RetryDecision {
    const errorCode = (input.errorCode ?? 'DELIVERY_FAILED').toUpperCase();
    if (input.attemptNumber >= this.maxAttempts) {
      return {
        kind: 'TERMINAL',
        maxAttempts: this.maxAttempts,
        reasonCode: 'MAX_ATTEMPTS_REACHED',
      };
    }

    if (this.nonRetryableErrorCodes.has(errorCode)) {
      return {
        kind: 'TERMINAL',
        maxAttempts: this.maxAttempts,
        reasonCode: errorCode,
      };
    }

    const isRetryable =
      this.retryableErrorCodes.has(errorCode) ||
      errorCode === 'DELIVERY_FAILED';
    if (!isRetryable) {
      return {
        kind: 'TERMINAL',
        maxAttempts: this.maxAttempts,
        reasonCode: errorCode,
      };
    }

    const retryDelayMinutes =
      this.baseBackoffMinutes *
      Math.pow(2, Math.max(0, input.attemptNumber - 1));
    return {
      kind: 'RETRY',
      maxAttempts: this.maxAttempts,
      reasonCode: errorCode,
      nextRetryAt: new Date(input.now.getTime() + retryDelayMinutes * 60_000),
    };
  }
}
