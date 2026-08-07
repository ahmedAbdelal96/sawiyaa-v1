import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PractitionerSettlementStatus,
  Prisma,
  SettlementBatchStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { sessionCodeSearchFilter } from '../../sessions/utils/session-code-search.util';

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
    const db = this.getDb(tx);
    return db.practitionerSettlement.findUnique({
      where: { id: settlementId },
      select: { status: true },
    }).then((current) => {
      const immutableFields = [
        'amountGross',
        'amountAdjustments',
        'amountNet',
        'currencyCode',
        'originalAmount',
        'originalCurrencyCode',
        'walletCurrencyCode',
        'exchangeRate',
        'convertedAmount',
        'finalWalletCredit',
      ];
      const attemptsToMutateApprovedAmount = immutableFields.some((field) =>
        Object.prototype.hasOwnProperty.call(data, field),
      );
      if (
        current &&
        attemptsToMutateApprovedAmount &&
        ['APPROVED', 'CREDITED', 'PAID_OUT'].includes(current.status)
      ) {
        throw new BadRequestException({
          messageKey: 'financialOperations.errors.approvedSettlementImmutable',
          error: 'FINANCIAL_OPERATIONS_APPROVED_SETTLEMENT_IMMUTABLE',
        });
      }

      return db.practitionerSettlement.update({
        where: { id: settlementId },
        data,
        include: this.settlementInclude,
      });
    });
  }

  listAdminSettlementWorkflow(input: {
    status?: PractitionerSettlementStatus;
    query?: string;
    practitionerId?: string;
    currencyCode?: string;
    countryCode?: string;
    createdFrom?: Date;
    createdTo?: Date;
    sortBy?: 'createdAt' | 'amount' | 'practitionerName';
    sortDirection?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const search = input.query?.trim();
    const searchParts = search ? search.split(/\s+/).filter(Boolean) : [];
    const settlementId = search && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search) ? search : undefined;
    const matchingPractitionersPromise = search
      ? this.prisma.practitionerProfile.findMany({
          where: {
            OR: [
              { publicSlug: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { user: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              ...(searchParts.length > 1
                ? [{ user: { displayName: { contains: searchParts[0], mode: Prisma.QueryMode.insensitive } } }]
                : []),
            ],
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>);
    const matchingPatientsPromise = search
      ? this.prisma.patientProfile.findMany({
          where: { displayName: { contains: search, mode: 'insensitive' } },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>);
    const matchingSessionsPromise = search
      ? this.prisma.session.findMany({
          where: {
            OR: [
              { sessionCode: sessionCodeSearchFilter(search) },
              { patient: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            ],
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>);

    const where: Prisma.PractitionerSettlementWhereInput = {
      status: input.status,
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      ...(input.countryCode
        ? { practitioner: { country: { isoCode: input.countryCode } } }
        : {}),
      ...(input.createdFrom || input.createdTo
        ? { createdAt: { ...(input.createdFrom ? { gte: input.createdFrom } : {}), ...(input.createdTo ? { lte: input.createdTo } : {}) } }
        : {}),
    };
    const include = this.adminSettlementInclude;
    return Promise.all([matchingPractitionersPromise, matchingPatientsPromise, matchingSessionsPromise]).then(([practitioners, patients, sessions]) => {
      if (search) {
        const practitionerIds = practitioners.map((row) => row.id);
        const patientIds = patients.map((row) => row.id);
        const sessionIds = sessions.map((row) => row.id);
        where.OR = [
          ...(settlementId ? [{ id: settlementId }] : []),
          ...(practitionerIds.length ? [{ practitionerId: { in: practitionerIds } }] : []),
          ...(patientIds.length ? [{ sourceReview: { is: { patientId: { in: patientIds } } } }] : []),
          ...(sessionIds.length ? [{ sourceReview: { is: { sessionId: { in: sessionIds } } } }] : []),
        ];
      }
      const direction = input.sortDirection ?? 'desc';
      const orderBy: Prisma.PractitionerSettlementOrderByWithRelationInput[] =
        input.sortBy === 'amount'
          ? [{ finalWalletCredit: direction }, { id: 'asc' }]
          : input.sortBy === 'practitionerName'
            ? [{ practitioner: { user: { displayName: direction } } }, { id: 'asc' }]
            : [{ createdAt: direction }, { id: 'asc' }];
      return Promise.all([
      this.prisma.practitionerSettlement.findMany({
        where, skip: input.skip, take: input.take, include, orderBy,
      }),
      this.prisma.practitionerSettlement.count({ where }),
      ]);
    });
  }

  findAdminSettlementWorkflowById(id: string) {
    return this.prisma.practitionerSettlement.findUnique({
      where: { id }, include: this.adminSettlementInclude,
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
    sourceReview: { select: { sessionId: true } },
  } satisfies Prisma.PractitionerSettlementInclude;

  private readonly adminSettlementInclude = {
    batch: { select: { id: true, slug: true, periodYear: true, periodMonth: true, currencyCode: true, status: true } },
    practitioner: { select: { id: true, publicSlug: true, user: { select: { id: true, displayName: true } }, country: { select: { isoCode: true, name: true } }, wallets: { where: { status: 'ACTIVE' }, select: { id: true, status: true, currencyCode: true } } } },
    sourceReview: {
      select: {
        id: true, sessionId: true, patientId: true, paymentId: true, sourceType: true,
        reviewStatus: true, reviewDecision: true, paymentAmount: true, paymentCurrencyCode: true,
        suggestedPractitionerAmount: true, suggestedPlatformAmount: true, calculatedPractitionerAmount: true, accountantApprovedSourceAmount: true, accountingAdjustmentAmount: true, finalPractitionerAmount: true, finalCurrencyCode: true,
      },
    },
    adjustments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { createdByUser: { select: { id: true, displayName: true } } } },
    ledgerEntries: { where: { entryType: 'PRACTITIONER_EARNING' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    payoutRecords: {
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        amountPaid: true,
        currencyCode: true,
        sourceAmount: true,
        sourceCurrencyCode: true,
        payoutCurrencyCode: true,
        exchangeRateEgpPerUsd: true,
        calculatedPayoutAmount: true,
        actualPayoutAmount: true,
        differenceAmount: true,
        overrideReason: true,
        payoutMethod: true,
        externalPayoutRef: true,
        notes: true,
        actorUserId: true,
        actorType: true,
        effectiveAt: true,
        processedByUserId: true,
        actorUser: { select: { id: true, displayName: true } },
        createdAt: true,
      },
    },
    approvedByUser: { select: { id: true, displayName: true } },
    rejectedByUser: { select: { id: true, displayName: true } },
  } satisfies Prisma.PractitionerSettlementInclude;

  private readonly batchInclude = {
    settlements: {
      include: this.settlementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    },
  } satisfies Prisma.SettlementBatchInclude;
}
