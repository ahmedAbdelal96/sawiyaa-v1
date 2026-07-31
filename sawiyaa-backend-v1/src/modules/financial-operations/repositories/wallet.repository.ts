import { Injectable } from '@nestjs/common';
import { PractitionerWallet, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import {
  assertWalletCurrencyMatches,
  normalizeFinancialCurrency,
} from '../utils/wallet-currency-invariant';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPractitionerId(practitionerId: string) {
    return this.prisma.practitionerWallet.findMany({
      where: {
        practitionerId,
      },
      orderBy: [{ currencyCode: 'asc' }],
    });
  }

  listByPractitionerIds(input: {
    practitionerIds: string[];
    currencyCode?: string;
  }): Promise<PractitionerWallet[]> {
    if (input.practitionerIds.length === 0) {
      return Promise.resolve([] as PractitionerWallet[]);
    }

    return this.prisma.practitionerWallet.findMany({
      where: {
        practitionerId: { in: input.practitionerIds },
        ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
      },
      orderBy: [{ practitionerId: 'asc' }, { currencyCode: 'asc' }],
    });
  }

  async upsertWallet(
    input: Prisma.PractitionerWalletUncheckedCreateInput & {
      availableBalance: Prisma.Decimal | string;
      pendingBalance: Prisma.Decimal | string;
      reservedBalance: Prisma.Decimal | string;
      lifetimeEarned: Prisma.Decimal | string;
      lifetimePaidOut: Prisma.Decimal | string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    const normalizedCurrencyCode = normalizeFinancialCurrency(input.currencyCode);
    if (!normalizedCurrencyCode) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.practitionerWalletCurrencyUnresolved',
        error: 'PRACTITIONER_WALLET_CURRENCY_UNRESOLVED',
      });
    }
    const normalizedInput = { ...input, currencyCode: normalizedCurrencyCode };
    if (normalizedInput.status === 'ACTIVE') {
      const active = await db.practitionerWallet.findFirst({
        where: { practitionerId: normalizedInput.practitionerId, status: 'ACTIVE' },
        select: { id: true, currencyCode: true },
      });
      if (active && active.id !== normalizedInput.id) {
        assertWalletCurrencyMatches({
          operation: 'WALLET_CREDIT',
          walletCurrency: active.currencyCode,
          attemptedCurrency: normalizedCurrencyCode,
        });
      }
    }
    const existing = await db.practitionerWallet.findUnique({
      where: {
        practitionerId_currencyCode: {
          practitionerId: normalizedInput.practitionerId,
          currencyCode: normalizedCurrencyCode,
        },
      },
      select: {
        status: true,
        availableBalance: true,
        pendingBalance: true,
        reservedBalance: true,
      },
    });
    if (
      normalizedInput.status === 'CLOSED' &&
      existing?.status === 'ACTIVE' &&
      (!new Prisma.Decimal(existing.availableBalance).eq(0) ||
        !new Prisma.Decimal(existing.pendingBalance).eq(0) ||
        !new Prisma.Decimal(existing.reservedBalance).eq(0))
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.walletCurrencyChangeRequiresSettlement',
        error: 'FINANCIAL_OPERATIONS_WALLET_CURRENCY_CHANGE_REQUIRES_SETTLEMENT',
      });
    }

    return db.practitionerWallet.upsert({
      where: {
        practitionerId_currencyCode: {
          practitionerId: normalizedInput.practitionerId,
          currencyCode: normalizedCurrencyCode,
        },
      },
      create: normalizedInput,
      update: {
        availableBalance: normalizedInput.availableBalance,
        pendingBalance: normalizedInput.pendingBalance,
        reservedBalance: normalizedInput.reservedBalance,
        lifetimeEarned: normalizedInput.lifetimeEarned,
        lifetimePaidOut: normalizedInput.lifetimePaidOut,
        lastLedgerEntryAt: normalizedInput.lastLedgerEntryAt,
        ...(normalizedInput.status
          ? {
              status: normalizedInput.status,
              closedAt: normalizedInput.status === 'CLOSED' ? new Date() : null,
            }
          : {}),
      },
    });
  }

  async ensureActiveWallet(
    practitionerId: string,
    currencyCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    const normalizedCurrencyCode = normalizeFinancialCurrency(currencyCode);
    if (!normalizedCurrencyCode) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.practitionerWalletCurrencyUnresolved',
        error: 'PRACTITIONER_WALLET_CURRENCY_UNRESOLVED',
      });
    }
    const active = await db.practitionerWallet.findFirst({
      where: { practitionerId, status: 'ACTIVE' },
    });

    if (active && active.currencyCode !== normalizedCurrencyCode) {
      if (
        !new Prisma.Decimal(active.availableBalance).eq(0) ||
        !new Prisma.Decimal(active.pendingBalance).eq(0) ||
        !new Prisma.Decimal(active.reservedBalance).eq(0)
      ) {
        throw new BadRequestException({
          messageKey: 'financialOperations.errors.walletCurrencyChangeRequiresSettlement',
          error: 'FINANCIAL_OPERATIONS_WALLET_CURRENCY_CHANGE_REQUIRES_SETTLEMENT',
        });
      }

      await db.practitionerWallet.update({
        where: { id: active.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
    }

    return db.practitionerWallet.upsert({
      where: {
        practitionerId_currencyCode: { practitionerId, currencyCode: normalizedCurrencyCode },
      },
      create: { practitionerId, currencyCode: normalizedCurrencyCode, status: 'ACTIVE' },
      update: { status: 'ACTIVE', closedAt: null },
    });
  }
}
