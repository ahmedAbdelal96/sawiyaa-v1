import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  Prisma,
  SecurityAuditActorType,
  SettlementBatchStatus,
  PractitionerSettlementStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import {
  assertWalletCurrencyMatches,
  normalizeFinancialCurrency,
} from '../utils/wallet-currency-invariant';

@Injectable()
export class ApprovePractitionerSettlementService {
  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async approveAndCredit(input: {
    db: Prisma.TransactionClient;
    practitionerId: string;
    sessionId?: string | null;
    paymentId?: string | null;
    sessionEarningReviewId?: string | null;
    originalAmount: Prisma.Decimal;
    originalCurrencyCode: string;
    walletCurrencyCode: string;
    exchangeRate?: Prisma.Decimal;
    convertedAmount: Prisma.Decimal;
    finalWalletCredit: Prisma.Decimal;
    walletCreditDifferenceAmount?: Prisma.Decimal;
    walletCreditOverrideReason?: string | null;
    platformAmount: Prisma.Decimal;
    actorUserId: string;
    referenceType: string;
    referenceId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    const originalCurrencyCode = input.originalCurrencyCode.trim().toUpperCase();
    const requestedWalletCurrencyCode = input.walletCurrencyCode.trim().toUpperCase();
    if (!originalCurrencyCode || originalCurrencyCode.length !== 3 || !requestedWalletCurrencyCode || requestedWalletCurrencyCode.length !== 3) {
      throw new BadRequestException('Explicit source and Wallet currencies are required');
    }
    if (input.originalAmount.lt(0) || input.convertedAmount.lt(0) || input.finalWalletCredit.lt(0)) {
      throw new BadRequestException('Financial amounts cannot be negative');
    }
    if (input.finalWalletCredit.lte(0)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementAmount',
        error: 'FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_AMOUNT',
      });
    }

    if (input.sessionEarningReviewId) {
      const existingEntry = await input.db.ledgerEntry.findFirst({
        where: {
          sessionEarningReviewId: input.sessionEarningReviewId,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: LedgerDirection.CREDIT,
          settlementId: { not: null },
        },
        select: { settlementId: true },
      });
      if (existingEntry?.settlementId) {
        return input.db.practitionerSettlement.findUniqueOrThrow({
          where: { id: existingEntry.settlementId },
        });
      }
    }

