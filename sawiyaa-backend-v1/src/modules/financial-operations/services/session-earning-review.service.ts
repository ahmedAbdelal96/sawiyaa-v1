import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  Prisma,
  PractitionerSettlementStatus,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionStatus,
  SecurityAuditOutcome,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CalculatePackageSessionAllocationService } from './calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from './extract-payment-ledger-breakdown.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { ApprovePractitionerSettlementService } from './approve-practitioner-settlement.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

type DbClient = PrismaService | Prisma.TransactionClient;

type ReviewPayment = {
  id: string;
  status: PaymentStatus;
  amountTotal: Prisma.Decimal;
  currencyCode: string;
  metadataJson: Prisma.JsonValue | null;
  commissionPlatformRatePercent: Prisma.Decimal | null;
};

type SessionForReview = {
  id: string;
  status: SessionStatus;
  patientId: string;
  practitionerId: string;
  packagePurchaseId: string | null;
  packageSessionIndex: number | null;
  packageSessionCount: number | null;
};

type SessionEarningReviewSyncResult =
  | {
      reviewId: string;
      reviewStatus: SessionEarningReviewStatus;
      reviewDecision: SessionEarningReviewDecision;
      sourceType: SessionEarningReviewSourceType;
      wasAlreadySynced: boolean;
    }
  | null;

