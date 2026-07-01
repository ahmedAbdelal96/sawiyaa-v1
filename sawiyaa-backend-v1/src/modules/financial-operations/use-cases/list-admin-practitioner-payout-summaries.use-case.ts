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
        avatarUrl: true,
        user: {
          select: {
            displayName: true,
          },
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          select: {
            isPrimary: true,
            specialty: {
              select: {
                slug: true,
                translations: {
                  orderBy: [{ locale: 'asc' }],
                  select: {
                    locale: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        payoutDestination: {
          select: {
            methodType: true,
            bankName: true,
            bankAccountNumber: true,
            iban: true,
            walletProvider: true,
            walletIdentifier: true,
            otherDetails: true,
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
        const lastPayoutAt = this.latestTimestamp(
          egp.lastPayoutAt,
          usd.lastPayoutAt,
        );

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
        const payableA =
          Number(a.egp.totalPayableAmount) + Number(a.usd.totalPayableAmount);
        const payableB =
          Number(b.egp.totalPayableAmount) + Number(b.usd.totalPayableAmount);
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

        const nameA = (
          a.candidate.user?.displayName ??
          a.candidate.publicSlug ??
          a.candidate.id
        ).toLowerCase();
        const nameB = (
          b.candidate.user?.displayName ??
          b.candidate.publicSlug ??
          b.candidate.id
        ).toLowerCase();
        return nameA.localeCompare(nameB);
      });

    const totalItems = relevant.length;
    const items = relevant.slice(
      (page - 1) * limit,
      (page - 1) * limit + limit,
    );

    const summary = {
      practitionersWithDues: totalItems,
      readyForPayoutPractitioners: relevant.filter((item) => item.hasPayable).length,
      totalDueEgp: this.sumMoneyAmounts(relevant, (item) => item.egp.totalPayableAmount),
      totalDueUsd: this.sumMoneyAmounts(relevant, (item) => item.usd.totalPayableAmount),
    };

    return {
      summary,
      items: items.map(
        ({ candidate, egp, usd, hasPayable, hasPackage, lastPayoutAt }) => {
          const primarySpecialty = candidate.specialties?.find(
            (item) => item.isPrimary,
          )
            ?? candidate.specialties?.[0]
            ?? null;
          const specialtyTranslations =
            primarySpecialty?.specialty.translations ?? [];
          const primarySpecialtyName =
            specialtyTranslations.find((item) => item.locale === 'ar')?.title ??
            specialtyTranslations.find((item) => item.locale === 'en')?.title ??
            specialtyTranslations[0]?.title ??
            null;
          const payoutDestinationType =
            candidate.payoutDestination?.methodType ?? null;
          const payoutDestinationSummaryMasked = this.maskPayoutDestinationSummary(
            {
              methodType: payoutDestinationType,
              bankName: candidate.payoutDestination?.bankName ?? null,
              bankAccountNumber:
                candidate.payoutDestination?.bankAccountNumber ?? null,
              iban: candidate.payoutDestination?.iban ?? null,
              walletProvider: candidate.payoutDestination?.walletProvider ?? null,
              walletIdentifier:
                candidate.payoutDestination?.walletIdentifier ?? null,
              otherDetails: candidate.payoutDestination?.otherDetails ?? null,
            },
          );

          return this.mapper.toPractitionerManualPayoutSummary({
            practitionerId: candidate.id,
            practitionerName:
              candidate.user?.displayName ?? candidate.publicSlug ?? null,
            practitionerSlug: candidate.publicSlug,
            safeDisplayCode: this.buildSafeDisplayCode(
              candidate.id,
              candidate.publicSlug,
            ),
            avatarUrl: candidate.avatarUrl ?? null,
            primarySpecialtyName,
            payoutDestinationType,
            payoutDestinationSummaryMasked,
            egp,
            usd,
            hasPayable,
            hasPackage,
            lastPayoutAt,
          });
        },
      ),
      pagination: buildPagination({ page, limit, totalItems }),
    };
  }

  private buildSafeDisplayCode(
    practitionerId: string,
    practitionerSlug: string | null,
  ) {
    const suffix = practitionerId.replace(/-/g, '').slice(0, 4).toLowerCase();
    const codeBase = practitionerSlug?.trim() || 'practitioner';
    return `${codeBase} · #${suffix}`;
  }

  private sumMoneyAmounts<T>(
    items: T[],
    select: (item: T) => string | null | undefined,
  ) {
    const total = items.reduce((accumulator, item) => {
      const value = Number(select(item) ?? 0);
      return accumulator + (Number.isFinite(value) ? value : 0);
    }, 0);

    return total.toFixed(2);
  }

  private maskIdentifier(value: string | null | undefined) {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return null;
    if (trimmed.length <= 4) return '••••';
    if (trimmed.length <= 8) return `••••${trimmed.slice(-4)}`;
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
  }

  private maskPayoutDestinationSummary(input: {
    methodType: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    iban: string | null;
    walletProvider: string | null;
    walletIdentifier: string | null;
    otherDetails: string | null;
  }) {
    const parts: string[] = [];

    if (input.walletProvider?.trim()) {
      parts.push(input.walletProvider.trim());
    } else if (input.bankName?.trim()) {
      parts.push(input.bankName.trim());
    } else if (input.methodType?.trim()) {
      parts.push(input.methodType.trim());
    }

    const maskedIdentifier =
      this.maskIdentifier(
        input.walletIdentifier ?? input.bankAccountNumber ?? input.iban ?? input.otherDetails,
      ) ?? null;

    if (maskedIdentifier) {
      parts.push(maskedIdentifier);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  }

  private latestTimestamp(...values: Array<string | null | undefined>) {
    const timestamps = values
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime());
    if (timestamps.length === 0) return null;
    const latest = Math.max(...timestamps);
    return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
  }
}
