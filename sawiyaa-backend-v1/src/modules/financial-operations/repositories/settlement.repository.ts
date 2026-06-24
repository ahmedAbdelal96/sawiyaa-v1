import { Injectable } from '@nestjs/common';
import {
  PractitionerSettlementStatus,
  Prisma,
  SettlementBatchStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findBatchByPeriod(
    periodYear: number,
    periodMonth: number,
    currencyCode: string,
  ) {
    return this.prisma.settlementBatch.findUnique({
      where: {
        periodYear_periodMonth_currencyCode: {
          periodYear,
          periodMonth,
          currencyCode,
        },
      },
      include: this.batchInclude,
    });
  }

  findPractitionerSettlementById(
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlement.findUnique({
      where: { id: settlementId },
      include: this.settlementInclude,
    });
  }

  createSettlementBatch(
    data: Prisma.SettlementBatchUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).settlementBatch.create({
      data,
      include: this.batchInclude,
    });
  }

  createPractitionerSettlement(
    data: Prisma.PractitionerSettlementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlement.create({
      data,
      include: this.settlementInclude,
    });
  }

  listSettlementBatches(
    input: {
      currencyCode?: string;
      status?: SettlementBatchStatus;
      periodYear?: number;
      periodMonth?: number;
      createdFrom?: Date;
      createdTo?: Date;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.SettlementBatchWhereInput = {
      currencyCode: input.currencyCode,
      status: input.status,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      ...(input.createdFrom || input.createdTo
        ? {
            createdAt: {
              ...(input.createdFrom ? { gte: input.createdFrom } : {}),
              ...(input.createdTo ? { lte: input.createdTo } : {}),
            },
          }
        : {}),
    };

    const db = this.getDb(tx);

    return Promise.all([
      db.settlementBatch.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.batchInclude,
        orderBy: [
          { periodYear: 'desc' },
          { periodMonth: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      db.settlementBatch.count({ where }),
    ]);
  }

  getSettlementBatchDetails(batchId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).settlementBatch.findUnique({
      where: { id: batchId },
      include: this.batchInclude,
    });
  }

  updateSettlementBatchStatus(
    batchId: string,
    data: Prisma.SettlementBatchUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).settlementBatch.update({
      where: { id: batchId },
      data,
      include: this.batchInclude,
    });
  }

  listPractitionerSettlements(
    input: {
      practitionerId: string;
      status?: PractitionerSettlementStatus;
      currencyCode?: string;
      createdFrom?: Date;
      createdTo?: Date;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.PractitionerSettlementWhereInput = {
      practitionerId: input.practitionerId,
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

    const db = this.getDb(tx);

    return Promise.all([
      db.practitionerSettlement.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.settlementInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      db.practitionerSettlement.count({ where }),
    ]);
  }

  listPractitionerDueSettlements(
    input: {
      practitionerId: string;
      currencyCode?: string;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.PractitionerSettlementWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      status: {
        in: ['READY', 'PROCESSING'],
      },
    };

    const db = this.getDb(tx);

    return Promise.all([
      db.practitionerSettlement.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.settlementInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      db.practitionerSettlement.count({ where }),
    ]);
  }

  aggregatePractitionerDueSummary(
    input: {
      practitionerId: string;
      currencyCode?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.PractitionerSettlementWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      status: {
        in: ['READY', 'PROCESSING'],
      },
    };

    return this.getDb(tx).practitionerSettlement.groupBy({
      by: ['currencyCode'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amountNet: true,
        amountPaidTotal: true,
      },
      _max: {
        createdAt: true,
      },
    });
  }

  aggregateDueSummaryByPractitionerIds(
    input: {
      practitionerIds: string[];
      currencyCode?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (input.practitionerIds.length === 0) {
      return Promise.resolve(
        [] as Array<{
          practitionerId: string;
          currencyCode: string;
          _count: { id: number };
          _sum: {
            amountNet: Prisma.Decimal | null;
            amountPaidTotal: Prisma.Decimal | null;
          };
          _max: { createdAt: Date | null };
        }>,
      );
    }

    const where: Prisma.PractitionerSettlementWhereInput = {
      practitionerId: { in: input.practitionerIds },
      ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
      status: {
        in: ['READY', 'PROCESSING'],
      },
    };

    return this.getDb(tx).practitionerSettlement.groupBy({
      by: ['practitionerId', 'currencyCode'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amountNet: true,
        amountPaidTotal: true,
      },
      _max: {
        createdAt: true,
      },
    });
  }

  findPractitionerDueSettlementById(
    practitionerId: string,
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlement.findFirst({
      where: {
        id: settlementId,
        practitionerId,
        status: {
          in: ['READY', 'PROCESSING'],
        },
      },
      include: this.settlementInclude,
    });
  }

  listBatchSettlements(batchId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerSettlement.findMany({
      where: { batchId },
      include: this.settlementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  updatePractitionerSettlement(
    settlementId: string,
    data: Prisma.PractitionerSettlementUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlement.update({
      where: { id: settlementId },
      data,
      include: this.settlementInclude,
    });
  }

  private readonly settlementInclude = {
    batch: {
      select: {
        id: true,
        slug: true,
        periodYear: true,
        periodMonth: true,
        currencyCode: true,
        status: true,
      },
    },
  } satisfies Prisma.PractitionerSettlementInclude;

  private readonly batchInclude = {
    settlements: {
      include: this.settlementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    },
  } satisfies Prisma.SettlementBatchInclude;
}
