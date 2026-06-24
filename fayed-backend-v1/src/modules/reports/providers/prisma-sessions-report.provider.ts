import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDailyBuckets, toUtcDateKey } from '../utils/report-date.util';
import {
  SessionsReportOverviewInput,
  SessionsReportProvider,
  SessionsReportRowsInput,
} from './sessions-report.provider';
import {
  SessionsReportOverview,
  SessionsReportRow,
} from '../types/sessions-report.types';

type Db = PrismaService | Prisma.TransactionClient | PrismaClient;

@Injectable()
export class PrismaSessionsReportProvider implements SessionsReportProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    input: SessionsReportOverviewInput,
  ): Promise<SessionsReportOverview> {
    const where: Prisma.SessionWhereInput = {
      scheduledStartAt: {
        gte: input.from,
        lte: input.to,
      },
    };

    const [totalSessions, statusGroups, trendRows] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.listTrendRows(this.prisma, input),
    ]);

    const statusBreakdown: Record<string, string> = {};
    let completed = 0;
    let cancelled = 0;
    let noShow = 0;
    for (const row of statusGroups) {
      statusBreakdown[row.status] = String(row._count._all);
      if (row.status === SessionStatus.COMPLETED) completed += row._count._all;
      if (row.status === SessionStatus.CANCELLED) cancelled += row._count._all;
      if (row.status === SessionStatus.NO_SHOW) noShow += row._count._all;
    }

    const bucketKeys = buildDailyBuckets(input.from, input.to);
    const trendMap = new Map<
      string,
      { total: number; completed: number; cancelled: number; noShow: number }
    >();
    for (const row of trendRows) {
      const key = row.dateKey;
      const bucket = trendMap.get(key) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };
      bucket.total += row.total;
      bucket.completed += row.completed;
      bucket.cancelled += row.cancelled;
      bucket.noShow += row.noShow;
      trendMap.set(key, bucket);
    }

    const trend = bucketKeys.map((date) => {
      const bucket = trendMap.get(date) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };
      return {
        date,
        total: String(bucket.total),
        completed: String(bucket.completed),
        cancelled: String(bucket.cancelled),
        noShow: String(bucket.noShow),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      range: {
        from: input.from.toISOString(),
        to: input.to.toISOString(),
      },
      totals: {
        totalSessions: String(totalSessions),
        completed: String(completed),
        cancelled: String(cancelled),
        noShow: String(noShow),
      },
      statusBreakdown,
      trend,
    };
  }

  async listRows(input: SessionsReportRowsInput) {
    const where: Prisma.SessionWhereInput = {
      scheduledStartAt: {
        gte: input.from,
        lte: input.to,
      },
      status: (input.status as SessionStatus | undefined) ?? undefined,
    };

    const skip = (input.page - 1) * input.limit;
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        select: {
          id: true,
          sessionCode: true,
          status: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          createdAt: true,
          patientId: true,
          practitionerId: true,
          patient: {
            select: {
              displayName: true,
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
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
        orderBy: [{ scheduledStartAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: input.limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    const items: SessionsReportRow[] = rows.map((row) => ({
      id: row.id,
      sessionCode: row.sessionCode,
      status: row.status,
      scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      patientName: row.patient?.user?.displayName ?? row.patient?.displayName ?? null,
      practitionerName: row.practitioner?.user?.displayName ?? null,
    }));

    return { items, totalItems };
  }

  private async listTrendRows(db: Db, input: SessionsReportOverviewInput) {
    const rows = await db.$queryRaw<
      Array<{
        dateKey: string;
        total: number;
        completed: number;
        cancelled: number;
        noShow: number;
      }>
    >(Prisma.sql`
      select
        to_char(date_trunc('day', "scheduledStartAt"), 'YYYY-MM-DD') as "dateKey",
        count(*)::int as "total",
        sum(case when "status"::text = ${SessionStatus.COMPLETED} then 1 else 0 end)::int as "completed",
        sum(case when "status"::text = ${SessionStatus.CANCELLED} then 1 else 0 end)::int as "cancelled",
        sum(case when "status"::text = ${SessionStatus.NO_SHOW} then 1 else 0 end)::int as "noShow"
      from "Session"
      where "scheduledStartAt" >= ${input.from} and "scheduledStartAt" <= ${input.to}
      group by 1
      order by 1 asc
    `);

    // Ensure we always return UTC day keys, regardless of DB timezone.
    return rows.map((row) => ({
      ...row,
      dateKey: row.dateKey ?? toUtcDateKey(new Date()),
    }));
  }
}
