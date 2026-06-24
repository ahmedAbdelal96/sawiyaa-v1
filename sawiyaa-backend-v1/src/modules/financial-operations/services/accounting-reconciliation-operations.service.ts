import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountingReconciliationIssueStatus,
  AccountingReconciliationIssue as PrismaAccountingReconciliationIssue,
  AccountingReconciliationRun as PrismaAccountingReconciliationRun,
  AccountingReconciliationRunStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingReconciliationDiagnosticsService } from './accounting-reconciliation-diagnostics.service';
import { AccountingReconciliationAlertService } from './accounting-reconciliation-alert.service';
import {
  ACCOUNTING_RECONCILIATION_ISSUE_CODES,
  ReconciliationResult,
} from '../types/accounting-reconciliation.types';
import {
  AccountingReconciliationIssueListFilters,
  AccountingReconciliationIssueRecord,
  AccountingReconciliationIssueReviewAction,
  AccountingReconciliationIssueSeed,
  AccountingReconciliationIssueStatus as AccountingReconciliationIssueStatusView,
  AccountingReconciliationPaginatedResult,
  AccountingReconciliationRunExecutionResult,
  AccountingReconciliationRunExecutionSummary,
  AccountingReconciliationRunRecord,
  AccountingReconciliationRunRequest,
  AccountingReconciliationRunScope,
  AccountingReconciliationRunStatus as AccountingReconciliationRunStatusView,
  AccountingReconciliationRunTrigger as AccountingReconciliationRunTriggerView,
  AccountingReconciliationListFilters,
  AccountingReconciliationSeverity,
} from '../types/accounting-reconciliation-operations.types';

type ReconciliationTarget = {
  scope: AccountingReconciliationRunScope;
  entityType: string;
  entityId: string;
  currencyCode: string;
  execute: () => Promise<ReconciliationResult>;
};

type EntityListItem = {
  id: string;
  currencyCode: string;
  batchId?: string | null;
};

type WalletTarget = {
  id: string;
  currencyCode: string;
  practitionerId?: string;
  patientId?: string;
};

