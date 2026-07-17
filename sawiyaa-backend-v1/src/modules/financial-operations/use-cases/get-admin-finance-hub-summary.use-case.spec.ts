import {
  AccountingReconciliationIssueStatus,
  PractitionerRecoveryStatus,
  PractitionerSettlementStatus,
  ReconciliationReviewStatus,
  SessionEarningReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import { GetAdminFinanceHubSummaryUseCase } from './get-admin-finance-hub-summary.use-case';

describe('GetAdminFinanceHubSummaryUseCase', () => {
  it('returns a compact finance queue snapshot', async () => {
    const prisma = {
      sessionEarningReview: {
        groupBy: jest.fn().mockResolvedValue([
          {
            paymentCurrencyCode: 'EGP',
            _sum: { paymentAmount: { toString: () => '125.00' } },
          },
        ]),
      },
      practitionerRecovery: {
        count: jest.fn().mockResolvedValue(7),
        groupBy: jest.fn().mockResolvedValue([
          {
            currencyCode: 'EGP',
            _sum: {
              amount: {
                sub: jest.fn().mockReturnValue({ toString: () => '80.00' }),
              },
              recoveredAmount: {
                toString: () => '20.00',
              },
            },
          },
        ]),
      },
      practitionerSettlement: {
        count: jest.fn().mockResolvedValue(4),
        groupBy: jest.fn().mockResolvedValue([
          {
            currencyCode: 'USD',
            _sum: { amountNet: { toString: () => '50.00' } },
          },
        ]),
      },
      financeReconciliationReview: {
        count: jest.fn().mockResolvedValue(3),
      },
      accountingReconciliationIssue: {
        count: jest.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaService;

    const sessionEarningReviewRepository = {
      countAdminReviews: jest.fn().mockResolvedValue(11),
    } as unknown as SessionEarningReviewRepository;
    const prismaMock = prisma as any;
    const repositoryMock = sessionEarningReviewRepository as any;

    const useCase = new GetAdminFinanceHubSummaryUseCase(
      prisma,
      sessionEarningReviewRepository,
    );

    const result = await useCase.execute();

    expect(result.generatedAt).toBeTruthy();
    expect(result.pendingSessionEarningReviewsCount).toBe(11);
    expect(result.pendingSessionEarningReviewsAmountByCurrency).toEqual([
      { currencyCode: 'EGP', amount: '125.00' },
    ]);
    expect(result.openPractitionerRecoveriesCount).toBe(7);
    expect(result.openPractitionerRecoveriesAmountByCurrency).toEqual([
      { currencyCode: 'EGP', amount: '80.00' },
    ]);
    expect(result.readyPractitionerSettlementsCount).toBe(4);
    expect(result.readyPractitionerSettlementsAmountByCurrency).toEqual([
      { currencyCode: 'USD', amount: '50.00' },
    ]);
    expect(result.pendingReconciliationReviewsCount).toBe(3);
    expect(result.openAccountingIssuesCount).toBe(2);
    expect(
      repositoryMock.countAdminReviews.mock.calls[0][0].reviewStatus,
    ).toBe(SessionEarningReviewStatus.PENDING_REVIEW);
    expect(
      prismaMock.practitionerRecovery.count.mock.calls[0][0].where.status.in,
    ).toEqual([
      PractitionerRecoveryStatus.OPEN,
      PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
    ]);
    expect(
      prismaMock.practitionerSettlement.count.mock.calls[0][0].where.status.in,
    ).toEqual([
      PractitionerSettlementStatus.READY,
      PractitionerSettlementStatus.PROCESSING,
    ]);
    expect(
      prismaMock.practitionerSettlement.groupBy.mock.calls[0][0].by,
    ).toEqual(['currencyCode']);
    expect(
      prismaMock.sessionEarningReview.groupBy.mock.calls[0][0].by,
    ).toEqual(['paymentCurrencyCode']);
    expect(
      prismaMock.financeReconciliationReview.count.mock.calls[0][0].where.status,
    ).toBe(ReconciliationReviewStatus.PENDING_REVIEW);
    expect(
      prismaMock.accountingReconciliationIssue.count.mock.calls[0][0].where.status.in,
    ).toEqual([
      AccountingReconciliationIssueStatus.OPEN,
      AccountingReconciliationIssueStatus.ACKNOWLEDGED,
    ]);
  });
});
