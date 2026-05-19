import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { Prisma, AccountingReconciliationRunStatus, AccountingReconciliationRunTrigger } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingReconciliationOperationsService } from './accounting-reconciliation-operations.service';
import { AccountingReconciliationSchedulerState } from '../types/accounting-reconciliation-operations.types';

@Injectable()
export class AccountingReconciliationSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    AccountingReconciliationSchedulerService.name,
  );
  private job: CronJob | null = null;
  private lastScheduledRunAt: Date | null = null;
  private lastScheduledRunId: string | null = null;
  private lastScheduledRunStatus: AccountingReconciliationRunStatus | null = null;
  private lastScheduledIssueCount: number | null = null;
  private lastScheduledCriticalCount: number | null = null;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly operationsService: AccountingReconciliationOperationsService,
  ) {}

  onModuleInit() {
    if (!this.shouldStartScheduler()) {
      return;
    }

    const cronExpression = this.getCronExpression();

    try {
      this.job = CronJob.from({
        cronTime: cronExpression,
        start: true,
        timeZone: 'UTC',
        waitForCompletion: true,
        onTick: async () => {
          await this.runScheduledReconciliation('cron');
        },
        errorHandler: (error) => {
          this.logger.error(
            `Accounting reconciliation scheduler job failed: ${(error as Error).message}`,
          );
        },
      });

      this.logger.log(
        `Accounting reconciliation scheduler started with cron "${cronExpression}"`,
      );
    } catch (error) {
      this.job = null;
      this.logger.error(
        `Accounting reconciliation scheduler could not start: ${(error as Error).message}`,
      );
    }
  }

  onModuleDestroy() {
    this.job?.stop();
    this.job = null;
  }

  async runScheduledReconciliation(triggeredBy: 'cron' | 'manual' = 'manual') {
    if (!this.isEnabled()) {
      return null;
    }

    if (this.running) {
      this.logger.warn(
        `Skipping accounting reconciliation because a run is already in progress`,
      );
      return null;
    }

    this.running = true;
    const startedAt = new Date();

    try {
      const result = await this.operationsService.runFull({
        scope: 'FULL',
        trigger: 'SCHEDULED',
        lookbackDays: this.getLookbackDays(),
        batchSize: this.getBatchSize(),
      });

      this.lastScheduledRunAt = startedAt;
      this.lastScheduledRunId = result.run.id;
      this.lastScheduledRunStatus = result.run.status as AccountingReconciliationRunStatus;
      this.lastScheduledIssueCount = result.issueCount;
      this.lastScheduledCriticalCount = result.summary.totalCritical;

      this.logger.log(
        `Accounting reconciliation scheduled run completed runId=${result.run.id} status=${result.run.status} checked=${result.summary.totalChecked} failed=${result.summary.totalFailed} critical=${result.summary.totalCritical} warnings=${result.summary.totalWarnings}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Accounting reconciliation scheduled run failed: ${(error as Error).message}`,
      );
      return null;
    } finally {
      this.running = false;
    }
  }

  async getStatusSnapshot(): Promise<AccountingReconciliationSchedulerState> {
    const [lastScheduledRun, lastFullRun, criticalCount, warningCount] =
      await Promise.all([
        this.prisma.accountingReconciliationRun.findFirst({
          where: {
            scope: 'FULL',
            trigger: 'SCHEDULED',
          },
          orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            startedAt: true,
            status: true,
            totalCritical: true,
            totalWarnings: true,
            totalFailed: true,
          },
        }),
        this.prisma.accountingReconciliationRun.findFirst({
          where: {
            scope: 'FULL',
            status: {
              in: [
                AccountingReconciliationRunStatus.COMPLETED,
                AccountingReconciliationRunStatus.COMPLETED_WITH_ISSUES,
              ],
            },
          },
          orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          select: { startedAt: true },
        }),
        this.prisma.accountingReconciliationIssue.count({
          where: {
            status: 'OPEN',
            severity: 'CRITICAL',
          },
        }),
        this.prisma.accountingReconciliationIssue.count({
          where: {
            status: 'OPEN',
            severity: { in: ['WARNING', 'ERROR'] },
          },
        }),
      ]);

    return {
      enabled: this.isEnabled(),
      alertsEnabled: this.isAlertsEnabled(),
      cron: this.getCronExpression(),
      lookbackDays: this.getLookbackDays(),
      batchSize: this.getBatchSize(),
      active: Boolean(this.job),
      nextScheduledRunAt: this.job ? this.job.nextDate().toJSDate().toISOString() : null,
      lastScheduledRunAt:
        this.lastScheduledRunAt?.toISOString() ??
        lastScheduledRun?.startedAt?.toISOString() ??
        null,
      lastScheduledRunId: this.lastScheduledRunId ?? lastScheduledRun?.id ?? null,
      lastScheduledRunStatus:
        this.lastScheduledRunStatus ??
        (lastScheduledRun?.status ?? null) ??
        null,
      lastScheduledIssueCount:
        this.lastScheduledIssueCount ??
        (typeof lastScheduledRun?.totalCritical === 'number'
          ? lastScheduledRun.totalCritical + lastScheduledRun.totalWarnings
          : null),
      lastScheduledCriticalCount:
        this.lastScheduledCriticalCount ?? lastScheduledRun?.totalCritical ?? null,
      lastFullRunAt: lastFullRun?.startedAt?.toISOString() ?? null,
      openCriticalCount: criticalCount,
      openWarningCount: warningCount,
    };
  }

  private shouldStartScheduler() {
    if (!this.isEnabled()) {
      return false;
    }

    if (process.env.NODE_ENV === 'test') {
      return false;
    }

    return true;
  }

  private isEnabled() {
    return (
      this.configService.get<boolean>('accountingReconciliation.enabled') ?? false
    );
  }

  private isAlertsEnabled() {
    return (
      this.configService.get<boolean>('accountingReconciliation.alertsEnabled') ??
      false
    );
  }

  private getCronExpression() {
    return (
      this.configService.get<string>('accountingReconciliation.cron') ??
      '0 3 * * *'
    );
  }

  private getLookbackDays() {
    return Math.max(
      1,
      this.configService.get<number>('accountingReconciliation.lookbackDays') ?? 7,
    );
  }

  private getBatchSize() {
    return Math.max(
      10,
      this.configService.get<number>('accountingReconciliation.batchSize') ?? 100,
    );
  }
}
