import { Injectable, Optional } from '@nestjs/common';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { NotificationQueueService } from '@common/queue/notification-queue.service';
import type { NotificationQueueHealthSnapshot } from '@common/queue/notification-queue.service';
import { OperationsQueueService } from '@common/queue/operations-queue.service';
import type { OperationsQueueHealthSnapshot } from '@common/queue/operations-queue.service';
import { PaymentProviderRecoveryService } from '@modules/payments/services/payment-provider-recovery.service';
import { AccountingReconciliationSchedulerService } from '@modules/financial-operations/services/accounting-reconciliation-scheduler.service';

export type ReadinessState = 'READY' | 'DEGRADED' | 'NOT_READY';

export type ReadinessSnapshot = {
  status: ReadinessState;
  checkedAt: string;
  components: {
    sessionCompletionWorker: { status: 'READY'; detail: string };
    attendanceReconciliation: { status: ReadinessState; detail: string };
    dailyWebhook: { status: ReadinessState; detail: string };
    paymentRouting: { status: ReadinessState; detail: string };
    providerPaymentRecovery: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      running: boolean;
      lastStartedAt: string | null;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
      lastErrorCategory: string | null;
      lastScannedCount: number | null;
      lastRecoveredCount: number | null;
    };
    accountingReconciliation: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      lastRunStatus: string | null;
    };
    notificationQueue: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      redis: NotificationQueueHealthSnapshot['redis'];
      worker: NotificationQueueHealthSnapshot['worker'];
      counts: NotificationQueueHealthSnapshot['counts'];
      oldestWaitingJobAgeMs: number | null;
    };
    operationsQueue: {
      status: ReadinessState;
      detail: string;
      enabled: boolean;
      redis: OperationsQueueHealthSnapshot['redis'];
      worker: OperationsQueueHealthSnapshot['worker'];
      counts: OperationsQueueHealthSnapshot['counts'];
      oldestWaitingJobAgeMs: number | null;
    };
  };
  warnings: string[];
};

@Injectable()
export class ReadinessService {
  constructor(
    private readonly paymentRuntime: PaymentRuntimeConfigService,
    @Optional() private readonly notificationQueue?: NotificationQueueService,
    @Optional() private readonly operationsQueue?: OperationsQueueService,
    @Optional()
    private readonly providerRecovery?: PaymentProviderRecoveryService,
    @Optional()
    private readonly accountingScheduler?: AccountingReconciliationSchedulerService,
  ) {}

