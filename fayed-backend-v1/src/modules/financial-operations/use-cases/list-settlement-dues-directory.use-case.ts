import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PractitionerStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import {
  ListSettlementDuesDirectoryDto,
  SettlementDuesFinanceFilterDto,
  SettlementDuesSortByDto,
  SettlementDuesVerificationFilterDto,
} from '../dto/list-settlement-dues-directory.dto';
import { SettlementRepository } from '../repositories/settlement.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

const DUE_STATUSES = ['READY', 'PROCESSING'] as const;

function normalizeCurrency(value: string | undefined) {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) return undefined;
  return trimmed;
}

@Injectable()
export class ListSettlementDuesDirectoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementRepository: SettlementRepository,
    private readonly walletRepository: WalletRepository,
    private readonly mapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { query: ListSettlementDuesDirectoryDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const currencyCode = normalizeCurrency(input.query.currencyCode);
    if (currencyCode && currencyCode.length !== 3) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const search = input.query.search?.trim();
    const finance = input.query.finance ?? SettlementDuesFinanceFilterDto.ALL;
    const verification =
      input.query.verification ?? SettlementDuesVerificationFilterDto.ALL;
    const sortBy = input.query.sortBy ?? SettlementDuesSortByDto.DUE_DESC;

    const dueWhere: Prisma.PractitionerProfileWhereInput = {
      settlements: {
        some: {
          status: { in: [...DUE_STATUSES] },
          ...(currencyCode ? { currencyCode } : {}),
        },
      },
    };

    const balanceWhere: Prisma.PractitionerProfileWhereInput = {
      wallets: {
        some: {
          availableBalance: { gt: new Prisma.Decimal(0) },
          ...(currencyCode ? { currencyCode } : {}),
        },
      },
    };

    const baseWhere: Prisma.PractitionerProfileWhereInput = {
      ...(search
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
        : {}),
      ...(verification === SettlementDuesVerificationFilterDto.VERIFIED
        ? { status: PractitionerStatus.APPROVED }
        : verification === SettlementDuesVerificationFilterDto.UNVERIFIED
          ? { status: { not: PractitionerStatus.APPROVED } }
          : {}),
    };

    const listWhere: Prisma.PractitionerProfileWhereInput = {
      ...baseWhere,
      ...(finance === SettlementDuesFinanceFilterDto.WITH_DUE
        ? dueWhere
        : finance === SettlementDuesFinanceFilterDto.WITH_BALANCE
          ? balanceWhere
          : finance === SettlementDuesFinanceFilterDto.EMPTY
            ? {
                AND: [
                  {
                    settlements: {
                      none: {
                        status: { in: [...DUE_STATUSES] },
                        ...(currencyCode ? { currencyCode } : {}),
                      },
                    },
                  },
                  {
                    wallets: {
                      none: {
                        availableBalance: { gt: new Prisma.Decimal(0) },
                        ...(currencyCode ? { currencyCode } : {}),
                      },
                    },
                  },
                ],
              }
            : {}),
    };

    const orderBy: Prisma.PractitionerProfileOrderByWithRelationInput[] =
      sortBy === SettlementDuesSortByDto.NAME_ASC
        ? [{ user: { displayName: 'asc' } }, { id: 'asc' }]
        : [{ user: { displayName: 'asc' } }, { id: 'asc' }];

    const practitionerSelect = {
      id: true,
      publicSlug: true,
      practitionerType: true,
      professionalTitle: true,
      status: true,
      user: { select: { displayName: true } },
      country: { select: { isoCode: true } },
    } as const;

    const [rows, totalItems, statsVisible, statsDue, statsBalance, statsVerified] =
      await Promise.all([
        this.prisma.practitionerProfile.findMany({
          where: listWhere,
          select: practitionerSelect,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.practitionerProfile.count({ where: listWhere }),
        this.prisma.practitionerProfile.count({ where: baseWhere }),
        this.prisma.practitionerProfile.count({
          where: { ...baseWhere, ...dueWhere },
        }),
        this.prisma.practitionerProfile.count({
          where: { ...baseWhere, ...balanceWhere },
        }),
        this.prisma.practitionerProfile.count({
          where: {
            ...baseWhere,
            status: PractitionerStatus.APPROVED,
          },
        }),
      ]);

    const practitionerIds = rows.map((row) => row.id);

    const [dueGroups, wallets] = await Promise.all([
      this.settlementRepository.aggregateDueSummaryByPractitionerIds({
        practitionerIds,
        currencyCode,
      }),
      this.walletRepository.listByPractitionerIds({ practitionerIds, currencyCode }),
    ]);

    const walletByKey = new Map(
      wallets.map((wallet) => [`${wallet.practitionerId}:${wallet.currencyCode}`, wallet]),
    );

    const dueByKey = new Map(
      dueGroups.map((group) => [`${group.practitionerId}:${group.currencyCode}`, group]),
    );

    const currencyByPractitioner = new Map<string, Set<string>>();
    for (const wallet of wallets) {
      const set = currencyByPractitioner.get(wallet.practitionerId) ?? new Set<string>();
      set.add(wallet.currencyCode);
      currencyByPractitioner.set(wallet.practitionerId, set);
    }
    for (const group of dueGroups) {
      const set = currencyByPractitioner.get(group.practitionerId) ?? new Set<string>();
      set.add(group.currencyCode);
      currencyByPractitioner.set(group.practitionerId, set);
    }

    return {
      items: rows.map((row) => {
        const currencies = Array.from(currencyByPractitioner.get(row.id) ?? []).sort((a, b) =>
          a.localeCompare(b),
        );

        return {
          practitioner: {
            id: row.id,
            slug: row.publicSlug || row.id,
            displayName: row.user.displayName ?? null,
            practitionerType: row.practitionerType,
            professionalTitle: row.professionalTitle ?? null,
            countryCode: row.country?.isoCode ?? null,
            isVerified: row.status === PractitionerStatus.APPROVED,
          },
          summaries: currencies.map((currency) => {
            const wallet = walletByKey.get(`${row.id}:${currency}`);
            const group = dueByKey.get(`${row.id}:${currency}`);
            const dueAmount = new Prisma.Decimal(group?._sum.amountNet ?? 0).sub(
              new Prisma.Decimal(group?._sum.amountPaidTotal ?? 0),
            );

            return this.mapper.toPractitionerPayoutDueSummary({
              currency,
              dueCount: group?._count.id ?? 0,
              dueAmountNet: dueAmount.toFixed(2),
              lastDueAt: group?._max.createdAt ?? null,
              walletAvailableBalance: wallet?.availableBalance ?? null,
              walletReservedBalance: wallet?.reservedBalance ?? null,
              walletPendingBalance: wallet?.pendingBalance ?? null,
              walletUpdatedAt: wallet?.updatedAt ?? null,
            });
          }),
        };
      }),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
      stats: {
        visibleCount: statsVisible,
        withDueCount: statsDue,
        withBalanceCount: statsBalance,
        verifiedCount: statsVerified,
      },
    };
  }
}
