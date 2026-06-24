import { Injectable } from '@nestjs/common';
import { CustomerWallet, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomerWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPatientIdAndCurrency(patientId: string, currencyCode: string) {
    return this.prisma.customerWallet.findUnique({
      where: {
        patientId_currencyCode: {
          patientId,
          currencyCode,
        },
      },
    });
  }

  findByPatientId(patientId: string): Promise<CustomerWallet[]> {
    return this.prisma.customerWallet.findMany({
      where: { patientId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  upsertWallet(
    input: {
      patientId: string;
      currencyCode: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWallet.upsert({
      where: {
        patientId_currencyCode: {
          patientId: input.patientId,
          currencyCode: input.currencyCode,
        },
      },
      create: {
        patientId: input.patientId,
        currencyCode: input.currencyCode,
      },
      update: {},
    });
  }

  reserveBalance(
    walletId: string,
    amount: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWallet.updateMany({
      where: {
        id: walletId,
        availableBalance: {
          gte: new Prisma.Decimal(amount),
        },
      },
      data: {
        availableBalance: {
          decrement: new Prisma.Decimal(amount),
        },
        reservedBalance: {
          increment: new Prisma.Decimal(amount),
        },
        lastEntryAt: new Date(),
      },
    });
  }

  captureReservedBalance(
    walletId: string,
    amount: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWallet.updateMany({
      where: {
        id: walletId,
        reservedBalance: {
          gte: new Prisma.Decimal(amount),
        },
      },
      data: {
        reservedBalance: {
          decrement: new Prisma.Decimal(amount),
        },
        lifetimeDebited: {
          increment: new Prisma.Decimal(amount),
        },
        lastEntryAt: new Date(),
      },
    });
  }

  releaseReservedBalance(
    walletId: string,
    amount: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWallet.updateMany({
      where: {
        id: walletId,
        reservedBalance: {
          gte: new Prisma.Decimal(amount),
        },
      },
      data: {
        reservedBalance: {
          decrement: new Prisma.Decimal(amount),
        },
        availableBalance: {
          increment: new Prisma.Decimal(amount),
        },
        lastEntryAt: new Date(),
      },
    });
  }

  creditAvailableBalance(
    walletId: string,
    amount: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWallet.update({
      where: { id: walletId },
      data: {
        availableBalance: {
          increment: new Prisma.Decimal(amount),
        },
        lifetimeCredited: {
          increment: new Prisma.Decimal(amount),
        },
        lastEntryAt: new Date(),
      },
    });
  }
}
