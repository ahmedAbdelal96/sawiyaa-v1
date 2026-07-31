import { Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  LedgerDirection,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type LedgerLineListInput = {
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
  ledgerAccountId?: string;
  sourceType?: JournalEntrySourceType;
  practitionerId?: string;
  currencyCode?: string;
  journalEntryId?: string;
  query?: string;
};

@Injectable()
export class AccountingReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  listLedgerAccountOptions(currencyCode?: string) {
    return this.prisma.ledgerAccount.findMany({
      where: {
        isActive: true,
        currencyCode: currencyCode || undefined,
      },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        scope: true,
        currencyCode: true,
        practitionerId: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async listLedgerLines(input: LedgerLineListInput) {
    const normalizedQuery = input.query?.trim() ?? '';
    const queryIsUuid = this.isUuid(normalizedQuery);
    const matchingSessions = normalizedQuery
      ? await this.prisma.session.findMany({
          where: { sessionCode: { startsWith: normalizedQuery, mode: 'insensitive' } },
          select: { id: true },
        })
      : [];
    const matchingSessionIds = matchingSessions.map((session) => session.id);
    const sessionSourceMatches = normalizedQuery
      ? await Promise.all([
          this.prisma.payment.findMany({
            where: {
              session: {
                sessionCode: { startsWith: normalizedQuery, mode: 'insensitive' },
              },
            },
            select: { id: true },
          }),
          this.prisma.refund.findMany({
            where: {
              session: {
                sessionCode: { startsWith: normalizedQuery, mode: 'insensitive' },
              },
            },
            select: { id: true },
          }),
          this.prisma.practitionerSettlementPayout.findMany({
            where: {
              settlement: { sourceReview: { sessionId: { in: matchingSessionIds } } },
            },
            select: { id: true },
          }),
        ])
      : [[], [], []];
    const [paymentSessionMatches, refundSessionMatches, payoutSessionMatches] =
      sessionSourceMatches;

    const where: Prisma.JournalLineWhereInput = {
      ledgerAccountId: input.ledgerAccountId,
      journalEntryId: input.journalEntryId,
      ledgerAccount: {
        practitionerId: input.practitionerId,
      },
      journalEntry: {
        sourceType: input.sourceType,
        currencyCode: input.currencyCode,
        ...(input.from || input.to
          ? {
              occurredAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      ...(normalizedQuery
        ? {
            OR: [
              ...(queryIsUuid ? [{ id: normalizedQuery }] : []),
              ...(queryIsUuid ? [{ journalEntryId: normalizedQuery }] : []),
              ...(paymentSessionMatches.length > 0
                ? [{
                    journalEntry: {
                      sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
                      sourceId: { in: paymentSessionMatches.map((item) => item.id) },
                    },
                  }]
                : []),
              ...(refundSessionMatches.length > 0
                ? [{
                    journalEntry: {
                      sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
                      sourceId: { in: refundSessionMatches.map((item) => item.id) },
                    },
                  }]
                : []),
              ...(payoutSessionMatches.length > 0
                ? [{
                    journalEntry: {
                      sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
                      sourceId: { in: payoutSessionMatches.map((item) => item.id) },
                    },
                  }]
                : []),
              {
                referenceId: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                referenceType: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                memo: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                ledgerAccount: {
                  code: {
                    contains: normalizedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                ledgerAccount: {
                  name: {
                    contains: normalizedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                journalEntry: {
                  sourceId: {
                    contains: normalizedQuery,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;

    const [lines, totalItems] = await this.prisma.$transaction([
      this.prisma.journalLine.findMany({
        where,
        include: {
          journalEntry: true,
          ledgerAccount: true,
        },
        orderBy: [
          { journalEntry: { occurredAt: 'desc' } },
          { journalEntry: { createdAt: 'desc' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        skip,
        take: input.limit,
      }),
      this.prisma.journalLine.count({ where }),
    ]);

    return [
      await this.attachSessionReferences(lines),
      totalItems,
    ] as const;
  }

  async getJournalEntryWithLines(journalEntryId: string) {
    const journal = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        lines: {
          include: {
            journalEntry: true,
            ledgerAccount: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!journal) {
      return null;
    }

    return {
      ...journal,
      lines: await this.attachSessionReferences(journal.lines),
    };
  }

  private async attachSessionReferences<
    T extends { journalEntry: { sourceType: JournalEntrySourceType; sourceId: string } },
  >(rows: T[]) {
    const paymentIds = rows
      .filter((row) => row.journalEntry.sourceType === JournalEntrySourceType.PAYMENT_CAPTURED)
      .map((row) => row.journalEntry.sourceId);
    const refundIds = rows
      .filter((row) => row.journalEntry.sourceType === JournalEntrySourceType.REFUND_SUCCEEDED)
      .map((row) => row.journalEntry.sourceId);
    const payoutIds = rows
      .filter((row) => row.journalEntry.sourceType === JournalEntrySourceType.PRACTITIONER_PAYOUT)
      .map((row) => row.journalEntry.sourceId);

    const [payments, refunds, payouts] = await Promise.all([
      this.prisma.payment.findMany({
        where: { id: { in: paymentIds } },
        select: { id: true, session: { select: { id: true, sessionCode: true } } },
      }),
      this.prisma.refund.findMany({
        where: { id: { in: refundIds } },
        select: { id: true, session: { select: { id: true, sessionCode: true } } },
      }),
      this.prisma.practitionerSettlementPayout.findMany({
        where: { id: { in: payoutIds } },
        select: {
          id: true,
          settlement: { select: { sourceReview: { select: { sessionId: true } } } },
        },
      }),
    ]);

    const sessionBySourceId = new Map<string, { id: string; sessionCode: string }>();
    payments.forEach((item) => {
      if (item.session) sessionBySourceId.set(item.id, item.session);
    });
    refunds.forEach((item) => {
      if (item.session) sessionBySourceId.set(item.id, item.session);
    });
    const payoutSessionIds = payouts
      .map((item) => item.settlement.sourceReview?.sessionId)
      .filter((id): id is string => Boolean(id));
    const payoutSessions = payoutSessionIds.length === 0
      ? []
      : await this.prisma.session.findMany({
          where: { id: { in: payoutSessionIds } },
          select: { id: true, sessionCode: true },
        });
    const payoutSessionById = new Map(payoutSessions.map((session) => [session.id, session]));
    payouts.forEach((item) => {
      const sessionId = item.settlement.sourceReview?.sessionId;
      const session = sessionId ? payoutSessionById.get(sessionId) : undefined;
      if (session) sessionBySourceId.set(item.id, session);
    });

    return rows.map((row) => {
      const session = sessionBySourceId.get(row.journalEntry.sourceId) ?? null;
      return {
        ...row,
        sessionId: session?.id ?? null,
        sessionCode: session?.sessionCode ?? null,
      };
    });
  }

  listJournalEntriesInRange(input: {
    from: Date;
    to: Date;
    currencyCode?: string;
    recentLimit: number;
  }) {
    return this.prisma.journalEntry.findMany({
      where: {
        occurredAt: {
          gte: input.from,
          lte: input.to,
        },
        currencyCode: input.currencyCode,
      },
      include: {
        lines: {
          include: {
            ledgerAccount: {
              select: {
                code: true,
                scope: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.max(input.recentLimit, 50),
    });
  }

  listRecentJournalEntries(input: { currencyCode?: string; take: number }) {
    return this.prisma.journalEntry.findMany({
      where: {
        currencyCode: input.currencyCode,
      },
      include: {
        lines: {
          include: {
            ledgerAccount: {
              select: {
                code: true,
                scope: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: input.take,
    });
  }

  listJournalEntriesBySource(input: {
    sourceType: JournalEntrySourceType;
    sourceIds: string[];
  }) {
    if (input.sourceIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.journalEntry.findMany({
      where: {
        sourceType: input.sourceType,
        sourceId: {
          in: input.sourceIds,
        },
      },
      select: {
        id: true,
        sourceId: true,
      },
    });
  }

  listPractitionerLiabilityLinesUntil(input: {
    to: Date;
    currencyCode?: string;
  }) {
    return this.prisma.journalLine.findMany({
      where: {
        ledgerAccount: {
          scope: 'PRACTITIONER',
          accountType: 'LIABILITY',
          currencyCode: input.currencyCode,
        },
        journalEntry: {
          occurredAt: {
            lte: input.to,
          },
          currencyCode: input.currencyCode,
        },
      },
      select: {
        direction: true,
        amount: true,
      },
    });
  }

  private isUuid(value: string) {
    if (!value) {
      return false;
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    );
  }

  parseAmount(value: unknown) {
    if (typeof value === 'number') {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    return new Prisma.Decimal(0);
  }

  sumDirection(
    lines: Array<{ direction: LedgerDirection; amount: Prisma.Decimal }>,
    direction: LedgerDirection,
  ) {
    return lines
      .filter((line) => line.direction === direction)
      .reduce((sum, line) => sum.add(line.amount), new Prisma.Decimal(0));
  }
}
