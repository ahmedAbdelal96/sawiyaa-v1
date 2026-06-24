import { ConfigService } from '@nestjs/config';
import { AccountingReconciliationAlertService } from './accounting-reconciliation-alert.service';
import { AccountingReconciliationDiagnosticsService } from './accounting-reconciliation-diagnostics.service';
import { AccountingReconciliationOperationsService } from './accounting-reconciliation-operations.service';
import { PrismaService } from '@common/prisma/prisma.service';

function buildRunRecord(partial: Record<string, unknown> = {}) {
  return {
    id: 'run_1',
    scope: 'PAYMENTS',
    trigger: 'ADMIN',
    status: 'COMPLETED',
    entityType: null,
    entityId: null,
    currencyCode: null,
    startedAt: new Date('2026-05-15T00:00:00.000Z'),
    completedAt: new Date('2026-05-15T00:01:00.000Z'),
    totalChecked: 1,
    totalPassed: 0,
    totalFailed: 1,
    totalWarnings: 0,
    totalCritical: 1,
    summaryJson: null,
    metadataJson: null,
    triggeredByUserId: 'user_1',
    createdAt: new Date('2026-05-15T00:00:00.000Z'),
    updatedAt: new Date('2026-05-15T00:01:00.000Z'),
    ...partial,
  };
}

function buildIssueRecord(partial: Record<string, unknown> = {}) {
  return {
    id: 'issue_1',
    runId: 'run_1',
    scope: 'PAYMENTS',
    entityType: 'Payment',
    entityId: 'payment_1',
    currencyCode: 'EGP',
    issueCode: 'DUPLICATE_POSTING',
    severity: 'CRITICAL',
    status: 'OPEN',
    message: 'Duplicate posting detected',
    expectedValue: '1',
    actualValue: '2',
    metadataJson: null,
    firstDetectedAt: new Date('2026-05-15T00:00:00.000Z'),
    lastDetectedAt: new Date('2026-05-15T00:00:00.000Z'),
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
    ignoredAt: null,
    ignoredByUserId: null,
    resolutionNote: null,
    createdAt: new Date('2026-05-15T00:00:00.000Z'),
    updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    ...partial,
  };
}

function buildService() {
  const issueUpsert = jest.fn();
  const issueFindUnique = jest.fn();
  const runCreate = jest.fn();
  const runUpdate = jest.fn();

  const prisma = {
    accountingReconciliationRun: {
      create: runCreate,
      update: runUpdate,
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    accountingReconciliationIssue: {
      findMany: jest.fn(),
      findUnique: issueFindUnique,
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    practitionerWallet: {
      findMany: jest.fn(),
    },
    customerWallet: {
      findMany: jest.fn(),
    },
    practitionerSettlement: {
      findMany: jest.fn(),
    },
    settlementBatch: {
      findMany: jest.fn(),
    },
    refund: {
      findMany: jest.fn(),
    },
    packageSettlement: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        accountingReconciliationIssue: {
          findUnique: issueFindUnique,
          upsert: issueUpsert,
        },
      }),
    ),
  } as unknown as PrismaService;

  const diagnostics = {
    reconcilePayment: jest.fn(),
    reconcilePractitionerWallet: jest.fn(),
    reconcileCustomerWallet: jest.fn(),
    reconcileSettlement: jest.fn(),
    reconcileSettlementBatch: jest.fn(),
    reconcileRefund: jest.fn(),
    reconcilePackageSettlement: jest.fn(),
  } as unknown as AccountingReconciliationDiagnosticsService;

  const alertService = {
    handleCriticalRunIssues: jest.fn().mockResolvedValue(undefined),
  } as unknown as AccountingReconciliationAlertService;

  const configService = {
    get: jest.fn((key: string, fallback: number | boolean) => fallback),
  } as unknown as ConfigService;

  const service = new AccountingReconciliationOperationsService(
    prisma,
    diagnostics,
    alertService,
    configService,
  );

  return {
    service,
    prisma: prisma as unknown as {
      accountingReconciliationRun: {
        create: jest.Mock;
        update: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        findUnique: jest.Mock;
      };
      accountingReconciliationIssue: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        count: jest.Mock;
        upsert: jest.Mock;
        update: jest.Mock;
      };
      payment: { findMany: jest.Mock };
      practitionerWallet: { findMany: jest.Mock };
      customerWallet: { findMany: jest.Mock };
      practitionerSettlement: { findMany: jest.Mock };
      settlementBatch: { findMany: jest.Mock };
      refund: { findMany: jest.Mock };
      packageSettlement: { findMany: jest.Mock };
      $transaction: jest.Mock;
    },
    diagnostics: diagnostics as unknown as {
      reconcilePayment: jest.Mock;
      reconcilePractitionerWallet: jest.Mock;
      reconcileCustomerWallet: jest.Mock;
      reconcileSettlement: jest.Mock;
      reconcileSettlementBatch: jest.Mock;
      reconcileRefund: jest.Mock;
      reconcilePackageSettlement: jest.Mock;
    },
    alertService: alertService as unknown as {
      handleCriticalRunIssues: jest.Mock;
    },
    issueUpsert,
    issueFindUnique,
    runCreate,
    runUpdate,
  };
}

