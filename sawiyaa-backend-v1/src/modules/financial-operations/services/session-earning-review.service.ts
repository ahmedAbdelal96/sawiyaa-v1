import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  FinancialOperationType,
  PractitionerEarningAdjustmentType,
  Prisma,
  PractitionerSettlementStatus,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionStatus,
  SecurityAuditOutcome,
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

import { ConfigResolverService } from '../../config/services/config-resolver.service';

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
  originalSessionId?: string | null;
  earningEntitlementId: string;
  patientCountrySnapshot?: string | null;
  practitionerCountrySnapshot?: string | null;
  countryRelationshipSnapshot?: string | null;
  suggestedPractitionerPercentageSnapshot?: Prisma.Decimal | null;
  pricingPolicySnapshotJson?: Prisma.JsonValue | null;
};

type SessionEarningReviewSyncResult = {
  reviewId: string;
  reviewStatus: SessionEarningReviewStatus;
  reviewDecision: SessionEarningReviewDecision;
  sourceType: SessionEarningReviewSourceType;
  wasAlreadySynced: boolean;
} | null;

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
    private readonly configResolverService?: ConfigResolverService,
  ) {}

  private async lockPaymentReviewScope(db: DbClient, paymentId: string) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${paymentId})::bigint)`;
  }

  private async lockEntitlementScope(db: DbClient, earningEntitlementId: string) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`earning-entitlement:${earningEntitlementId}`})::bigint)`;
  }

  async syncForSessionCompletion(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    if (input.tx) {
      return this.syncForSessionOutcomeInDb(input.tx, input.sessionId, [
        SessionStatus.COMPLETED,
      ]);
    }

    return this.prisma.$transaction((tx) =>
      this.syncForSessionOutcomeInDb(tx, input.sessionId, [
        SessionStatus.COMPLETED,
      ]),
    );
  }

  async syncForPatientNoShow(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    if (input.tx) {
      return this.syncForSessionOutcomeInDb(input.tx, input.sessionId, [
        SessionStatus.PATIENT_NO_SHOW,
      ]);
    }

    return this.prisma.$transaction((tx) =>
      this.syncForSessionOutcomeInDb(tx, input.sessionId, [
        SessionStatus.PATIENT_NO_SHOW,
      ]),
    );
  }

  async syncForPackageEntitlementDecision(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    if (input.tx) {
      return this.syncForPackageEntitlementDecisionInDb(
        input.tx,
        input.sessionId,
      );
    }

    return this.prisma.$transaction((tx) =>
      this.syncForPackageEntitlementDecisionInDb(tx, input.sessionId),
    );
  }

  async syncForAdminResolution(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<SessionEarningReviewSyncResult> {
    const statuses = [
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
    ];
    if (input.tx) {
      return this.syncForSessionOutcomeInDb(input.tx, input.sessionId, statuses);
    }
    return this.prisma.$transaction((tx) =>
      this.syncForSessionOutcomeInDb(tx, input.sessionId, statuses),
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
    approvedWalletCreditAmount?: string | number | Prisma.Decimal | null;
    calculatedWalletCreditAmount?: string | number | Prisma.Decimal | null;
    walletCreditDifferenceAmount?: string | number | Prisma.Decimal | null;
    walletCreditOverrideReason?: string | null;
    postFinancialEffects?: boolean;
    accountingAdjustmentType?: string | null;
    accountingNotes?: string | null;
    internalReason?: string | null;
    practitionerFacingNote?: string | null;
    idempotencyKey?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    // This method is retained only for the non-posting rejection/exclusion
    // compatibility path.  Approvals must always cross the explicit
    // accountant-decision (Stage A) and wallet-credit (Stage B) boundaries.
    if (input.action === 'APPROVE_AS_IS' || input.action === 'EDIT_AND_APPROVE') {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.legacyCombinedApprovalDisabled',
        error: 'LEGACY_COMBINED_APPROVAL_DISABLED',
      });
    }

    if (input.tx) {
      return this.approveReviewInDb(input.tx, input);
    }

    return this.prisma.$transaction((tx) => this.approveReviewInDb(tx, input));
  }

  async approveFinancialDecision(input: {
    reviewId: string;
    reviewerUserId: string;
    actorRoles?: string[];
    accountantApprovedSourceAmount?: string | number | Prisma.Decimal | null;
    overrideReason?: string | null;
    adjustments?: Array<{
      type: 'ADDITION' | 'DEDUCTION';
      category: string;
      description: string;
      amount: string | number | Prisma.Decimal;
      currencyCode: string;
      reason?: string | null;
    }>;
    internalReason?: string | null;
    practitionerFacingNote?: string | null;
    idempotencyKey?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const executeInTx = async (db: DbClient) => {
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
      await this.lockEntitlementScope(db, review.earningEntitlementId);
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

      const idempotencyKey = input.idempotencyKey?.trim() || `review:${review.id}`;
      const existingOperation = await db.financialOperationIdempotency.findFirst({
        where: {
          earningEntitlementId: review.earningEntitlementId,
          operationType: FinancialOperationType.RECORD_ACCOUNTANT_DECISION,
        },
        include: { review: true },
      });
      if (existingOperation) {
        return { item: existingOperation.review, wasAlreadyPosted: true };
      }

      if (review.reviewStatus === SessionEarningReviewStatus.DECISION_APPROVED) {
        return {
          item: review,
          wasAlreadyPosted: true,
        };
      }

      if (review.reviewStatus !== SessionEarningReviewStatus.PENDING_REVIEW) {
        throw new BadRequestException(`Cannot record decision for review in status ${review.reviewStatus}`);
      }

      const suggestedAmount = review.suggestedPractitionerAmount;
      const sourceCurrencyCode = review.paymentCurrencyCode.trim().toUpperCase();

      const explicitOverride = input.accountantApprovedSourceAmount !== undefined && input.accountantApprovedSourceAmount !== null;
      const overrideAmount = explicitOverride
        ? new Prisma.Decimal(input.accountantApprovedSourceAmount!)
        : null;

      let totalAdditions = new Prisma.Decimal(0);
      let totalDeductions = new Prisma.Decimal(0);

      if (input.adjustments && input.adjustments.length > 0) {
        for (const adj of input.adjustments) {
          const amt = new Prisma.Decimal(adj.amount);
          if (amt.lte(0)) {
            throw new BadRequestException('Adjustment amount must be greater than zero');
          }
          if (adj.type === 'ADDITION') {
            totalAdditions = totalAdditions.add(amt);
          } else if (adj.type === 'DEDUCTION') {
            totalDeductions = totalDeductions.add(amt);
          } else {
            throw new BadRequestException(`Invalid adjustment type: ${adj.type}`);
          }
          if (adj.currencyCode.trim().toUpperCase() !== sourceCurrencyCode) {
            throw new BadRequestException('Adjustment currency must equal the accountant decision source currency');
          }
          if (!adj.description.trim() || !adj.reason?.trim()) {
            throw new BadRequestException('Adjustment description and reason are required');
          }
        }
      }

      const netAdjustments = totalAdditions.sub(totalDeductions);
      const calculatedDecisionAmount = suggestedAmount.add(netAdjustments).toDecimalPlaces(2);
      const finalPractitionerAmount = (overrideAmount ?? calculatedDecisionAmount).toDecimalPlaces(2);
      if (overrideAmount && !overrideAmount.equals(calculatedDecisionAmount) && !input.overrideReason?.trim()) {
        throw new BadRequestException('Override reason is required when approved source amount differs from calculated decision amount');
      }
      if (finalPractitionerAmount.lt(0)) {
        throw new BadRequestException('Final practitioner amount cannot be negative');
      }

      const finalPlatformAmount = review.paymentAmount.sub(finalPractitionerAmount).toDecimalPlaces(2);
      const isEdited = !finalPractitionerAmount.equals(suggestedAmount) || (input.adjustments && input.adjustments.length > 0);
      const decision = isEdited
        ? SessionEarningReviewDecision.EDITED_AND_APPROVED
        : SessionEarningReviewDecision.APPROVED_AS_IS;

      if (input.adjustments && input.adjustments.length > 0) {
        for (const adj of input.adjustments) {
          await db.practitionerEarningAdjustment.create({
            data: {
              sessionEarningReviewId: review.id,
              type: adj.type as PractitionerEarningAdjustmentType,
              category: adj.category,
              description: adj.description,
              amount: new Prisma.Decimal(adj.amount),
              currencyCode: adj.currencyCode.trim().toUpperCase(),
              reason: adj.reason?.trim() || '',
              createdByUserId: input.reviewerUserId,
            },
          });
        }
      }

      const updated = await db.sessionEarningReview.update({
        where: { id: review.id },
        data: {
          reviewStatus: SessionEarningReviewStatus.DECISION_APPROVED,
          reviewDecision: decision,
          accountantApprovedSourceAmount: finalPractitionerAmount,
          // The canonical adjustment is the accountant-approved source
          // amount versus the immutable candidate suggestion.  This includes
          // an explicit override even when no separate adjustment rows exist.
          accountingAdjustmentAmount: finalPractitionerAmount
            .sub(suggestedAmount)
            .toDecimalPlaces(2),
          calculatedPractitionerAmount: calculatedDecisionAmount,
          finalPractitionerAmount,
          finalPlatformAmount,
          finalCurrencyCode: sourceCurrencyCode,
          overrideReason: overrideAmount && !overrideAmount.equals(calculatedDecisionAmount)
            ? input.overrideReason!.trim()
            : null,
          reviewedByUserId: input.reviewerUserId,
          reviewedAt: new Date(),
          internalReason: input.internalReason?.trim() || null,
          practitionerFacingNote: input.practitionerFacingNote?.trim() || null,
        },
        include: this.reviewInclude,
      });

      await db.financialOperationIdempotency.create({
        data: {
          earningEntitlementId: review.earningEntitlementId,
          operationType: FinancialOperationType.RECORD_ACCOUNTANT_DECISION,
          idempotencyKey,
          reviewId: review.id,
        },
      });

      await this.securityAuditService?.recordRequired(db as Prisma.TransactionClient, {
        action: 'finance.session-earning-review.financial-decision',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.reviewerUserId,
        actorRoles: input.actorRoles,
        resourceType: 'SessionEarningReview',
        resourceId: review.id,
        metadata: {
          decision,
          accountantApprovedSourceAmount: finalPractitionerAmount.toFixed(2),
          finalPlatformAmount: finalPlatformAmount.toFixed(2),
          currencyCode: sourceCurrencyCode,
          adjustmentsCount: input.adjustments?.length ?? 0,
          idempotencyKey,
        },
      });

      return {
        item: updated,
        wasAlreadyPosted: false,
      };
    };

    return input.tx ? executeInTx(input.tx) : this.prisma.$transaction(executeInTx);
  }

  async creditPractitionerWallet(input: {
    reviewId: string;
    approvedByUserId: string;
    actorRoles?: string[];
    approvedWalletCreditAmount?: string | number | Prisma.Decimal | null;
    walletCreditDifferenceAmount?: string | number | Prisma.Decimal | null;
    walletCreditOverrideReason?: string | null;
    idempotencyKey?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const executeInTx = async (txClient: Prisma.TransactionClient) => {
      let review = await txClient.sessionEarningReview.findUnique({
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
      await this.lockEntitlementScope(txClient, review.earningEntitlementId);
      await this.lockPaymentReviewScope(txClient, reviewLockKey);

      review = await txClient.sessionEarningReview.findUniqueOrThrow({
        where: { id: review.id },
        include: this.reviewInclude,
      });

      const idempotencyKey = input.idempotencyKey?.trim() || `review:${review.id}`;
      const existingOperation = await txClient.financialOperationIdempotency.findFirst({
        where: {
          earningEntitlementId: review.earningEntitlementId,
          operationType: FinancialOperationType.CREDIT_PRACTITIONER_WALLET,
        },
        include: { review: true },
      });
      if (existingOperation) return { item: existingOperation.review, wasAlreadyPosted: true };

      if (review.reviewStatus === SessionEarningReviewStatus.APPROVED) {
        if (review.settlementId) {
          return { item: review, wasAlreadyPosted: true };
        }
        throw new BadRequestException({
          error: 'FINANCIAL_OPERATIONS_APPROVED_REVIEW_MISSING_WALLET_CREDIT',
        });
      }

      if (review.reviewStatus !== SessionEarningReviewStatus.DECISION_APPROVED) {
        throw new BadRequestException(
          `Cannot credit wallet for review in status ${review.reviewStatus}. Review must be DECISION_APPROVED first.`,
        );
      }

      const finalPractitionerAmount = review.accountantApprovedSourceAmount;
      if (finalPractitionerAmount === null) {
        throw new BadRequestException('Accountant approved source amount is required before wallet credit');
      }
      const finalPlatformAmount = review.paymentAmount.sub(finalPractitionerAmount).toDecimalPlaces(2);
      const sourceCurrencyCode = review.paymentCurrencyCode.trim().toUpperCase();

      const activeWallet = await txClient.practitionerWallet.findFirst({
        where: { practitionerId: review.practitionerId, status: 'ACTIVE' },
        select: { currencyCode: true },
      });
      if (!activeWallet) {
        throw new NotFoundException({
          messageKey: 'financialOperations.errors.walletNotFound',
          error: 'FINANCIAL_OPERATIONS_PRACTITIONER_WALLET_REQUIRED',
        });
      }

      const walletCurrencyCode = activeWallet.currencyCode.trim().toUpperCase();
      const targetAmount = input.approvedWalletCreditAmount !== undefined && input.approvedWalletCreditAmount !== null
        ? this.resolveDecimal(
            input.approvedWalletCreditAmount,
            finalPractitionerAmount,
          ).toDecimalPlaces(2)
        : walletCurrencyCode === sourceCurrencyCode.trim().toUpperCase()
          ? finalPractitionerAmount
          : null;

      if (targetAmount === null || targetAmount.lt(0)) {
        throw new BadRequestException({
          error: 'FINANCIAL_OPERATIONS_WALLET_AMOUNT_REQUIRED',
        });
      }

      if (finalPractitionerAmount.isZero()) {
        const updatedZero = await txClient.sessionEarningReview.update({
          where: { id: review.id },
          data: { reviewStatus: SessionEarningReviewStatus.APPROVED, approvedByUserId: input.approvedByUserId, approvedAt: new Date() },
          include: this.reviewInclude,
        });
        await txClient.financialOperationIdempotency.create({
          data: { earningEntitlementId: review.earningEntitlementId, operationType: FinancialOperationType.CREDIT_PRACTITIONER_WALLET, idempotencyKey, reviewId: review.id },
        });
        await this.securityAuditService?.recordRequired(txClient, {
          action: 'finance.session-earning-review.wallet-credit',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: input.approvedByUserId,
          actorRoles: input.actorRoles,
          resourceType: 'SessionEarningReview',
          resourceId: review.id,
          metadata: {
            approvedWalletCreditAmount: targetAmount.toFixed(2),
            currencyCode: walletCurrencyCode,
            idempotencyKey,
            zeroCredit: true,
          },
        });
        return { item: updatedZero, wasAlreadyPosted: false };
      }

      const isCrossCurrency =
        walletCurrencyCode !== sourceCurrencyCode.trim().toUpperCase();
      const effectiveRate = isCrossCurrency
        ? sourceCurrencyCode.trim().toUpperCase() === 'USD'
          ? targetAmount.div(finalPractitionerAmount)
          : finalPractitionerAmount.div(targetAmount)
        : null;

      const settlement =
        await this.approvePractitionerSettlementService.approveAndCredit({
          db: txClient,
          practitionerId: review.practitionerId,
          sessionId: review.sessionId,
          paymentId: review.paymentId,
          sessionEarningReviewId: review.id,
          originalAmount: review.paymentAmount,
          originalCurrencyCode: sourceCurrencyCode,
          walletCurrencyCode,
          exchangeRate: effectiveRate ?? undefined,
          convertedAmount: targetAmount,
          finalWalletCredit: targetAmount,
          walletCreditDifferenceAmount: input.walletCreditDifferenceAmount
            ? new Prisma.Decimal(input.walletCreditDifferenceAmount)
            : new Prisma.Decimal(0),
          walletCreditOverrideReason: input.walletCreditOverrideReason ?? null,
          platformAmount: finalPlatformAmount,
          actorUserId: input.approvedByUserId,
          referenceType: 'SESSION_EARNING_REVIEW',
          referenceId: review.id,
          description: `Earning review approval for session ${review.sessionId}`,
        });

      await this.refreshPractitionerWalletService.refresh(
        review.practitionerId,
        txClient,
      );

      const updated = await txClient.sessionEarningReview.update({
        where: { id: review.id },
        data: {
          reviewStatus: SessionEarningReviewStatus.APPROVED,
          approvedByUserId: input.approvedByUserId,
          approvedAt: new Date(),
          settlementId: settlement.id,
        },
        include: this.reviewInclude,
      });

      await txClient.financialOperationIdempotency.create({
        data: {
          earningEntitlementId: review.earningEntitlementId,
          operationType: FinancialOperationType.CREDIT_PRACTITIONER_WALLET,
          idempotencyKey,
          reviewId: review.id,
          settlementId: settlement.id,
        },
      });

      await this.securityAuditService?.recordRequired(txClient, {
        action: 'finance.session-earning-review.wallet-credit',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.approvedByUserId,
        actorRoles: input.actorRoles,
        resourceType: 'SessionEarningReview',
        resourceId: review.id,
        metadata: {
          approvedWalletCreditAmount: targetAmount.toFixed(2),
          currencyCode: walletCurrencyCode,
          settlementId: settlement.id,
          idempotencyKey,
        },
      });

      return { item: updated, wasAlreadyPosted: false };
    };

    return input.tx
      ? executeInTx(input.tx)
      : this.prisma.$transaction(executeInTx);
  }

  private async syncForSessionOutcomeInDb(
    db: DbClient,
    sessionId: string,
    allowedStatuses: SessionStatus[],
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
        originalSessionId: true,
        earningEntitlementId: true,
        patientCountrySnapshot: true,
        practitionerCountrySnapshot: true,
        countryRelationshipSnapshot: true,
        suggestedPractitionerPercentageSnapshot: true,
        pricingPolicySnapshotJson: true,
      },
    });

    if (!session || !allowedStatuses.includes(session.status)) {
      return null;
    }

    const replacementResolution = 'sessionResolution' in db && db.sessionResolution
      ? await db.sessionResolution.findFirst({
          where: {
            sessionId: session.id,
            patientRemedy: 'CREATE_REPLACEMENT_SESSION',
            replacementSessionId: { not: null },
          },
          select: { id: true },
        })
      : null;
    if (replacementResolution) return null;

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

    if (existingReview) {
      return {
        reviewId: existingReview.id,
        reviewStatus: existingReview.reviewStatus,
        reviewDecision: existingReview.reviewDecision,
        sourceType: existingReview.sourceType,
        wasAlreadySynced: true,
      };
    }

    const createData: Prisma.SessionEarningReviewUncheckedCreateInput = {
      sessionId: session.id,
      earningEntitlementId: session.earningEntitlementId,
      paymentId: payment.id,
      packagePurchaseId: session.packagePurchaseId ?? null,
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
      suggestedPractitionerPercentage: reviewPayload.suggestedPractitionerPercentage ?? null,
      accountantApprovedSourceAmount: null,
      calculatedPractitionerAmount: null,
      patientCountrySnapshot: reviewPayload.patientCountrySnapshot ?? null,
      practitionerCountrySnapshot: reviewPayload.practitionerCountrySnapshot ?? null,
      countryRelationshipSnapshot: reviewPayload.countryRelationshipSnapshot ?? null,
      policySnapshotJson: (reviewPayload.policySnapshotJson as Prisma.InputJsonValue) ?? Prisma.DbNull,
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
    };

    const updateData: Prisma.SessionEarningReviewUncheckedUpdateInput = {
      paymentId: payment.id,
      packagePurchaseId: session.packagePurchaseId ?? null,
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
      suggestedPractitionerPercentage: reviewPayload.suggestedPractitionerPercentage ?? null,
      accountantApprovedSourceAmount: null,
      calculatedPractitionerAmount: null,
      patientCountrySnapshot: reviewPayload.patientCountrySnapshot ?? null,
      practitionerCountrySnapshot: reviewPayload.practitionerCountrySnapshot ?? null,
      countryRelationshipSnapshot: reviewPayload.countryRelationshipSnapshot ?? null,
      policySnapshotJson: (reviewPayload.policySnapshotJson as Prisma.InputJsonValue) ?? Prisma.DbNull,
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


    return {
      reviewId: review.id,
      reviewStatus: review.reviewStatus,
      reviewDecision: review.reviewDecision,
      sourceType: review.sourceType,
      wasAlreadySynced: false,
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
        originalSessionId: true,
        earningEntitlementId: true,
        patientCountrySnapshot: true,
        practitionerCountrySnapshot: true,
        countryRelationshipSnapshot: true,
        suggestedPractitionerPercentageSnapshot: true,
        pricingPolicySnapshotJson: true,
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
        earningEntitlementId: session.earningEntitlementId,
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
        suggestedPractitionerPercentage: reviewPayload.suggestedPractitionerPercentage ?? null,
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
        suggestedPractitionerPercentage: reviewPayload.suggestedPractitionerPercentage ?? null,
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
      approvedWalletCreditAmount?: string | number | Prisma.Decimal | null;
      calculatedWalletCreditAmount?: string | number | Prisma.Decimal | null;
      walletCreditDifferenceAmount?: string | number | Prisma.Decimal | null;
      walletCreditOverrideReason?: string | null;
      internalReason?: string | null;
      practitionerFacingNote?: string | null;
      postFinancialEffects?: boolean;
      accountingAdjustmentType?: string | null;
      accountingNotes?: string | null;
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
    const sourceCurrencyCode = review.paymentCurrencyCode ?? review.suggestedCurrencyCode;
    const finalCurrencyCode = sourceCurrencyCode;
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
    const accountingAdjustmentAmount = finalPractitionerAmount
      .sub(review.suggestedPractitionerAmount)
      .toDecimalPlaces(2);
    if (!accountingAdjustmentAmount.isZero() && !input.internalReason?.trim()) {
      throw new BadRequestException('An adjustment reason is required when the approved amount differs from the suggestion');
    }
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
          accountingAdjustmentAmount,
          accountingAdjustmentType: accountingAdjustmentAmount.isZero() ? 'NONE' : input.accountingAdjustmentType?.trim() || (accountingAdjustmentAmount.lt(0) ? 'DEDUCTION' : 'ADDITION'),
          accountingAdjustmentReason: input.internalReason?.trim() || null,
          accountingNotes: input.accountingNotes?.trim() || null,
        },
        include: this.reviewInclude,
      });

      return {
        item: updated,
        wasAlreadyPosted: false,
      };
    }

    throw new BadRequestException({
      error: 'LEGACY_COMBINED_APPROVAL_DISABLED',
    });
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

    if (payment) return payment;

    // Admin replacement sessions intentionally have no new payment. They
    // reuse the original captured payment's immutable financial snapshot as
    // source context while remaining a distinct earning-review session.
    if (session.originalSessionId) {
      return db.payment.findFirst({
        where: {
          sessionId: session.originalSessionId,
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
    }

    return null;
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
        // A package candidate without its immutable purchase allocation is
        // not economically meaningful.  Never turn the whole package payment
        // into a per-session practitioner amount.
        return null;
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

      const requiredAllocationSnapshots = [
        purchase.patientPayableTotalSnapshot,
        purchase.platformFinalShareSnapshot,
        purchase.practitionerFinalShareSnapshot,
        purchase.platformOriginalShareSnapshot,
        purchase.practitionerOriginalShareSnapshot,
        purchase.platformDiscountShareSnapshot,
        purchase.practitionerDiscountShareSnapshot,
        purchase.discountAmountSnapshot,
      ];
      if (
        !purchase.sessionCountSnapshot ||
        !input.session.packageSessionIndex ||
        requiredAllocationSnapshots.some((value) => value === null)
      ) {
        // Missing booking-time allocation data requires an explicit manual
        // reconciliation; using the current package price or a zero fallback
        // would create a fabricated financial basis.
        return null;
      }

      const allocation = this.calculatePackageSessionAllocationService.allocate(
        {
          patientPayableTotal: purchase.patientPayableTotalSnapshot!,
          platformFinalShare: purchase.platformFinalShareSnapshot!,
          practitionerFinalShare: purchase.practitionerFinalShareSnapshot!,
          platformOriginalShare: purchase.platformOriginalShareSnapshot!,
          practitionerOriginalShare: purchase.practitionerOriginalShareSnapshot!,
          platformDiscountShare: purchase.platformDiscountShareSnapshot!,
          practitionerDiscountShare: purchase.practitionerDiscountShareSnapshot!,
          discountAmount: purchase.discountAmountSnapshot!,
          sessionCount: purchase.sessionCountSnapshot,
          sessionIndex: input.session.packageSessionIndex,
        },
      );

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
        suggestedPractitionerPercentage: new Prisma.Decimal(allocation.patientPayableAmount).gt(0)
          ? new Prisma.Decimal(allocation.practitionerFinalShareAmount).div(new Prisma.Decimal(allocation.patientPayableAmount)).mul(100).toDecimalPlaces(2)
          : null,
        packageSettlementId: purchase.packageSettlement?.id ?? null,
        idempotencyKey: `session-earning-review:${input.sourceType}:${input.session.id}`,
      };
    }

    // Completion consumes booking-time snapshots only.  Current profile or
    // current configuration values are not a valid basis for historical pay.
    let patientCountry = input.session.patientCountrySnapshot;
    let practitionerCountry = input.session.practitionerCountrySnapshot;
    let countryRelationship = input.session.countryRelationshipSnapshot;
    let suggestedPercentage = input.session.suggestedPractitionerPercentageSnapshot;

    if (patientCountry && practitionerCountry) {
      const isSame = patientCountry.trim().toUpperCase() === practitionerCountry.trim().toUpperCase();
      countryRelationship = isSame ? 'SAME_COUNTRY' : 'CROSS_COUNTRY';
    } else {
      countryRelationship = 'UNRESOLVED';
      // Preserve an explicitly snapshotted recommendation; otherwise remain unresolved.
      suggestedPercentage = suggestedPercentage ?? null;
    }

    const suggestedPractitionerPercentage = suggestedPercentage;
    const suggestedPractitionerAmount = suggestedPractitionerPercentage
      ? input.payment.amountTotal
          .mul(suggestedPractitionerPercentage)
          .div(100)
          .toDecimalPlaces(2)
      : new Prisma.Decimal(0);
    const suggestedPlatformAmount = input.payment.amountTotal
      .sub(suggestedPractitionerAmount)
      .toDecimalPlaces(2);

    return {
      paymentAmount: input.payment.amountTotal,
      paymentCurrencyCode: input.payment.currencyCode,
      suggestedPractitionerAmount,
      suggestedPlatformAmount,
      suggestedCurrencyCode: input.payment.currencyCode,
      suggestedPractitionerPercentage,
      patientCountrySnapshot: patientCountry,
      practitionerCountrySnapshot: practitionerCountry,
      countryRelationshipSnapshot: countryRelationship,
      policySnapshotJson: input.session.pricingPolicySnapshotJson ?? {
        source: 'booking_snapshot',
        resolvedRelationship: countryRelationship,
        snapshotComplete: Boolean(
          patientCountry && practitionerCountry && suggestedPercentage,
        ),
      },
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

    const activeWallet = await db.practitionerWallet.findFirst({
      where: { practitionerId: review.practitionerId, status: 'ACTIVE' },
      select: { id: true, currencyCode: true },
    });
    if (!activeWallet) return null;
    const walletCurrencyCode = activeWallet.currencyCode;
    const isCrossCurrency = review.paymentCurrencyCode.trim().toUpperCase() !== walletCurrencyCode.trim().toUpperCase();
    const candidateAmount = isCrossCurrency ? new Prisma.Decimal(0) : review.suggestedPractitionerAmount;
    const now = new Date();
    const batch = await db.settlementBatch.upsert({
      where: {
        periodYear_periodMonth_currencyCode: {
          periodYear: now.getUTCFullYear(),
          periodMonth: now.getUTCMonth() + 1,
          currencyCode: walletCurrencyCode,
        },
      },
      create: {
        periodYear: now.getUTCFullYear(),
        periodMonth: now.getUTCMonth() + 1,
        currencyCode: walletCurrencyCode,
        status: 'GENERATED',
        slug: `settlement-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${walletCurrencyCode}`,
        generatedAt: now,
      },
      update: { status: 'GENERATED' },
    });
    const existingBatchSettlement = await db.practitionerSettlement.findUnique({
      where: {
        batchId_practitionerId: {
          batchId: batch.id,
          practitionerId: review.practitionerId,
        },
      },
      select: { id: true, status: true },
    });
    if (existingBatchSettlement) {
      if (!['DRAFT', 'UNDER_REVIEW'].includes(existingBatchSettlement.status)) return existingBatchSettlement;
      return db.practitionerSettlement.update({
        where: { id: existingBatchSettlement.id },
        data: {
          sourceReviewId: review.id,
          walletId: activeWallet.id,
          amountGross: candidateAmount,
          amountNet: candidateAmount,
          currencyCode: walletCurrencyCode,
          originalAmount: review.paymentAmount,
          originalCurrencyCode: review.paymentCurrencyCode,
          walletCurrencyCode,
          exchangeRate: null,
          exchangeRateSource: null,
          exchangeRateAt: null,
          convertedAmount: candidateAmount,
          finalWalletCredit: 0,
        },
      });
    }
    const settlement = await db.practitionerSettlement.create({
      data: {
        batchId: batch.id,
        practitionerId: review.practitionerId,
        sourceReviewId: review.id,
        walletId: activeWallet.id,
        amountGross: candidateAmount,
        amountAdjustments: 0,
        amountNet: candidateAmount,
        currencyCode: walletCurrencyCode,
        originalAmount: review.paymentAmount,
        originalCurrencyCode: review.paymentCurrencyCode,
        walletCurrencyCode,
        exchangeRate: null,
        exchangeRateSource: null,
        exchangeRateAt: null,
        convertedAmount: candidateAmount,
        finalWalletCredit: 0,
        status: 'UNDER_REVIEW',
        notes: 'Created automatically after eligible session completion.',
      },
    });

    if (this.securityAuditService && db instanceof PrismaService === false) {
      await this.securityAuditService.recordRequired(db, {
        action: 'SETTLEMENT_CREATED',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: 'SYSTEM',
        resourceType: 'PractitionerSettlement',
        resourceId: settlement.id,
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