@Injectable()
export class SessionEarningReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly extractPaymentLedgerBreakdownService: ExtractPaymentLedgerBreakdownService,
    private readonly calculatePackageSessionAllocationService: CalculatePackageSessionAllocationService,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly approvePractitionerSettlementService: ApprovePractitionerSettlementService,
    private readonly walletRepository?: WalletRepository,
    private readonly securityAuditService?: SecurityAuditService,
  ) {}

  private async lockPaymentReviewScope(db: DbClient, paymentId: string) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${paymentId})::bigint)`;
  }

  async syncForSessionCompletion(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    if (input.tx) {
      return this.syncForSessionCompletionInDb(input.tx, input.sessionId);
    }

    return this.prisma.$transaction((tx) =>
      this.syncForSessionCompletionInDb(tx, input.sessionId),
    );
  }

  async syncForPackageEntitlementDecision(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    if (input.tx) {
      return this.syncForPackageEntitlementDecisionInDb(input.tx, input.sessionId);
    }

    return this.prisma.$transaction((tx) =>
      this.syncForPackageEntitlementDecisionInDb(tx, input.sessionId),
    );
  }

  async approveReview(input: {
    reviewId: string;
    reviewerUserId: string;
    action:
      | 'APPROVE_AS_IS'
      | 'EDIT_AND_APPROVE'
      | 'REJECT_PAYOUT'
      | 'EXCLUDE_FROM_PAYOUT';
    finalPractitionerAmount?: string | number | Prisma.Decimal | null;
    finalPlatformAmount?: string | number | Prisma.Decimal | null;
    finalCurrencyCode?: string | null;
    exchangeRate?: string | number | Prisma.Decimal | null;
    calculatedWalletCreditAmount?: string | number | Prisma.Decimal | null;
    walletCreditDifferenceAmount?: string | number | Prisma.Decimal | null;
    walletCreditOverrideReason?: string | null;
    internalReason?: string | null;
    practitionerFacingNote?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    if (input.tx) {
      return this.approveReviewInDb(input.tx, input);
    }

    return this.prisma.$transaction((tx) => this.approveReviewInDb(tx, input));
  }

  private async syncForSessionCompletionInDb(
    db: DbClient,
    sessionId: string,
  ): Promise<SessionEarningReviewSyncResult> {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        patientId: true,
        practitionerId: true,
        packagePurchaseId: true,
        packageSessionIndex: true,
        packageSessionCount: true,
      },
    });

    if (!session || session.status !== SessionStatus.COMPLETED) {
      return null;
    }

    const sourceType = session.packagePurchaseId
      ? SessionEarningReviewSourceType.PACKAGE_SESSION
      : SessionEarningReviewSourceType.DIRECT_SESSION;
    const payment = await this.resolvePaymentForSession(db, session);
    if (!payment || payment.status !== PaymentStatus.CAPTURED) {
      return null;
    }

    const reviewPayload = await this.buildReviewPayload(db, {
      session,
      sourceType,
      payment,
    });

    if (!reviewPayload) {
      return null;
    }

    await this.lockPaymentReviewScope(db, payment.id);

    const existingPaymentEntries = await db.ledgerEntry.findMany({
      where: {
        paymentId: payment.id,
        practitionerId: {
          not: null,
        },
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        settlementId: { not: null },
        actorUserId: { not: null },
      },
      select: {
        id: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const alreadyRealized = existingPaymentEntries.length > 0;
    const existingReview = await db.sessionEarningReview.findUnique({
      where: {
        sessionId_sourceType: {
          sessionId: session.id,
          sourceType,
        },
      },
      include: this.reviewInclude,
    });

    if (
      existingReview &&
      existingReview.reviewStatus !== SessionEarningReviewStatus.PENDING_REVIEW
    ) {
      return {
        reviewId: existingReview.id,
        reviewStatus: existingReview.reviewStatus,
        reviewDecision: existingReview.reviewDecision,
        sourceType: existingReview.sourceType,
        wasAlreadySynced: true,
      };
    }

    if (existingReview && !alreadyRealized) {
      return {
        reviewId: existingReview.id,
        reviewStatus: existingReview.reviewStatus,
        reviewDecision: existingReview.reviewDecision,
        sourceType: existingReview.sourceType,
        wasAlreadySynced: true,
      };
    }

    const now = new Date();
    const createData: Prisma.SessionEarningReviewUncheckedCreateInput = {
      sessionId: session.id,
      paymentId: payment.id,
      packagePurchaseId: session.packagePurchaseId ?? null,
      packageSettlementId: reviewPayload.packageSettlementId ?? null,
      practitionerId: session.practitionerId,
      patientId: session.patientId,
      sourceType,
      reviewStatus: alreadyRealized
        ? SessionEarningReviewStatus.APPROVED
        : SessionEarningReviewStatus.PENDING_REVIEW,
      reviewDecision: alreadyRealized
        ? SessionEarningReviewDecision.APPROVED_AS_IS
        : SessionEarningReviewDecision.AUTO_CREATED,
      paymentAmount: reviewPayload.paymentAmount,
      paymentCurrencyCode: reviewPayload.paymentCurrencyCode,
      suggestedPractitionerAmount: reviewPayload.suggestedPractitionerAmount,
      suggestedPlatformAmount: reviewPayload.suggestedPlatformAmount,
      suggestedCurrencyCode: reviewPayload.suggestedCurrencyCode,
      finalPractitionerAmount: alreadyRealized
        ? reviewPayload.suggestedPractitionerAmount
        : null,
      finalPlatformAmount: alreadyRealized
        ? reviewPayload.suggestedPlatformAmount
        : null,
      finalCurrencyCode: alreadyRealized
        ? reviewPayload.suggestedCurrencyCode
        : null,
      reviewedByUserId: null,
      reviewedAt: alreadyRealized ? now : null,
      approvedByUserId: null,
      approvedAt: alreadyRealized ? now : null,
      internalReason: null,
      practitionerFacingNote: null,
      idempotencyKey: reviewPayload.idempotencyKey,
    };

    const updateData: Prisma.SessionEarningReviewUncheckedUpdateInput = {
      paymentId: payment.id,
      packagePurchaseId: session.packagePurchaseId ?? null,
      packageSettlementId: reviewPayload.packageSettlementId ?? null,
      practitionerId: session.practitionerId,
      patientId: session.patientId,
      reviewStatus: alreadyRealized
        ? SessionEarningReviewStatus.APPROVED
        : SessionEarningReviewStatus.PENDING_REVIEW,
      reviewDecision: alreadyRealized
        ? SessionEarningReviewDecision.APPROVED_AS_IS
        : SessionEarningReviewDecision.AUTO_CREATED,
      paymentAmount: reviewPayload.paymentAmount,
      paymentCurrencyCode: reviewPayload.paymentCurrencyCode,
      suggestedPractitionerAmount: reviewPayload.suggestedPractitionerAmount,
      suggestedPlatformAmount: reviewPayload.suggestedPlatformAmount,
      suggestedCurrencyCode: reviewPayload.suggestedCurrencyCode,
      finalPractitionerAmount: alreadyRealized
        ? reviewPayload.suggestedPractitionerAmount
        : null,
      finalPlatformAmount: alreadyRealized
        ? reviewPayload.suggestedPlatformAmount
        : null,
      finalCurrencyCode: alreadyRealized
        ? reviewPayload.suggestedCurrencyCode
        : null,
      reviewedByUserId: null,
      reviewedAt: alreadyRealized ? now : null,
      approvedByUserId: null,
      approvedAt: alreadyRealized ? now : null,
      internalReason: null,
      practitionerFacingNote: null,
      idempotencyKey: reviewPayload.idempotencyKey,
    };

    const review = await db.sessionEarningReview.upsert({
      where: {
        sessionId_sourceType: {
          sessionId: session.id,
          sourceType,
        },
      },
      create: createData,
      update: updateData,
      include: this.reviewInclude,
    });

    if (!alreadyRealized && review.reviewStatus === SessionEarningReviewStatus.PENDING_REVIEW) {
      await this.ensureSettlementCandidate(db, review);
    }

    return {
      reviewId: review.id,
      reviewStatus: review.reviewStatus,
      reviewDecision: review.reviewDecision,
      sourceType: review.sourceType,
      wasAlreadySynced: alreadyRealized,
    };
  }

  private async syncForPackageEntitlementDecisionInDb(
    db: DbClient,
    sessionId: string,
  ): Promise<SessionEarningReviewSyncResult> {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        patientId: true,
        practitionerId: true,
        packagePurchaseId: true,
        packageSessionIndex: true,
        packageSessionCount: true,
      },
    });

    if (!session || !session.packagePurchaseId) {
      return null;
    }

    const sourceType = SessionEarningReviewSourceType.PACKAGE_SESSION;
    const payment = await this.resolvePaymentForSession(db, session);
    if (!payment) {
      return null;
    }

    const reviewPayload = await this.buildReviewPayload(db, {
      session,
      sourceType,
      payment,
    });

    if (!reviewPayload) {
      return null;
    }

    await this.lockPaymentReviewScope(db, payment.id);

    const existingReview = await db.sessionEarningReview.findUnique({
      where: {
        sessionId_sourceType: {
          sessionId: session.id,
          sourceType,
        },
      },
      include: this.reviewInclude,
    });

    if (existingReview) {
      return {
        reviewId: existingReview.id,
        reviewStatus: existingReview.reviewStatus,
        reviewDecision: existingReview.reviewDecision,
        sourceType: existingReview.sourceType,
        wasAlreadySynced: true,
      };
    }

    const review = await db.sessionEarningReview.upsert({
      where: {
        sessionId_sourceType: {
          sessionId: session.id,
          sourceType,
        },
      },
      create: {
        sessionId: session.id,
        paymentId: payment.id,
        packagePurchaseId: session.packagePurchaseId,
        packageSettlementId: reviewPayload.packageSettlementId ?? null,
        practitionerId: session.practitionerId,
        patientId: session.patientId,
        sourceType,
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
        reviewDecision: SessionEarningReviewDecision.AUTO_CREATED,
        paymentAmount: reviewPayload.paymentAmount,
        paymentCurrencyCode: reviewPayload.paymentCurrencyCode,
        suggestedPractitionerAmount: reviewPayload.suggestedPractitionerAmount,
        suggestedPlatformAmount: reviewPayload.suggestedPlatformAmount,
        suggestedCurrencyCode: reviewPayload.suggestedCurrencyCode,
        finalPractitionerAmount: null,
        finalPlatformAmount: null,
        finalCurrencyCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        approvedByUserId: null,
        approvedAt: null,
        internalReason: null,
        practitionerFacingNote: null,
        idempotencyKey: reviewPayload.idempotencyKey,
      },
      update: {
        paymentId: payment.id,
        packagePurchaseId: session.packagePurchaseId,
        packageSettlementId: reviewPayload.packageSettlementId ?? null,
        practitionerId: session.practitionerId,
        patientId: session.patientId,
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
        reviewDecision: SessionEarningReviewDecision.AUTO_CREATED,
        paymentAmount: reviewPayload.paymentAmount,
        paymentCurrencyCode: reviewPayload.paymentCurrencyCode,
        suggestedPractitionerAmount: reviewPayload.suggestedPractitionerAmount,
        suggestedPlatformAmount: reviewPayload.suggestedPlatformAmount,
        suggestedCurrencyCode: reviewPayload.suggestedCurrencyCode,
        finalPractitionerAmount: null,
        finalPlatformAmount: null,
        finalCurrencyCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        approvedByUserId: null,
        approvedAt: null,
        internalReason: null,
        practitionerFacingNote: null,
        idempotencyKey: reviewPayload.idempotencyKey,
      },
      include: this.reviewInclude,
    });

    await this.ensureSettlementCandidate(db, review);

    return {
      reviewId: review.id,
      reviewStatus: review.reviewStatus,
      reviewDecision: review.reviewDecision,
      sourceType: review.sourceType,
      wasAlreadySynced: false,
    };
  }

  private async approveReviewInDb(
    db: DbClient,
    input: {
      reviewId: string;
      reviewerUserId: string;
      action:
        | 'APPROVE_AS_IS'
        | 'EDIT_AND_APPROVE'
        | 'REJECT_PAYOUT'
        | 'EXCLUDE_FROM_PAYOUT';
      finalPractitionerAmount?: string | number | Prisma.Decimal | null;
      finalPlatformAmount?: string | number | Prisma.Decimal | null;
      finalCurrencyCode?: string | null;
      exchangeRate?: string | number | Prisma.Decimal | null;
      calculatedWalletCreditAmount?: string | number | Prisma.Decimal | null;
      walletCreditDifferenceAmount?: string | number | Prisma.Decimal | null;
      walletCreditOverrideReason?: string | null;
      internalReason?: string | null;
      practitionerFacingNote?: string | null;
    },
  ) {
    let review = await db.sessionEarningReview.findUnique({
      where: { id: input.reviewId },
      include: this.reviewInclude,
    });

    if (!review) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.sessionEarningReviewNotFound',
        error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_NOT_FOUND',
      });
    }

    const reviewLockKey = review.paymentId ?? review.sessionId;
    if (!reviewLockKey) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.sessionEarningReviewNotFound',
        error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_NOT_FOUND',
      });
    }

    await this.lockPaymentReviewScope(db, reviewLockKey);

    const lockedReview = await db.sessionEarningReview.findUnique({
      where: { id: review.id },
      include: this.reviewInclude,
    });

    if (!lockedReview) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.sessionEarningReviewNotFound',
        error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_NOT_FOUND',
      });
    }

    review = lockedReview;

    if (review.reviewStatus !== SessionEarningReviewStatus.PENDING_REVIEW) {
      return {
        item: review,
        wasAlreadyPosted: true,
      };
    }

    const decision =
      input.action === 'APPROVE_AS_IS'
        ? SessionEarningReviewDecision.APPROVED_AS_IS
        : input.action === 'EDIT_AND_APPROVE'
          ? SessionEarningReviewDecision.EDITED_AND_APPROVED
          : input.action === 'REJECT_PAYOUT'
            ? SessionEarningReviewDecision.REJECTED_PAYOUT
            : SessionEarningReviewDecision.EXCLUDED_FROM_PAYOUT;

    const isEditedApproval = input.action === 'EDIT_AND_APPROVE';
    const finalCurrencyCode = isEditedApproval
      ? input.finalCurrencyCode?.trim().toUpperCase() ||
        review.finalCurrencyCode ||
        review.suggestedCurrencyCode
      : review.finalCurrencyCode || review.suggestedCurrencyCode;
    const finalPractitionerAmount = isEditedApproval
      ? this.resolveDecimal(
          input.finalPractitionerAmount,
          review.suggestedPractitionerAmount,
        )
      : review.suggestedPractitionerAmount;
    const finalPlatformAmount = isEditedApproval
      ? this.resolveDecimal(
          input.finalPlatformAmount,
          review.suggestedPlatformAmount,
        )
      : review.suggestedPlatformAmount;
    const finalStatus =
      input.action === 'APPROVE_AS_IS' || input.action === 'EDIT_AND_APPROVE'
        ? SessionEarningReviewStatus.APPROVED
        : input.action === 'REJECT_PAYOUT'
          ? SessionEarningReviewStatus.REJECTED
          : SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT;

    if (finalStatus !== SessionEarningReviewStatus.APPROVED) {
      const existingEntries = await db.ledgerEntry.findMany({
        where: {
          sessionEarningReviewId: review.id,
        },
        select: {
          id: true,
        },
      });

      if (existingEntries.length > 0) {
        return {
          item: review,
          wasAlreadyPosted: true,
        };
      }

      const updated = await db.sessionEarningReview.update({
        where: { id: review.id },
        data: {
          reviewStatus: finalStatus,
          reviewDecision: decision,
          reviewedByUserId: input.reviewerUserId,
          reviewedAt: new Date(),
          approvedByUserId: null,
          approvedAt: null,
          internalReason: input.internalReason?.trim() || null,
          practitionerFacingNote: input.practitionerFacingNote?.trim() || null,
        },
        include: this.reviewInclude,
      });

      return {
        item: updated,
        wasAlreadyPosted: false,
      };
    }

    const settlement = await this.approvePractitionerSettlementService.approveAndCredit({
      db: db as Prisma.TransactionClient,
      practitionerId: review.practitionerId,
      sessionId: review.sessionId,
      paymentId: review.paymentId,
      sessionEarningReviewId: review.id,
      originalAmount: review.paymentAmount,
      originalCurrencyCode: review.paymentCurrencyCode,
      walletCurrencyCode: finalCurrencyCode,
      exchangeRate: input.exchangeRate
        ? this.resolveDecimal(input.exchangeRate, new Prisma.Decimal(1))
        : undefined,
      convertedAmount: input.calculatedWalletCreditAmount
        ? this.resolveDecimal(input.calculatedWalletCreditAmount, finalPractitionerAmount)
        : finalPractitionerAmount,
      finalWalletCredit: finalPractitionerAmount,
      walletCreditDifferenceAmount: input.walletCreditDifferenceAmount
        ? this.resolveDecimal(input.walletCreditDifferenceAmount, new Prisma.Decimal(0))
        : new Prisma.Decimal(0),
      walletCreditOverrideReason: input.walletCreditOverrideReason ?? null,
      platformAmount: finalPlatformAmount,
      actorUserId: input.reviewerUserId,
      referenceType: 'session-earning-review',
      referenceId: review.id,
      description: 'Practitioner earning approved from session accounting review.',
      metadata: {
        reviewId: review.id,
        sessionId: review.sessionId,
        paymentId: review.paymentId,
        sourceType: review.sourceType,
      },
    });

    const postedEntries = await db.ledgerEntry.findMany({
      where: {
        sessionEarningReviewId: review.id,
      },
      select: {
        entryType: true,
        amount: true,
        currencyCode: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const postedPractitionerAmount = postedEntries
      .filter(
        (entry) => entry.entryType === LedgerEntryType.PRACTITIONER_EARNING,
      )
      .reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0),
      );
    const postedPlatformAmount = postedEntries
      .filter((entry) => entry.entryType === LedgerEntryType.PLATFORM_COMMISSION)
      .reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0),
      );
    const postedCurrencyCode =
      postedEntries[0]?.currencyCode ?? finalCurrencyCode;
    const shouldUsePostedLedgerRows = postedEntries.length > 0;
    const resolvedFinalPractitionerAmount = shouldUsePostedLedgerRows
      ? postedPractitionerAmount
      : finalPractitionerAmount;
    const resolvedFinalPlatformAmount = shouldUsePostedLedgerRows
      ? postedPlatformAmount
      : finalPlatformAmount;
    const resolvedFinalCurrencyCode = shouldUsePostedLedgerRows
      ? postedCurrencyCode
      : finalCurrencyCode;

    const updated = await db.sessionEarningReview.update({
      where: { id: review.id },
      data: {
        reviewStatus: SessionEarningReviewStatus.APPROVED,
        reviewDecision: decision,
        reviewedByUserId: input.reviewerUserId,
        reviewedAt: new Date(),
        approvedByUserId: input.reviewerUserId,
        approvedAt: new Date(),
        internalReason: input.internalReason?.trim() || null,
        practitionerFacingNote: input.practitionerFacingNote?.trim() || null,
        finalPractitionerAmount: resolvedFinalPractitionerAmount,
        finalPlatformAmount: resolvedFinalPlatformAmount,
        finalCurrencyCode: resolvedFinalCurrencyCode,
        settlementId: settlement.id,
      },
      include: this.reviewInclude,
    });

    if (review.practitionerId) {
      await this.refreshPractitionerWalletService.refresh(
        review.practitionerId,
        db instanceof PrismaService ? undefined : db,
      );
    }

    return {
      item: updated,
      wasAlreadyPosted: false,
    };
  }

  async invalidatePendingReviewsForPayment(input: {
    paymentId: string;
    internalReason?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    if (input.tx) {
      return this.invalidatePendingReviewsForPaymentInDb(input.tx, input);
    }

    return this.prisma.$transaction((tx) =>
      this.invalidatePendingReviewsForPaymentInDb(tx, input),
    );
  }

  private async invalidatePendingReviewsForPaymentInDb(
    db: DbClient,
    input: {
      paymentId: string;
      internalReason?: string | null;
    },
  ) {
    await this.lockPaymentReviewScope(db, input.paymentId);

    const pendingReviews = await db.sessionEarningReview.findMany({
      where: {
        paymentId: input.paymentId,
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      },
      select: {
        id: true,
        sessionId: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if (pendingReviews.length === 0) {
      return {
        updatedCount: 0,
        reviewIds: [] as string[],
      };
    }

    const reviewIds = pendingReviews.map((item) => item.id);
    const invalidatedAt = new Date();
    const pendingSettlements = await db.practitionerSettlement.findMany({
      where: {
        sourceReviewId: { in: reviewIds },
        status: PractitionerSettlementStatus.UNDER_REVIEW,
      },
      select: {
        id: true,
        sourceReviewId: true,
        status: true,
        finalWalletCredit: true,
        walletCurrencyCode: true,
      },
    });

    await db.sessionEarningReview.updateMany({
      where: {
        id: {
          in: reviewIds,
        },
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      },
      data: {
        reviewStatus: SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
        reviewDecision: SessionEarningReviewDecision.EXCLUDED_FROM_PAYOUT,
        reviewedByUserId: null,
        reviewedAt: invalidatedAt,
        approvedByUserId: null,
        approvedAt: null,
        internalReason:
          input.internalReason?.trim() ||
          'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
        practitionerFacingNote: null,
      },
    });

    await db.practitionerSettlement.updateMany({
      where: {
        sourceReviewId: { in: reviewIds },
        status: PractitionerSettlementStatus.UNDER_REVIEW,
      },
      data: {
        status: PractitionerSettlementStatus.REJECTED,
        rejectionReason:
          input.internalReason?.trim() ||
          'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
        rejectedByUserId: null,
        rejectedAt: invalidatedAt,
      },
    });

    if (this.securityAuditService) {
      const reviewById = new Map(
        pendingReviews.map((review) => [review.id, review]),
      );

      for (const settlement of pendingSettlements) {
        const review = settlement.sourceReviewId
          ? reviewById.get(settlement.sourceReviewId)
          : undefined;
        const reason =
          input.internalReason?.trim() ||
          'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL';

        await this.securityAuditService.recordRequired(
          db as Prisma.TransactionClient,
          {
            action: 'SETTLEMENT_AUTO_REJECTED_REFUND',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.SYSTEM,
            source: SecurityAuditSource.SYSTEM,
            resourceType: 'PractitionerSettlement',
            resourceId: settlement.id,
            reason,
            metadata: {
              settlementId: settlement.id,
              sessionId: review?.sessionId ?? null,
              reviewId: settlement.sourceReviewId,
              paymentId: input.paymentId,
              previousSettlementStatus: settlement.status,
              newSettlementStatus: PractitionerSettlementStatus.REJECTED,
              previousReviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
              newReviewStatus: SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
              amount: settlement.finalWalletCredit.toString(),
              currency: settlement.walletCurrencyCode,
              reason,
              referenceType: 'PAYMENT',
              referenceId: input.paymentId,
              transitionAt: invalidatedAt.toISOString(),
            },
          },
        );
      }
    }

    return {
      updatedCount: reviewIds.length,
      reviewIds,
    };
  }

  private async resolvePaymentForSession(
    db: DbClient,
    session: SessionForReview,
  ): Promise<ReviewPayment | null> {
    if (session.packagePurchaseId) {
      const purchase = await db.patientPackagePurchase.findUnique({
        where: { id: session.packagePurchaseId },
        select: {
          payment: {
            select: {
              id: true,
              status: true,
              amountTotal: true,
              currencyCode: true,
              metadataJson: true,
              commissionPlatformRatePercent: true,
            },
          },
        },
      });

      return purchase?.payment ?? null;
    }

    const payment = await db.payment.findFirst({
      where: {
        sessionId: session.id,
        status: PaymentStatus.CAPTURED,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        amountTotal: true,
        currencyCode: true,
        metadataJson: true,
        commissionPlatformRatePercent: true,
      },
    });

    return payment ?? null;
  }

  private async buildReviewPayload(
    db: DbClient,
    input: {
      session: SessionForReview;
      sourceType: SessionEarningReviewSourceType;
      payment: ReviewPayment;
    },
  ) {
    if (input.sourceType === SessionEarningReviewSourceType.PACKAGE_SESSION) {
      if (!input.session.packagePurchaseId) {
        return {
          paymentAmount: input.payment.amountTotal,
          paymentCurrencyCode: input.payment.currencyCode,
          suggestedPractitionerAmount: input.payment.amountTotal,
          suggestedPlatformAmount: new Prisma.Decimal(0),
          suggestedCurrencyCode: input.payment.currencyCode,
          packageSettlementId: null as string | null,
          idempotencyKey: `session-earning-review:${input.sourceType}:${input.session.id}`,
        };
      }

      const purchase = await db.patientPackagePurchase.findUnique({
        where: { id: input.session.packagePurchaseId },
        select: {
          id: true,
          selectedCurrencyCode: true,
          payment: {
            select: {
              id: true,
              status: true,
              amountTotal: true,
              currencyCode: true,
              metadataJson: true,
              commissionPlatformRatePercent: true,
            },
          },
          packageSettlement: {
            select: {
              id: true,
            },
          },
          sessionCountSnapshot: true,
          patientPayableTotalSnapshot: true,
          platformFinalShareSnapshot: true,
          practitionerFinalShareSnapshot: true,
          platformOriginalShareSnapshot: true,
          practitionerOriginalShareSnapshot: true,
          platformDiscountShareSnapshot: true,
          practitionerDiscountShareSnapshot: true,
          discountAmountSnapshot: true,
        },
      });

      if (!purchase) {
        return null;
      }

      const allocation = this.calculatePackageSessionAllocationService.allocate({
        patientPayableTotal:
          purchase.patientPayableTotalSnapshot ?? input.payment.amountTotal,
        platformFinalShare:
          purchase.platformFinalShareSnapshot ?? new Prisma.Decimal(0),
        practitionerFinalShare:
          purchase.practitionerFinalShareSnapshot ?? new Prisma.Decimal(0),
        platformOriginalShare:
          purchase.platformOriginalShareSnapshot ?? new Prisma.Decimal(0),
        practitionerOriginalShare:
          purchase.practitionerOriginalShareSnapshot ?? new Prisma.Decimal(0),
        platformDiscountShare:
          purchase.platformDiscountShareSnapshot ?? new Prisma.Decimal(0),
        practitionerDiscountShare:
          purchase.practitionerDiscountShareSnapshot ?? new Prisma.Decimal(0),
        discountAmount: purchase.discountAmountSnapshot ?? new Prisma.Decimal(0),
        sessionCount: purchase.sessionCountSnapshot,
        sessionIndex: input.session.packageSessionIndex ?? 1,
      });

      const paymentCurrencyCode =
        purchase.payment?.currencyCode ?? input.payment.currencyCode;
      const suggestedCurrencyCode =
        purchase.selectedCurrencyCode ?? paymentCurrencyCode;

      return {
        paymentAmount: allocation.patientPayableAmount,
        paymentCurrencyCode,
        suggestedPractitionerAmount: allocation.practitionerFinalShareAmount,
        suggestedPlatformAmount: allocation.platformFinalShareAmount,
        suggestedCurrencyCode,
        packageSettlementId: purchase.packageSettlement?.id ?? null,
        idempotencyKey: `session-earning-review:${input.sourceType}:${input.session.id}`,
      };
    }

    const breakdown = this.extractPaymentLedgerBreakdownService.extract({
      amountTotal: input.payment.amountTotal,
      currencyCode: input.payment.currencyCode,
      commissionPlatformRatePercent: input.payment.commissionPlatformRatePercent,
      metadataJson: input.payment.metadataJson,
    });

    return {
      paymentAmount: input.payment.amountTotal,
      paymentCurrencyCode: input.payment.currencyCode,
      suggestedPractitionerAmount: this.resolveDecimal(
        breakdown.practitionerShareAmount,
        new Prisma.Decimal(0),
      ),
      suggestedPlatformAmount: this.resolveDecimal(
        breakdown.platformCommissionAmount,
        new Prisma.Decimal(0),
      ),
      suggestedCurrencyCode: breakdown.currencyCode,
      packageSettlementId: null as string | null,
      idempotencyKey: `session-earning-review:${input.sourceType}:${input.session.id}`,
    };
  }

  private resolveDecimal(
    value: string | number | Prisma.Decimal | null | undefined,
    fallback: Prisma.Decimal,
  ): Prisma.Decimal {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  private async ensureSettlementCandidate(
    db: DbClient,
    review: {
      id: string;
      practitionerId: string;
      paymentAmount: Prisma.Decimal;
      paymentCurrencyCode: string;
      suggestedPractitionerAmount: Prisma.Decimal;
    },
  ) {
    if (!('practitionerProfile' in db) || !this.walletRepository) return null;
    const existing = await db.practitionerSettlement.findUnique({
      where: { sourceReviewId: review.id },
      select: { id: true },
    });
    if (existing) return existing;

    const practitioner = await db.practitionerProfile.findUnique({
      where: { id: review.practitionerId },
      select: { country: { select: { isoCode: true } } },
    });
    const countryCode = practitioner?.country?.isoCode?.trim().toUpperCase();
    if (!countryCode) return null;
    const walletCurrencyCode = ['EG', 'EGY'].includes(countryCode) ? 'EGP' : 'USD';
    const now = new Date();
    const batch = await db.settlementBatch.upsert({
      where: { periodYear_periodMonth_currencyCode: { periodYear: now.getUTCFullYear(), periodMonth: now.getUTCMonth() + 1, currencyCode: walletCurrencyCode } },
      create: { periodYear: now.getUTCFullYear(), periodMonth: now.getUTCMonth() + 1, currencyCode: walletCurrencyCode, status: 'GENERATED', slug: `settlement-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${walletCurrencyCode}`, generatedAt: now },
      update: { status: 'GENERATED' },
    });
    const wallet = await this.walletRepository.ensureActiveWallet(review.practitionerId, walletCurrencyCode, db as Prisma.TransactionClient);
    const settlement = await db.practitionerSettlement.create({
      data: {
        batchId: batch.id,
        practitionerId: review.practitionerId,
        sourceReviewId: review.id,
        walletId: wallet.id,
        amountGross: review.suggestedPractitionerAmount,
        amountAdjustments: 0,
        amountNet: review.suggestedPractitionerAmount,
        currencyCode: walletCurrencyCode,
        originalAmount: review.paymentAmount,
        originalCurrencyCode: review.paymentCurrencyCode,
        walletCurrencyCode,
        exchangeRate: 1,
        convertedAmount: review.suggestedPractitionerAmount,
        finalWalletCredit: 0,
        status: 'UNDER_REVIEW',
        notes: 'Created automatically after eligible session completion.',
      },
    });

    if (this.securityAuditService && db instanceof PrismaService === false) {
      await this.securityAuditService.recordRequired(db as Prisma.TransactionClient, {
        action: 'SETTLEMENT_CREATED', outcome: SecurityAuditOutcome.SUCCESS,
        actorType: 'SYSTEM', resourceType: 'PractitionerSettlement', resourceId: settlement.id,
        metadata: { sourceReviewId: review.id, status: 'UNDER_REVIEW' },
      });
    }
    return settlement;
  }

  private readonly reviewInclude = {
    ledgerEntries: {
      select: {
        id: true,
        entryType: true,
        direction: true,
        amount: true,
        currencyCode: true,
        balanceBucket: true,
        referenceType: true,
        referenceId: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    },
  } satisfies Prisma.SessionEarningReviewInclude;
}
