import { BadRequestException, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  LedgerClassificationActionType,
  LedgerDirection,
  LedgerEntryType,
  Prisma,
  SecurityAuditActorType,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  assertWalletCurrencyMatches,
  normalizeFinancialCurrency,
} from '../utils/wallet-currency-invariant';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LedgerRepository {
  private readonly logger = new Logger(LedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createManyLedgerEntries(
    data: Prisma.LedgerEntryUncheckedCreateInput[],
    tx?: Prisma.TransactionClient,
    skipDuplicates = false,
  ) {
    data.forEach((entry) => this.assertPractitionerEarningInvariant(entry));
    return Promise.all(data.map((entry) => this.assertWalletLedgerCurrency(entry, tx))).then(() =>
      this.getDb(tx).ledgerEntry.createMany({ data, skipDuplicates }),
    );
  }

  createLedgerEntry(
    data: Prisma.LedgerEntryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    this.assertPractitionerEarningInvariant(data);
    return this.assertWalletLedgerCurrency(data, tx).then(() =>
      this.getDb(tx).ledgerEntry.create({ data }),
    );
  }

  findByPaymentId(paymentId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).ledgerEntry.findMany({
      where: { paymentId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findByRefundId(refundId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).ledgerEntry.findMany({
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
        sessionEarningReviewId: null,
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

  findSessionReviewPractitionerEarningEntriesBySessionIds(input: {
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
        sessionEarningReviewId: {
          not: null,
        },
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: 'CREDIT',
        balanceBucket: WalletBalanceBucket.AVAILABLE,
      },
      select: {
        id: true,
        sessionId: true,
        sessionEarningReviewId: true,
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
        include: { session: { select: { sessionCode: true } } },
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
      include: { session: { select: { sessionCode: true } } },
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

  async assignEntriesToSettlement(
    ledgerEntryIds: string[],
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    void ledgerEntryIds;
    void settlementId;
    void tx;
    throw new BadRequestException({
      messageKey: 'financialOperations.errors.legacySettlementAssignmentDisabled',
      error: 'FINANCIAL_OPERATIONS_LEGACY_SETTLEMENT_ASSIGNMENT_DISABLED',
    });
  }

  releaseSettlementEntries(
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (db: Prisma.TransactionClient | PrismaService) => {
      const entries = await db.ledgerEntry.findMany({
        where: {
          settlementId,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: 'CREDIT',
        },
        select: { id: true, settlementId: true, balanceBucket: true },
      });
      const result = await db.ledgerEntry.updateMany({
        where: {
          settlementId,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: 'CREDIT',
        },
        data: {
          balanceBucket: WalletBalanceBucket.AVAILABLE,
        },
      });
      if (entries.length > 0) {
        await db.ledgerClassificationEvent.createMany({
          data: entries.map((entry) => ({
            ledgerEntryId: entry.id,
            previousSettlementId: entry.settlementId,
            newSettlementId: settlementId,
            previousBalanceBucket: entry.balanceBucket,
            newBalanceBucket: WalletBalanceBucket.AVAILABLE,
            actionType: LedgerClassificationActionType.RELEASED_FROM_SETTLEMENT,
            actorType: SecurityAuditActorType.SYSTEM,
            source: 'SYSTEM',
            reason: 'settlement-release',
          })),
        });
      }
      return result;
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  private assertPractitionerEarningInvariant(
    entry: Prisma.LedgerEntryUncheckedCreateInput,
  ) {
    if (
      entry.entryType !== LedgerEntryType.PRACTITIONER_EARNING ||
      entry.direction !== LedgerDirection.CREDIT
    ) {
      return;
    }

    if (!entry.settlementId || !entry.actorUserId || !entry.actorType) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.practitionerEarningRequiresSettlement',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_EARNING_REQUIRES_SETTLEMENT',
      });
    }

    if (entry.actorType !== SecurityAuditActorType.USER || !entry.effectiveAt) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.practitionerEarningRequiresAudit',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_EARNING_REQUIRES_AUDIT',
      });
    }
  }

  private async assertWalletLedgerCurrency(
    entry: Prisma.LedgerEntryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (!entry.practitionerId || !entry.settlementId) {
      return;
    }

    if (
      entry.entryType !== LedgerEntryType.PRACTITIONER_EARNING &&
      entry.entryType !== LedgerEntryType.SETTLEMENT_PAYOUT
    ) {
      return;
    }

    const db = this.getDb(tx);
    const settlement = await db.practitionerSettlement.findUnique({
      where: { id: entry.settlementId },
      select: {
        walletId: true,
        walletCurrencyCode: true,
        wallet: { select: { currencyCode: true } },
      },
    });
    const walletCurrency = normalizeFinancialCurrency(
      settlement?.wallet?.currencyCode ?? settlement?.walletCurrencyCode,
    );
    try {
      assertWalletCurrencyMatches({
        operation:
          entry.entryType === LedgerEntryType.PRACTITIONER_EARNING
            ? 'LEDGER_EARNING'
            : 'WALLET_DEBIT',
        walletCurrency,
        attemptedCurrency: entry.currencyCode,
      });
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'walletCurrencyIntegrityViolation',
          practitionerId: entry.practitionerId,
          walletId: settlement?.walletId ?? null,
          walletCurrency,
          attemptedCurrency: entry.currencyCode,
          settlementId: entry.settlementId,
          operation: entry.entryType,
        }),
      );
      throw error;
    }
  }
}
