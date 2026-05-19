import { Injectable } from '@nestjs/common';
import { Prisma, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDailyBuckets } from '../utils/report-date.util';
import {
  SupportReportOverviewInput,
  SupportReportProvider,
  SupportReportRowsInput,
} from './support-report.provider';
import {
  SupportReportOverview,
  SupportReportRow,
} from '../types/support-report.types';

@Injectable()
export class PrismaSupportReportProvider implements SupportReportProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    input: SupportReportOverviewInput,
  ): Promise<SupportReportOverview> {
    const baseWhere: Prisma.SupportTicketWhereInput = {
      createdAt: { gte: input.from, lte: input.to },
    };

    const openStatuses: SupportTicketStatus[] = [
      SupportTicketStatus.OPEN,
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.WAITING_FOR_USER,
      SupportTicketStatus.ESCALATED,
    ];

    const overdueThreshold = new Date(
      input.to.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    const [
      totalTickets,
      statusGroups,
      overdueOpenTickets,
      avgCloseHours,
      trendCreated,
      trendResolved,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where: baseWhere }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: { in: openStatuses },
          createdAt: { lt: overdueThreshold },
        },
      }),
      this.avgCloseHoursInRange(input),
      this.createdTrend(input),
      this.resolvedTrend(input),
    ]);

    const statusBreakdown: Record<string, string> = {};
    let openTickets = 0;
    let resolvedTickets = 0;
    let closedTickets = 0;
    for (const row of statusGroups) {
      statusBreakdown[row.status] = String(row._count._all);
      if (openStatuses.includes(row.status)) openTickets += row._count._all;
      if (row.status === SupportTicketStatus.RESOLVED)
        resolvedTickets += row._count._all;
      if (row.status === SupportTicketStatus.CLOSED)
        closedTickets += row._count._all;
    }

    const dailyKeys = buildDailyBuckets(input.from, input.to);
    const createdMap = new Map(
      trendCreated.map((row) => [row.dateKey, row.count]),
    );
    const resolvedMap = new Map(
      trendResolved.map((row) => [row.dateKey, row.count]),
    );

    return {
      generatedAt: new Date().toISOString(),
      range: { from: input.from.toISOString(), to: input.to.toISOString() },
      totals: {
        totalTickets: String(totalTickets),
        openTickets: String(openTickets),
        resolvedTickets: String(resolvedTickets),
        closedTickets: String(closedTickets),
        overdueOpenTickets: String(overdueOpenTickets),
        avgCloseHours: avgCloseHours === null ? null : avgCloseHours.toFixed(2),
      },
      statusBreakdown,
      trend: dailyKeys.map((date) => ({
        date,
        created: String(createdMap.get(date) ?? 0),
        resolvedOrClosed: String(resolvedMap.get(date) ?? 0),
      })),
    };
  }

  async listRows(input: SupportReportRowsInput) {
    const where: Prisma.SupportTicketWhereInput = {
      createdAt: { gte: input.from, lte: input.to },
      status: input.status ?? undefined,
    };

    const skip = (input.page - 1) * input.limit;
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        select: {
          id: true,
          publicTicketRef: true,
          ticketType: true,
          status: true,
          priority: true,
          subject: true,
          createdAt: true,
          lastMessageAt: true,
          resolvedAt: true,
          closedAt: true,
          assignedToUserId: true,
          openedByUserId: true,
          patientId: true,
          practitionerId: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: input.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const items: SupportReportRow[] = rows.map((row) => ({
      id: row.id,
      publicTicketRef: row.publicTicketRef,
      ticketType: row.ticketType,
      status: row.status,
      priority: row.priority,
      subject: row.subject,
      createdAt: row.createdAt.toISOString(),
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      assignedToUserId: row.assignedToUserId,
      openedByUserId: row.openedByUserId,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
    }));

    return { items, totalItems };
  }

  private async avgCloseHoursInRange(input: SupportReportOverviewInput) {
    const rows = await this.prisma.$queryRaw<
      Array<{ avgHours: number | null }>
    >(Prisma.sql`
      select
        avg(extract(epoch from (coalesce("closedAt", "resolvedAt") - "createdAt")) / 3600.0) as "avgHours"
      from "SupportTicket"
      where coalesce("closedAt", "resolvedAt") is not null
        and coalesce("closedAt", "resolvedAt") >= ${input.from}
        and coalesce("closedAt", "resolvedAt") <= ${input.to}
    `);

    return rows[0]?.avgHours ?? null;
  }

  private createdTrend(input: SupportReportOverviewInput) {
    return this.prisma.$queryRaw<
      Array<{ dateKey: string; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "count"
      from "SupportTicket"
      where "createdAt" >= ${input.from} and "createdAt" <= ${input.to}
      group by 1
      order by 1 asc
    `);
  }

  private resolvedTrend(input: SupportReportOverviewInput) {
    return this.prisma.$queryRaw<
      Array<{ dateKey: string; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', coalesce("closedAt", "resolvedAt")), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "count"
      from "SupportTicket"
      where coalesce("closedAt", "resolvedAt") is not null
        and coalesce("closedAt", "resolvedAt") >= ${input.from}
        and coalesce("closedAt", "resolvedAt") <= ${input.to}
      group by 1
      order by 1 asc
    `);
  }
}
