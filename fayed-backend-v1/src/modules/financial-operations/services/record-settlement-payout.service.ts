import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PractitionerSettlement,
  Prisma,
  SettlementPayoutMethod,
  SettlementPayoutSource,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
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
      transferFeeAmount?: Prisma.Decimal | string | null;
      transferFeeTreatment?: TransferFeeTreatment;
      notes?: string | null;
      effectiveAt?: Date;
      processedByUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (input.settlement.status === 'PAID') {
      throw new ConflictException({
        messageKey:
          'financialOperations.errors.settlementPayoutAlreadyRecorded',
        error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
      });
    }

    if (
      input.settlement.status !== 'READY' &&
      input.settlement.status !== 'PROCESSING'
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementPayoutState',
        error: FINANCIAL_OPS_ERROR_CODES.invalidSettlementPayoutState,
      });
    }

    const effectiveAt = input.effectiveAt ?? new Date();
    const resolvedNotes = input.notes ?? input.settlement.notes ?? null;
    const amountPaid = new Prisma.Decimal(input.amountPaid).toDecimalPlaces(2);
    const transferFeeAmount = new Prisma.Decimal(
      input.transferFeeAmount ?? 0,
    ).toDecimalPlaces(2);
    const transferFeeTreatment =
      input.transferFeeTreatment ?? 'PLATFORM_EXPENSE';
    const paidSoFar = input.settlement.amountPaidTotal ?? new Prisma.Decimal(0);
    const remainingBefore = input.settlement.amountNet.sub(paidSoFar);
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

    const paidTotalNext = paidSoFar.add(settlementAppliedAmount);
    const isFullyPaid = paidTotalNext.equals(input.settlement.amountNet);

    const payoutMethodSnapshot = {
      method: input.payoutMethod,
      source: input.payoutSource,
      externalPayoutRef: input.externalPayoutRef ?? null,
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
            batchId: input.settlement.batchId,
            settlementId: input.settlement.id,
            practitionerId: input.settlement.practitionerId,
            amountPaid,
            currencyCode: input.settlement.currencyCode,
            payoutMethod: input.payoutMethod,
            payoutSource: input.payoutSource,
            payoutMethodSnapshot,
            transferFeeAmount,
            transferFeeTreatment,
            externalPayoutRef: input.externalPayoutRef ?? null,
            notes: resolvedNotes,
            effectiveAt,
            processedByUserId: input.processedByUserId ?? null,
          },
          tx,
        );
    } catch (error) {
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
        input.settlement.id,
        {
          status: isFullyPaid ? 'PAID' : 'PROCESSING',
          paidAt: isFullyPaid ? effectiveAt : null,
          amountPaidTotal: paidTotalNext,
          externalPayoutRef: input.externalPayoutRef ?? null,
          notes: resolvedNotes,
          payoutMethodSnapshot,
        },
        tx,
      );

    await this.ledgerRepository.createLedgerEntry(
      {
        practitionerId: input.settlement.practitionerId,
        settlementId: input.settlement.id,
        entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
        direction: LedgerDirection.DEBIT,
        amount: settlementAppliedAmount,
        currencyCode: input.settlement.currencyCode,
        balanceBucket: 'RESERVED',
        referenceType: 'settlement',
        referenceId: input.settlement.id,
        description: 'Practitioner settlement payout (manual).',
      },
      tx,
    );

    await this.refreshPractitionerWalletService.refresh(
      input.settlement.practitionerId,
      tx,
    );

    await this.accountingJournalPostingService.postPractitionerPayout({
      payout: {
        payoutId: payoutRecord.id,
        settlementId: input.settlement.id,
        practitionerId: input.settlement.practitionerId,
        amountPaid,
        settlementAppliedAmount,
        currencyCode: input.settlement.currencyCode,
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
}
