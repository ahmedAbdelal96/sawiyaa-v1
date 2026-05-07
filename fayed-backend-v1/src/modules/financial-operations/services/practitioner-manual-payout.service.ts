import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  Prisma,
  SettlementPayoutMethod,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerManualPayoutBalanceService } from './practitioner-manual-payout-balance.service';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerManualPayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manualPayoutRepository: PractitionerManualPayoutRepository,
    private readonly balanceService: PractitionerManualPayoutBalanceService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly accountingJournalPostingService: AccountingJournalPostingService,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private normalizeCurrency(value: string) {
    const currencyCode = value.trim().toUpperCase();
    if (currencyCode.length !== 3) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    return currencyCode;
  }

  private advisoryLockKey(practitionerId: string, currencyCode: string) {
    return `practitioner-manual-payout:${practitionerId}:${currencyCode}`;
  }

  async record(input: {
    practitionerId: string;
    currencyCode: string;
    amountPaid: string;
    paidAt?: Date;
    paymentMethod?: SettlementPayoutMethod;
    transferReference?: string | null;
    notes?: string | null;
    recordedByUserId?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const currencyCode = this.normalizeCurrency(input.currencyCode);
    const effectiveAt = input.paidAt ?? new Date();
    const paymentMethod = input.paymentMethod ?? SettlementPayoutMethod.MANUAL_BANK_TRANSFER;
    const transferReference = input.transferReference?.trim() || null;
    const notes = input.notes?.trim() || null;
    const amountPaid = new Prisma.Decimal(input.amountPaid).toDecimalPlaces(2);

    if (amountPaid.lte(0)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutAmountInvalid',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountInvalid,
      });
    }

    const db = this.getDb(input.tx);

    if (transferReference) {
      const existing = await this.manualPayoutRepository.findByTransferReference(
        transferReference,
        input.tx,
      );
      if (existing) {
        if (
          existing.practitionerId !== input.practitionerId ||
          existing.currencyCode !== currencyCode
        ) {
          throw new ConflictException({
            messageKey: 'financialOperations.errors.manualPayoutAlreadyRecorded',
            error: FINANCIAL_OPS_ERROR_CODES.manualPayoutAlreadyRecorded,
          });
        }

        return {
          payoutRecord: existing,
          wasAlreadyRecorded: true,
        };
      }
    }

    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${this.advisoryLockKey(
      input.practitionerId,
      currencyCode,
    )}))`;

    if (transferReference) {
      const existing = await this.manualPayoutRepository.findByTransferReference(
        transferReference,
        input.tx,
      );
      if (existing) {
        if (
          existing.practitionerId !== input.practitionerId ||
          existing.currencyCode !== currencyCode
        ) {
          throw new ConflictException({
            messageKey: 'financialOperations.errors.manualPayoutAlreadyRecorded',
            error: FINANCIAL_OPS_ERROR_CODES.manualPayoutAlreadyRecorded,
          });
        }

        return {
          payoutRecord: existing,
          wasAlreadyRecorded: true,
        };
      }
    }

    const balance = await this.balanceService.getBalance({
      practitionerId: input.practitionerId,
      currencyCode,
      tx: input.tx,
    });

    const totalPayable = new Prisma.Decimal(balance.totalPayableAmount);
    if (amountPaid.gt(totalPayable)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutAmountExceedsDue',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountExceedsDue,
      });
    }

    const normalPayable = new Prisma.Decimal(
      balance.normalSessionPayableAmount,
    );
    const packageReleasedPayable = new Prisma.Decimal(
      balance.packageReleasedPayableAmount,
    );
    const packageHeldAmount = new Prisma.Decimal(balance.packageHeldAmount);

    const normalSessionAppliedAmount = amountPaid.lt(normalPayable)
      ? amountPaid
      : normalPayable;
    const packageReleasedAppliedAmount = amountPaid
      .sub(normalSessionAppliedAmount)
      .toDecimalPlaces(2);

    if (packageReleasedAppliedAmount.gt(packageReleasedPayable)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutAmountExceedsDue',
        error: FINANCIAL_OPS_ERROR_CODES.payoutAmountExceedsDue,
      });
    }

    const payoutRecord = await this.manualPayoutRepository.create(
      {
        practitionerId: input.practitionerId,
        currencyCode,
        amountPaid,
        normalSessionAppliedAmount,
        packageReleasedAppliedAmount,
        packageHeldAmountSnapshot: packageHeldAmount,
        totalPayableSnapshot: totalPayable,
        payoutMethod: paymentMethod,
        transferReference,
        paidAt: effectiveAt,
        notes,
        recordedByUserId: input.recordedByUserId ?? null,
      },
      input.tx,
    );

    await this.ledgerRepository.createLedgerEntry(
      {
        practitionerId: input.practitionerId,
        entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
        direction: LedgerDirection.DEBIT,
        amount: amountPaid,
        currencyCode,
        balanceBucket: 'AVAILABLE',
        referenceType: 'practitioner-manual-payout',
        referenceId: payoutRecord.id,
        description: 'Practitioner manual payout recorded by admin.',
        effectiveAt,
        metadataJson: {
          payoutId: payoutRecord.id,
          practitionerId: input.practitionerId,
          currencyCode,
          amountPaid: amountPaid.toFixed(2),
          normalSessionAppliedAmount: normalSessionAppliedAmount.toFixed(2),
          packageReleasedAppliedAmount: packageReleasedAppliedAmount.toFixed(2),
          packageHeldAmountSnapshot: packageHeldAmount.toFixed(2),
          totalPayableSnapshot: totalPayable.toFixed(2),
          paymentMethod,
          transferReference,
          recordedByUserId: input.recordedByUserId ?? null,
        },
      },
      input.tx,
    );

    await this.refreshPractitionerWalletService.refresh(
      input.practitionerId,
      input.tx,
    );

    await this.accountingJournalPostingService.postPractitionerPayout({
      payout: {
        payoutId: payoutRecord.id,
        settlementId: null,
        practitionerId: input.practitionerId,
        amountPaid,
        settlementAppliedAmount: amountPaid,
        currencyCode,
        effectiveAt,
        payoutMethodSnapshot: {
          method: paymentMethod,
          transferReference,
          notes,
          payoutKind: 'MANUAL',
        } as Prisma.JsonValue,
        transferFeeAmount: null,
        transferFeeTreatment: 'PLATFORM_EXPENSE',
      },
      tx: input.tx,
    });

    return {
      payoutRecord,
      wasAlreadyRecorded: false,
    };
  }
}
