import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PractitionerWalletStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { MoneyAmountService } from './money-amount.service';
import { assertWalletCurrencyMatches } from '../utils/wallet-currency-invariant';

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
    const aggregates =
      await this.ledgerRepository.aggregatePractitionerBalances(
        practitionerId,
        tx,
      );
    const db = tx ?? this.prisma;
    const activeWallet = await db.practitionerWallet.findFirst({
      where: { practitionerId, status: PractitionerWalletStatus.ACTIVE },
      select: { id: true, currencyCode: true },
    });
    if (!activeWallet) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.practitionerWalletNotFound',
        error: 'PRACTITIONER_WALLET_NOT_FOUND',
      });
    }
    const activeCurrencyCode = activeWallet.currencyCode.trim().toUpperCase();
    const value = {
      available: new Prisma.Decimal(0),
      pending: new Prisma.Decimal(0),
      reserved: new Prisma.Decimal(0),
      lifetimeEarned: new Prisma.Decimal(0),
      lifetimePaidOut: new Prisma.Decimal(0),
      lastLedgerEntryAt: null as Date | null,
    };

    for (const aggregate of aggregates) {
      assertWalletCurrencyMatches({
        operation: 'WALLET_CREDIT',
        walletCurrency: activeCurrencyCode,
        attemptedCurrency: aggregate.currencyCode,
      });

      const signed = this.moneyAmountService.signedAmount(
        aggregate.direction,
        aggregate._sum.amount ?? 0,
      );

      if (aggregate.balanceBucket === 'AVAILABLE') {
        value.available = value.available.add(signed);
      } else if (aggregate.balanceBucket === 'PENDING') {
        value.pending = value.pending.add(signed);
      } else if (aggregate.balanceBucket === 'RESERVED') {
        value.reserved = value.reserved.add(signed);
      }

      if (
        aggregate.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
        aggregate.direction === LedgerDirection.CREDIT
      ) {
        value.lifetimeEarned = value.lifetimeEarned.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate.entryType === LedgerEntryType.SETTLEMENT_PAYOUT &&
        aggregate.direction === LedgerDirection.DEBIT
      ) {
        value.lifetimePaidOut = value.lifetimePaidOut.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate._max.effectiveAt &&
        (!value.lastLedgerEntryAt ||
          aggregate._max.effectiveAt > value.lastLedgerEntryAt)
      ) {
        value.lastLedgerEntryAt = aggregate._max.effectiveAt;
      }
    }

    return this.walletRepository.upsertWallet(
      {
        practitionerId,
        currencyCode: activeCurrencyCode,
        availableBalance: value.available.toFixed(2),
        pendingBalance: value.pending.toFixed(2),
        reservedBalance: value.reserved.toFixed(2),
        lifetimeEarned: value.lifetimeEarned.toFixed(2),
        lifetimePaidOut: value.lifetimePaidOut.toFixed(2),
        lastLedgerEntryAt: value.lastLedgerEntryAt,
        status: PractitionerWalletStatus.ACTIVE,
      },
      tx,
    );
  }
}
