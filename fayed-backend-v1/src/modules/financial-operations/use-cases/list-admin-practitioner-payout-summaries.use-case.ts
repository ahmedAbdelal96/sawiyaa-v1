import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { buildPagination } from '../utils/pagination';
import { ListAdminPractitionerPayoutSummariesDto } from '../dto/admin-practitioner-payouts.dto';

@Injectable()
export class ListAdminPractitionerPayoutSummariesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: PractitionerManualPayoutBalanceService,
    private readonly mapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { query: ListAdminPractitionerPayoutSummariesDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const search = input.query.search?.trim();

    const where: Prisma.PractitionerProfileWhereInput | undefined = search
      ? {
          OR: [
            {
              publicSlug: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              user: {
                displayName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : undefined;

    const candidates = await this.prisma.practitionerProfile.findMany({
      where,
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const balances = await Promise.all(
      candidates.map(async (candidate) => {
        const [egp, usd] = await Promise.all([
          this.balanceService.getBalance({
            practitionerId: candidate.id,
            currencyCode: 'EGP',
          }),
          this.balanceService.getBalance({
            practitionerId: candidate.id,
            currencyCode: 'USD',
          }),
        ]);

        return {
          candidate,
          egp,
          usd,
        };
      }),
    );

    const relevant = balances
      .map(({ candidate, egp, usd }) => {
        const hasPayable =
          Number(egp.totalPayableAmount ?? 0) > 0 ||
          Number(usd.totalPayableAmount ?? 0) > 0;
        const hasPackage =
          Number(egp.packageHeldAmount ?? 0) > 0 ||
          Number(egp.packageReleasedPayableAmount ?? 0) > 0 ||
          Number(usd.packageHeldAmount ?? 0) > 0 ||
          Number(usd.packageReleasedPayableAmount ?? 0) > 0;
        const lastPayoutAt =
          this.latestTimestamp(egp.lastPayoutAt, usd.lastPayoutAt);

        return {
          candidate,
          egp,
          usd,
          hasPayable,
          hasPackage,
          lastPayoutAt,
        };
      })
      .filter((item) => item.hasPayable || item.hasPackage)
      .sort((a, b) => {
        const payableA = Number(a.egp.totalPayableAmount) + Number(a.usd.totalPayableAmount);
        const payableB = Number(b.egp.totalPayableAmount) + Number(b.usd.totalPayableAmount);
        if (payableA !== payableB) {
          return payableB - payableA;
        }

        const packageA =
          Number(a.egp.packageHeldAmount) +
          Number(a.egp.packageReleasedPayableAmount) +
          Number(a.usd.packageHeldAmount) +
          Number(a.usd.packageReleasedPayableAmount);
        const packageB =
          Number(b.egp.packageHeldAmount) +
          Number(b.egp.packageReleasedPayableAmount) +
          Number(b.usd.packageHeldAmount) +
          Number(b.usd.packageReleasedPayableAmount);
        if (packageA !== packageB) {
          return packageB - packageA;
        }

        const nameA = (a.candidate.user?.displayName ?? a.candidate.publicSlug ?? a.candidate.id).toLowerCase();
        const nameB = (b.candidate.user?.displayName ?? b.candidate.publicSlug ?? b.candidate.id).toLowerCase();
        return nameA.localeCompare(nameB);
      });

    const totalItems = relevant.length;
    const items = relevant.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      items: items.map(({ candidate, egp, usd, hasPayable, hasPackage, lastPayoutAt }) =>
        this.mapper.toPractitionerManualPayoutSummary({
          practitionerId: candidate.id,
          practitionerName: candidate.user?.displayName ?? candidate.publicSlug ?? null,
          practitionerSlug: candidate.publicSlug,
          egp,
          usd,
          hasPayable,
          hasPackage,
          lastPayoutAt,
        }),
      ),
      pagination: buildPagination({ page, limit, totalItems }),
    };
  }

  private latestTimestamp(...values: Array<string | null | undefined>) {
    const timestamps = values.filter(Boolean).map((value) => new Date(value as string).getTime());
    if (timestamps.length === 0) return null;
    const latest = Math.max(...timestamps);
    return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
  }
}
