import { Injectable } from '@nestjs/common';

export type NotificationDeliveryResilienceMetricsSnapshot = {
  notificationClaimedTotal: number;
  notificationClaimConflictTotal: number;
  notificationLeaseExpiredTotal: number;
  notificationStaleQueuedTotal: number;
  notificationRecoveredTotal: number;
  notificationRecoveryFailedTotal: number;
  notificationOldestQueuedSeconds: number | null;
  providerOutcomeAcceptedTotal: number;
  providerOutcomeFailedTotal: number;
  providerOutcomeUnknownTotal: number;
  providerOutcomePartialTotal: number;
  providerReconciliationAcceptedTotal: number;
  providerReconciliationUnknownTotal: number;
  providerAcceptedFinalizationRetryTotal: number;
  retryScheduledTotal: number;
  retryExhaustedTotal: number;
  retryRateLimitedTotal: number;
  retryTransientTotal: number;
  retryTerminalTotal: number;
  retryUnknownSuppressedTotal: number;
  retryDelayMsTotal: number;
  retryDelayMaxMs: number;
};

@Injectable()
export class NotificationDeliveryResilienceMetricsService {
  private readonly counters = {
    notificationClaimedTotal: 0,
    notificationClaimConflictTotal: 0,
    notificationLeaseExpiredTotal: 0,
    notificationStaleQueuedTotal: 0,
    notificationRecoveredTotal: 0,
    notificationRecoveryFailedTotal: 0,
    providerOutcomeAcceptedTotal: 0,
    providerOutcomeFailedTotal: 0,
    providerOutcomeUnknownTotal: 0,
    providerOutcomePartialTotal: 0,
    providerReconciliationAcceptedTotal: 0,
    providerReconciliationUnknownTotal: 0,
    providerAcceptedFinalizationRetryTotal: 0,
    retryScheduledTotal: 0,
    retryExhaustedTotal: 0,
    retryRateLimitedTotal: 0,
    retryTransientTotal: 0,
    retryTerminalTotal: 0,
    retryUnknownSuppressedTotal: 0,
    retryDelayMsTotal: 0,
    retryDelayMaxMs: 0,
  };
  private oldestQueuedSeconds: number | null = null;

  recordClaimed(count = 1): void {
    this.counters.notificationClaimedTotal += Math.max(0, count);
  }

  recordClaimConflict(count = 1): void {
    this.counters.notificationClaimConflictTotal += Math.max(0, count);
  }

  recordLeaseExpired(count = 1): void {
    this.counters.notificationLeaseExpiredTotal += Math.max(0, count);
  }

  recordStaleQueued(count = 1): void {
    this.counters.notificationStaleQueuedTotal += Math.max(0, count);
  }

  recordRecovered(count = 1): void {
    this.counters.notificationRecoveredTotal += Math.max(0, count);
  }

  recordRecoveryFailed(count = 1): void {
    this.counters.notificationRecoveryFailedTotal += Math.max(0, count);
  }

  recordProviderOutcome(
    outcome: 'ACCEPTED' | 'FAILED' | 'UNKNOWN' | 'PARTIAL',
  ): void {
    const key =
      `providerOutcome${outcome[0]}${outcome.slice(1).toLowerCase()}Total` as keyof typeof this.counters;
    this.counters[key] += 1;
  }

  recordProviderReconciliation(outcome: 'ACCEPTED' | 'UNKNOWN'): void {
    if (outcome === 'ACCEPTED') {
      this.counters.providerReconciliationAcceptedTotal += 1;
    } else {
      this.counters.providerReconciliationUnknownTotal += 1;
    }
  }

  recordProviderAcceptedFinalizationRetry(): void {
    this.counters.providerAcceptedFinalizationRetryTotal += 1;
  }

  recordRetryDecision(input: {
    kind: 'RETRY' | 'TERMINAL';
    errorCategory: string;
    delayMs?: number;
    reasonCode: string;
  }): void {
    if (input.kind === 'RETRY') {
      this.counters.retryScheduledTotal += 1;
      const delayMs = Math.max(0, Math.floor(input.delayMs ?? 0));
      this.counters.retryDelayMsTotal += delayMs;
      this.counters.retryDelayMaxMs = Math.max(
        this.counters.retryDelayMaxMs,
        delayMs,
      );
      if (input.errorCategory === 'RATE_LIMITED') {
        this.counters.retryRateLimitedTotal += 1;
      } else if (input.errorCategory === 'TRANSIENT') {
        this.counters.retryTransientTotal += 1;
      }
      return;
    }
    this.counters.retryTerminalTotal += 1;
    if (input.reasonCode === 'MAX_ATTEMPTS_REACHED') {
      this.counters.retryExhaustedTotal += 1;
    }
  }

  recordUnknownOutcomeSuppressed(): void {
    this.counters.retryUnknownSuppressedTotal += 1;
  }

  recordOldestQueuedSeconds(seconds: number | null): void {
    this.oldestQueuedSeconds =
      seconds === null || !Number.isFinite(seconds)
        ? null
        : Math.max(0, Math.floor(seconds));
  }

  snapshot(): NotificationDeliveryResilienceMetricsSnapshot {
    return {
      ...this.counters,
      notificationOldestQueuedSeconds: this.oldestQueuedSeconds,
    };
  }
}
