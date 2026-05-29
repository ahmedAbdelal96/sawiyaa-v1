import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, CorporateContractStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const CONTRACT_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'status',
  'billingMode',
  'currency',
  'market',
]);

function sanitizeSortBy(sortBy: string, allowedFields: Set<string>): string {
  if (!allowedFields.has(sortBy)) {
    throw new BadRequestException(`Invalid sort field: ${sortBy}`);
  }
  return sortBy;
}

@Injectable()
export class CorporateContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateContract.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
        _count: {
          select: {
            plans: true,
            batches: true,
            codes: true,
          },
        },
      },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateContract.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByOrganization(args: {
    organizationId: string;
    status?: CorporateContractStatus;
    page: number;
    limit: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) {
    const { organizationId, status, page, limit, sortBy, sortDirection } = args;

    const safeSortBy = sanitizeSortBy(sortBy, CONTRACT_SORT_FIELDS);

    const where: Prisma.CorporateContractWhereInput = { organizationId };
    if (status) {
      where.status = status;
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [safeSortBy]: sortDirection,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.corporateContract.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { plans: true },
          },
        },
      }),
      this.prisma.corporateContract.count({ where }),
    ]);

    return { items, total };
  }

  async create(
    data: {
      organizationId: string;
      startDate: Date;
      endDate: Date;
      billingMode: string;
      currency: string;
      market: string;
      status?: CorporateContractStatus;
      notes?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateContract.create({
      data: {
        organizationId: data.organizationId,
        startDate: data.startDate,
        endDate: data.endDate,
        billingMode: data.billingMode as any,
        currency: data.currency.toUpperCase(),
        market: data.market as any,
        status: data.status ?? CorporateContractStatus.DRAFT,
        notes: data.notes as any,
      },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      startDate?: Date;
      endDate?: Date;
      billingMode?: string;
      currency?: string;
      market?: string;
      notes?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const updateData: Prisma.CorporateContractUpdateInput = {};
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.billingMode !== undefined)
      updateData.billingMode = data.billingMode as any;
    if (data.currency !== undefined)
      updateData.currency = data.currency.toUpperCase();
    if (data.market !== undefined) updateData.market = data.market as any;
    if (data.notes !== undefined) updateData.notes = data.notes as any;
    return this.getDb(tx).corporateContract.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    status: CorporateContractStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateContract.update({
      where: { id },
      data: { status },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
      },
    });
  }

  async hasActiveContracts(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const count = await this.getDb(tx).corporateContract.count({
      where: {
        organizationId,
        status: CorporateContractStatus.ACTIVE,
      },
    });
    return count > 0;
  }
}
