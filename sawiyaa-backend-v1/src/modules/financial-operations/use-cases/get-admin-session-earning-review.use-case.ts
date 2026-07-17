import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerEntryType,
  Prisma,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionPaymentCoverageType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import {
  AdminSessionEarningReviewDetailSuccessResponseDto,
  AdminSessionEarningReviewDetailItemDto,
} from '../dto/admin-session-earning-reviews.dto';
import { SessionEarningReviewPresenter } from '../presenters/session-earning-review.presenter';
import {
  SessionEarningReviewLedgerRow,
  SessionEarningReviewRefundRow,
  SessionEarningReviewPaymentRow,
  SessionEarningReviewPackagePurchaseRow,
  SessionEarningReviewPackageSettlementRow,
  SessionEarningReviewSessionRow,
  SessionEarningReviewUserRow,
} from '../presenters/session-earning-review.presenter';

type ReviewRow = {
  id: string;
  sessionId: string;
  paymentId: string | null;
  packagePurchaseId: string | null;
  packageSettlementId: string | null;
  practitionerId: string;
  patientId: string;
  sourceType: SessionEarningReviewSourceType;
  reviewStatus: SessionEarningReviewStatus;
  reviewDecision: SessionEarningReviewDecision;
  paymentAmount: Prisma.Decimal;
  paymentCurrencyCode: string;
  suggestedPractitionerAmount: Prisma.Decimal;
  suggestedPlatformAmount: Prisma.Decimal;
  suggestedCurrencyCode: string;
  finalPractitionerAmount: Prisma.Decimal | null;
  finalPlatformAmount: Prisma.Decimal | null;
  finalCurrencyCode: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  internalReason: string | null;
  practitionerFacingNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  ledgerEntries: SessionEarningReviewLedgerRow[];
};

