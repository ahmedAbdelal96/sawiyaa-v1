import { Injectable } from '@nestjs/common';
import { Prisma, SettlementPayoutMethod } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerManualPayoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: Prisma.PractitionerManualPayoutUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerManualPayout.create({
      data,
      include: this.include,
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerManualPayout.findUnique({
      where: { id },
      include: this.include,
    });
  }

  findByTransferReference(
    transferReference: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerManualPayout.findUnique({
      where: { transferReference },
      include: this.include,
    });
  }

  listPayouts(input: {
    practitionerId?: string;
    currencyCode?: string;
    payoutMethod?: SettlementPayoutMethod;
    createdFrom?: Date;
    createdTo?: Date;
    skip: number;
    take: number;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerManualPayoutWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      payoutMethod: input.payoutMethod,
      ...(input.createdFrom || input.createdTo
        ? {
            paidAt: {
              ...(input.createdFrom ? { gte: input.createdFrom } : {}),
              ...(input.createdTo ? { lte: input.createdTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      db.practitionerManualPayout.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.include,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      }),
      db.practitionerManualPayout.count({ where }),
    ]);
  }

  summarizePayouts(input: {
    practitionerId?: string;
    currencyCode?: string;
    payoutMethod?: SettlementPayoutMethod;
    createdFrom?: Date;
    createdTo?: Date;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerManualPayoutWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      payoutMethod: input.payoutMethod,
      ...(input.createdFrom || input.createdTo
        ? {
            paidAt: {
              ...(input.createdFrom ? { gte: input.createdFrom } : {}),
              ...(input.createdTo ? { lte: input.createdTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      db.practitionerManualPayout.count({ where }),
      db.practitionerManualPayout.aggregate({
        where: { ...where, currencyCode: 'EGP' },
        _sum: { amountPaid: true },
      }),
      db.practitionerManualPayout.aggregate({
        where: { ...where, currencyCode: 'USD' },
        _sum: { amountPaid: true },
      }),
    ]).then(([payoutCount, egpAgg, usdAgg]) => ({
      payoutCount,
      egpAmountPaid: (egpAgg._sum.amountPaid ?? new Prisma.Decimal(0)).toFixed(2),
      usdAmountPaid: (usdAgg._sum.amountPaid ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  listForBalance(
    practitionerId: string,
    currencyCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerManualPayout.findMany({
      where: {
        practitionerId,
        currencyCode,
      },
      select: {
        amountPaid: true,
        normalSessionAppliedAmount: true,
        packageReleasedAppliedAmount: true,
        paidAt: true,
      },
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findLatestPaidAt(
    practitionerId: string,
    currencyCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerManualPayout.findFirst({
      where: {
        practitionerId,
        currencyCode,
      },
      select: {
        paidAt: true,
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  private readonly include = {
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
    recordedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
  } satisfies Prisma.PractitionerManualPayoutInclude;
}
