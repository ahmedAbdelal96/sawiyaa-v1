import { Injectable } from '@nestjs/common';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';

export type ReadinessState = 'READY' | 'DEGRADED' | 'NOT_READY';

export type ReadinessSnapshot = {
  status: ReadinessState;
  checkedAt: string;
  components: {
    sessionCompletionWorker: { status: 'READY'; detail: string };
    attendanceReconciliation: { status: ReadinessState; detail: string };
    dailyWebhook: { status: ReadinessState; detail: string };
    paymentRouting: { status: ReadinessState; detail: string };
    accountingReconciliation: { status: ReadinessState; detail: string };
  };
  warnings: string[];
};

@Injectable()
export class ReadinessService {
  constructor(private readonly paymentRuntime: PaymentRuntimeConfigService) {}

  getSnapshot(): ReadinessSnapshot {
    const production =
      process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
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
      const enabledRoutes = routing.routeReadiness.filter(({ route }) => route.enabled);
      if (enabledRoutes.some(({ ready }) => !ready)) {
        paymentStatus = 'NOT_READY';
        paymentDetail = 'One or more enabled payment routes are not ready.';
      }
    } catch {
      paymentStatus = 'NOT_READY';
      paymentDetail = 'Payment routing snapshot is unavailable.';
    }

    const warnings: string[] = [];
    const attendanceStatus: ReadinessState = attendanceEnabled ? 'READY' : 'DEGRADED';
    if (!attendanceEnabled) {
      warnings.push(
        'SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED is not true; attendance evidence reconciliation is disabled.',
      );
    }
    const dailyStatus: ReadinessState = dailyConfigured ? 'READY' : production ? 'NOT_READY' : 'DEGRADED';
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

    const statuses = [
      attendanceStatus,
      dailyStatus,
      paymentStatus,
      reconciliationStatus,
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
          detail: 'Production completion-confirmation worker is always started.',
        },
        attendanceReconciliation: {
          status: attendanceStatus,
          detail: attendanceEnabled ? 'Evidence-only worker is enabled.' : 'Evidence-only worker is disabled.',
        },
        dailyWebhook: {
          status: dailyStatus,
          detail: dailyConfigured ? 'Daily webhook credentials are configured.' : 'Daily webhook credentials are incomplete.',
        },
        paymentRouting: { status: paymentStatus, detail: paymentDetail },
        accountingReconciliation: {
          status: reconciliationStatus,
          detail: reconciliationDetail,
        },
      },
      warnings,
    };
  }
}