  async getSnapshot(): Promise<ReadinessSnapshot> {
    const production =
      process.env.APP_ENV === 'production' ||
      process.env.NODE_ENV === 'production';
    const providerRecoverySnapshot =
      this.providerRecovery?.getStatusSnapshot() ?? {
        enabled: false,
        running: false,
        lastStartedAt: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastErrorCategory: null,
        lastScannedCount: null,
        lastRecoveredCount: null,
      };
    let accountingSchedulerSnapshot: Awaited<
      ReturnType<AccountingReconciliationSchedulerService['getStatusSnapshot']>
    > | null = null;
    try {
      accountingSchedulerSnapshot = this.accountingScheduler
        ? await this.accountingScheduler.getStatusSnapshot()
        : null;
    } catch {
      accountingSchedulerSnapshot = null;
    }
    const attendanceEnabled =
      process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED === 'true';
    const dailyConfigured = Boolean(
      process.env.DAILY_API_KEY?.trim() &&
      process.env.DAILY_API_BASE_URL?.trim() &&
      process.env.DAILY_WEBHOOK_SECRET?.trim(),
    );

    let paymentStatus: ReadinessState = 'READY';
    let paymentDetail = 'Payment routing snapshot is available.';
    try {
      const routing = this.paymentRuntime.getPaymentRoutingConfig();
      const enabledRoutes = routing.routeReadiness.filter(
        ({ route }) => route.enabled,
      );
      if (enabledRoutes.some(({ ready }) => !ready)) {
        paymentStatus = 'NOT_READY';
        paymentDetail = 'One or more enabled payment routes are not ready.';
      }
    } catch {
      paymentStatus = 'NOT_READY';
      paymentDetail = 'Payment routing snapshot is unavailable.';
    }

    const warnings: string[] = [];
    const notificationQueue = this.notificationQueue
      ? await this.notificationQueue.getHealthSnapshot()
      : ({
          enabled: false,
          status: 'DISABLED' as const,
          redis: 'NOT_REQUIRED' as const,
          worker: 'NOT_REQUIRED' as const,
          queueName: 'notifications',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          },
          oldestWaitingJobAgeMs: null,
          lastEnqueuedAt: null,
          lastEnqueueFailureAt: null,
          lastWorkerHeartbeatAt: null,
          lastError: null,
        } satisfies NotificationQueueHealthSnapshot);
    const notificationQueueStatus: ReadinessState =
      notificationQueue.status === 'DEGRADED' ? 'DEGRADED' : 'READY';
    if (notificationQueue.status === 'DEGRADED') {
      warnings.push(
        `Notification queue is degraded; PostgreSQL DB runner fallback remains active${notificationQueue.lastError ? ` (${notificationQueue.lastError})` : ''}.`,
      );
    }
    const operationsQueue = this.operationsQueue
      ? await this.operationsQueue.getHealthSnapshot()
      : ({
          enabled: false,
          status: 'DISABLED' as const,
          redis: 'NOT_REQUIRED' as const,
          worker: 'NOT_REQUIRED' as const,
          queueName: 'operations',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          },
          oldestWaitingJobAgeMs: null,
          lastEnqueuedAt: null,
          lastEnqueueFailureAt: null,
          lastWorkerHeartbeatAt: null,
          lastError: null,
        } satisfies OperationsQueueHealthSnapshot);
    const operationsQueueStatus: ReadinessState =
      operationsQueue.status === 'DEGRADED' ? 'DEGRADED' : 'READY';
    if (operationsQueue.status === 'DEGRADED') {
      warnings.push(
        `Daily attendance operations queue is degraded; eligible sessions remain recoverable by the next sweep${operationsQueue.lastError ? ` (${operationsQueue.lastError})` : ''}.`,
      );
    }
    const attendanceStatus: ReadinessState = attendanceEnabled
      ? 'READY'
      : 'DEGRADED';
    if (!attendanceEnabled) {
      warnings.push(
        'SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED is not true; attendance evidence reconciliation is disabled.',
      );
    }
    const dailyStatus: ReadinessState = dailyConfigured
      ? 'READY'
      : production
        ? 'NOT_READY'
        : 'DEGRADED';
    if (!dailyConfigured) {
      warnings.push('Daily webhook runtime configuration is incomplete.');
    }

    const reconciliationEnabled =
      process.env.ACCOUNTING_RECONCILIATION_ENABLED === 'true';
    const reconciliationAlertsEnabled =
      process.env.ACCOUNTING_RECONCILIATION_ALERTS_ENABLED === 'true';
    const reconciliationStatus: ReadinessState = reconciliationEnabled
      ? reconciliationAlertsEnabled
        ? 'READY'
        : production
          ? 'NOT_READY'
          : 'DEGRADED'
      : 'DEGRADED';
    const reconciliationDetail = reconciliationEnabled
      ? reconciliationAlertsEnabled
        ? 'Automatic reconciliation and critical-issue alerting are enabled.'
        : 'Automatic reconciliation is enabled but critical-issue alerting is disabled.'
      : 'Automatic accounting reconciliation is disabled by configuration.';
    if (!reconciliationEnabled) {
      warnings.push(
        'ACCOUNTING_RECONCILIATION_ENABLED is not true; automatic payment reconciliation is disabled.',
      );
    } else if (!reconciliationAlertsEnabled) {
      warnings.push(
        'ACCOUNTING_RECONCILIATION_ALERTS_ENABLED is not true while automatic reconciliation is enabled.',
      );
    }

    const providerRecoveryFailureIsLatest =
      providerRecoverySnapshot.lastFailureAt !== null &&
      (providerRecoverySnapshot.lastSuccessAt === null ||
        providerRecoverySnapshot.lastFailureAt >
          providerRecoverySnapshot.lastSuccessAt);
    const providerRecoveryStatus: ReadinessState =
      !providerRecoverySnapshot.enabled
        ? production
          ? 'NOT_READY'
          : 'DEGRADED'
        : providerRecoveryFailureIsLatest
          ? production
            ? 'NOT_READY'
            : 'DEGRADED'
          : 'READY';
    const providerRecoveryDetail = !providerRecoverySnapshot.enabled
      ? 'Mandatory provider payment recovery scheduler is not active.'
      : providerRecoveryFailureIsLatest
        ? 'Mandatory provider payment recovery has failed on its latest recorded run.'
        : 'Mandatory provider payment recovery scheduler is active independently of accounting reconciliation.';
    if (!providerRecoverySnapshot.enabled) {
      warnings.push(
        'Mandatory provider payment recovery scheduler is not active; payment convergence is unsafe.',
      );
    } else if (providerRecoveryFailureIsLatest) {
      warnings.push(
        `Mandatory provider payment recovery failed${providerRecoverySnapshot.lastErrorCategory ? ` (${providerRecoverySnapshot.lastErrorCategory})` : ''}.`,
      );
    }

    const statuses = [
      attendanceStatus,
      dailyStatus,
      paymentStatus,
      providerRecoveryStatus,
      reconciliationStatus,
      notificationQueueStatus,
      operationsQueueStatus,
    ];
    const status: ReadinessState = statuses.includes('NOT_READY')
      ? 'NOT_READY'
      : statuses.includes('DEGRADED')
        ? 'DEGRADED'
        : 'READY';

    return {
      status,
      checkedAt: new Date().toISOString(),
      components: {
        sessionCompletionWorker: {
          status: 'READY',
          detail:
            'Production completion-confirmation worker is always started.',
        },
        attendanceReconciliation: {
          status: attendanceStatus,
          detail: attendanceEnabled
            ? 'Evidence-only worker is enabled.'
            : 'Evidence-only worker is disabled.',
        },
        dailyWebhook: {
          status: dailyStatus,
          detail: dailyConfigured
            ? 'Daily webhook credentials are configured.'
            : 'Daily webhook credentials are incomplete.',
        },
        paymentRouting: { status: paymentStatus, detail: paymentDetail },
        providerPaymentRecovery: {
          status: providerRecoveryStatus,
          detail: providerRecoveryDetail,
          enabled: providerRecoverySnapshot.enabled,
          running: providerRecoverySnapshot.running,
          lastStartedAt: providerRecoverySnapshot.lastStartedAt,
          lastSuccessAt: providerRecoverySnapshot.lastSuccessAt,
          lastFailureAt: providerRecoverySnapshot.lastFailureAt,
          lastErrorCategory: providerRecoverySnapshot.lastErrorCategory,
          lastScannedCount: providerRecoverySnapshot.lastScannedCount,
          lastRecoveredCount: providerRecoverySnapshot.lastRecoveredCount,
        },
        accountingReconciliation: {
          status: reconciliationStatus,
          detail: reconciliationDetail,
          enabled: reconciliationEnabled,
          lastRunStatus:
            accountingSchedulerSnapshot?.lastScheduledRunStatus ?? null,
        },
        notificationQueue: {
          status: notificationQueueStatus,
          detail:
            notificationQueue.status === 'DISABLED'
              ? 'BullMQ notification queue is disabled; the PostgreSQL DB runner is authoritative and active.'
              : notificationQueue.status === 'READY'
                ? 'Redis notification queue is available; the PostgreSQL DB runner remains a recovery fallback.'
                : 'Redis notification queue is unavailable or degraded; the PostgreSQL DB runner remains active.',
          enabled: notificationQueue.enabled,
          redis: notificationQueue.redis,
          worker: notificationQueue.worker,
          counts: notificationQueue.counts,
          oldestWaitingJobAgeMs: notificationQueue.oldestWaitingJobAgeMs,
        },
        operationsQueue: {
          status: operationsQueueStatus,
          detail:
            operationsQueue.status === 'DISABLED'
              ? 'Daily attendance queue is disabled; the existing synchronous sweeper remains the rollback path.'
              : operationsQueue.status === 'READY'
                ? 'Daily attendance operations queue is available; provider work runs in the worker process.'
                : 'Daily attendance operations queue is degraded; eligible sessions remain recoverable by scheduled discovery.',
          enabled: operationsQueue.enabled,
          redis: operationsQueue.redis,
          worker: operationsQueue.worker,
          counts: operationsQueue.counts,
          oldestWaitingJobAgeMs: operationsQueue.oldestWaitingJobAgeMs,
        },
      },
      warnings,
    };
  }
}
