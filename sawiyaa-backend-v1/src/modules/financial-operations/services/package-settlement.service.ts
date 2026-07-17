import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PackageSettlement,
  PackageSettlementStatus,
  Prisma,
  PaymentStatus,
  SessionStatus,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PackageSettlementRepository } from '../repositories/package-settlement.repository';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { SessionEarningReviewService } from './session-earning-review.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type PackagePurchaseSettlementSource = {
  id: string;
  practitionerId: string;
  patientId: string;
  paymentId: string | null;
  status: string;
  sessionCountSnapshot: number;
  currencyCodeSnapshot: string | null;
  selectedCurrencyCode: string;
  selectedBaseSessionPriceSnapshot: Prisma.Decimal | string | number | null;
  discountAmountSnapshot: Prisma.Decimal | string | number | null;
  practitionerFinalShareSnapshot: Prisma.Decimal | string | number | null;
  platformFinalShareSnapshot: Prisma.Decimal | string | number | null;
  planCodeSnapshot: string | null;
  titleSnapshot: string;
  payment?: {
    id: string;
    status: PaymentStatus;
    currencyCode: string | null;
  } | null;
  packagePlan?: {
    code: string;
    title?: string | null;
  } | null;
  sessions: Array<{
    id: string;
    status: SessionStatus;
    packageSessionIndex?: number | null;
    packageSessionCount?: number | null;
  }>;
};

