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
import { ApprovePractitionerSettlementService } from '../services/approve-practitioner-settlement.service';

@Injectable()
export class AdminSettlementWorkflowUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SettlementRepository,
    private readonly adjustmentService: SettlementAdjustmentService,
    private readonly reviewService: SessionEarningReviewService,
    private readonly audit: SecurityAuditService,
    private readonly payoutService: RecordSettlementPayoutService,
    private readonly approvePractitionerSettlementService?: ApprovePractitionerSettlementService,
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
      calculatedDecisionAmount: sourceReview?.calculatedPractitionerAmount ? this.money(sourceReview.calculatedPractitionerAmount) : null,
      accountantApprovedSourceAmount: sourceReview?.accountantApprovedSourceAmount ? this.money(sourceReview.accountantApprovedSourceAmount) : null,
      grossPractitionerAmount: this.money(item.amountGross),
      adjustmentsTotal: this.money(item.amountAdjustments),
      finalWalletCredit: this.money(item.finalWalletCredit),
      amountPaidTotal: this.money(item.amountPaidTotal),
      currency: item.currencyCode,
      originalCurrencyCode: item.originalCurrencyCode,
      walletCurrencyCode: item.walletCurrencyCode,
      exchangeRate: this.money(item.exchangeRate),
      exchangeRateSource: item.exchangeRateSource ?? null,
      exchangeRateDate: item.exchangeRateAt ?? item.approvedAt ?? item.createdAt,
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
    const sourcePlatformAmount = item.sourceReview?.accountantApprovedSourceAmount && item.sourceReview.paymentAmount
      ? item.sourceReview.paymentAmount.sub(item.sourceReview.accountantApprovedSourceAmount)
      : null;
    return { item: { ...this.toContract(item, session), financial: { originalAmount: this.money(item.originalAmount), originalCurrency: item.originalCurrencyCode, walletCurrency: item.walletCurrencyCode, exchangeRate: this.money(item.exchangeRate), exchangeRateSource: item.exchangeRateSource ?? null, exchangeRateDate: item.exchangeRateAt ?? item.approvedAt ?? item.createdAt, convertedAmount: this.money(item.convertedAmount), finalWalletCredit: this.money(item.finalWalletCredit), walletCreditDifferenceAmount: this.money(item.walletCreditDifferenceAmount), walletCreditOverrideReason: item.walletCreditOverrideReason ?? null, grossPractitionerAmount: this.money(item.amountGross), adjustmentsTotal: this.money(item.amountAdjustments), platformCommissionRatePercent: this.money(payment?.commissionPlatformRatePercent), platformCommissionAmount: this.money(sourcePlatformAmount), platformCommissionCurrency: payment?.currencyCode ?? item.originalCurrencyCode }, payment: payment ? { id: payment.id, reference: payment.providerPaymentRef ?? payment.providerOrderRef ?? null, status: payment.status, provider: payment.provider, currency: payment.currencyCode, amount: this.money(payment.amountTotal), capturedAt: payment.capturedAt } : null, adjustments: item.adjustments.map((adjustment: any) => ({ id: adjustment.id, type: adjustment.type, amount: this.money(adjustment.amount), currency: adjustment.currencyCode, reason: adjustment.reason, createdByUserId: adjustment.createdByUserId, createdBy: adjustment.createdByUser ? { id: adjustment.createdByUser.id, name: adjustment.createdByUser.displayName } : null, createdAt: adjustment.createdAt })), auditEvents: events, session, patient: session?.patient ?? null } };
  }

  async addAdjustment(input: { settlementId: string; body: AddSettlementAdjustmentDto; actorUserId: string }) {
    throw new BadRequestException({
      messageKey: 'financialOperations.errors.legacySettlementAdjustmentsDisabled',
      error: 'LEGACY_SETTLEMENT_ADJUSTMENTS_DISABLED',
      settlementId: input.settlementId,
    });
  }

  async approve(input: { settlementId: string; actorUserId: string; exchangeRate?: string | null; approvedWalletCreditAmount?: string | null; walletCreditOverrideReason?: string | null }) {
    throw new BadRequestException({
      messageKey: 'financialOperations.errors.legacySettlementApprovalDisabled',
      error: 'LEGACY_SETTLEMENT_APPROVAL_DISABLED',
      settlementId: input.settlementId,
    });
  }

  async reject(input: { settlementId: string; actorUserId: string; reason: string }) {
    throw new BadRequestException({
      messageKey: 'financialOperations.errors.legacySettlementRejectionDisabled',
      error: 'LEGACY_SETTLEMENT_REJECTION_DISABLED',
      settlementId: input.settlementId,
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
