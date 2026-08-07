import { Injectable } from '@nestjs/common';
import { sessionCodeSearchFilter } from '../../sessions/utils/session-code-search.util';
import {
  Prisma,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionPaymentCoverageType,
  SessionStatus,
  PractitionerSettlementStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import {
  AdminSessionEarningReviewListSuccessResponseDto,
  ListAdminSessionEarningReviewsDto,
} from '../dto/admin-session-earning-reviews.dto';
import {
  SessionEarningReviewPackagePurchaseRow,
  SessionEarningReviewPackageSettlementRow,
  SessionEarningReviewPaymentRow,
  SessionEarningReviewPresenter,
  SessionEarningReviewSessionRow,
  SessionEarningReviewUserRow,
} from '../presenters/session-earning-review.presenter';
import { SessionEarningReviewFinancialStage } from '../dto/admin-session-earning-reviews.dto';

type ReviewRow = {
  id: string;
  sessionId: string;
  earningEntitlementId: string;
  paymentId: string | null;
  packagePurchaseId: string | null;
  packageSettlementId: string | null;
  settlementId: string | null;
  settlement: { status: PractitionerSettlementStatus } | null;
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
  suggestedPractitionerPercentage: Prisma.Decimal | null;
  accountantApprovedSourceAmount: Prisma.Decimal | null;
  accountingAdjustmentAmount: Prisma.Decimal | null;
  accountingAdjustmentType: string | null;
  accountingAdjustmentReason: string | null;
  accountingNotes: string | null;
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
};

type ReviewQueryShape = {
  where: Prisma.SessionEarningReviewWhereInput;
  orderBy: Prisma.SessionEarningReviewOrderByWithRelationInput[];
  filters: Record<string, string | boolean | null>;
};

@Injectable()
export class ListAdminSessionEarningReviewsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewRepository: SessionEarningReviewRepository,
    private readonly paymentRepository: FinancialOperationsPaymentRepository,
    private readonly presenter: SessionEarningReviewPresenter,
  ) {}

  async execute(input: { query: ListAdminSessionEarningReviewsDto }): Promise<AdminSessionEarningReviewListSuccessResponseDto> {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const queryShape = await this.buildQueryShape(input.query);
    const skip = (page - 1) * limit;

    const [rows, totalItems] = await this.reviewRepository.listAdminReviews({
      where: queryShape.where,
      skip,
      take: limit,
      orderBy: queryShape.orderBy,
    });

    const context = await this.loadContext(rows as ReviewRow[]);

    const items = rows.map((row) => {
      const sessionRow = context.sessionMap.get(row.sessionId);
      const paymentRow = row.paymentId
        ? context.paymentMap.get(row.paymentId) ?? null
        : null;
      const packagePurchaseRow = row.packagePurchaseId
        ? context.packagePurchaseMap.get(row.packagePurchaseId) ?? null
        : null;
      const packageSettlementRow = row.packageSettlementId
        ? context.packageSettlementMap.get(row.packageSettlementId) ?? null
        : null;

      return this.presenter.presentListItem({
        review: row as ReviewRow,
        practitioner: sessionRow
          ? this.presenter.presentPractitionerSummary(sessionRow)
          : {
              practitionerId: row.practitionerId,
              displayName: null,
              publicSlug: null,
              professionalTitle: null,
            },
        patient: sessionRow
          ? this.presenter.presentPatientSummary(sessionRow)
          : {
              patientId: row.patientId,
              displayName: null,
            },
        session: sessionRow
          ? this.presenter.presentSessionSummary(sessionRow)
          : {
              sessionId: row.sessionId,
              // A missing relation is not a missing code. Never expose the UUID
              // as a public session reference when the Session row is absent.
              sessionCode: null,
              status: SessionStatus.DRAFT,
              paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
              scheduledStartAt: null,
              scheduledEndAt: null,
              completedAt: null,
              packagePurchaseId: row.packagePurchaseId,
              packageSessionIndex: null,
              packageSessionCount: null,
              originalSessionId: null,
            },
        payment: paymentRow
          ? this.presenter.presentPaymentSummary({
              payment: paymentRow,
              refundedAmount:
                row.paymentId && context.refundAmountMap.has(row.paymentId)
                  ? context.refundAmountMap.get(row.paymentId) ?? null
                  : null,
              refunds: [],
              reversalLedgerEntries: null,
            })
          : null,
        packagePurchase: packagePurchaseRow
          ? this.presenter.presentPackagePurchaseSummary(packagePurchaseRow)
          : null,
        packageSettlement: packageSettlementRow
          ? this.presenter.presentPackageSettlementSummary(
              packageSettlementRow,
            )
          : null,
        activeWalletCurrency: context.walletCurrencyMap.get(row.practitionerId) ?? null,
        reviewedBy:
          row.reviewedByUserId && context.userMap.get(row.reviewedByUserId)
            ? this.presenter.presentReviewUserSummary(
                context.userMap.get(row.reviewedByUserId) ?? null,
              )
            : null,
        approvedBy:
          row.approvedByUserId && context.userMap.get(row.approvedByUserId)
            ? this.presenter.presentReviewUserSummary(
                context.userMap.get(row.approvedByUserId) ?? null,
              )
            : null,
      });
    });

    return {
      success: true as const,
      data: this.presenter.presentList({
        items,
        page,
        limit,
        totalItems,
        filters: queryShape.filters,
      }),
    };
  }

  private async buildQueryShape(
    query: ListAdminSessionEarningReviewsDto,
  ): Promise<ReviewQueryShape> {
    const normalizedSearch = query.search?.trim() ?? '';
    const isDefaultPendingQueue =
      query.status === undefined &&
      query.actionRequired === undefined &&
      query.finalized === undefined;

    const andConditions: Prisma.SessionEarningReviewWhereInput[] = [];

    if (query.status !== undefined) {
      andConditions.push({ reviewStatus: query.status });
    } else if (query.actionRequired === true) {
      andConditions.push({
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      });
    } else if (query.finalized === true) {
      andConditions.push({
        reviewStatus: {
          in: [
            SessionEarningReviewStatus.APPROVED,
            SessionEarningReviewStatus.REJECTED,
            SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
          ],
        },
      });
    } else if (isDefaultPendingQueue) {
      andConditions.push({
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      });
    }

    if (query.stage && query.stage !== SessionEarningReviewFinancialStage.ALL) {
      switch (query.stage) {
        case SessionEarningReviewFinancialStage.PENDING_REVIEW:
          andConditions.push({ reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW });
          break;
        case SessionEarningReviewFinancialStage.DECISION_APPROVED:
          andConditions.push({ reviewStatus: SessionEarningReviewStatus.DECISION_APPROVED });
          break;
        case SessionEarningReviewFinancialStage.WALLET_CREDITED:
          andConditions.push({
            reviewStatus: SessionEarningReviewStatus.APPROVED,
            settlement: { is: { status: PractitionerSettlementStatus.CREDITED } },
          });
          break;
        case SessionEarningReviewFinancialStage.EXTERNAL_PAYOUT:
          andConditions.push({
            reviewStatus: SessionEarningReviewStatus.APPROVED,
            settlement: { is: { status: { in: [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID] } } },
          });
          break;
        case SessionEarningReviewFinancialStage.REJECTED_OR_EXCLUDED:
          andConditions.push({ reviewStatus: { in: [SessionEarningReviewStatus.REJECTED, SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT] } });
          break;
      }
    }

    if (query.decision !== undefined) {
      andConditions.push({ reviewDecision: query.decision });
    }

    if (query.sourceType) {
      andConditions.push({ sourceType: query.sourceType });
    }

    if (query.practitionerId) {
      andConditions.push({ practitionerId: query.practitionerId });
    }

    if (query.patientId) {
      andConditions.push({ patientId: query.patientId });
    }

    if (query.sessionId) {
      andConditions.push({ sessionId: query.sessionId });
    }

    if (query.paymentId) {
      andConditions.push({ paymentId: query.paymentId });
    }

    if (query.currencyCode) {
      const currencyCode = query.currencyCode.trim().toUpperCase();
      andConditions.push({
        OR: [
          { paymentCurrencyCode: currencyCode },
          { suggestedCurrencyCode: currencyCode },
          { finalCurrencyCode: currencyCode },
        ],
      });
    }

    if (query.createdFrom || query.createdTo) {
      const createdTo = query.createdTo ? new Date(query.createdTo) : undefined;
      if (createdTo && /^\d{4}-\d{2}-\d{2}$/.test(query.createdTo ?? '')) {
        createdTo.setUTCHours(23, 59, 59, 999);
      }
      andConditions.push({
        createdAt: {
          ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
          ...(createdTo ? { lte: createdTo } : {}),
        },
      });
    }

    if (query.reviewedFrom || query.reviewedTo) {
      const reviewedTo = query.reviewedTo ? new Date(query.reviewedTo) : undefined;
      if (reviewedTo && /^\d{4}-\d{2}-\d{2}$/.test(query.reviewedTo ?? '')) {
        reviewedTo.setUTCHours(23, 59, 59, 999);
      }
      andConditions.push({
        reviewedAt: {
          ...(query.reviewedFrom ? { gte: new Date(query.reviewedFrom) } : {}),
          ...(reviewedTo ? { lte: reviewedTo } : {}),
        },
      });
    }

    if (normalizedSearch) {
      const [
        practitionerIds,
        patientIds,
        sessionIds,
        paymentIds,
      ] = await Promise.all([
        this.findPractitionerIds(normalizedSearch),
        this.findPatientIds(normalizedSearch),
        this.findSessionIds(normalizedSearch),
        this.findPaymentIds(normalizedSearch),
      ]);

      const uuidFilters = this.buildUuidSearchFilters(normalizedSearch);

      andConditions.push({
        OR: [
          ...uuidFilters,
          ...(practitionerIds.length > 0
            ? [{ practitionerId: { in: practitionerIds } }]
            : []),
          ...(patientIds.length > 0 ? [{ patientId: { in: patientIds } }] : []),
          ...(sessionIds.length > 0 ? [{ sessionId: { in: sessionIds } }] : []),
          ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : []),
        ],
      });
    }

    const where =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const orderBy = this.resolveOrderBy(query);

    return {
      where,
      orderBy,
      filters: {
        status: query.status ?? null,
        stage: query.stage ?? null,
        decision: query.decision ?? null,
        sourceType: query.sourceType ?? null,
        practitionerId: query.practitionerId ?? null,
        patientId: query.patientId ?? null,
        sessionId: query.sessionId ?? null,
        paymentId: query.paymentId ?? null,
        currencyCode: query.currencyCode?.trim().toUpperCase() ?? null,
        search: normalizedSearch || null,
        createdFrom: query.createdFrom ?? null,
        createdTo: query.createdTo ?? null,
        reviewedFrom: query.reviewedFrom ?? null,
        reviewedTo: query.reviewedTo ?? null,
        actionRequired: query.actionRequired ?? null,
        finalized: query.finalized ?? null,
      },
    };
  }

  private resolveOrderBy(
    query: ListAdminSessionEarningReviewsDto,
  ): Prisma.SessionEarningReviewOrderByWithRelationInput[] {
    if (
      query.finalized === true ||
      query.status !== undefined ||
      query.decision !== undefined
    ) {
      return [
        { reviewedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'asc' },
      ];
    }

    return [{ createdAt: 'asc' }, { id: 'asc' }];
  }

  private async loadContext(rows: ReviewRow[]) {
    const sessionIds = Array.from(new Set(rows.map((row) => row.sessionId)));
    const paymentIds = Array.from(
      new Set(rows.map((row) => row.paymentId).filter((value): value is string => Boolean(value))),
    );
    const packagePurchaseIds = Array.from(
      new Set(
        rows
          .map((row) => row.packagePurchaseId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const packageSettlementIds = Array.from(
      new Set(
        rows
          .map((row) => row.packageSettlementId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const userIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [row.reviewedByUserId, row.approvedByUserId])
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const practitionerIds = Array.from(new Set(rows.map((row) => row.practitionerId)));

    const [sessions, payments, refundSums, packagePurchases, packageSettlements, users] =
      await Promise.all([
        this.prisma.session.findMany({
          where: {
            id: { in: sessionIds },
          },
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
            originalSessionId: true,
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
        this.prisma.payment.findMany({
          where: {
            id: { in: paymentIds },
          },
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
        }),
        this.paymentRepository.sumSucceededRefundAmountsByPaymentIds(paymentIds),
        this.prisma.patientPackagePurchase.findMany({
          where: {
            id: { in: packagePurchaseIds },
          },
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
        }),
        this.prisma.packageSettlement.findMany({
          where: {
            id: { in: packageSettlementIds },
          },
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
        }),
        this.prisma.user.findMany({
          where: {
            id: { in: userIds },
          },
          select: {
            id: true,
            displayName: true,
          },
        }),
      ]);
    const wallets = await this.prisma.practitionerWallet.findMany({
      where: { practitionerId: { in: practitionerIds }, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { practitionerId: true, currencyCode: true },
    });

    const sessionMap = new Map(
      sessions.map((session) => [
        session.id,
        {
          ...session,
          patient: {
            id: session.patient.id,
            displayName: session.patient.displayName,
            user: session.patient.user,
          },
          practitioner: {
            id: session.practitioner.id,
            publicSlug: session.practitioner.publicSlug,
            professionalTitle: session.practitioner.professionalTitle,
            user: session.practitioner.user,
          },
        } satisfies SessionEarningReviewSessionRow,
      ]),
    );

    const paymentMap = new Map(
      payments.map((payment) => [payment.id, payment as SessionEarningReviewPaymentRow]),
    );

    const refundAmountMap = new Map(
      refundSums.map((entry) => [entry.paymentId, entry._sum.amount ?? new Prisma.Decimal(0)]),
    );

    const packagePurchaseMap = new Map(
      packagePurchases.map((purchase) => [
        purchase.id,
        purchase as SessionEarningReviewPackagePurchaseRow,
      ]),
    );

    const packageSettlementMap = new Map(
      packageSettlements.map((settlement) => [
        settlement.id,
        settlement as SessionEarningReviewPackageSettlementRow,
      ]),
    );

    const userMap = new Map(users.map((user) => [user.id, user as SessionEarningReviewUserRow]));
    const walletCurrencyMap = new Map<string, string>();
    for (const wallet of wallets) if (!walletCurrencyMap.has(wallet.practitionerId)) walletCurrencyMap.set(wallet.practitionerId, wallet.currencyCode);

    return {
      sessionMap,
      paymentMap,
      refundAmountMap,
      packagePurchaseMap,
      packageSettlementMap,
      userMap,
      walletCurrencyMap,
    };
  }

  private async findPractitionerIds(search: string) {
    const uuidFilter = this.isUuid(search) ? { id: search } : null;
    const rows = await this.prisma.practitionerProfile.findMany({
      where: {
        OR: [
          ...(uuidFilter ? [uuidFilter] : []),
          {
            publicSlug: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            user: {
              displayName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }

  private async findPatientIds(search: string) {
    const uuidFilter = this.isUuid(search) ? { id: search } : null;
    const rows = await this.prisma.patientProfile.findMany({
      where: {
        OR: [
          ...(uuidFilter ? [uuidFilter] : []),
          {
            displayName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            user: {
              displayName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }

  private async findSessionIds(search: string) {
    const isUuid = this.isUuid(search);
    const rows = await this.prisma.session.findMany({
      where: {
        OR: [
          ...(isUuid
            ? [
                {
                  id: search,
                },
              ]
            : []),
          {
            sessionCode: sessionCodeSearchFilter(search),
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }

  private async findPaymentIds(search: string) {
    const isUuid = this.isUuid(search);
    const rows = await this.prisma.payment.findMany({
      where: {
        OR: [
          ...(isUuid
            ? [
                {
                  id: search,
                },
              ]
            : []),
          {
            providerPaymentRef: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            providerOrderRef: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }

  private buildUuidSearchFilters(search: string): Prisma.SessionEarningReviewWhereInput[] {
    if (!this.isUuid(search)) {
      return [];
    }

    return [
      { id: search },
      { sessionId: search },
      { paymentId: search },
      { practitionerId: search },
      { patientId: search },
    ];
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