    const now = new Date();
    const periodYear = now.getUTCFullYear();
    const periodMonth = now.getUTCMonth() + 1;
    const existingWallet = await input.db.practitionerWallet.findFirst({
      where: { practitionerId: input.practitionerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, currencyCode: true },
    });
    if (!existingWallet) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerWalletRequired',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_WALLET_REQUIRED',
      });
    }
    const currencyCode = assertWalletCurrencyMatches({
      operation: 'WALLET_CREDIT',
      walletCurrency: existingWallet.currencyCode,
      attemptedCurrency: requestedWalletCurrencyCode,
    });
    assertWalletCurrencyMatches({
      operation: 'WALLET_CREDIT',
      walletCurrency: currencyCode,
      attemptedCurrency: currencyCode,
    });
    if (
      originalCurrencyCode !== currencyCode &&
      !input.exchangeRate
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.exchangeRateRequired',
        error: 'FINANCIAL_OPERATIONS_EXCHANGE_RATE_REQUIRED',
      });
    }
    const batch = await input.db.settlementBatch.upsert({
      where: {
        periodYear_periodMonth_currencyCode: {
          periodYear,
          periodMonth,
          currencyCode,
        },
      },
      create: {
        periodYear,
        periodMonth,
        currencyCode,
        status: SettlementBatchStatus.GENERATED,
        slug: `settlement-${periodYear}-${String(periodMonth).padStart(2, '0')}-${currencyCode}`,
        generatedAt: now,
      },
      update: {
        status: SettlementBatchStatus.GENERATED,
        generatedAt: now,
      },
    });

    const wallet = existingWallet
      ? await input.db.practitionerWallet.findUniqueOrThrow({ where: { id: existingWallet.id } })
      : await this.walletRepository.ensureActiveWallet(input.practitionerId, currencyCode, input.db);

    const existingSettlement = await input.db.practitionerSettlement.findUnique({
      where: {
        batchId_practitionerId: {
          batchId: batch.id,
          practitionerId: input.practitionerId,
        },
      },
      select: { id: true, status: true },
    });
    if (
      existingSettlement &&
      (existingSettlement.status === PractitionerSettlementStatus.PAID_OUT ||
        existingSettlement.status === PractitionerSettlementStatus.PAID ||
        existingSettlement.status === PractitionerSettlementStatus.PROCESSING)
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.settlementAlreadyClosed',
        error: 'FINANCIAL_OPERATIONS_SETTLEMENT_ALREADY_CLOSED',
      });
    }

    const sourceSettlement = input.sessionEarningReviewId
      ? await input.db.practitionerSettlement.findUnique({
          where: { sourceReviewId: input.sessionEarningReviewId },
          select: { id: true, status: true, amountGross: true, amountAdjustments: true, convertedAmount: true },
        })
      : null;
    const settlement = sourceSettlement
      ? await input.db.practitionerSettlement.update({
          where: { id: sourceSettlement.id },
          data: {
            walletId: wallet.id,
            amountNet: input.finalWalletCredit,
            finalWalletCredit: input.finalWalletCredit,
            currencyCode,
            originalAmount: input.originalAmount,
            originalCurrencyCode,
            walletCurrencyCode: currencyCode,
            exchangeRate: input.exchangeRate ?? null,
            exchangeRateSource: input.exchangeRate ? 'ACCOUNTANT_APPROVAL' : null,
            exchangeRateAt: input.exchangeRate ? now : null,
            convertedAmount: input.convertedAmount,
            walletCreditDifferenceAmount: input.walletCreditDifferenceAmount ?? new Prisma.Decimal(0),
            walletCreditOverrideReason: input.walletCreditOverrideReason ?? null,
            approvedByUserId: input.actorUserId,
            approvedAt: now,
            status: PractitionerSettlementStatus.APPROVED,
          },
        })
      : await input.db.practitionerSettlement.upsert({
      where: {
        batchId_practitionerId: {
          batchId: batch.id,
          practitionerId: input.practitionerId,
        },
      },
      create: {
        batchId: batch.id,
        practitionerId: input.practitionerId,
        sourceReviewId: input.sessionEarningReviewId ?? null,
        walletId: wallet.id,
        amountGross: input.convertedAmount,
        amountAdjustments: 0,
        amountNet: input.finalWalletCredit,
        currencyCode,
        originalAmount: input.originalAmount,
        originalCurrencyCode,
        walletCurrencyCode: currencyCode,
        exchangeRate: input.exchangeRate ?? null,
        exchangeRateSource: input.exchangeRate ? 'ACCOUNTANT_APPROVAL' : null,
        exchangeRateAt: input.exchangeRate ? now : null,
        convertedAmount: input.convertedAmount,
        finalWalletCredit: input.finalWalletCredit,
        walletCreditDifferenceAmount: input.walletCreditDifferenceAmount ?? new Prisma.Decimal(0),
        walletCreditOverrideReason: input.walletCreditOverrideReason ?? null,
        approvedByUserId: input.actorUserId,
        approvedAt: now,
        status: PractitionerSettlementStatus.APPROVED,
        notes: 'Created by approved accounting decision.',
      },
      update: {
        amountGross: { increment: input.convertedAmount },
        amountNet: { increment: input.finalWalletCredit },
        convertedAmount: { increment: input.convertedAmount },
        finalWalletCredit: { increment: input.finalWalletCredit },
        approvedByUserId: input.actorUserId,
        approvedAt: now,
        status: PractitionerSettlementStatus.APPROVED,
        walletId: wallet.id,
      },
    });

    const auditMetadata = {
      source: 'approved-practitioner-settlement',
      settlementId: settlement.id,
      settlementBatchId: batch.id,
      actorUserId: input.actorUserId,
      approvedAt: now.toISOString(),
      ...input.metadata,
    };

    await this.ledgerRepository.createManyLedgerEntries(
      [
        {
          practitionerId: input.practitionerId,
          sessionId: input.sessionId ?? null,
          paymentId: input.paymentId ?? null,
          settlementId: settlement.id,
          sessionEarningReviewId: input.sessionEarningReviewId ?? null,
          actorUserId: input.actorUserId,
          actorType: SecurityAuditActorType.USER,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: LedgerDirection.CREDIT,
          amount: input.finalWalletCredit,
          currencyCode,
          balanceBucket: WalletBalanceBucket.AVAILABLE,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
          effectiveAt: now,
          metadataJson: auditMetadata,
        },
        ...(input.platformAmount.gt(0)
          ? [
              {
                practitionerId: null,
                sessionId: input.sessionId ?? null,
                paymentId: input.paymentId ?? null,
                settlementId: settlement.id,
                sessionEarningReviewId: input.sessionEarningReviewId ?? null,
                actorUserId: input.actorUserId,
                actorType: SecurityAuditActorType.USER,
                entryType: LedgerEntryType.PLATFORM_COMMISSION,
                direction: LedgerDirection.CREDIT,
                amount: input.platformAmount,
                currencyCode,
                balanceBucket: WalletBalanceBucket.AVAILABLE,
                referenceType: input.referenceType,
                referenceId: input.referenceId,
                description: 'Platform commission approved with settlement.',
                effectiveAt: now,
                metadataJson: auditMetadata,
              },
            ]
          : []),
      ] as Prisma.LedgerEntryUncheckedCreateInput[],
      input.db,
      true,
    );

    await input.db.practitionerSettlement.update({
      where: { id: settlement.id },
      data: { status: PractitionerSettlementStatus.CREDITED },
    });

    return input.db.practitionerSettlement.findUniqueOrThrow({
      where: { id: settlement.id },
    });
  }
}
