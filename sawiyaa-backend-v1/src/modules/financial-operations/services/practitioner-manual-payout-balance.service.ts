import { Injectable } from '@nestjs/common';
import { LedgerDirection, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerRecoveryService } from './practitioner-recovery.service';
import { PractitionerPayoutBalanceViewModel } from '../types/financial-operations.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerManualPayoutBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly manualPayoutRepository: PractitionerManualPayoutRepository,
    private readonly practitionerRecoveryService: PractitionerRecoveryService,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private maskIdentifier(value: string | null | undefined) {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return null;
    if (trimmed.length <= 4) return 'â€¢â€¢â€¢â€¢';
    if (trimmed.length <= 8) return `â€¢â€¢â€¢â€¢${trimmed.slice(-4)}`;
    return `${trimmed.slice(0, 4)}â€¢â€¢â€¢â€¢${trimmed.slice(-4)}`;
  }

  private buildPayoutDestinationSummary(
    destination:
      | {
          methodType?: string | null;
          accountHolderName?: string | null;
          bankName?: string | null;
          bankAccountNumber?: string | null;
          iban?: string | null;
          walletProvider?: string | null;
          walletIdentifier?: string | null;
          otherDetails?: string | null;
        }
      | null
      | undefined,
  ) {
    if (!destination)
      return {
        payoutDestinationType: null,
        payoutDestinationSummaryMasked: null,
      };

    const methodType = destination.methodType ?? null;
    const summaryParts: string[] = [];

    if (destination.walletProvider?.trim()) {
      summaryParts.push(destination.walletProvider.trim());
    } else if (destination.bankName?.trim()) {
      summaryParts.push(destination.bankName.trim());
    }

    const maskedIdentifier =
      this.maskIdentifier(
        destination.walletIdentifier ??
          destination.bankAccountNumber ??
          destination.iban ??
          destination.otherDetails,
      ) ?? null;

    if (maskedIdentifier) {
      summaryParts.push(maskedIdentifier);
    }

    return {
      payoutDestinationType: methodType,
      payoutDestinationSummaryMasked: summaryParts.join(' â€¢ ') || null,
    };
  }

  async getBalance(input: {
    practitionerId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }): Promise<PractitionerPayoutBalanceViewModel> {
    const currencyCode = input.currencyCode.trim().toUpperCase();
    const db = this.getDb(input.tx);

    const [
      practitioner,
      ledgerEntries,
      manualPayouts,
      packageSettlements,
      settlementPayouts,
      outstandingRecoveryAmount,
    ] = await Promise.all([
      this.practitionerRepository.findById(input.practitionerId),
      db.ledgerEntry.findMany({
        where: {
          practitionerId: input.practitionerId,
          currencyCode,
          balanceBucket: 'AVAILABLE',
        },
        select: {
          amount: true,
          direction: true,
          referenceType: true,
          referenceId: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.manualPayoutRepository.listForBalance(
        input.practitionerId,
        currencyCode,
        input.tx,
      ),
      db.packageSettlement.findMany({
        where: {
          practitionerId: input.practitionerId,
          currencyCode,
        },
        select: {
          heldPractitionerAmount: true,
          releasedPractitionerAmount: true,
        },
      }),
      db.practitionerSettlementPayout.findMany({
        where: {
          practitionerId: input.practitionerId,
          currencyCode,
        },
        select: {
          effectiveAt: true,
        },
        orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.practitionerRecoveryService.getOutstandingAmount({
        practitionerId: input.practitionerId,
        currencyCode,
        tx: input.tx,
      }),
    ]);

    const zero = new Prisma.Decimal(0);

    const normalLedgerEntries = ledgerEntries.filter(
      (entry) =>
        entry.referenceType !== 'package-settlement-release' &&
        entry.referenceType !== 'practitioner-manual-payout',
    );
    const packageReleaseLedgerEntries = ledgerEntries.filter(
      (entry) => entry.referenceType === 'package-settlement-release',
    );

    const normalCredits = normalLedgerEntries.reduce((sum, entry) => {
      const signed =
        entry.direction === LedgerDirection.CREDIT
          ? entry.amount
          : entry.amount.negated();
      return sum.add(signed);
    }, zero);

    const packageReleasedCredits = packageReleaseLedgerEntries.reduce(
      (sum, entry) => {
        const signed =
          entry.direction === LedgerDirection.CREDIT
            ? entry.amount
            : entry.amount.negated();
        return sum.add(signed);
      },
      zero,
    );

    const normalPaid = manualPayouts.reduce(
      (sum, payout) => sum.add(payout.normalSessionAppliedAmount),
      zero,
    );

    const packageReleasedPaid = manualPayouts.reduce(
      (sum, payout) => sum.add(payout.packageReleasedAppliedAmount),
      zero,
    );

    const packageHeldAmount = packageSettlements.reduce((sum, item) => {
      const held = new Prisma.Decimal(item.heldPractitionerAmount ?? 0);
      const released = new Prisma.Decimal(item.releasedPractitionerAmount ?? 0);
      const remaining = held.sub(released);
      return sum.add(remaining.gt(0) ? remaining : zero);
    }, zero);

    const normalSessionPayableAmountRaw = normalCredits.sub(normalPaid);
    const packageReleasedPayableAmountRaw =
      packageReleasedCredits.sub(packageReleasedPaid);
    const grossNormalSessionPayableAmount = normalSessionPayableAmountRaw.gt(0)
      ? normalSessionPayableAmountRaw
      : zero;
    const grossPackageReleasedPayableAmount =
      packageReleasedPayableAmountRaw.gt(0)
        ? packageReleasedPayableAmountRaw
        : zero;
    const normalRecoveryApplied = outstandingRecoveryAmount.lt(
      grossNormalSessionPayableAmount,
    )
      ? outstandingRecoveryAmount
      : grossNormalSessionPayableAmount;
    const remainingRecoveryAfterNormal =
      outstandingRecoveryAmount.sub(normalRecoveryApplied);
    const packageRecoveryApplied = remainingRecoveryAfterNormal.gt(
      grossPackageReleasedPayableAmount,
    )
      ? grossPackageReleasedPayableAmount
      : remainingRecoveryAfterNormal.gt(0)
        ? remainingRecoveryAfterNormal
        : zero;
    const normalSessionPayableAmount = grossNormalSessionPayableAmount.sub(
      normalRecoveryApplied,
    );
    const packageReleasedPayableAmount = grossPackageReleasedPayableAmount.sub(
      packageRecoveryApplied,
    );
    const totalPayableAmount = normalSessionPayableAmount.add(
      packageReleasedPayableAmount,
    );
    const lastPayoutAt =
      manualPayouts.length > 0
        ? manualPayouts[manualPayouts.length - 1].paidAt
        : settlementPayouts.length > 0
          ? settlementPayouts[settlementPayouts.length - 1].effectiveAt
          : null;

    const practitionerName =
      practitioner?.user.displayName ?? practitioner?.publicSlug ?? null;
    const payoutDestinationSummary = this.buildPayoutDestinationSummary(
      practitioner?.payoutDestination,
    );

    return {
      practitionerId: input.practitionerId,
      practitionerName,
      currencyCode,
      payoutDestinationSnapshot: practitioner?.payoutDestination
        ? {
            methodType: practitioner.payoutDestination.methodType ?? null,
            accountHolderName:
              practitioner.payoutDestination.accountHolderName ?? null,
            bankName: practitioner.payoutDestination.bankName ?? null,
            bankAccountNumber:
              practitioner.payoutDestination.bankAccountNumber ?? null,
            iban: practitioner.payoutDestination.iban ?? null,
            walletProvider:
              practitioner.payoutDestination.walletProvider ?? null,
            walletIdentifier:
              practitioner.payoutDestination.walletIdentifier ?? null,
            otherDetails: practitioner.payoutDestination.otherDetails ?? null,
          }
        : null,
      normalSessionPayableAmount: normalSessionPayableAmount.toFixed(2),
      packageReleasedPayableAmount: packageReleasedPayableAmount.toFixed(2),
      packageHeldAmount: packageHeldAmount.toFixed(2),
      totalPayableAmount: totalPayableAmount.toFixed(2),
      manualRecoveryAmount: outstandingRecoveryAmount.toFixed(2),
      lastPayoutAt: lastPayoutAt?.toISOString() ?? null,
      ...payoutDestinationSummary,
    };
  }
}
