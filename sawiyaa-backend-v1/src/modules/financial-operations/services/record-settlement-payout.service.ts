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
  ) {}

  async execute(
    input: {
      settlement: SettlementWithBatch;
      amountPaid: Prisma.Decimal | string;
      payoutMethod: SettlementPayoutMethod;
      payoutSource: SettlementPayoutSource;
      externalPayoutRef?: string | null;
      idempotencyKey?: string | null;
      transferFeeAmount?: Prisma.Decimal | string | null;
      transferFeeTreatment?: TransferFeeTreatment;
      notes?: string | null;
      effectiveAt?: Date;
      processedByUserId?: string | null;
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

    const effectiveAt = input.effectiveAt ?? new Date();
    const resolvedNotes = input.notes ?? currentSettlement.notes ?? null;
    const amountPaid = new Prisma.Decimal(input.amountPaid).toDecimalPlaces(2);
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
        amountPaid,
        payoutMethod: input.payoutMethod,
        payoutSource: input.payoutSource,
        transferFeeAmount,
        transferFeeTreatment,
        notes: resolvedNotes,
        processedByUserId: input.processedByUserId ?? null,
      });

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
      };
    }

    const existingPayoutByIdempotencyKey =
      await this.settlementPayoutRepository.findSettlementPayoutByIdempotencyKey(
        payoutIdempotencyKey,
        tx,
      );
    if (existingPayoutByIdempotencyKey) {
      if (existingPayoutByIdempotencyKey.settlementId !== currentSettlement.id) {
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
      };
    }

    if (
      currentSettlement.status !== 'READY' &&
      currentSettlement.status !== 'PROCESSING'
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementPayoutState',
        error: FINANCIAL_OPS_ERROR_CODES.invalidSettlementPayoutState,
      });
    }

    const paidSoFar =
      currentSettlement.amountPaidTotal ?? new Prisma.Decimal(0);
    const remainingBefore = currentSettlement.amountNet.sub(paidSoFar);
    const settlementAppliedAmount =
      transferFeeTreatment === 'DEDUCT_FROM_PRACTITIONER'
        ? amountPaid.add(transferFeeAmount).toDecimalPlaces(2)
        : amountPaid;

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
        currencyCode: currentSettlement.currencyCode,
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
      settlementAppliedAmount: settlementAppliedAmount.toFixed(2),
      transferFeeAmount: transferFeeAmount.toFixed(2),
      transferFeeTreatment,
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
            currencyCode: currentSettlement.currencyCode,
            payoutMethod: input.payoutMethod,
            payoutSource: input.payoutSource,
            payoutMethodSnapshot,
            transferFeeAmount,
            transferFeeTreatment,
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
          status: isFullyPaid ? 'PAID' : 'PROCESSING',
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
        entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
        direction: LedgerDirection.DEBIT,
        amount: settlementAppliedAmount,
        currencyCode: currentSettlement.currencyCode,
        balanceBucket: 'RESERVED',
        referenceType: 'settlement',
        referenceId: currentSettlement.id,
        description: 'Practitioner settlement payout (manual).',
      },
      tx,
    );

    await this.practitionerRecoveryService.applyOpenRecoveriesToPayout({
      practitionerId: currentSettlement.practitionerId,
      currencyCode: currentSettlement.currencyCode,
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
        currencyCode: currentSettlement.currencyCode,
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
        balanceBucket: WalletBalanceBucket.RESERVED,
      },
      _sum: {
        amount: true,
      },
    });

    return aggregates.reduce((sum, entry) => {
      const amount = new Prisma.Decimal(entry._sum.amount ?? 0);
      return entry.direction === 'CREDIT'
        ? sum.add(amount)
        : sum.sub(amount);
    }, new Prisma.Decimal(0));
  }
}