@Injectable()
export class AccountingReconciliationOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diagnostics: AccountingReconciliationDiagnosticsService,
    private readonly alertService: AccountingReconciliationAlertService,
    private readonly configService: ConfigService,
  ) {}

  async runPayments(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'PAYMENTS',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async runWallets(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'WALLETS',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async runSettlements(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'SETTLEMENTS',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async runRefunds(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'REFUNDS',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async runPackageSettlements(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'PACKAGE_SETTLEMENTS',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async runFull(
    input: AccountingReconciliationRunRequest,
    actorUserId?: string | null,
  ) {
    return this.runScope({
      scope: 'FULL',
      trigger: input.trigger,
      triggeredByUserId: actorUserId ?? input.triggeredByUserId ?? null,
      currencyCode: input.currencyCode,
      practitionerId: input.practitionerId,
      patientId: input.patientId,
      entityId: input.entityId,
      from: input.from,
      to: input.to,
      lookbackDays: input.lookbackDays,
      batchSize: input.batchSize,
      query: input.query,
    });
  }

  async listRuns(
    input: AccountingReconciliationListFilters & {
      page?: number;
      limit?: number;
    },
  ) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const where: Prisma.AccountingReconciliationRunWhereInput = {
      scope: input.scope ?? undefined,
      status: input.status ?? undefined,
      trigger: input.trigger ?? undefined,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      triggeredByUserId: input.triggeredByUserId ?? undefined,
      ...(input.from || input.to
        ? {
            startedAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.accountingReconciliationRun.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountingReconciliationRun.count({ where }),
    ]);

    return this.paginateRuns(items, totalItems, page, limit);
  }

  async getRun(runId: string) {
    const run = await this.prisma.accountingReconciliationRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return null;
    }

    const issues = await this.prisma.accountingReconciliationIssue.findMany({
      where: { runId: run.id },
      orderBy: [
        { severity: 'desc' },
        { lastDetectedAt: 'desc' },
        { id: 'asc' },
      ],
    });

    return {
      run: this.toRunViewModel(run),
      issues: issues.map((item) => this.toIssueViewModel(item)),
    };
  }

  async listIssues(
    input: AccountingReconciliationIssueListFilters & {
      page?: number;
      limit?: number;
    },
  ) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const where: Prisma.AccountingReconciliationIssueWhereInput = {
      runId: input.runId ?? undefined,
      scope: input.scope ?? undefined,
      status: input.status ?? undefined,
      severity: input.severity ?? undefined,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      issueCode: input.issueCode ?? undefined,
      ...(input.from || input.to
        ? {
            lastDetectedAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.accountingReconciliationIssue.findMany({
        where,
        orderBy: [
          { severity: 'desc' },
          { lastDetectedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountingReconciliationIssue.count({ where }),
    ]);

    return this.paginateIssues(items, totalItems, page, limit);
  }

  async getIssue(issueId: string) {
    const issue = await this.prisma.accountingReconciliationIssue.findUnique({
      where: { id: issueId },
    });

    return issue ? this.toIssueViewModel(issue) : null;
  }

  async acknowledgeIssue(
    issueId: string,
    reviewerUserId: string,
    note?: string | null,
  ) {
    return this.reviewIssue(issueId, 'ACKNOWLEDGE', reviewerUserId, note);
  }

  async resolveIssue(
    issueId: string,
    reviewerUserId: string,
    note?: string | null,
  ) {
    return this.reviewIssue(issueId, 'RESOLVE', reviewerUserId, note);
  }

  async ignoreIssue(
    issueId: string,
    reviewerUserId: string,
    note?: string | null,
  ) {
    return this.reviewIssue(issueId, 'IGNORE', reviewerUserId, note);
  }

  private async reviewIssue(
    issueId: string,
    action: AccountingReconciliationIssueReviewAction,
    reviewerUserId: string,
    note?: string | null,
  ) {
    const now = new Date();
    const updated = await this.prisma.accountingReconciliationIssue.update({
      where: { id: issueId },
      data: {
        status:
          action === 'ACKNOWLEDGE'
            ? AccountingReconciliationIssueStatus.ACKNOWLEDGED
            : action === 'RESOLVE'
              ? AccountingReconciliationIssueStatus.RESOLVED
              : AccountingReconciliationIssueStatus.IGNORED,
        acknowledgedAt: action === 'ACKNOWLEDGE' ? now : undefined,
        acknowledgedByUserId:
          action === 'ACKNOWLEDGE' ? reviewerUserId : undefined,
        resolvedAt: action === 'RESOLVE' ? now : undefined,
        resolvedByUserId: action === 'RESOLVE' ? reviewerUserId : undefined,
        ignoredAt: action === 'IGNORE' ? now : undefined,
        ignoredByUserId: action === 'IGNORE' ? reviewerUserId : undefined,
        resolutionNote: note?.trim() || null,
      },
    });

    return this.toIssueViewModel(updated);
  }

  private async runScope(input: AccountingReconciliationRunRequest) {
    const scope = input.scope;
    const startedAt = new Date();
    const run = await this.prisma.accountingReconciliationRun.create({
      data: {
        scope,
        trigger: input.trigger,
        entityType: input.entityId ? this.scopeEntityType(scope) : null,
        entityId: input.entityId ?? null,
        currencyCode: this.normalizeCurrency(input.currencyCode),
        startedAt,
        status: AccountingReconciliationRunStatus.RUNNING,
        triggeredByUserId: input.triggeredByUserId ?? null,
        metadataJson: this.toMetadata({
          scope,
          from: this.resolveFromDate(input).toISOString(),
          to: this.resolveToDate(input).toISOString(),
          lookbackDays: this.resolveLookbackDays(input),
          batchSize: this.resolveBatchSize(input),
          practitionerId: input.practitionerId ?? null,
          patientId: input.patientId ?? null,
          query: input.query ?? null,
        }),
      },
    });

    try {
      const targets = await this.collectTargets(input);
      const execution = await this.executeTargets(run.id, scope, targets);

      const finalRun = await this.prisma.accountingReconciliationRun.update({
        where: { id: run.id },
        data: {
          status:
            execution.issueCount > 0
              ? AccountingReconciliationRunStatus.COMPLETED_WITH_ISSUES
              : AccountingReconciliationRunStatus.COMPLETED,
          completedAt: new Date(),
          totalChecked: execution.summary.totalChecked,
          totalPassed: execution.summary.totalPassed,
          totalFailed: execution.summary.totalFailed,
          totalWarnings: execution.summary.totalWarnings,
          totalCritical: execution.summary.totalCritical,
          summaryJson: this.toMetadata({
            ...execution.summary,
            issueCount: execution.issueCount,
          }),
        },
      });

      await this.alertService.handleCriticalRunIssues({
        runId: finalRun.id,
        scope: finalRun.scope as AccountingReconciliationRunScope,
        issueSeeds: execution.issueSeeds,
        summary: execution.summary,
      });

      return {
        run: this.toRunViewModel(finalRun),
        summary: execution.summary,
        issueCount: execution.issueCount,
      } satisfies AccountingReconciliationRunExecutionResult;
    } catch (error) {
      await this.prisma.accountingReconciliationRun.update({
        where: { id: run.id },
        data: {
          status: AccountingReconciliationRunStatus.FAILED,
          completedAt: new Date(),
          summaryJson: this.toMetadata({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      });
      throw error;
    }
  }

  private async executeTargets(
    runId: string,
    scope: AccountingReconciliationRunScope,
    targets: ReconciliationTarget[],
  ): Promise<{
    summary: AccountingReconciliationRunExecutionSummary;
    issueCount: number;
    issueSeeds: AccountingReconciliationIssueSeed[];
  }> {
    const seeds: AccountingReconciliationIssueSeed[] = [];
    let totalChecked = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;
    let totalCritical = 0;

    for (const target of targets) {
      totalChecked += 1;
      const result = await this.safeReconcileTarget(target);
      if (result.ok) {
        totalPassed += 1;
      } else {
        totalFailed += 1;
      }

      for (const issue of result.issues) {
        if (issue.severity === 'WARNING') {
          totalWarnings += 1;
        }
        if (issue.severity === 'CRITICAL') {
          totalCritical += 1;
        }

        seeds.push({
          runId,
          scope: target.scope ?? scope,
          entityType: issue.entityType,
          entityId: issue.entityId,
          currencyCode: issue.currencyCode ?? target.currencyCode,
          issueCode: issue.code,
          severity: issue.severity,
          message: issue.message,
          expectedValue: issue.expected == null ? null : String(issue.expected),
          actualValue: issue.actual == null ? null : String(issue.actual),
          metadataJson: issue.metadata ?? null,
        });
      }
    }

    await this.persistIssues(runId, seeds);

    return {
      summary: {
        totalChecked,
        totalPassed,
        totalFailed,
        totalWarnings,
        totalCritical,
      },
      issueCount: seeds.length,
      issueSeeds: seeds,
    };
  }

  private async safeReconcileTarget(target: ReconciliationTarget) {
    try {
      return await target.execute();
    } catch (error) {
      return {
        ok: false,
        checkedAt: new Date(),
        scope: target.scope,
        entityType: target.entityType,
        entityId: target.entityId,
        currencyCode: target.currencyCode,
        issues: [
          {
            code: ACCOUNTING_RECONCILIATION_ISSUE_CODES.RECONCILIATION_EXECUTION_ERROR,
            severity: 'CRITICAL' as const,
            message:
              error instanceof Error
                ? `Reconciliation failed: ${error.message}`
                : 'Reconciliation failed unexpectedly.',
            entityType: target.entityType,
            entityId: target.entityId,
            currencyCode: target.currencyCode,
            metadata: {
              scope: target.scope,
              errorType: error instanceof Error ? error.name : 'UnknownError',
            },
          },
        ],
      } satisfies ReconciliationResult;
    }
  }

  private async collectTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    switch (input.scope) {
      case 'PAYMENTS':
        return this.collectPaymentTargets(input);
      case 'WALLETS':
        return this.collectWalletTargets(input);
      case 'SETTLEMENTS':
        return this.collectSettlementTargets(input);
      case 'REFUNDS':
        return this.collectRefundTargets(input);
      case 'PACKAGE_SETTLEMENTS':
        return this.collectPackageSettlementTargets(input);
      case 'FULL':
        return [
          ...(await this.collectPaymentTargets(input)),
          ...(await this.collectWalletTargets(input)),
          ...(await this.collectSettlementTargets(input)),
          ...(await this.collectRefundTargets(input)),
          ...(await this.collectPackageSettlementTargets(input)),
        ];
      default:
        throw new BadRequestException({
          messageKey: 'financialOperations.errors.invalidFilter',
          error: 'FINANCIAL_RECONCILIATION_INVALID_SCOPE',
        });
    }
  }

  private async collectPaymentTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    const payments = await this.findPaymentTargets(input);
    return payments.map((payment) => ({
      scope: 'PAYMENTS',
      entityType: 'Payment',
      entityId: payment.id,
      currencyCode: payment.currencyCode,
      execute: () => this.diagnostics.reconcilePayment(payment.id),
    }));
  }

  private async collectWalletTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    const [practitionerWallets, customerWallets] = await Promise.all([
      this.findPractitionerWalletTargets(input),
      this.findCustomerWalletTargets(input),
    ]);

    return [
      ...practitionerWallets.map((wallet) => ({
        scope: 'WALLETS' as const,
        entityType: 'PractitionerWallet',
        entityId: wallet.id,
        currencyCode: wallet.currencyCode,
        execute: () =>
          this.diagnostics.reconcilePractitionerWallet(
            wallet.practitionerId ?? wallet.id,
            wallet.currencyCode,
          ),
      })),
      ...customerWallets.map((wallet) => ({
        scope: 'WALLETS' as const,
        entityType: 'CustomerWallet',
        entityId: wallet.id,
        currencyCode: wallet.currencyCode,
        execute: () =>
          this.diagnostics.reconcileCustomerWallet(
            wallet.patientId ?? wallet.id,
            wallet.currencyCode,
          ),
      })),
    ];
  }

  private async collectSettlementTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    const settlements = await this.findSettlementTargets(input);
    const batches = await this.findSettlementBatchTargets(input, settlements);

    return [
      ...settlements.map((settlement) => ({
        scope: 'SETTLEMENTS' as const,
        entityType: 'PractitionerSettlement',
        entityId: settlement.id,
        currencyCode: settlement.currencyCode,
        execute: () => this.diagnostics.reconcileSettlement(settlement.id),
      })),
      ...batches.map((batch) => ({
        scope: 'SETTLEMENTS' as const,
        entityType: 'SettlementBatch',
        entityId: batch.id,
        currencyCode: batch.currencyCode,
        execute: () => this.diagnostics.reconcileSettlementBatch(batch.id),
      })),
    ];
  }

  private async collectRefundTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    const refunds = await this.findRefundTargets(input);
    return refunds.map((refund) => ({
      scope: 'REFUNDS' as const,
      entityType: 'Refund',
      entityId: refund.id,
      currencyCode: refund.currencyCode,
      execute: () => this.diagnostics.reconcileRefund(refund.id),
    }));
  }

  private async collectPackageSettlementTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<ReconciliationTarget[]> {
    const packages = await this.findPackageSettlementTargets(input);
    return packages.map((packageSettlement) => ({
      scope: 'PACKAGE_SETTLEMENTS' as const,
      entityType: 'PackageSettlement',
      entityId: packageSettlement.id,
      currencyCode: packageSettlement.currencyCode,
      execute: () =>
        this.diagnostics.reconcilePackageSettlement(packageSettlement.id),
    }));
  }

  private async findPaymentTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<EntityListItem[]> {
    const where: Prisma.PaymentWhereInput = {
      status: {
        in: [
          PaymentStatus.CAPTURED,
          PaymentStatus.REFUND_PENDING,
          PaymentStatus.PARTIALLY_REFUNDED,
          PaymentStatus.REFUNDED,
        ],
      },
      capturedAt: this.buildDateWindow(input),
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      practitionerId: input.practitionerId ?? undefined,
      sessionId: input.entityId ?? undefined,
    };

    return this.findInBatches<EntityListItem>(
      (skip, take) =>
        this.prisma.payment.findMany({
          where,
          orderBy: [{ capturedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, currencyCode: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async findRefundTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<EntityListItem[]> {
    const where: Prisma.RefundWhereInput = {
      status: RefundStatus.SUCCEEDED,
      processedAt: this.buildDateWindow(input),
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      payment: {
        practitionerId: input.practitionerId ?? undefined,
      },
      sessionId: input.entityId ?? undefined,
    };

    return this.findInBatches<EntityListItem>(
      (skip, take) =>
        this.prisma.refund.findMany({
          where,
          orderBy: [
            { processedAt: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' },
          ],
          select: { id: true, currencyCode: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async findSettlementTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<EntityListItem[]> {
    const where: Prisma.PractitionerSettlementWhereInput = {
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      practitionerId: input.practitionerId ?? undefined,
      createdAt: this.buildDateWindow(input),
    };

    return this.findInBatches<EntityListItem>(
      (skip, take) =>
        this.prisma.practitionerSettlement.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, currencyCode: true, batchId: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async findSettlementBatchTargets(
    input: AccountingReconciliationRunRequest,
    settlements: EntityListItem[],
  ): Promise<EntityListItem[]> {
    const uniqueBatchIds = Array.from(
      new Set(
        settlements
          .map((item) => item.batchId)
          .filter((batchId): batchId is string => Boolean(batchId)),
      ),
    );
    if (uniqueBatchIds.length === 0) {
      return [];
    }

    const batches = await this.prisma.settlementBatch.findMany({
      where: {
        id: { in: uniqueBatchIds },
        currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      },
      select: { id: true, currencyCode: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return batches;
  }

  private async findPractitionerWalletTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<WalletTarget[]> {
    const where: Prisma.PractitionerWalletWhereInput = {
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      practitionerId: input.practitionerId ?? undefined,
      OR: this.buildWalletDateWindow(
        input,
        'updatedAt',
        'lastLedgerEntryAt',
      ) as Prisma.PractitionerWalletWhereInput['OR'] | undefined,
    };

    return this.findInBatches<WalletTarget>(
      (skip, take) =>
        this.prisma.practitionerWallet.findMany({
          where,
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          select: { id: true, currencyCode: true, practitionerId: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async findCustomerWalletTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<WalletTarget[]> {
    const where: Prisma.CustomerWalletWhereInput = {
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      patientId: input.patientId ?? undefined,
      OR: this.buildWalletDateWindow(input, 'updatedAt', 'lastEntryAt') as
        | Prisma.CustomerWalletWhereInput['OR']
        | undefined,
    };

    return this.findInBatches<WalletTarget>(
      (skip, take) =>
        this.prisma.customerWallet.findMany({
          where,
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          select: { id: true, currencyCode: true, patientId: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async findPackageSettlementTargets(
    input: AccountingReconciliationRunRequest,
  ): Promise<EntityListItem[]> {
    const where: Prisma.PackageSettlementWhereInput = {
      currencyCode: this.normalizeCurrency(input.currencyCode) ?? undefined,
      createdAt: this.buildDateWindow(input),
    };

    return this.findInBatches<EntityListItem>(
      (skip, take) =>
        this.prisma.packageSettlement.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, currencyCode: true },
          skip,
          take,
        }),
      this.resolveBatchSize(input),
    );
  }

  private async persistIssues(
    runId: string,
    seeds: AccountingReconciliationIssueSeed[],
  ) {
    if (seeds.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const seed of seeds) {
        const existing = await tx.accountingReconciliationIssue.findUnique({
          where: {
            scope_entityType_entityId_issueCode_currencyCode: {
              scope: seed.scope,
              entityType: seed.entityType,
              entityId: seed.entityId,
              issueCode: seed.issueCode,
              currencyCode: seed.currencyCode,
            },
          },
        });

        const reopenRequired =
          existing &&
          (existing.status === AccountingReconciliationIssueStatus.RESOLVED ||
            existing.status === AccountingReconciliationIssueStatus.IGNORED);

        await tx.accountingReconciliationIssue.upsert({
          where: {
            scope_entityType_entityId_issueCode_currencyCode: {
              scope: seed.scope,
              entityType: seed.entityType,
              entityId: seed.entityId,
              issueCode: seed.issueCode,
              currencyCode: seed.currencyCode,
            },
          },
          create: {
            runId,
            scope: seed.scope,
            entityType: seed.entityType,
            entityId: seed.entityId,
            currencyCode: seed.currencyCode,
            issueCode: seed.issueCode,
            severity: this.toIssueSeverity(seed.severity),
            status: AccountingReconciliationIssueStatus.OPEN,
            message: seed.message,
            expectedValue:
              seed.expectedValue == null ? null : String(seed.expectedValue),
            actualValue:
              seed.actualValue == null ? null : String(seed.actualValue),
            metadataJson:
              seed.metadataJson == null
                ? undefined
                : this.toMetadata(seed.metadataJson),
            firstDetectedAt: new Date(),
            lastDetectedAt: new Date(),
          },
          update: {
            runId,
            severity: this.toIssueSeverity(seed.severity),
            message: seed.message,
            expectedValue:
              seed.expectedValue == null ? null : String(seed.expectedValue),
            actualValue:
              seed.actualValue == null ? null : String(seed.actualValue),
            metadataJson:
              seed.metadataJson == null
                ? undefined
                : this.toMetadata(seed.metadataJson),
            lastDetectedAt: new Date(),
            ...(reopenRequired
              ? {
                  status: AccountingReconciliationIssueStatus.OPEN,
                  acknowledgedAt: null,
                  acknowledgedByUserId: null,
                  resolvedAt: null,
                  resolvedByUserId: null,
                  ignoredAt: null,
                  ignoredByUserId: null,
                  resolutionNote: null,
                }
              : {}),
          },
        });
      }
    });
  }

  private paginateRuns(
    items: PrismaAccountingReconciliationRun[],
    totalItems: number,
    page: number,
    limit: number,
  ): AccountingReconciliationPaginatedResult<AccountingReconciliationRunRecord> {
    return {
      items: items.map((item) => this.toRunRecord(item)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  private paginateIssues(
    items: PrismaAccountingReconciliationIssue[],
    totalItems: number,
    page: number,
    limit: number,
  ): AccountingReconciliationPaginatedResult<AccountingReconciliationIssueRecord> {
    return {
      items: items.map((item) => this.toIssueRecord(item)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  private toRunViewModel(
    run: PrismaAccountingReconciliationRun,
  ): AccountingReconciliationRunRecord {
    return this.toRunRecord(run);
  }

  private toIssueViewModel(
    issue: PrismaAccountingReconciliationIssue,
  ): AccountingReconciliationIssueRecord {
    return this.toIssueRecord(issue);
  }

  private toRunRecord(
    run: PrismaAccountingReconciliationRun,
  ): AccountingReconciliationRunRecord {
    return {
      id: run.id,
      scope: run.scope as AccountingReconciliationRunScope,
      trigger: run.trigger as AccountingReconciliationRunTriggerView,
      status: run.status as AccountingReconciliationRunStatusView,
      entityType: run.entityType,
      entityId: run.entityId,
      currencyCode: run.currencyCode,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      totalChecked: run.totalChecked,
      totalPassed: run.totalPassed,
      totalFailed: run.totalFailed,
      totalWarnings: run.totalWarnings,
      totalCritical: run.totalCritical,
      summaryJson: this.toRecord(run.summaryJson),
      metadataJson: this.toRecord(run.metadataJson),
      triggeredByUserId: run.triggeredByUserId,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  private toIssueRecord(
    issue: PrismaAccountingReconciliationIssue,
  ): AccountingReconciliationIssueRecord {
    return {
      id: issue.id,
      runId: issue.runId,
      scope: issue.scope as AccountingReconciliationRunScope,
      entityType: issue.entityType,
      entityId: issue.entityId,
      currencyCode: issue.currencyCode,
      issueCode: issue.issueCode,
      severity: issue.severity as AccountingReconciliationSeverity,
      status: issue.status as AccountingReconciliationIssueStatusView,
      message: issue.message,
      expectedValue: issue.expectedValue,
      actualValue: issue.actualValue,
      metadataJson: this.toRecord(issue.metadataJson),
      firstDetectedAt: issue.firstDetectedAt,
      lastDetectedAt: issue.lastDetectedAt,
      acknowledgedAt: issue.acknowledgedAt,
      acknowledgedByUserId: issue.acknowledgedByUserId,
      resolvedAt: issue.resolvedAt,
      resolvedByUserId: issue.resolvedByUserId,
      ignoredAt: issue.ignoredAt,
      ignoredByUserId: issue.ignoredByUserId,
      resolutionNote: issue.resolutionNote,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };
  }

  private async findInBatches<T>(
    fetchPage: (skip: number, take: number) => Promise<T[]>,
    batchSize: number,
  ): Promise<T[]> {
    const pageSize = Math.max(1, batchSize);
    const results: T[] = [];
    let skip = 0;

    while (true) {
      const page = await fetchPage(skip, pageSize);
      results.push(...page);
      if (page.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    return results;
  }

  private buildDateWindow(input: AccountingReconciliationRunRequest) {
    const from = this.resolveFromDate(input);
    const to = this.resolveToDate(input);
    return {
      gte: from,
      lte: to,
    };
  }

  private buildWalletDateWindow(
    input: AccountingReconciliationRunRequest,
    updatedAtField: 'updatedAt' | 'lastEntryAt' | 'lastLedgerEntryAt',
    lastAtField: 'updatedAt' | 'lastEntryAt' | 'lastLedgerEntryAt',
  ) {
    const window = this.buildDateWindow(input);
    return [{ [updatedAtField]: window }, { [lastAtField]: window }];
  }

  private resolveFromDate(input: AccountingReconciliationRunRequest) {
    if (input.from) {
      return input.from;
    }

    const lookbackDays = this.resolveLookbackDays(input);
    const end = this.resolveToDate(input);
    return new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  }

  private resolveToDate(input: AccountingReconciliationRunRequest) {
    return input.to ?? new Date();
  }

  private resolveLookbackDays(input: AccountingReconciliationRunRequest) {
    return Math.max(
      1,
      input.lookbackDays ??
        this.configService.get<number>(
          'accountingReconciliation.lookbackDays',
          7,
        ),
    );
  }

  private resolveBatchSize(input: AccountingReconciliationRunRequest) {
    return Math.max(
      10,
      input.batchSize ??
        this.configService.get<number>(
          'accountingReconciliation.batchSize',
          100,
        ),
    );
  }

  private normalizeCurrency(currencyCode: string | null | undefined) {
    const normalized = currencyCode?.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  private scopeEntityType(scope: AccountingReconciliationRunScope) {
    if (scope === 'PAYMENTS') {
      return 'Payment';
    }
    if (scope === 'WALLETS') {
      return 'Wallet';
    }
    if (scope === 'SETTLEMENTS') {
      return 'Settlement';
    }
    if (scope === 'REFUNDS') {
      return 'Refund';
    }
    if (scope === 'PACKAGE_SETTLEMENTS') {
      return 'PackageSettlement';
    }
    return null;
  }

  private toMetadata(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Prisma.JsonValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Prisma.JsonValue;
  }

  private toIssueSeverity(
    severity: AccountingReconciliationSeverity,
  ): AccountingReconciliationSeverity {
    return severity;
  }
}
