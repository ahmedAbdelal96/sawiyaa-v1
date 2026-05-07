import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PackagePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listAll(tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packagePlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { sessionCount: 'asc' }],
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  listActive(tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packagePlan.findMany({
      where: {
        isActive: true,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { sessionCount: 'asc' }],
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  findByCode(code: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packagePlan.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  findActiveByCode(code: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).packagePlan.findFirst({
      where: {
        code,
        isActive: true,
        archivedAt: null,
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  updateByCode(
    code: string,
    data: Prisma.PackagePlanUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).packagePlan.update({
      where: { code },
      data,
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }
}
