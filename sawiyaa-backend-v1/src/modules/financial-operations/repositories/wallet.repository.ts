import { Injectable } from '@nestjs/common';
import { PractitionerWallet, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

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

  upsertWallet(
    input: Prisma.PractitionerWalletUncheckedCreateInput & {
      availableBalance: Prisma.Decimal | string;
      pendingBalance: Prisma.Decimal | string;
      reservedBalance: Prisma.Decimal | string;
      lifetimeEarned: Prisma.Decimal | string;
      lifetimePaidOut: Prisma.Decimal | string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerWallet.upsert({
      where: {
        practitionerId_currencyCode: {
          practitionerId: input.practitionerId,
          currencyCode: input.currencyCode,
        },
      },
      create: input,
      update: {
        availableBalance: input.availableBalance,
        pendingBalance: input.pendingBalance,
        reservedBalance: input.reservedBalance,
        lifetimeEarned: input.lifetimeEarned,
        lifetimePaidOut: input.lifetimePaidOut,
        lastLedgerEntryAt: input.lastLedgerEntryAt,
      },
    });
  }
}
