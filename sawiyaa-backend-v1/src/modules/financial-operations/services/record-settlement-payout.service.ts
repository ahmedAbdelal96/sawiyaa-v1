import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PractitionerSettlement,
  Prisma,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  SecurityAuditActorType,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { PractitionerRecoveryService } from './practitioner-recovery.service';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';
import { CalculatePractitionerPayoutConversionService } from './calculate-practitioner-payout-conversion.service';
import {
  assertWalletCurrencyMatches,
  walletCurrencyMismatchException,
} from '../utils/wallet-currency-invariant';

type SettlementWithBatch = PractitionerSettlement & {
  batch: {
    id: string;
    slug: string;
    periodYear: number;
    periodMonth: number;
    currencyCode: string;
    status: string;
  };
};

type TransferFeeTreatment = 'PLATFORM_EXPENSE' | 'DEDUCT_FROM_PRACTITIONER';

@Injectable()
export class RecordSettlementPayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementRepository: SettlementRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly practitionerRecoveryService: PractitionerRecoveryService,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
    private readonly accountingJournalPostingService: AccountingJournalPostingService,
    private readonly payoutConversionService: CalculatePractitionerPayoutConversionService,
  ) {}

  async execute(
    input: {
      settlement: SettlementWithBatch;
      amountPaid?: Prisma.Decimal | string;
      payoutMethod: SettlementPayoutMethod;
      payoutSource: SettlementPayoutSource;
      externalPayoutRef?: string | null;
      idempotencyKey?: string | null;
      transferFeeAmount?: Prisma.Decimal | string | null;
      transferFeeTreatment?: TransferFeeTreatment;
      notes?: string | null;
      effectiveAt?: Date;
      processedByUserId?: string | null;
      payoutCurrencyCode?: string | null;
      exchangeRateEgpPerUsd?: Prisma.Decimal | string | null;
      actualPayoutAmount?: Prisma.Decimal | string | null;
      overrideReason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const currentSettlement = tx
      ? await this.settlementRepository.findPractitionerSettlementById(
          input.settlement.id,
          tx,
        )
      : input.settlement;

    if (!currentSettlement) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementItemNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.settlementItemNotFound,
      });
    }

    if (tx) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${currentSettlement.id})::bigint)`;
    }

    const db = tx ?? this.prisma;
    const wallet = await db.practitionerWallet.findFirst({
      where: { practitionerId: currentSettlement.practitionerId, status: 'ACTIVE' },
      select: { id: true, currencyCode: true },
    });
    if (!wallet) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerWalletNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.practitionerWalletNotFound,
      });
    }
    if (currentSettlement.walletId && currentSettlement.walletId !== wallet.id) {
      throw walletCurrencyMismatchException({
        operation: 'WALLET_DEBIT',
        walletCurrency: wallet.currencyCode,
        attemptedCurrency: currentSettlement.walletCurrencyCode,
      });
    }

    const effectiveAt = input.effectiveAt ?? new Date();
    const resolvedNotes = input.notes ?? currentSettlement.notes ?? null;
    const legacyAmountPaid = new Prisma.Decimal(
      input.amountPaid ?? 0,
    ).toDecimalPlaces(2);
    const transferFeeAmount = new Prisma.Decimal(
      input.transferFeeAmount ?? 0,
    ).toDecimalPlaces(2);
    const transferFeeTreatment =
      input.transferFeeTreatment ?? 'PLATFORM_EXPENSE';
    const externalPayoutRef = input.externalPayoutRef?.trim() || null;
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    const payoutIdempotencyKey =
      idempotencyKey ??
      externalPayoutRef ??
      this.buildFallbackIdempotencyKey({
        settlementId: currentSettlement.id,
        amountPaid: legacyAmountPaid,
        payoutMethod: input.payoutMethod,
        payoutSource: input.payoutSource,
        transferFeeAmount,
        transferFeeTreatment,
        notes: resolvedNotes,
        processedByUserId: input.processedByUserId ?? null,
      });

    const paidSoFar =
      currentSettlement.amountPaidTotal ?? new Prisma.Decimal(0);
    const remainingBefore = currentSettlement.amountNet
      .sub(paidSoFar)
      .toDecimalPlaces(2);
    const walletCurrency = assertWalletCurrencyMatches({
      operation: 'WALLET_DEBIT',
      walletCurrency: wallet.currencyCode,
      attemptedCurrency:
        currentSettlement.walletCurrencyCode ?? currentSettlement.currencyCode,
    });
    if (input.payoutCurrencyCode && input.payoutCurrencyCode.trim().toUpperCase() !== walletCurrency) {
      throw new BadRequestException('External payout currency must match the practitioner wallet currency');
    }
    if (input.exchangeRateEgpPerUsd !== undefined || input.actualPayoutAmount !== undefined || input.overrideReason !== undefined) {
      throw new BadRequestException('Currency conversion and payout amount overrides belong to settlement approval');
    }
    assertWalletCurrencyMatches({ operation: 'EXTERNAL_PAYOUT', walletCurrency, attemptedCurrency: walletCurrency });
    assertWalletCurrencyMatches({ operation: 'TRANSFER_FEE', walletCurrency, attemptedCurrency: walletCurrency });
    assertWalletCurrencyMatches({ operation: 'NET_RECEIVED', walletCurrency, attemptedCurrency: walletCurrency });
    assertWalletCurrencyMatches({ operation: 'PLATFORM_OUTFLOW', walletCurrency, attemptedCurrency: walletCurrency });
    const amountPaid = legacyAmountPaid;
    if (amountPaid.lte(0)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidPayoutAmount',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountInvalid,
      });
    }
    const transferFee = transferFeeAmount;
    if (transferFee.lt(0)) throw new BadRequestException('Transfer fee cannot be negative');
    if (transferFee.gt(0) && !input.transferFeeTreatment) throw new BadRequestException('Transfer fee bearer is required');
    const netAmountReceived = transferFeeTreatment === 'DEDUCT_FROM_PRACTITIONER'
      ? amountPaid.sub(transferFee).toDecimalPlaces(2)
      : amountPaid;
    if (netAmountReceived.lt(0)) throw new BadRequestException('Net amount received cannot be negative');
    const totalPlatformOutflow = transferFeeTreatment === 'PLATFORM_EXPENSE'
      ? amountPaid.add(transferFee).toDecimalPlaces(2)
      : amountPaid;

    const existingPayoutByExternalRef = externalPayoutRef
      ? await this.settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef(
          externalPayoutRef,
          tx,
        )
      : null;
    if (existingPayoutByExternalRef) {
      if (existingPayoutByExternalRef.settlementId !== currentSettlement.id) {
        throw new ConflictException({
          messageKey:
            'financialOperations.errors.settlementPayoutAlreadyRecorded',
          error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
        });
      }

      return {
        payoutRecord: this.financialOperationsMapper.toSettlementPayout(
          existingPayoutByExternalRef,
        ),
        settlement: currentSettlement,
        wasAlreadyRecorded: true,
      };
    }

    const existingPayoutByIdempotencyKey =
      await this.settlementPayoutRepository.findSettlementPayoutByIdempotencyKey(
        payoutIdempotencyKey,
        tx,
      );
    if (existingPayoutByIdempotencyKey) {
      if (
        existingPayoutByIdempotencyKey.settlementId !== currentSettlement.id
      ) {
        throw new ConflictException({
          messageKey:
            'financialOperations.errors.settlementPayoutAlreadyRecorded',
          error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
        });
      }

      return {
        payoutRecord: this.financialOperationsMapper.toSettlementPayout(
          existingPayoutByIdempotencyKey,
        ),
        settlement: currentSettlement,
        wasAlreadyRecorded: true,
      };
    }

    if (
      input.payoutSource === SettlementPayoutSource.MANUAL_EXCEPTION &&
      !externalPayoutRef &&
      !idempotencyKey
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutReferenceRequired',
        error: 'FINANCIAL_OPERATIONS_PAYOUT_REFERENCE_REQUIRED',
      });
    }
    if (!input.processedByUserId) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutActorRequired',
        error: 'FINANCIAL_OPERATIONS_PAYOUT_ACTOR_REQUIRED',
      });
    }

    if (currentSettlement.status !== 'CREDITED') {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementPayoutState',
        error: FINANCIAL_OPS_ERROR_CODES.invalidSettlementPayoutState,
      });
    }

    const settlementAppliedAmount = amountPaid;

    if (settlementAppliedAmount.lte(0)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidPayoutAmount',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountInvalid,
      });
    }

    if (settlementAppliedAmount.gt(remainingBefore)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutAmountExceedsDue',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountExceedsDue,
      });
    }

    const reservedBalanceBefore = await this.resolveReservedSettlementBalance(
      currentSettlement.id,
      {
        practitionerId: currentSettlement.practitionerId,
        currencyCode: walletCurrency,
        tx,
      },
    );

    if (reservedBalanceBefore.lt(settlementAppliedAmount)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementPayoutState',
        error: FINANCIAL_OPS_ERROR_CODES.invalidSettlementPayoutState,
      });
    }

    const paidTotalNext = paidSoFar.add(settlementAppliedAmount);
    const isFullyPaid = paidTotalNext.equals(currentSettlement.amountNet);

    const payoutMethodSnapshot = {
      method: input.payoutMethod,
      source: input.payoutSource,
      externalPayoutRef,
      idempotencyKey: payoutIdempotencyKey,
      notes: resolvedNotes,
      effectiveAt: effectiveAt.toISOString(),
      processedByUserId: input.processedByUserId ?? null,
      amountPaid: amountPaid.toFixed(2),
      walletCurrency,
      settlementAppliedAmount: settlementAppliedAmount.toFixed(2),
      transferFeeAmount: transferFeeAmount.toFixed(2),
      transferFeeCurrencyCode: walletCurrency,
      transferFeeTreatment,
      netAmountReceived: netAmountReceived.toFixed(2),
      totalPlatformOutflow: totalPlatformOutflow.toFixed(2),
    };

    let payoutRecord: Awaited<
      ReturnType<SettlementPayoutRepository['createSettlementPayout']>
    >;

    try {
      payoutRecord =
        await this.settlementPayoutRepository.createSettlementPayout(
          {
            batchId: currentSettlement.batchId,
            settlementId: currentSettlement.id,
            practitionerId: currentSettlement.practitionerId,
            amountPaid,
            currencyCode: walletCurrency,
            sourceAmount: null,
            sourceCurrencyCode: null,
            payoutCurrencyCode: walletCurrency,
            exchangeRateEgpPerUsd: null,
            calculatedPayoutAmount: null,
            actualPayoutAmount: null,
            differenceAmount: new Prisma.Decimal(0),
            overrideReason: null,
            payoutMethod: input.payoutMethod,
            payoutSource: input.payoutSource,
            payoutMethodSnapshot,
            transferFeeAmount,
            transferFeeTreatment,
            transferFeeCurrencyCode: walletCurrency,
            netAmountReceived,
            totalPlatformOutflow,
            externalPayoutRef,
            notes: resolvedNotes,
            effectiveAt,
            processedByUserId: input.processedByUserId ?? null,
          },
          tx,
        );
    } catch (error) {
      if (
        input.externalPayoutRef &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const conflictingPayout =
          await this.settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef(
            input.externalPayoutRef,
            tx,
          );
        if (
          conflictingPayout &&
          conflictingPayout.settlementId !== currentSettlement.id
        ) {
          throw new ConflictException({
            messageKey:
              'financialOperations.errors.settlementPayoutAlreadyRecorded',
            error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
          });
        }
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey:
            'financialOperations.errors.settlementPayoutAlreadyRecorded',
          error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
        });
      }

      throw error;
    }

    const updatedSettlement =
      await this.settlementRepository.updatePractitionerSettlement(
        currentSettlement.id,
        {
          status: isFullyPaid ? 'PAID_OUT' : 'CREDITED',
          paidAt: isFullyPaid ? effectiveAt : null,
          amountPaidTotal: paidTotalNext,
          externalPayoutRef,
          notes: resolvedNotes,
          payoutMethodSnapshot,
        },
        tx,
      );

    await this.ledgerRepository.createLedgerEntry(
      {
        practitionerId: currentSettlement.practitionerId,
        settlementId: currentSettlement.id,
        actorUserId: input.processedByUserId ?? null,
        actorType: input.processedByUserId ? SecurityAuditActorType.USER : null,
        entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
        direction: LedgerDirection.DEBIT,
        amount: settlementAppliedAmount,
        currencyCode: walletCurrency,
        balanceBucket: 'AVAILABLE',
        effectiveAt,
        referenceType: 'settlement',
        referenceId: currentSettlement.id,
        description: 'Practitioner settlement payout (manual).',
      },
      tx,
    );

    await this.practitionerRecoveryService.applyOpenRecoveriesToPayout({
      practitionerId: currentSettlement.practitionerId,
      currencyCode: walletCurrency,
      payoutId: payoutRecord.id,
      payoutAmount: amountPaid,
      operatorUserId: input.processedByUserId ?? null,
      tx,
    });

    await this.refreshPractitionerWalletService.refresh(
      currentSettlement.practitionerId,
      tx,
    );

    await this.accountingJournalPostingService.postPractitionerPayout({
      payout: {
        payoutId: payoutRecord.id,
        settlementId: currentSettlement.id,
        practitionerId: currentSettlement.practitionerId,
        amountPaid,
        settlementAppliedAmount,
      currencyCode: walletCurrency,
        effectiveAt,
        payoutMethodSnapshot: payoutMethodSnapshot as Prisma.JsonValue,
        transferFeeAmount,
        transferFeeTreatment,
      },
      tx,
    });

    return {
      payoutRecord:
        this.financialOperationsMapper.toSettlementPayout(payoutRecord),
      settlement: updatedSettlement,
      wasAlreadyRecorded: false,
    };
  }

  private buildFallbackIdempotencyKey(input: {
    settlementId: string;
    amountPaid: Prisma.Decimal;
    payoutMethod: SettlementPayoutMethod;
    payoutSource: SettlementPayoutSource;
    transferFeeAmount: Prisma.Decimal;
    transferFeeTreatment: TransferFeeTreatment;
    notes: string | null;
    processedByUserId: string | null;
  }) {
    return [
      'settlement-payout',
      input.settlementId,
      input.amountPaid.toFixed(2),
      input.payoutMethod,
      input.payoutSource,
      input.transferFeeAmount.toFixed(2),
      input.transferFeeTreatment,
      input.processedByUserId ?? '',
      input.notes ?? '',
    ].join(':');
  }

  private async resolveReservedSettlementBalance(
    settlementId: string,
    input: {
      practitionerId: string;
      currencyCode: string;
      tx?: Prisma.TransactionClient;
    },
  ) {
    const db = input.tx ?? this.prisma;
    const aggregates = await db.ledgerEntry.groupBy({
      by: ['direction'],
      where: {
        settlementId,
        practitionerId: input.practitionerId,
        currencyCode: input.currencyCode,
        balanceBucket: WalletBalanceBucket.AVAILABLE,
      },
      _sum: {
        amount: true,
      },
    });

    return aggregates.reduce((sum, entry) => {
      const amount = new Prisma.Decimal(entry._sum.amount ?? 0);
      return entry.direction === 'CREDIT' ? sum.add(amount) : sum.sub(amount);
    }, new Prisma.Decimal(0));
  }
}
