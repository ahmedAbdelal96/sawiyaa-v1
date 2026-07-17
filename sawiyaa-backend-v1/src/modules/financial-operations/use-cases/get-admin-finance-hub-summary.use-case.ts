import { Injectable } from '@nestjs/common';
import {
  AccountingReconciliationIssueStatus,
  PractitionerRecoveryStatus,
  PractitionerSettlementStatus,
  ReconciliationReviewStatus,
  SessionEarningReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import {
  AdminFinanceHubCurrencyAmountDto,
  AdminFinanceHubSummaryDataDto,
} from '../dto/admin-finance-dashboard-summary.dto';

@Injectable()
export class GetAdminFinanceHubSummaryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionEarningReviewRepository: SessionEarningReviewRepository,
  ) {}

  async execute(): Promise<AdminFinanceHubSummaryDataDto> {
    const [
      pendingSessionEarningReviewsCount,
      pendingSessionEarningReviewsAmountByCurrency,
      openPractitionerRecoveriesCount,
      openPractitionerRecoveriesAmountByCurrency,
      readyPractitionerSettlementsCount,
      readyPractitionerSettlementsAmountByCurrency,
      pendingReconciliationReviewsCount,
      openAccountingIssuesCount,
    ] = await Promise.all([
      this.sessionEarningReviewRepository.countAdminReviews({
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      }),
      this.prisma.sessionEarningReview.groupBy({
        by: ['paymentCurrencyCode'],
        where: {
          reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
        },
        _sum: {
          paymentAmount: true,
        },
        orderBy: {
          paymentCurrencyCode: 'asc',
        },
      }),
      this.prisma.practitionerRecovery.count({
        where: {
          status: {
            in: [
              PractitionerRecoveryStatus.OPEN,
              PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
            ],
          },
        },
      }),
      this.prisma.practitionerRecovery.groupBy({
        by: ['currencyCode'],
        where: {
          status: {
            in: [
              PractitionerRecoveryStatus.OPEN,
              PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
            ],
          },
        },
        _sum: {
          amount: true,
          recoveredAmount: true,
        },
        orderBy: {
          currencyCode: 'asc',
        },
      }),
      this.prisma.practitionerSettlement.count({
        where: {
          status: {
            in: [
              PractitionerSettlementStatus.READY,
              PractitionerSettlementStatus.PROCESSING,
            ],
          },
        },
      }),
      this.prisma.practitionerSettlement.groupBy({
        by: ['currencyCode'],
        where: {
          status: {
            in: [
              PractitionerSettlementStatus.READY,
              PractitionerSettlementStatus.PROCESSING,
            ],
          },
        },
        _sum: {
          amountNet: true,
        },
        orderBy: {
          currencyCode: 'asc',
        },
      }),
      this.prisma.financeReconciliationReview.count({
        where: {
          status: ReconciliationReviewStatus.PENDING_REVIEW,
        },
      }),
      this.prisma.accountingReconciliationIssue.count({
        where: {
          status: {
            in: [
              AccountingReconciliationIssueStatus.OPEN,
              AccountingReconciliationIssueStatus.ACKNOWLEDGED,
            ],
          },
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      pendingSessionEarningReviewsCount,
      pendingSessionEarningReviewsAmountByCurrency:
        pendingSessionEarningReviewsAmountByCurrency.map<AdminFinanceHubCurrencyAmountDto>(
          (row) => ({
            currencyCode: row.paymentCurrencyCode,
            amount: row._sum.paymentAmount?.toString() ?? '0',
          }),
        ),
      openPractitionerRecoveriesCount,
      openPractitionerRecoveriesAmountByCurrency:
        openPractitionerRecoveriesAmountByCurrency.map<AdminFinanceHubCurrencyAmountDto>(
          (row) => ({
            currencyCode: row.currencyCode,
            amount:
              row._sum.amount && row._sum.recoveredAmount
                ? row._sum.amount.sub(row._sum.recoveredAmount).toString()
                : row._sum.amount?.toString() ?? '0',
          }),
        ),
      readyPractitionerSettlementsCount,
      readyPractitionerSettlementsAmountByCurrency:
        readyPractitionerSettlementsAmountByCurrency.map<AdminFinanceHubCurrencyAmountDto>(
          (row) => ({
            currencyCode: row.currencyCode,
            amount: row._sum.amountNet?.toString() ?? '0',
          }),
        ),
      pendingReconciliationReviewsCount,
      openAccountingIssuesCount,
    };
  }
}
