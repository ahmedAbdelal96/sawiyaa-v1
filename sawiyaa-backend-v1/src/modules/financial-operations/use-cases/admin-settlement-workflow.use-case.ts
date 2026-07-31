import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PractitionerSettlementStatus, SecurityAuditOutcome, SettlementPayoutSource } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { SettlementRepository } from '../repositories/settlement.repository';
import { SettlementAdjustmentService } from '../services/settlement-adjustment.service';
import { SessionEarningReviewService } from '../services/session-earning-review.service';
import { AddSettlementAdjustmentDto, ListAdminSettlementsDto } from '../dto/admin-settlement-workflow.dto';
import { RecordPractitionerPayoutDto } from '../dto/practitioner-payout.dto';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';
import { CalculatePractitionerPayoutConversionService } from '../services/calculate-practitioner-payout-conversion.service';
import { assertWalletCurrencyMatches } from '../utils/wallet-currency-invariant';

@Injectable()
export class AdminSettlementWorkflowUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SettlementRepository,
    private readonly adjustmentService: SettlementAdjustmentService,
    private readonly reviewService: SessionEarningReviewService,
    private readonly audit: SecurityAuditService,
    private readonly payoutService: RecordSettlementPayoutService,
    private readonly payoutConversionService: CalculatePractitionerPayoutConversionService = new CalculatePractitionerPayoutConversionService(),
  ) {}

  private money(value: unknown) {
    return value === null || value === undefined ? null : String(value);
  }

  private toContract(item: any, session: any | null = null) {
    const sourceReview = item.sourceReview;
    const activeWallet = item.practitioner.wallets?.[0] ?? null;
    return {
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      practitioner: {
        id: item.practitioner.id,
        name: item.practitioner.user?.displayName ?? item.practitioner.publicSlug,
        country: item.practitioner.country?.name ?? item.practitioner.country?.isoCode ?? null,
        countryCode: item.practitioner.country?.isoCode ?? null,
        walletCurrency: item.walletCurrencyCode,
        walletStatus: activeWallet?.status ?? null,
      },
      session: session
        ? { id: session.id, date: session.completedAt ?? session.scheduledStartAt, patientName: session.patient?.displayName ?? null, sessionCode: session.sessionCode, type: session.flowType, durationMinutes: session.durationMinutes, status: session.status }
        : sourceReview
          ? { id: sourceReview.sessionId, date: null, patientName: null, sessionCode: null, type: sourceReview.sourceType, status: null }
          : null,
      originalAmount: this.money(item.originalAmount),
      originalCurrency: item.originalCurrencyCode,
      grossPractitionerAmount: this.money(item.amountGross),
      adjustmentsTotal: this.money(item.amountAdjustments),
      finalWalletCredit: this.money(item.finalWalletCredit),
      amountPaidTotal: this.money(item.amountPaidTotal),
      currency: item.currencyCode,
      originalCurrencyCode: item.originalCurrencyCode,
      walletCurrencyCode: item.walletCurrencyCode,
      exchangeRate: this.money(item.exchangeRate),
      exchangeRateSource: item.exchangeRate ? 'ACCOUNTANT_SNAPSHOT' : null,
      exchangeRateDate: item.approvedAt ?? item.createdAt,
      convertedAmount: this.money(item.convertedAmount),
      approvedByUserId: item.approvedByUserId ?? null,
      approvedBy: item.approvedByUser ? { id: item.approvedByUser.id, name: item.approvedByUser.displayName } : null,
      approvedAt: item.approvedAt ?? null,
      rejectionReason: item.rejectionReason ?? null,
      rejectedByUserId: item.rejectedByUserId ?? null,
      rejectedBy: item.rejectedByUser ? { id: item.rejectedByUser.id, name: item.rejectedByUser.displayName } : null,
      rejectedAt: item.rejectedAt ?? null,
      payoutRecords: (item.payoutRecords ?? []).map((payout: any) => ({
        id: payout.id,
        amountPaid: this.money(payout.amountPaid),
        currency: payout.currencyCode,
        sourceAmount: this.money(payout.sourceAmount),
        sourceCurrency: payout.sourceCurrencyCode ?? null,
        payoutCurrency: payout.payoutCurrencyCode ?? null,
        exchangeRateEgpPerUsd: this.money(payout.exchangeRateEgpPerUsd),
        calculatedPayoutAmount: this.money(payout.calculatedPayoutAmount),
        actualPayoutAmount: this.money(payout.actualPayoutAmount),
        differenceAmount: this.money(payout.differenceAmount),
        overrideReason: payout.overrideReason ?? null,
        transferFeeAmount: this.money(payout.transferFeeAmount),
        transferFeeCurrency: payout.transferFeeCurrencyCode ?? payout.currencyCode,
        feeBearer: payout.transferFeeTreatment,
        netAmountReceived: this.money(payout.netAmountReceived ?? payout.amountPaid),
        totalPlatformOutflow: this.money(payout.totalPlatformOutflow ?? payout.amountPaid),
        payoutMethod: payout.payoutMethod,
        externalPayoutRef: payout.externalPayoutRef ?? null,
        notes: payout.notes ?? null,
        actorUserId: payout.actorUserId ?? payout.processedByUserId ?? null,
        actorType: payout.actorType ?? null,
        executor: payout.actorUser ? { id: payout.actorUser.id, name: payout.actorUser.displayName } : null,
        effectiveAt: payout.effectiveAt,
        createdAt: payout.createdAt,
      })),
    };
  }

  async list(query: ListAdminSettlementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = query.createdFrom ? new Date(query.createdFrom) : undefined;
    const to = query.createdTo ? new Date(query.createdTo) : undefined;
    if (to) to.setDate(to.getDate() + 1);
    if (from && to && from > to) throw new BadRequestException('Invalid settlement date range');
    const [items, totalItems] = await this.repository.listAdminSettlementWorkflow({
      status: query.status,
      query: query.query,
      practitionerId: query.practitionerId,
      currencyCode: query.currency?.trim().toUpperCase(),
      countryCode: query.country?.trim().toUpperCase(),
      createdFrom: from,
      createdTo: to,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      skip: (page - 1) * limit,
      take: limit,
    });
    const sessionIds = items.map((item) => item.sourceReview?.sessionId).filter((id): id is string => Boolean(id));
    const sessionRows = await this.prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, sessionCode: true, status: true, scheduledStartAt: true, completedAt: true, flowType: true, sessionMode: true, durationMinutes: true, patientId: true, practitionerId: true, patient: { select: { displayName: true } } },
    });
    const sessionRowsById = new Map(sessionRows.map((session) => [session.id, session]));
    return { items: items.map((item) => this.toContract(item, item.sourceReview?.sessionId ? sessionRowsById.get(item.sourceReview.sessionId) ?? null : null)), pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) } };
  }

  async detail(id: string) {
    const item = await this.repository.findAdminSettlementWorkflowById(id);
    if (!item) throw new NotFoundException('Settlement was not found');
    const session = item.sourceReview?.sessionId
      ? await this.prisma.session.findUnique({ where: { id: item.sourceReview.sessionId }, select: { id: true, sessionCode: true, status: true, scheduledStartAt: true, completedAt: true, flowType: true, sessionMode: true, durationMinutes: true, patientId: true, practitionerId: true, patient: { select: { displayName: true } } } })
      : null;
    const events = await this.prisma.securityAuditLog.findMany({
      where: { resourceType: 'PractitionerSettlement', resourceId: id },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: { id: true, action: true, outcome: true, occurredAt: true, reason: true, actorUser: { select: { id: true, displayName: true } } },
    });
    const payment = item.sourceReview?.paymentId
      ? await this.prisma.payment.findUnique({
          where: { id: item.sourceReview.paymentId },
          select: { id: true, providerPaymentRef: true, providerOrderRef: true, status: true, provider: true, currencyCode: true, amountTotal: true, commissionPlatformRatePercent: true, capturedAt: true },
        })
      : null;
    return { item: { ...this.toContract(item, session), financial: { originalAmount: this.money(item.originalAmount), originalCurrency: item.originalCurrencyCode, walletCurrency: item.walletCurrencyCode, exchangeRate: this.money(item.exchangeRate), exchangeRateSource: item.exchangeRate ? 'ACCOUNTANT_SNAPSHOT' : null, exchangeRateDate: item.approvedAt ?? item.createdAt, convertedAmount: this.money(item.convertedAmount), finalWalletCredit: this.money(item.finalWalletCredit), walletCreditDifferenceAmount: this.money(item.walletCreditDifferenceAmount), walletCreditOverrideReason: item.walletCreditOverrideReason ?? null, grossPractitionerAmount: this.money(item.amountGross), adjustmentsTotal: this.money(item.amountAdjustments), platformCommissionRatePercent: this.money(payment?.commissionPlatformRatePercent), platformCommissionAmount: this.money(item.sourceReview?.suggestedPlatformAmount), platformCommissionCurrency: payment?.currencyCode ?? item.originalCurrencyCode }, payment: payment ? { id: payment.id, reference: payment.providerPaymentRef ?? payment.providerOrderRef ?? null, status: payment.status, provider: payment.provider, currency: payment.currencyCode, amount: this.money(payment.amountTotal), capturedAt: payment.capturedAt } : null, adjustments: item.adjustments.map((adjustment: any) => ({ id: adjustment.id, type: adjustment.type, amount: this.money(adjustment.amount), currency: adjustment.currencyCode, reason: adjustment.reason, createdByUserId: adjustment.createdByUserId, createdBy: adjustment.createdByUser ? { id: adjustment.createdByUser.id, name: adjustment.createdByUser.displayName } : null, createdAt: adjustment.createdAt })), auditEvents: events, session, patient: session?.patient ?? null } };
  }

  async addAdjustment(input: { settlementId: string; body: AddSettlementAdjustmentDto; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.practitionerSettlement.findUnique({ where: { id: input.settlementId }, select: { status: true, walletCurrencyCode: true } });
      if (!item) throw new NotFoundException('Settlement was not found');
      const adjustment = await this.adjustmentService.apply({
        db: tx,
        settlementId: input.settlementId,
        type: input.body.type,
        amount: new Prisma.Decimal(input.body.amount),
        reason: input.body.reason,
        actorUserId: input.actorUserId,
      });
      await this.audit.recordRequired(tx, {
        action: 'SETTLEMENT_ADJUSTMENT_ADDED', outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId, resourceType: 'PractitionerSettlement', resourceId: input.settlementId,
        reason: input.body.reason, metadata: { type: input.body.type, amount: input.body.amount, currencyCode: item.walletCurrencyCode, oldState: item.status, newState: item.status },
      });
      return adjustment;
    });
  }

  async approve(input: { settlementId: string; actorUserId: string; exchangeRate?: string | null; approvedWalletCreditAmount?: string | null; walletCreditOverrideReason?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.practitionerSettlement.findUnique({
        where: { id: input.settlementId },
        include: { sourceReview: true },
      });
      if (!settlement) throw new NotFoundException('Settlement was not found');
      if (settlement.status === PractitionerSettlementStatus.CREDITED || settlement.status === PractitionerSettlementStatus.PAID_OUT) return { item: settlement, wasAlreadyApproved: true };
      if (settlement.status !== PractitionerSettlementStatus.DRAFT && settlement.status !== PractitionerSettlementStatus.UNDER_REVIEW) throw new BadRequestException('Settlement is not awaiting approval');
      if (!settlement.sourceReview) throw new BadRequestException('Settlement is missing its source earning review');
      if (settlement.sourceReview.reviewStatus !== 'PENDING_REVIEW') throw new BadRequestException('Settlement source earning review is no longer pending');
      const originalCurrency = (settlement.originalCurrencyCode ?? settlement.walletCurrencyCode).trim().toUpperCase();
      const wallet = await tx.practitionerWallet.findFirst({ where: { practitionerId: settlement.practitionerId, status: 'ACTIVE' }, orderBy: { updatedAt: 'desc' }, select: { currencyCode: true } });
      if (!wallet) throw new BadRequestException('Practitioner active wallet is required before approval');
      const walletCurrency = assertWalletCurrencyMatches({
        operation: 'WALLET_CREDIT',
        walletCurrency: wallet.currencyCode,
        attemptedCurrency: settlement.walletCurrencyCode,
      });
      const isCrossCurrency = originalCurrency !== walletCurrency;
      if (isCrossCurrency && !input.exchangeRate) throw new BadRequestException({ messageKey: 'financialOperations.errors.exchangeRateRequired', error: 'FINANCIAL_OPERATIONS_EXCHANGE_RATE_REQUIRED' });
      if (!isCrossCurrency && input.exchangeRate) throw new BadRequestException('Exchange rate is not applicable when currencies match');
      const exchangeRate = isCrossCurrency ? new Prisma.Decimal(input.exchangeRate!) : null;
      if (exchangeRate?.lte(0)) throw new BadRequestException('Exchange rate must be greater than zero');
      const toDecimal = (value: unknown) => {
        const text = value?.toString?.() ?? String(value ?? 0);
        return new Prisma.Decimal(text === '[object Object]' ? '0' : text);
      };
      const entitlementAmount = toDecimal(settlement.sourceReview.suggestedPractitionerAmount ?? settlement.amountGross ?? settlement.amountNet);
      const conversion = this.payoutConversionService.calculate({ sourceAmount: entitlementAmount, sourceCurrencyCode: originalCurrency, payoutCurrencyCode: walletCurrency, exchangeRateEgpPerUsd: exchangeRate });
      const adjustmentsAmount = toDecimal(settlement.amountAdjustments ?? 0);
      const calculatedWalletCredit = conversion.calculatedPayoutAmount.sub(adjustmentsAmount).toDecimalPlaces(2);
      const finalWalletCredit = input.approvedWalletCreditAmount ? new Prisma.Decimal(input.approvedWalletCreditAmount).toDecimalPlaces(2) : calculatedWalletCredit;
      const walletCreditDifferenceAmount = finalWalletCredit.sub(calculatedWalletCredit).toDecimalPlaces(2);
      const walletCreditOverrideReason = input.walletCreditOverrideReason?.trim() || null;
      if (walletCreditDifferenceAmount.abs().gt(new Prisma.Decimal('0.01')) && !walletCreditOverrideReason) throw new BadRequestException('Wallet credit difference reason is required');
      if (finalWalletCredit.lte(0)) throw new BadRequestException('Settlement final wallet credit must be greater than zero');
      const sourcePlatformAmount = toDecimal(settlement.sourceReview.suggestedPlatformAmount ?? 0);
      const convertedPlatformAmount = isCrossCurrency ? sourcePlatformAmount.mul(exchangeRate!).toDecimalPlaces(2) : sourcePlatformAmount;
      if (isCrossCurrency) {
        await tx.practitionerSettlement.update({ where: { id: input.settlementId }, data: { amountGross: conversion.calculatedPayoutAmount, convertedAmount: calculatedWalletCredit, amountNet: finalWalletCredit, finalWalletCredit, exchangeRate } });
      }
      const result = await this.reviewService.approveReview({
        tx,
        reviewId: settlement.sourceReview.id,
        reviewerUserId: input.actorUserId,
        action: 'EDIT_AND_APPROVE',
        finalPractitionerAmount: finalWalletCredit,
        calculatedWalletCreditAmount: calculatedWalletCredit,
        walletCreditDifferenceAmount,
        walletCreditOverrideReason,
        finalPlatformAmount: convertedPlatformAmount,
        finalCurrencyCode: walletCurrency,
        exchangeRate,
      });
      const approvedSettlement = await tx.practitionerSettlement.findUnique({ where: { id: input.settlementId } });
      if (!approvedSettlement) throw new NotFoundException('Approved settlement was not found');
      const auditAmount = approvedSettlement.finalWalletCredit ?? approvedSettlement.amountNet;
      const auditCurrency = approvedSettlement.walletCurrencyCode;
      await this.audit.recordRequired(tx, {
        action: 'SETTLEMENT_APPROVED', outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId, resourceType: 'PractitionerSettlement', resourceId: input.settlementId,
        metadata: { oldState: settlement.status, newState: approvedSettlement.status, amount: auditAmount.toString(), currencyCode: auditCurrency, finalWalletCredit: auditAmount.toString() },
      });
      await this.audit.recordRequired(tx, {
        action: 'SETTLEMENT_CREDITED', outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId, resourceType: 'PractitionerSettlement', resourceId: input.settlementId,
        metadata: { oldState: settlement.status, newState: approvedSettlement.status, walletCurrencyCode: auditCurrency, amount: auditAmount.toString(), currencyCode: auditCurrency, finalWalletCredit: auditAmount.toString() },
      });
      return { item: approvedSettlement, review: result.item, wasAlreadyApproved: result.wasAlreadyPosted };
    });
  }

  async reject(input: { settlementId: string; actorUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Rejection reason is required');
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.practitionerSettlement.findUnique({ where: { id: input.settlementId }, select: { status: true, walletCurrencyCode: true, finalWalletCredit: true, amountNet: true } });
      if (!settlement) throw new NotFoundException('Settlement was not found');
      if (settlement.status === PractitionerSettlementStatus.REJECTED) return { settlementId: input.settlementId, wasAlreadyRejected: true };
      if (settlement.status !== PractitionerSettlementStatus.DRAFT && settlement.status !== PractitionerSettlementStatus.UNDER_REVIEW) throw new BadRequestException('Settlement is not awaiting rejection');
      const item = await tx.practitionerSettlement.update({ where: { id: input.settlementId }, data: { status: PractitionerSettlementStatus.REJECTED, rejectionReason: reason, rejectedByUserId: input.actorUserId, rejectedAt: new Date() } });
      if (item.sourceReviewId) await tx.sessionEarningReview.update({ where: { id: item.sourceReviewId }, data: { reviewStatus: 'REJECTED', internalReason: reason, reviewedByUserId: input.actorUserId, reviewedAt: new Date() } });
      await this.audit.recordRequired(tx, { action: 'SETTLEMENT_REJECTED', outcome: SecurityAuditOutcome.SUCCESS, actorUserId: input.actorUserId, resourceType: 'PractitionerSettlement', resourceId: input.settlementId, reason, metadata: { oldState: settlement.status, newState: item.status, amount: (settlement.finalWalletCredit ?? settlement.amountNet).toString(), currencyCode: settlement.walletCurrencyCode } });
      return { item, wasAlreadyRejected: false };
    });
  }

  async payout(input: { settlementId: string; actorUserId: string; body: RecordPractitionerPayoutDto }) {
    const effectiveAt = (input.body.transferredAt ?? input.body.payoutDate) ? new Date(input.body.transferredAt ?? input.body.payoutDate as string) : new Date();
    return this.prisma.$transaction(async (tx) => {
      const settlement = await this.repository.findPractitionerSettlementById(input.settlementId, tx);
      if (!settlement) throw new NotFoundException('Settlement was not found');

      const result = await this.payoutService.execute({
        settlement,
        amountPaid: input.body.amountPaid,
        payoutMethod: input.body.payoutMethod,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: input.body.externalReference ?? null,
        transferFeeAmount: input.body.transferFeeAmount ?? null,
        transferFeeTreatment: input.body.transferFeeTreatment,
        notes: input.body.notes ?? null,
        effectiveAt,
        processedByUserId: input.actorUserId,
        payoutCurrencyCode: null,
        exchangeRateEgpPerUsd: undefined,
        actualPayoutAmount: undefined,
        overrideReason: undefined,
      }, tx);

      if (!result.wasAlreadyRecorded) {
        await this.audit.recordRequired(tx, {
          action: 'SETTLEMENT_PAYOUT_EXECUTED',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: input.actorUserId,
          resourceType: 'PractitionerSettlement',
          resourceId: input.settlementId,
          metadata: {
            oldState: settlement.status,
            newState: result.settlement.status,
            payoutId: result.payoutRecord.id,
            amountPaid: result.payoutRecord.amountNet,
            currencyCode: settlement.walletCurrencyCode,
            payoutCurrencyCode: settlement.walletCurrencyCode,
            transferFeeAmount: input.body.transferFeeAmount ?? '0.00',
            transferFeeTreatment: input.body.transferFeeTreatment ?? 'PLATFORM_EXPENSE',
            netAmountReceived: result.payoutRecord.netAmountReceived ?? result.payoutRecord.amountNet,
            totalPlatformOutflow: result.payoutRecord.totalPlatformOutflow ?? result.payoutRecord.amountNet,
          },
        });
      }

      return { item: result.payoutRecord, settlement: result.settlement };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
