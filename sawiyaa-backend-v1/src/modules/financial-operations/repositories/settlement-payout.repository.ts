import { Injectable } from '@nestjs/common';
import {
  SettlementPayoutMethod,
  SettlementPayoutSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditActorType as AuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SettlementPayoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createSettlementPayout(
    data: Prisma.PractitionerSettlementPayoutUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (
      data.payoutSource === SettlementPayoutSource.MANUAL_EXCEPTION &&
      !data.processedByUserId
    ) {
      throw new Error('Manual payout requires an operator user');
    }
    return this.getDb(tx).practitionerSettlementPayout.create({
      data: {
        ...data,
        actorType: data.actorType ?? (data.processedByUserId
          ? AuditActorType.USER
          : data.payoutSource === SettlementPayoutSource.BATCH_CLOSEOUT
            ? AuditActorType.SCHEDULED_JOB
            : AuditActorType.SYSTEM),
        actorUserId: data.actorUserId ?? data.processedByUserId ?? null,
        source: data.source ?? (data.processedByUserId ? SecurityAuditSource.HTTP_REQUEST : SecurityAuditSource.SCHEDULED_JOB),
      },
      include: this.payoutInclude,
    });
  }

  listPractitionerSettlementPayouts(
    input: {
      practitionerId: string;
      payoutMethod?: SettlementPayoutMethod;
      payoutSource?: SettlementPayoutSource;
      currencyCode?: string;
      batchId?: string;
      settlementId?: string;
      createdFrom?: Date;
      createdTo?: Date;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.PractitionerSettlementPayoutWhereInput = {
      practitionerId: input.practitionerId,
      payoutMethod: input.payoutMethod,
      payoutSource: input.payoutSource,
      currencyCode: input.currencyCode,
      batchId: input.batchId,
      settlementId: input.settlementId,
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
      db.practitionerSettlementPayout.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.payoutInclude,
        orderBy: [
          { effectiveAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      db.practitionerSettlementPayout.count({ where }),
    ]);
  }

  listSettlementPayouts(
    input: {
      practitionerId?: string;
      payoutMethod?: SettlementPayoutMethod;
      payoutSource?: SettlementPayoutSource;
      currencyCode?: string;
      batchId?: string;
      settlementId?: string;
      createdFrom?: Date;
      createdTo?: Date;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.PractitionerSettlementPayoutWhereInput = {
      practitionerId: input.practitionerId,
      payoutMethod: input.payoutMethod,
      payoutSource: input.payoutSource,
      currencyCode: input.currencyCode,
      batchId: input.batchId,
      settlementId: input.settlementId,
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
      db.practitionerSettlementPayout.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.payoutInclude,
        orderBy: [
          { effectiveAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      db.practitionerSettlementPayout.count({ where }),
    ]);
  }

  listPractitionerStatementPayouts(input: {
    practitionerId: string;
    currencyCode?: string;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    return this.prisma.practitionerSettlementPayout.findMany({
      where: {
        practitionerId: input.practitionerId,
        currencyCode: input.currencyCode,
        ...(input.createdFrom || input.createdTo
          ? {
              effectiveAt: {
                ...(input.createdFrom ? { gte: input.createdFrom } : {}),
                ...(input.createdTo ? { lte: input.createdTo } : {}),
              },
            }
          : {}),
      },
      include: this.payoutInclude,
      orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findSettlementPayoutById(payoutId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerSettlementPayout.findUnique({
      where: { id: payoutId },
      include: this.payoutInclude,
    });
  }

  findSettlementPayoutBySettlementId(
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlementPayout.findFirst({
      where: { settlementId },
      include: this.payoutInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  findSettlementPayoutByExternalPayoutRef(
    externalPayoutRef: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlementPayout.findFirst({
      where: { externalPayoutRef },
      include: this.payoutInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  findSettlementPayoutByIdempotencyKey(
    idempotencyKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlementPayout.findFirst({
      where: {
        payoutMethodSnapshot: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
      include: this.payoutInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  findSettlementPayoutForPractitioner(
    practitionerId: string,
    payoutId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerSettlementPayout.findFirst({
      where: {
        id: payoutId,
        practitionerId,
      },
      include: this.payoutInclude,
    });
  }

  private readonly payoutInclude = {
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
    settlement: {
      select: {
        id: true,
        status: true,
        amountGross: true,
        amountAdjustments: true,
        amountNet: true,
        amountPaidTotal: true,
        currencyCode: true,
        practitionerId: true,
        paidAt: true,
        failedAt: true,
        notes: true,
        createdAt: true,
      },
    },
    processedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
    proof: {
      include: {
        payout: {
          select: {
            practitionerId: true,
          },
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
  } satisfies Prisma.PractitionerSettlementPayoutInclude;
}