describe('AccountingReconciliationOperationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a payment reconciliation run and persists deterministic issues', async () => {
    const setup = buildService();

    setup.prisma.accountingReconciliationRun.create.mockResolvedValue(
      buildRunRecord({ id: 'run_1', status: 'RUNNING' }),
    );
    setup.prisma.accountingReconciliationRun.update.mockResolvedValue(
      buildRunRecord({ status: 'COMPLETED_WITH_ISSUES' }),
    );
    setup.prisma.payment.findMany.mockResolvedValue([
      { id: 'payment_1', currencyCode: 'EGP' },
    ]);
    setup.diagnostics.reconcilePayment.mockResolvedValue({
      ok: false,
      checkedAt: new Date('2026-05-15T00:00:00.000Z'),
      scope: 'PAYMENTS',
      entityType: 'Payment',
      entityId: 'payment_1',
      currencyCode: 'EGP',
      issues: [
        {
          code: 'DUPLICATE_POSTING',
          severity: 'CRITICAL',
          message: 'Duplicate posting detected',
          entityType: 'Payment',
          entityId: 'payment_1',
          currencyCode: 'EGP',
          expected: '1',
          actual: '2',
          metadata: { source: 'ledger' },
        },
      ],
    });
    setup.issueFindUnique.mockResolvedValue(null);
    setup.issueUpsert.mockResolvedValue(buildIssueRecord());

    const result = await setup.service.runPayments(
      { scope: 'PAYMENTS', trigger: 'ADMIN' },
      'user_1',
    );

    expect(result.run.status).toBe('COMPLETED_WITH_ISSUES');
    expect(result.summary.totalChecked).toBe(1);
    expect(result.summary.totalFailed).toBe(1);
    expect(result.summary.totalCritical).toBe(1);
    expect(result.issueCount).toBe(1);
    expect(setup.issueUpsert).toHaveBeenCalledTimes(1);
    expect(setup.alertService.handleCriticalRunIssues).toHaveBeenCalledTimes(1);
  });

  it('supports acknowledgement, resolution, and ignore review lifecycle without mutating finance data', async () => {
    const setup = buildService();
    setup.prisma.accountingReconciliationIssue.update.mockResolvedValue(
      buildIssueRecord({
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date('2026-05-15T00:05:00.000Z'),
        acknowledgedByUserId: 'reviewer_1',
        resolutionNote: 'checked',
      }),
    );

    const acknowledged = await setup.service.acknowledgeIssue(
      'issue_1',
      'reviewer_1',
      ' checked ',
    );

    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    expect(acknowledged.resolutionNote).toBe('checked');

    setup.prisma.accountingReconciliationIssue.update.mockResolvedValue(
      buildIssueRecord({
        status: 'RESOLVED',
        resolvedAt: new Date('2026-05-15T00:06:00.000Z'),
        resolvedByUserId: 'reviewer_1',
        resolutionNote: 'resolved',
      }),
    );

    const resolved = await setup.service.resolveIssue(
      'issue_1',
      'reviewer_1',
      'resolved',
    );
    expect(resolved.status).toBe('RESOLVED');

    setup.prisma.accountingReconciliationIssue.update.mockResolvedValue(
      buildIssueRecord({
        status: 'IGNORED',
        ignoredAt: new Date('2026-05-15T00:07:00.000Z'),
        ignoredByUserId: 'reviewer_1',
        resolutionNote: 'ignore',
      }),
    );

    const ignored = await setup.service.ignoreIssue(
      'issue_1',
      'reviewer_1',
      'ignore',
    );
    expect(ignored.status).toBe('IGNORED');
  });

  it('lists issues with currency-scoped filters and pagination', async () => {
    const setup = buildService();
    setup.prisma.accountingReconciliationIssue.findMany.mockResolvedValue([]);
    setup.prisma.accountingReconciliationIssue.count.mockResolvedValue(0);

    const result = await setup.service.listIssues({
      currencyCode: 'egp',
      severity: 'WARNING',
      status: 'OPEN',
      page: 2,
      limit: 5,
    });

    const firstCall = setup.prisma.accountingReconciliationIssue.findMany.mock
      .calls[0] as [
      {
        where: {
          currencyCode?: string;
          severity?: string;
        };
      },
    ];
    const where = firstCall[0].where;

    expect(where.currencyCode).toBe('EGP');
    expect(where.severity).toBe('WARNING');
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(5);
  });
});
