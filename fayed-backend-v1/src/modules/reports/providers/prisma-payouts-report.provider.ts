import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerSettlementStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDailyBuckets } from '../utils/report-date.util';
import {
  PayoutsReportOverviewInput,
  PayoutsReportProvider,
  PayoutsReportRowsInput,
} from './payouts-report.provider';
import {
  PayoutsReportOverview,
  PayoutsReportRow,
} from '../types/payouts-report.types';

@Injectable()
export class PrismaPayoutsReportProvider implements PayoutsReportProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    input: PayoutsReportOverviewInput,
  ): Promise<PayoutsReportOverview> {
    const currencyCode = input.currencyCode?.trim().toUpperCase();

    const payoutWhere: Prisma.PractitionerSettlementPayoutWhereInput = {
      effectiveAt: { gte: input.from, lte: input.to },
      currencyCode: currencyCode || undefined,
      practitionerId: input.practitionerId,
    };

    const [
      paidAgg,
      payoutCount,
      transferFeeAgg,
      missingProofCount,
      dueSnapshot,
      trendRows,
    ] = await Promise.all([
      this.prisma.practitionerSettlementPayout.aggregate({
        where: payoutWhere,
        _sum: { amountPaid: true },
      }),
      this.prisma.practitionerSettlementPayout.count({ where: payoutWhere }),
      this.prisma.practitionerSettlementPayout.aggregate({
        where: payoutWhere,
        _sum: { transferFeeAmount: true },
      }),
      this.prisma.practitionerSettlementPayout.count({
        where: {
          ...payoutWhere,
          proof: { is: null },
        },
      }),
      this.dueOutstandingAsOf({
        to: input.to,
        currencyCode,
        practitionerId: input.practitionerId,
      }),
      this.payoutTrendRows(payoutWhere),
    ]);

    const dailyKeys = buildDailyBuckets(input.from, input.to);
    const trendMap = new Map(trendRows.map((row) => [row.dateKey, row]));
    const trend = dailyKeys.map((date) => {
      const row = trendMap.get(date);
      return {
        date,
        payoutAmount: row?.amountPaid?.toFixed(2) ?? '0.00',
        payoutCount: String(row?.count ?? 0),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      range: { from: input.from.toISOString(), to: input.to.toISOString() },
      currencyCode: currencyCode ?? null,
      practitionerId: input.practitionerId ?? null,
      totals: {
        paidAmountInRange: (
          paidAgg._sum.amountPaid ?? new Prisma.Decimal(0)
        ).toFixed(2),
        payoutCountInRange: String(payoutCount),
        transferFeesInRange: (
          transferFeeAgg._sum.transferFeeAmount ?? new Prisma.Decimal(0)
        ).toFixed(2),
        missingProofCountInRange: String(missingProofCount),
        dueOutstandingAsOfTo: dueSnapshot.dueAmount.toFixed(2),
        settlementsWithDueCount: String(dueSnapshot.settlementCount),
      },
      trend,
    };
  }

  async listRows(input: PayoutsReportRowsInput) {
    const currencyCode = input.currencyCode?.trim().toUpperCase();
    const where: Prisma.PractitionerSettlementPayoutWhereInput = {
      effectiveAt: { gte: input.from, lte: input.to },
      currencyCode: currencyCode || undefined,
      practitionerId: input.practitionerId,
    };

    const skip = (input.page - 1) * input.limit;
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.practitionerSettlementPayout.findMany({
        where,
        select: {
          id: true,
          settlementId: true,
          batchId: true,
          practitionerId: true,
          amountPaid: true,
          currencyCode: true,
          payoutMethod: true,
          payoutSource: true,
          transferFeeAmount: true,
          transferFeeTreatment: true,
          externalPayoutRef: true,
          effectiveAt: true,
          createdAt: true,
          processedByUserId: true,
          proof: { select: { id: true } },
          practitioner: {
            select: {
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: [
          { effectiveAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        skip,
        take: input.limit,
      }),
      this.prisma.practitionerSettlementPayout.count({ where }),
    ]);

    const items: PayoutsReportRow[] = rows.map((row) => ({
      payoutId: row.id,
      settlementId: row.settlementId,
      batchId: row.batchId,
      practitionerId: row.practitionerId,
      practitionerName: row.practitioner?.user?.displayName ?? null,
      amountPaid: row.amountPaid.toFixed(2),
      currencyCode: row.currencyCode,
      payoutMethod: row.payoutMethod,
      payoutSource: row.payoutSource,
      transferFeeAmount: row.transferFeeAmount?.toFixed(2) ?? null,
      transferFeeTreatment: row.transferFeeTreatment,
      externalPayoutRef: row.externalPayoutRef,
      effectiveAt: row.effectiveAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      processedByUserId: row.processedByUserId,
      proofUploaded: Boolean(row.proof?.id),
    }));

    return { items, totalItems };
  }

  private async dueOutstandingAsOf(input: {
    to: Date;
    currencyCode?: string;
    practitionerId?: string;
  }) {
    const activeStatuses: PractitionerSettlementStatus[] = [
      PractitionerSettlementStatus.READY,
      PractitionerSettlementStatus.PROCESSING,
      PractitionerSettlementStatus.FAILED,
      PractitionerSettlementStatus.DRAFT,
    ];

    const rows = await this.prisma.$queryRaw<
      Array<{ dueAmount: Prisma.Decimal | null; settlementCount: number }>
    >(Prisma.sql`
      select
        coalesce(sum(greatest("amountNet" - "amountPaidTotal", 0)), 0)::numeric(18,2) as "dueAmount",
        count(*)::int as "settlementCount"
      from "PractitionerSettlement"
      where "status"::text in (${Prisma.join(activeStatuses)})
        and "createdAt" <= ${input.to}
        ${input.currencyCode ? Prisma.sql`and "currencyCode" = ${input.currencyCode}` : Prisma.empty}
        ${input.practitionerId ? Prisma.sql`and "practitionerId" = ${input.practitionerId}` : Prisma.empty}
    `);

    const row = rows[0] ?? {
      dueAmount: new Prisma.Decimal(0),
      settlementCount: 0,
    };
    return {
      dueAmount: row.dueAmount
        ? new Prisma.Decimal(row.dueAmount)
        : new Prisma.Decimal(0),
      settlementCount: row.settlementCount ?? 0,
    };
  }

  private payoutTrendRows(
    where: Prisma.PractitionerSettlementPayoutWhereInput,
  ) {
    // Prisma can't group by day on DateTime, so we use a tiny date_trunc query here.
    const practitionerFilter =
      (where.practitionerId as string | undefined) ?? undefined;
    const currencyFilter =
      (where.currencyCode as string | undefined) ?? undefined;
    const from = (where.effectiveAt as any)?.gte as Date;
    const to = (where.effectiveAt as any)?.lte as Date;

    return this.prisma.$queryRaw<
      Array<{ dateKey: string; amountPaid: Prisma.Decimal; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "effectiveAt"), 'YYYY-MM-DD') as "dateKey",
        coalesce(sum("amountPaid"), 0)::numeric(18,2) as "amountPaid",
        count(*)::int as "count"
      from "PractitionerSettlementPayout"
      where "effectiveAt" >= ${from} and "effectiveAt" <= ${to}
        ${currencyFilter ? Prisma.sql`and "currencyCode" = ${currencyFilter}` : Prisma.empty}
        ${practitionerFilter ? Prisma.sql`and "practitionerId" = ${practitionerFilter}` : Prisma.empty}
      group by 1
      order by 1 asc
    `);
  }
}