@Injectable()
export class GetAdminSessionEarningReviewUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewRepository: SessionEarningReviewRepository,
    private readonly paymentRepository: FinancialOperationsPaymentRepository,
    private readonly presenter: SessionEarningReviewPresenter,
  ) {}

  async execute(input: {
    reviewId: string;
  }): Promise<AdminSessionEarningReviewDetailSuccessResponseDto> {
    const review = await this.reviewRepository.findAdminReviewById(input.reviewId);

    if (!review) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.sessionEarningReviewNotFound',
        error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_NOT_FOUND',
      });
    }

    const context = await this.loadContext(review as ReviewRow);
    const paymentId = review.paymentId ?? null;
    const payment =
      paymentId && context.paymentMap.get(paymentId)
        ? this.presenter.presentPaymentSummary({
            payment: context.paymentMap.get(paymentId) ?? null,
            refundedAmount:
              context.refundAmountMap.get(paymentId) ?? null,
            refunds: context.refundsByPaymentId.get(paymentId) ?? [],
            reversalLedgerEntries:
              context.reversalLedgerEntriesByPaymentId.get(paymentId) ?? [],
          })
        : null;

    const item: AdminSessionEarningReviewDetailItemDto =
      this.presenter.presentDetailItem({
        review: review as ReviewRow,
        practitioner:
          context.sessionMap.get(review.sessionId)
            ? this.presenter.presentPractitionerSummary(
                context.sessionMap.get(review.sessionId) as SessionEarningReviewSessionRow,
              )
            : {
                practitionerId: review.practitionerId,
                displayName: null,
                publicSlug: null,
                professionalTitle: null,
              },
        patient:
          context.sessionMap.get(review.sessionId)
            ? this.presenter.presentPatientSummary(
                context.sessionMap.get(review.sessionId) as SessionEarningReviewSessionRow,
              )
            : {
                patientId: review.patientId,
                displayName: null,
              },
        session:
          context.sessionMap.get(review.sessionId)
            ? this.presenter.presentSessionSummary(
                context.sessionMap.get(review.sessionId) as SessionEarningReviewSessionRow,
              )
            : {
                sessionId: review.sessionId,
                sessionCode: review.sessionId,
                status: SessionStatus.DRAFT,
                paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
                scheduledStartAt: null,
                scheduledEndAt: null,
                completedAt: null,
                packagePurchaseId: review.packagePurchaseId,
                packageSessionIndex: null,
                packageSessionCount: null,
              },
        payment,
        packagePurchase:
          review.packagePurchaseId &&
          context.packagePurchaseMap.get(review.packagePurchaseId)
            ? this.presenter.presentPackagePurchaseSummary(
                context.packagePurchaseMap.get(review.packagePurchaseId) as SessionEarningReviewPackagePurchaseRow,
              )
            : null,
        packageSettlement:
          review.packageSettlementId &&
          context.packageSettlementMap.get(review.packageSettlementId)
            ? this.presenter.presentPackageSettlementSummary(
                context.packageSettlementMap.get(review.packageSettlementId) as SessionEarningReviewPackageSettlementRow,
              )
            : null,
        reviewedBy:
          review.reviewedByUserId &&
          context.userMap.get(review.reviewedByUserId)
            ? this.presenter.presentReviewUserSummary(
                context.userMap.get(review.reviewedByUserId) as SessionEarningReviewUserRow,
              )
            : null,
        approvedBy:
          review.approvedByUserId &&
          context.userMap.get(review.approvedByUserId)
            ? this.presenter.presentReviewUserSummary(
                context.userMap.get(review.approvedByUserId) as SessionEarningReviewUserRow,
              )
            : null,
        ledgerEntries: review.ledgerEntries as SessionEarningReviewLedgerRow[],
      });

    return {
      success: true as const,
      data: this.presenter.presentDetail(item),
    };
  }

  private async loadContext(review: ReviewRow) {
    const [sessionRow, paymentRow, refunds, reversalLedgerEntries, packagePurchase, packageSettlement, userRows] =
      await Promise.all([
        this.prisma.session.findUnique({
          where: { id: review.sessionId },
          select: {
            id: true,
            sessionCode: true,
            status: true,
            paymentCoverageType: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            completedAt: true,
            packagePurchaseId: true,
            packageSessionIndex: true,
            packageSessionCount: true,
            patient: {
              select: {
                id: true,
                displayName: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
            practitioner: {
              select: {
                id: true,
                publicSlug: true,
                professionalTitle: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        }),
        review.paymentId
          ? this.prisma.payment.findUnique({
              where: { id: review.paymentId },
              select: {
                id: true,
                status: true,
                paymentPurpose: true,
                provider: true,
                amountTotal: true,
                currencyCode: true,
                providerPaymentRef: true,
                providerOrderRef: true,
                initiatedAt: true,
                capturedAt: true,
                failedAt: true,
                expiredAt: true,
              },
            })
          : Promise.resolve(null),
        review.paymentId
          ? this.paymentRepository.listRefundsByPaymentId(review.paymentId)
          : Promise.resolve([]),
        review.paymentId
          ? this.prisma.ledgerEntry.findMany({
              where: {
                paymentId: review.paymentId,
                entryType: {
                  in: [
                    LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
                    LedgerEntryType.REFUND_PLATFORM_REVERSAL,
                  ],
                },
              },
              select: {
                id: true,
                entryType: true,
                direction: true,
                amount: true,
                currencyCode: true,
                balanceBucket: true,
                referenceType: true,
                referenceId: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        review.packagePurchaseId
          ? this.prisma.patientPackagePurchase.findUnique({
              where: { id: review.packagePurchaseId },
              select: {
                id: true,
                status: true,
                titleSnapshot: true,
                slugSnapshot: true,
                sessionCountSnapshot: true,
                selectedCurrencyCode: true,
                patientPayableTotalSnapshot: true,
                practitionerFinalShareSnapshot: true,
                platformFinalShareSnapshot: true,
                paymentId: true,
                packageSettlement: {
                  select: {
                    id: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
        review.packageSettlementId
          ? this.prisma.packageSettlement.findUnique({
              where: { id: review.packageSettlementId },
              select: {
                id: true,
                status: true,
                currencyCode: true,
                sessionCount: true,
                completedSessionsCount: true,
                heldPractitionerAmount: true,
                heldPlatformAmount: true,
                releasablePractitionerAmount: true,
                releasedPractitionerAmount: true,
                normalEquivalentUsedAmount: true,
                discountAppliedAmount: true,
                reviewedAt: true,
                releasedAt: true,
                decision: true,
                notes: true,
              },
            })
          : Promise.resolve(null),
        this.prisma.user.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(
                  [review.reviewedByUserId, review.approvedByUserId].filter(
                    (value): value is string => Boolean(value),
                  ),
                ),
              ),
            },
          },
          select: {
            id: true,
            displayName: true,
          },
        }),
      ]);

    const sessionMap = new Map(
      sessionRow
        ? [
            [
              sessionRow.id,
              {
                ...sessionRow,
                patient: {
                  id: sessionRow.patient.id,
                  displayName: sessionRow.patient.displayName,
                  user: sessionRow.patient.user,
                },
                practitioner: {
                  id: sessionRow.practitioner.id,
                  publicSlug: sessionRow.practitioner.publicSlug,
                  professionalTitle: sessionRow.practitioner.professionalTitle,
                  user: sessionRow.practitioner.user,
                },
              } as SessionEarningReviewSessionRow,
            ],
          ]
        : [],
    );

    const paymentMap = new Map(
      paymentRow ? [[paymentRow.id, paymentRow as SessionEarningReviewPaymentRow]] : [],
    );

    const refundAmount = paymentRow
      ? await this.paymentRepository
          .sumSucceededRefundAmountByPaymentId(paymentRow.id)
          .then((result) => result._sum.amount ?? new Prisma.Decimal(0))
      : null;

    const refundAmountMap = new Map(
      paymentRow && refundAmount !== null
        ? [[paymentRow.id, refundAmount]]
        : [],
    );

    const refundsByPaymentId = new Map(
      paymentRow ? [[paymentRow.id, refunds as SessionEarningReviewRefundRow[]]] : [],
    );

    const reversalLedgerEntriesByPaymentId = new Map(
      paymentRow
        ? [[paymentRow.id, reversalLedgerEntries as SessionEarningReviewLedgerRow[]]]
        : [],
    );

    const packagePurchaseMap = new Map(
      packagePurchase ? [[packagePurchase.id, packagePurchase as SessionEarningReviewPackagePurchaseRow]] : [],
    );
    const packageSettlementMap = new Map(
      packageSettlement
        ? [[packageSettlement.id, packageSettlement as SessionEarningReviewPackageSettlementRow]]
        : [],
    );
    const userMap = new Map(
      userRows.map((user) => [user.id, user as SessionEarningReviewUserRow]),
    );

    return {
      sessionMap,
      paymentMap,
      refundAmountMap,
      refundsByPaymentId,
      reversalLedgerEntriesByPaymentId,
      packagePurchaseMap,
      packageSettlementMap,
      userMap,
    };
  }
}
