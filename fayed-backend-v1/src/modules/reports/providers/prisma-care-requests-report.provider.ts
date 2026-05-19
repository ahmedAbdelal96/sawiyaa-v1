import { Injectable } from '@nestjs/common';
import { ChatApprovalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDailyBuckets } from '../utils/report-date.util';
import {
  CareRequestsReportOverviewInput,
  CareRequestsReportProvider,
  CareRequestsReportRowsInput,
} from './care-requests-report.provider';
import {
  CareRequestsReportOverview,
  CareRequestsReportRow,
} from '../types/care-requests-report.types';

@Injectable()
export class PrismaCareRequestsReportProvider implements CareRequestsReportProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    input: CareRequestsReportOverviewInput,
  ): Promise<CareRequestsReportOverview> {
    const baseWhere: Prisma.ChatApprovalRequestWhereInput = {
      requestedAt: { gte: input.from, lte: input.to },
      practitionerId: input.practitionerId,
    };

    const [
      totalRequests,
      statusGroups,
      pendingAging,
      trendRequested,
      trendApproved,
      trendRejected,
    ] = await Promise.all([
      this.prisma.chatApprovalRequest.count({ where: baseWhere }),
      this.prisma.chatApprovalRequest.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.pendingAgingSnapshot({
        to: input.to,
        practitionerId: input.practitionerId,
      }),
      this.requestedTrend(input),
      this.approvedTrend(input),
      this.rejectedTrend(input),
    ]);

    const statusBreakdown: Record<string, string> = {};
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let cancelled = 0;
    let expired = 0;
    let revoked = 0;

    for (const row of statusGroups) {
      statusBreakdown[row.status] = String(row._count._all);
      if (row.status === ChatApprovalStatus.PENDING) pending += row._count._all;
      if (row.status === ChatApprovalStatus.APPROVED)
        approved += row._count._all;
      if (row.status === ChatApprovalStatus.REJECTED)
        rejected += row._count._all;
      if (row.status === ChatApprovalStatus.CANCELLED)
        cancelled += row._count._all;
      if (row.status === ChatApprovalStatus.EXPIRED) expired += row._count._all;
      if (row.status === ChatApprovalStatus.REVOKED) revoked += row._count._all;
    }

    const acceptanceDenominator = approved + rejected;
    const acceptanceRatePercent =
      acceptanceDenominator === 0
        ? null
        : ((approved / acceptanceDenominator) * 100).toFixed(2);

    const dailyKeys = buildDailyBuckets(input.from, input.to);
    const requestedMap = new Map(
      trendRequested.map((row) => [row.dateKey, row.count]),
    );
    const approvedMap = new Map(
      trendApproved.map((row) => [row.dateKey, row.count]),
    );
    const rejectedMap = new Map(
      trendRejected.map((row) => [row.dateKey, row.count]),
    );

    return {
      generatedAt: new Date().toISOString(),
      range: { from: input.from.toISOString(), to: input.to.toISOString() },
      totals: {
        totalRequests: String(totalRequests),
        pending: String(pending),
        approved: String(approved),
        rejected: String(rejected),
        cancelled: String(cancelled),
        expired: String(expired),
        revoked: String(revoked),
        acceptanceRatePercent,
      },
      statusBreakdown,
      pendingAging,
      trend: dailyKeys.map((date) => ({
        date,
        requested: String(requestedMap.get(date) ?? 0),
        approved: String(approvedMap.get(date) ?? 0),
        rejected: String(rejectedMap.get(date) ?? 0),
      })),
    };
  }

  async listRows(input: CareRequestsReportRowsInput) {
    const where: Prisma.ChatApprovalRequestWhereInput = {
      requestedAt: { gte: input.from, lte: input.to },
      practitionerId: input.practitionerId,
      status: input.status ?? undefined,
    };

    const skip = (input.page - 1) * input.limit;
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.chatApprovalRequest.findMany({
        where,
        select: {
          id: true,
          status: true,
          requestedAt: true,
          reviewedAt: true,
          approvedAt: true,
          rejectedAt: true,
          expiresAt: true,
          cancelledAt: true,
          revokedAt: true,
          patientId: true,
          practitionerId: true,
          requestedByUserId: true,
          reviewedByUserId: true,
          approvalRef: true,
        },
        orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: input.limit,
      }),
      this.prisma.chatApprovalRequest.count({ where }),
    ]);

    const items: CareRequestsReportRow[] = rows.map((row) => ({
      id: row.id,
      status: row.status,
      requestedAt: row.requestedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      requestedByUserId: row.requestedByUserId,
      reviewedByUserId: row.reviewedByUserId,
      approvalRef: row.approvalRef,
    }));

    return { items, totalItems };
  }

  private pendingAgingSnapshot(input: { to: Date; practitionerId?: string }) {
    return this.prisma
      .$queryRaw<
        Array<{ lt1: number; d1to3: number; d3to7: number; gt7: number }>
      >(
        Prisma.sql`
      select
        sum(case when extract(epoch from (${input.to} - "requestedAt")) < 86400 then 1 else 0 end)::int as "lt1",
        sum(case when extract(epoch from (${input.to} - "requestedAt")) >= 86400 and extract(epoch from (${input.to} - "requestedAt")) < 259200 then 1 else 0 end)::int as "d1to3",
        sum(case when extract(epoch from (${input.to} - "requestedAt")) >= 259200 and extract(epoch from (${input.to} - "requestedAt")) < 604800 then 1 else 0 end)::int as "d3to7",
        sum(case when extract(epoch from (${input.to} - "requestedAt")) >= 604800 then 1 else 0 end)::int as "gt7"
      from "ChatApprovalRequest"
      where "status"::text = ${ChatApprovalStatus.PENDING}
        ${input.practitionerId ? Prisma.sql`and "practitionerId" = ${input.practitionerId}` : Prisma.empty}
    `,
      )
      .then((rows) => {
        const row = rows[0] ?? { lt1: 0, d1to3: 0, d3to7: 0, gt7: 0 };
        return {
          lessThan1d: String(row.lt1 ?? 0),
          d1to3: String(row.d1to3 ?? 0),
          d3to7: String(row.d3to7 ?? 0),
          moreThan7: String(row.gt7 ?? 0),
        };
      });
  }

  private requestedTrend(input: CareRequestsReportOverviewInput) {
    return this.prisma.$queryRaw<
      Array<{ dateKey: string; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "requestedAt"), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "count"
      from "ChatApprovalRequest"
      where "requestedAt" >= ${input.from} and "requestedAt" <= ${input.to}
        ${input.practitionerId ? Prisma.sql`and "practitionerId" = ${input.practitionerId}` : Prisma.empty}
      group by 1
      order by 1 asc
    `);
  }

  private approvedTrend(input: CareRequestsReportOverviewInput) {
    return this.prisma.$queryRaw<
      Array<{ dateKey: string; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "approvedAt"), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "count"
      from "ChatApprovalRequest"
      where "approvedAt" is not null
        and "approvedAt" >= ${input.from} and "approvedAt" <= ${input.to}
        ${input.practitionerId ? Prisma.sql`and "practitionerId" = ${input.practitionerId}` : Prisma.empty}
      group by 1
      order by 1 asc
    `);
  }

  private rejectedTrend(input: CareRequestsReportOverviewInput) {
    return this.prisma.$queryRaw<
      Array<{ dateKey: string; count: number }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "rejectedAt"), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "count"
      from "ChatApprovalRequest"
      where "rejectedAt" is not null
        and "rejectedAt" >= ${input.from} and "rejectedAt" <= ${input.to}
        ${input.practitionerId ? Prisma.sql`and "practitionerId" = ${input.practitionerId}` : Prisma.empty}
      group by 1
      order by 1 asc
    `);
  }
}
