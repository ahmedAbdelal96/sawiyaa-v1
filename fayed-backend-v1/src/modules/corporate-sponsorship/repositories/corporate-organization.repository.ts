import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, CorporateOrganizationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const ORGANIZATION_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'name',
  'companyCode',
  'status',
  'billingEmail',
  'countryIsoCode',
]);

function sanitizeSortBy(sortBy: string, allowedFields: Set<string>): string {
  if (!allowedFields.has(sortBy)) {
    throw new BadRequestException(`Invalid sort field: ${sortBy}`);
  }
  return sortBy;
}

@Injectable()
export class CorporateOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateOrganization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contracts: true,
            batches: true,
            codes: true,
          },
        },
      },
    });
  }

  async findByCompanyCode(companyCode: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateOrganization.findFirst({
      where: { companyCode: companyCode.toUpperCase() },
    });
  }

  async findByIdWithActiveContracts(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateOrganization.findUnique({
      where: { id },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
        _count: {
          select: {
            contracts: true,
            batches: true,
            codes: true,
          },
        },
      },
    });
  }

  async list(args: {
    search?: string;
    status?: CorporateOrganizationStatus;
    page: number;
    limit: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) {
    const { search, status, page, limit, sortBy, sortDirection } = args;

    const safeSortBy = sanitizeSortBy(sortBy, ORGANIZATION_SORT_FIELDS);

    const where: Prisma.CorporateOrganizationWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [safeSortBy]: sortDirection,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.corporateOrganization.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              contracts: true,
              batches: true,
            },
          },
        },
      }),
      this.prisma.corporateOrganization.count({ where }),
    ]);

    return { items, total };
  }

  async create(
    data: {
      name: string;
      companyCode: string;
      countryIsoCode?: string;
      billingEmail: string;
      contactName?: string;
      contactPhone?: string;
      status?: CorporateOrganizationStatus;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateOrganization.create({
      data: {
        ...data,
        companyCode: data.companyCode.toUpperCase(),
        status: data.status ?? CorporateOrganizationStatus.ACTIVE,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      companyCode: string;
      countryIsoCode: string;
      billingEmail: string;
      contactName: string;
      contactPhone: string;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const updateData: Prisma.CorporateOrganizationUpdateInput = { ...data };
    if (data.companyCode) {
      updateData.companyCode = data.companyCode.toUpperCase();
    }
    return this.getDb(tx).corporateOrganization.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(
    id: string,
    status: CorporateOrganizationStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateOrganization.update({
      where: { id },
      data: { status },
    });
  }
}