@Injectable()
export class PackageSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly packageSettlementRepository: PackageSettlementRepository,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
  ) {}

  async ensureForPurchase(
    purchase: PackagePurchaseSettlementSource,
    tx?: Prisma.TransactionClient,
  ): Promise<PackageSettlement> {
    const db = this.getDb(tx);
    const existing = await this.packageSettlementRepository.findByPurchaseId(
      purchase.id,
      tx,
    );

    if (existing) {
      return existing;
    }

    const currencyCode = this.resolveCurrencyCode(purchase);
    if (!currencyCode) {
      throw new BadRequestException({
        messageKey:
          'financialOperations.errors.packageSettlementCurrencyMissing',
        error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_CURRENCY_MISSING',
      });
    }

    return this.packageSettlementRepository.upsertByPurchaseId(
      purchase.id,
      {
        purchaseId: purchase.id,
        practitionerId: purchase.practitionerId,
        patientId: purchase.patientId,
        currencyCode,
        status: PackageSettlementStatus.HELD,
        sessionCount: purchase.sessionCountSnapshot,
        completedSessionsCount: 0,
        heldPractitionerAmount: this.requireDecimal(
          purchase.practitionerFinalShareSnapshot,
          'practitionerFinalShareSnapshot',
        ),
        heldPlatformAmount: this.requireDecimal(
          purchase.platformFinalShareSnapshot,
          'platformFinalShareSnapshot',
        ),
        releasablePractitionerAmount: new Prisma.Decimal(0),
        releasedPractitionerAmount: new Prisma.Decimal(0),
        normalEquivalentUsedAmount: new Prisma.Decimal(0),
        discountAppliedAmount: this.toDecimal(purchase.discountAmountSnapshot),
        metadataJson: {
          source: 'package-settlement-ensure',
          packagePurchaseId: purchase.id,
          packagePlanCode:
            purchase.packagePlan?.code ?? purchase.planCodeSnapshot ?? null,
          packagePlanTitle:
            purchase.packagePlan?.title ?? purchase.titleSnapshot ?? null,
          paymentId: purchase.paymentId,
          purchaseStatus: purchase.status,
        },
      },
      db as Prisma.TransactionClient,
    );
  }

  async syncFromPurchase(
    purchase: PackagePurchaseSettlementSource,
    tx?: Prisma.TransactionClient,
  ) {
    const settlement = await this.ensureForPurchase(purchase, tx);
    const db = this.getDb(tx);
    const completedSessionsCount = purchase.sessions.filter(
      (session) => session.status === SessionStatus.COMPLETED,
    ).length;

    const normalEquivalentUsedAmount = this.multiply(
      purchase.selectedBaseSessionPriceSnapshot,
      completedSessionsCount,
    );
    const nextStatus =
      settlement.status === PackageSettlementStatus.RELEASED ||
      settlement.status === PackageSettlementStatus.PARTIALLY_RELEASED ||
      settlement.status === PackageSettlementStatus.NEEDS_REVIEW ||
      settlement.status === PackageSettlementStatus.REFUNDED_OR_ADJUSTED
        ? settlement.status
        : completedSessionsCount >= settlement.sessionCount
          ? PackageSettlementStatus.READY_TO_RELEASE
          : PackageSettlementStatus.HELD;
    const releasablePractitionerAmount =
      nextStatus === PackageSettlementStatus.READY_TO_RELEASE
        ? settlement.heldPractitionerAmount
        : nextStatus === PackageSettlementStatus.HELD
          ? new Prisma.Decimal(0)
          : settlement.releasablePractitionerAmount;

    const updated = await this.packageSettlementRepository.updateById(
      settlement.id,
      {
        completedSessionsCount,
        normalEquivalentUsedAmount,
        releasablePractitionerAmount,
        status: nextStatus,
      },
      db as Prisma.TransactionClient,
    );

    return updated;
  }

  async reconcilePurchase(
    purchase: PackagePurchaseSettlementSource,
    tx?: Prisma.TransactionClient,
  ) {
    if (
      purchase.status === 'CANCELLED' ||
      purchase.status === 'EXPIRED' ||
      purchase.status === 'REFUNDED'
    ) {
      return null;
    }

    const paymentCaptured =
      purchase.payment?.status === PaymentStatus.CAPTURED ||
      purchase.status === 'ACTIVE' ||
      purchase.status === 'COMPLETED';

    if (!paymentCaptured) {
      return null;
    }

    return this.syncFromPurchase(purchase, tx);
  }

  async releaseReadySettlement(input: {
    settlementId: string;
    releasedByAdminId: string;
    tx?: Prisma.TransactionClient;
  }) {
    const settlement = await this.packageSettlementRepository.findById(
      input.settlementId,
      input.tx,
    );

    if (!settlement) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.packageSettlementNotFound',
        error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_FOUND',
      });
    }

    if (settlement.status === PackageSettlementStatus.RELEASED) {
      return settlement;
    }

    if (settlement.status !== PackageSettlementStatus.READY_TO_RELEASE) {
      throw new ConflictException({
        messageKey: 'financialOperations.errors.packageSettlementNotReady',
        error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_READY',
      });
    }

    const referenceType = 'package-settlement-release';
    const referenceId = settlement.id;
    const releaseAt = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${referenceId})::bigint)
        `;

        const currentSettlement =
          await this.packageSettlementRepository.findById(settlement.id, tx);

        if (!currentSettlement) {
          throw new NotFoundException({
            messageKey: 'financialOperations.errors.packageSettlementNotFound',
            error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_FOUND',
          });
        }

        const legacyPackageEarnings =
          await this.ledgerRepository.findLegacyPackageEarningEntriesBySessionIds(
            {
              sessionIds:
                currentSettlement.purchase.sessions?.map(
                  (session) => session.id,
                ) ?? [],
              tx,
            },
          );

        if (legacyPackageEarnings.length > 0) {
          const existingMetadata =
            currentSettlement.metadataJson &&
            typeof currentSettlement.metadataJson === 'object' &&
            !Array.isArray(currentSettlement.metadataJson)
              ? (currentSettlement.metadataJson as Record<string, unknown>)
              : {};

          const markedForReview =
            await this.packageSettlementRepository.updateById(
              currentSettlement.id,
              {
                status: PackageSettlementStatus.NEEDS_REVIEW,
                releasablePractitionerAmount: new Prisma.Decimal(0),
                reviewedAt: releaseAt,
                reviewedByAdminId: input.releasedByAdminId,
                decision: 'LEGACY_PACKAGE_EARNINGS_ALREADY_POSTED',
                notes:
                  'Legacy package session earnings already exist for this purchase.',
                metadataJson: {
                  ...existingMetadata,
                  source: 'package-settlement-release',
                  blockedReason: 'LEGACY_PACKAGE_EARNINGS_ALREADY_POSTED',
                  legacyLedgerEntryCount: legacyPackageEarnings.length,
                  legacyLedgerEntryIds: legacyPackageEarnings.map(
                    (entry) => entry.id,
                  ),
                },
              },
              tx,
            );

          return markedForReview;
        }

        const existingReleaseEntries =
          await this.ledgerRepository.findByReference({
            referenceType,
            referenceId,
            paymentId: currentSettlement.purchase.paymentId ?? null,
            tx,
          });

        if (existingReleaseEntries.length > 0) {
          const repaired = await this.packageSettlementRepository.updateById(
            currentSettlement.id,
            {
              status: PackageSettlementStatus.RELEASED,
              releasablePractitionerAmount: new Prisma.Decimal(0),
              releasedPractitionerAmount:
                currentSettlement.releasablePractitionerAmount,
              reviewedAt: currentSettlement.reviewedAt ?? releaseAt,
              reviewedByAdminId:
                currentSettlement.reviewedByAdminId ?? input.releasedByAdminId,
              releasedAt: currentSettlement.releasedAt ?? releaseAt,
              releasedByAdminId:
                currentSettlement.releasedByAdminId ?? input.releasedByAdminId,
              decision:
                currentSettlement.decision ?? 'FULL_COMPLETION_ADMIN_RELEASE',
            },
            tx,
          );

          if (currentSettlement.practitionerId) {
            await this.refreshPractitionerWalletService.refresh(
              currentSettlement.practitionerId,
              tx,
            );
          }

          return repaired;
        }

        const pendingSessionReviews = await tx.sessionEarningReview.findMany({
          where: {
            packageSettlementId: currentSettlement.id,
            sourceType: SessionEarningReviewSourceType.PACKAGE_SESSION,
            reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
          },
        });

        const practitionerAmount =
          currentSettlement.releasablePractitionerAmount;
        const platformAmount = currentSettlement.heldPlatformAmount;
        let packageSessionReviewCount = 0;

        if (pendingSessionReviews.length > 0) {
          if (practitionerAmount.lte(0) && platformAmount.lte(0)) {
            throw new BadRequestException({
              messageKey: 'financialOperations.errors.packageSettlementEmpty',
              error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_EMPTY',
            });
          }

          if (practitionerAmount.gt(currentSettlement.heldPractitionerAmount)) {
            throw new ConflictException({
              messageKey:
                'financialOperations.errors.packageSettlementInvalidAmount',
              error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_INVALID_AMOUNT',
            });
          }

          for (const pendingReview of pendingSessionReviews) {
            await this.sessionEarningReviewService.approveReview({
              reviewId: pendingReview.id,
              reviewerUserId: input.releasedByAdminId,
              action: 'APPROVE_AS_IS',
              tx,
            });
          }
        } else {
          packageSessionReviewCount = await tx.sessionEarningReview.count(
            {
              where: {
                packageSettlementId: currentSettlement.id,
                sourceType: SessionEarningReviewSourceType.PACKAGE_SESSION,
              },
            },
          );

          if (packageSessionReviewCount === 0) {
            if (practitionerAmount.lte(0) && platformAmount.lte(0)) {
              throw new BadRequestException({
                messageKey: 'financialOperations.errors.packageSettlementEmpty',
                error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_EMPTY',
              });
            }

            if (practitionerAmount.gt(currentSettlement.heldPractitionerAmount)) {
              throw new ConflictException({
                messageKey:
                  'financialOperations.errors.packageSettlementInvalidAmount',
                error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_INVALID_AMOUNT',
              });
            }

            const releaseEntries = [
              {
                practitionerId: currentSettlement.practitionerId,
                paymentId: currentSettlement.purchase.paymentId ?? null,
                sessionId: null,
                entryType: LedgerEntryType.PRACTITIONER_EARNING,
                direction: LedgerDirection.CREDIT,
                amount: practitionerAmount,
                currencyCode: currentSettlement.currencyCode,
                balanceBucket: WalletBalanceBucket.AVAILABLE,
                referenceType,
                referenceId,
                description: 'Package settlement release practitioner earning.',
                metadataJson: {
                  source: 'package-settlement-release',
                  packageSettlementId: currentSettlement.id,
                  packagePurchaseId: currentSettlement.purchaseId,
                  practitionerId: currentSettlement.practitionerId,
                  patientId: currentSettlement.patientId,
                  currencyCode: currentSettlement.currencyCode,
                  sessionCount: currentSettlement.sessionCount,
                  completedSessionsCount:
                    currentSettlement.completedSessionsCount,
                  releaseType: 'FULL_COMPLETION_ADMIN_RELEASE',
                  releasedByAdminId: input.releasedByAdminId,
                },
              },
              {
                practitionerId: null,
                paymentId: currentSettlement.purchase.paymentId ?? null,
                sessionId: null,
                entryType: LedgerEntryType.PLATFORM_COMMISSION,
                direction: LedgerDirection.CREDIT,
                amount: platformAmount,
                currencyCode: currentSettlement.currencyCode,
                balanceBucket: WalletBalanceBucket.AVAILABLE,
                referenceType,
                referenceId,
                description: 'Package settlement release platform commission.',
                metadataJson: {
                  source: 'package-settlement-release',
                  packageSettlementId: currentSettlement.id,
                  packagePurchaseId: currentSettlement.purchaseId,
                  practitionerId: currentSettlement.practitionerId,
                  patientId: currentSettlement.patientId,
                  currencyCode: currentSettlement.currencyCode,
                  sessionCount: currentSettlement.sessionCount,
                  completedSessionsCount:
                    currentSettlement.completedSessionsCount,
                  releaseType: 'FULL_COMPLETION_ADMIN_RELEASE',
                  releasedByAdminId: input.releasedByAdminId,
                },
              },
            ].filter((entry) => entry.amount.gt(0));

            await this.ledgerRepository.createManyLedgerEntries(
              releaseEntries,
              tx,
            );
          }
        }

        const sessionReviewEarningEntries: Array<{
          amount: Prisma.Decimal;
        }> =
          await this.ledgerRepository.findSessionReviewPractitionerEarningEntriesBySessionIds(
            {
              sessionIds:
                currentSettlement.purchase.sessions?.map(
                  (session) => session.id,
                ) ?? [],
              tx,
            },
          );

        let sessionReviewPractitionerAmount = new Prisma.Decimal(0);
        for (const entry of sessionReviewEarningEntries) {
          sessionReviewPractitionerAmount = sessionReviewPractitionerAmount.plus(
            entry.amount,
          );
        }

        if (
          packageSessionReviewCount > 0 ||
          sessionReviewEarningEntries.length > 0
        ) {
          const updated = await this.packageSettlementRepository.updateById(
            currentSettlement.id,
            {
              status: PackageSettlementStatus.RELEASED,
              releasablePractitionerAmount: new Prisma.Decimal(0),
              releasedPractitionerAmount: sessionReviewPractitionerAmount,
              reviewedAt: releaseAt,
              reviewedByAdminId: input.releasedByAdminId,
              releasedAt: releaseAt,
              releasedByAdminId: input.releasedByAdminId,
              decision:
                currentSettlement.decision ?? 'FULL_COMPLETION_ADMIN_RELEASE',
            },
            tx,
          );

          if (currentSettlement.practitionerId) {
            await this.refreshPractitionerWalletService.refresh(
              currentSettlement.practitionerId,
              tx,
            );
          }

          return updated;
        }

        const updated = await this.packageSettlementRepository.updateById(
          currentSettlement.id,
          {
            status: PackageSettlementStatus.RELEASED,
            releasablePractitionerAmount: new Prisma.Decimal(0),
            releasedPractitionerAmount: practitionerAmount,
            reviewedAt: releaseAt,
            reviewedByAdminId: input.releasedByAdminId,
            releasedAt: releaseAt,
            releasedByAdminId: input.releasedByAdminId,
            decision: 'FULL_COMPLETION_ADMIN_RELEASE',
          },
          tx,
        );

        if (currentSettlement.practitionerId) {
          await this.refreshPractitionerWalletService.refresh(
            currentSettlement.practitionerId,
            tx,
          );
        }

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private resolveCurrencyCode(purchase: PackagePurchaseSettlementSource) {
    return (
      purchase.currencyCodeSnapshot ??
      purchase.selectedCurrencyCode ??
      ''
    )
      .trim()
      .toUpperCase();
  }

  private toDecimal(
    value: Prisma.Decimal | string | number | null | undefined,
  ): Prisma.Decimal {
    if (value === null || value === undefined || value === '') {
      return new Prisma.Decimal(0);
    }

    return new Prisma.Decimal(value.toString());
  }

  private requireDecimal(
    value: Prisma.Decimal | string | number | null | undefined,
    field: string,
  ): Prisma.Decimal {
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException({
        messageKey:
          'financialOperations.errors.packageSettlementSnapshotMissing',
        error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_SNAPSHOT_MISSING',
        messageParams: { field },
      });
    }

    return this.toDecimal(value);
  }

  private multiply(
    value: Prisma.Decimal | string | number | null | undefined,
    count: number,
  ): Prisma.Decimal {
    if (value === null || value === undefined || value === '') {
      return new Prisma.Decimal(0);
    }

    return this.toDecimal(value).mul(count);
  }
}
