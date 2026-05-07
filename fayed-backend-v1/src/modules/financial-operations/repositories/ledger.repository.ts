import { Injectable } from '@nestjs/common';
import { LedgerEntryType, Prisma, WalletBalanceBucket } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createManyLedgerEntries(
    data: Prisma.LedgerEntryUncheckedCreateInput[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).ledgerEntry.createMany({
      data,
    });
  }

  createLedgerEntry(
    data: Prisma.LedgerEntryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).ledgerEntry.create({
      data,
    });
  }

  findByPaymentId(paymentId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { paymentId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findByRefundId(refundId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        referenceType: 'refund',
        referenceId: refundId,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findByReference(input: {
    referenceType: string;
    referenceId: string;
    paymentId?: string | null;
    sessionId?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).ledgerEntry.findMany({
      where: {
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        paymentId: input.paymentId ?? undefined,
        sessionId: input.sessionId ?? undefined,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findLegacyPackageEarningEntriesBySessionIds(input: {
    sessionIds: string[];
    tx?: Prisma.TransactionClient;
  }) {
    if (input.sessionIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(input.tx).ledgerEntry.findMany({
      where: {
        sessionId: {
          in: input.sessionIds,
        },
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: 'CREDIT',
        balanceBucket: WalletBalanceBucket.AVAILABLE,
      },
      select: {
        id: true,
        sessionId: true,
        paymentId: true,
        referenceType: true,
        referenceId: true,
        amount: true,
        currencyCode: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  listPractitionerLedgerEntries(input: {
    practitionerId: string;
    entryType?: LedgerEntryType;
    balanceBucket?: WalletBalanceBucket;
    currencyCode?: string;
    referenceType?: string;
    paymentId?: string;
    settlementId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.LedgerEntryWhereInput = {
      practitionerId: input.practitionerId,
      entryType: input.entryType,
      balanceBucket: input.balanceBucket,
      currencyCode: input.currencyCode,
      referenceType: input.referenceType,
      paymentId: input.paymentId,
      settlementId: input.settlementId,
      ...(input.effectiveFrom || input.effectiveTo
        ? {
            effectiveAt: {
              ...(input.effectiveFrom ? { gte: input.effectiveFrom } : {}),
              ...(input.effectiveTo ? { lte: input.effectiveTo } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [
          { effectiveAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
  }

  listPractitionerStatementLedgerEntries(input: {
    practitionerId: string;
    currencyCode?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        practitionerId: input.practitionerId,
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: 'CREDIT',
        currencyCode: input.currencyCode,
        ...(input.effectiveFrom || input.effectiveTo
          ? {
              effectiveAt: {
                ...(input.effectiveFrom ? { gte: input.effectiveFrom } : {}),
                ...(input.effectiveTo ? { lte: input.effectiveTo } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  aggregatePractitionerBalances(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).ledgerEntry.groupBy({
      by: ['currencyCode', 'balanceBucket', 'direction', 'entryType'],
      where: {
        practitionerId,
      },
      _sum: {
        amount: true,
      },
      _max: {
        effectiveAt: true,
      },
    });
  }

  listEligibleLedgerEntriesForSettlement(input: {
    currencyCode: string;
    effectiveAtLte: Date;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).ledgerEntry.findMany({
      where: {
        practitionerId: {
          not: null,
        },
        currencyCode: input.currencyCode,
        settlementId: null,
        balanceBucket: WalletBalanceBucket.AVAILABLE,
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: 'CREDIT',
        effectiveAt: {
          lte: input.effectiveAtLte,
        },
      },
      orderBy: [
        { practitionerId: 'asc' },
        { effectiveAt: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  assignEntriesToSettlement(
    ledgerEntryIds: string[],
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).ledgerEntry.updateMany({
      where: {
        id: {
          in: ledgerEntryIds,
        },
      },
      data: {
        settlementId,
        balanceBucket: WalletBalanceBucket.RESERVED,
      },
    });
  }

  releaseSettlementEntries(
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).ledgerEntry.updateMany({
      where: {
        settlementId,
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: 'CREDIT',
      },
      data: {
        settlementId: null,
        balanceBucket: WalletBalanceBucket.AVAILABLE,
      },
    });
  }
}
