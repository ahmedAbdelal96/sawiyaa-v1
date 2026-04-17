import { Injectable } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { MoneyAmountService } from './money-amount.service';

/**
 * Wallet remains a projection. Every refresh is rebuilt from ledger aggregates
 * so the balance view can never silently drift away from the ledger source.
 */
@Injectable()
export class RefreshPractitionerWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly walletRepository: WalletRepository,
    private readonly moneyAmountService: MoneyAmountService,
  ) {}

  async refresh(practitionerId: string, tx?: Prisma.TransactionClient) {
    const aggregates = await this.ledgerRepository.aggregatePractitionerBalances(practitionerId);
    const byCurrency = new Map<
      string,
      {
        available: Prisma.Decimal;
        pending: Prisma.Decimal;
        reserved: Prisma.Decimal;
        lifetimeEarned: Prisma.Decimal;
        lifetimePaidOut: Prisma.Decimal;
        lastLedgerEntryAt: Date | null;
      }
    >();

    for (const aggregate of aggregates) {
      const current =
        byCurrency.get(aggregate.currencyCode) ?? {
          available: new Prisma.Decimal(0),
          pending: new Prisma.Decimal(0),
          reserved: new Prisma.Decimal(0),
          lifetimeEarned: new Prisma.Decimal(0),
          lifetimePaidOut: new Prisma.Decimal(0),
          lastLedgerEntryAt: null,
        };

      const signed = this.moneyAmountService.signedAmount(
        aggregate.direction,
        aggregate._sum.amount ?? 0,
      );

      if (aggregate.balanceBucket === 'AVAILABLE') {
        current.available = current.available.add(signed);
      } else if (aggregate.balanceBucket === 'PENDING') {
        current.pending = current.pending.add(signed);
      } else if (aggregate.balanceBucket === 'RESERVED') {
        current.reserved = current.reserved.add(signed);
      }

      if (
        aggregate.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
        aggregate.direction === LedgerDirection.CREDIT
      ) {
        current.lifetimeEarned = current.lifetimeEarned.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate.entryType === LedgerEntryType.SETTLEMENT_PAYOUT &&
        aggregate.direction === LedgerDirection.DEBIT
      ) {
        current.lifetimePaidOut = current.lifetimePaidOut.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate._max.effectiveAt &&
        (!current.lastLedgerEntryAt ||
          aggregate._max.effectiveAt > current.lastLedgerEntryAt)
      ) {
        current.lastLedgerEntryAt = aggregate._max.effectiveAt;
      }

      byCurrency.set(aggregate.currencyCode, current);
    }

    return Promise.all(
      Array.from(byCurrency.entries()).map(([currencyCode, value]) =>
        this.walletRepository.upsertWallet(
          {
            practitionerId,
            currencyCode,
            availableBalance: value.available.toFixed(2),
            pendingBalance: value.pending.toFixed(2),
            reservedBalance: value.reserved.toFixed(2),
            lifetimeEarned: value.lifetimeEarned.toFixed(2),
            lifetimePaidOut: value.lifetimePaidOut.toFixed(2),
            lastLedgerEntryAt: value.lastLedgerEntryAt,
          },
          tx,
        ),
      ),
    );
  }
}
