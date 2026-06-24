import { Injectable } from '@nestjs/common';
import { PackageSettlementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PackageSettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packageSettlement.findUnique({
      where: { id },
      include: this.include,
    });
  }

  findByPurchaseId(purchaseId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packageSettlement.findUnique({
      where: { purchaseId },
      include: this.include,
    });
  }

  create(
    data: Prisma.PackageSettlementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).packageSettlement.create({
      data,
      include: this.include,
    });
  }

  upsertByPurchaseId(
    purchaseId: string,
    create: Prisma.PackageSettlementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).packageSettlement.upsert({
      where: { purchaseId },
      create,
      update: {},
      include: this.include,
    });
  }

  updateById(
    id: string,
    data: Prisma.PackageSettlementUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).packageSettlement.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  listPackageSettlements(input: {
    status?: PackageSettlementStatus;
    currencyCode?: string;
    createdFrom?: Date;
    createdTo?: Date;
    skip: number;
    take: number;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PackageSettlementWhereInput = {
      status: input.status,
      currencyCode: input.currencyCode,
      ...(input.createdFrom || input.createdTo
        ? {
            createdAt: {
              ...(input.createdFrom ? { gte: input.createdFrom } : {}),
              ...(input.createdTo ? { lte: input.createdTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      db.packageSettlement.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: this.include,
      }),
      db.packageSettlement.count({ where }),
    ]);
  }

  private readonly include = {
    purchase: {
      select: {
        id: true,
        status: true,
        paymentId: true,
        planCodeSnapshot: true,
        titleSnapshot: true,
        packagePlan: {
          select: {
            code: true,
            title: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            currencyCode: true,
            amountTotal: true,
            capturedAt: true,
          },
        },
        sessions: {
          select: {
            id: true,
            status: true,
            packageSessionIndex: true,
            packageSessionCount: true,
          },
          orderBy: [{ packageSessionIndex: 'asc' }],
        },
      },
    },
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
    patient: {
      select: {
        id: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
  } satisfies Prisma.PackageSettlementInclude;
}
