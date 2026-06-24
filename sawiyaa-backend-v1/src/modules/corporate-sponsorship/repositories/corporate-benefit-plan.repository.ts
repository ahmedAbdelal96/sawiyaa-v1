import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, CorporateBenefitPlanStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const BENEFIT_PLAN_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'name',
  'status',
  'coverageType',
  'coveragePercent',
  'currency',
  'codeUsageLimit',
  'codeReservationTtlMinutes',
]);

function sanitizeSortBy(sortBy: string, allowedFields: Set<string>): string {
  if (!allowedFields.has(sortBy)) {
    throw new BadRequestException(`Invalid sort field: ${sortBy}`);
  }
  return sortBy;
}

@Injectable()
export class CorporateBenefitPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateBenefitPlan.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            organization: {
              select: { id: true, name: true, companyCode: true, status: true },
            },
          },
        },
        specialties: {
          include: {
            specialty: true,
          },
        },
        practitioners: {
          include: {
            practitioner: {
              select: { id: true, userId: true, publicSlug: true },
            },
          },
        },
        _count: {
          select: {
            codes: true,
            sponsorships: true,
          },
        },
      },
    });
  }

  async findByContractId(contractId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateBenefitPlan.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            codes: true,
            sponsorships: true,
          },
        },
      },
    });
  }

  async listByContract(args: {
    contractId: string;
    status?: CorporateBenefitPlanStatus;
    page: number;
    limit: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) {
    const { contractId, status, page, limit, sortBy, sortDirection } = args;

    const safeSortBy = sanitizeSortBy(sortBy, BENEFIT_PLAN_SORT_FIELDS);

    const where: Prisma.CorporateBenefitPlanWhereInput = { contractId };
    if (status) {
      where.status = status;
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [safeSortBy]: sortDirection,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.corporateBenefitPlan.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              codes: true,
              sponsorships: true,
            },
          },
        },
      }),
      this.prisma.corporateBenefitPlan.count({ where }),
    ]);

    return { items, total };
  }

  async create(
    data: {
      contractId: string;
      name: string;
      coverageType: string;
      coveragePercent?: number;
      maxCoverageAmount?: Prisma.Decimal;
      maxTotalCoverage?: Prisma.Decimal;
      currency: string;
      codeUsageLimit: number;
      codeReservationTtlMinutes: number;
      status?: CorporateBenefitPlanStatus;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitPlan.create({
      data: {
        contractId: data.contractId,
        name: data.name,
        coverageType: data.coverageType as any,
        coveragePercent: data.coveragePercent,
        maxCoverageAmount: data.maxCoverageAmount as any,
        maxTotalCoverage: data.maxTotalCoverage as any,
        currency: data.currency.toUpperCase(),
        codeUsageLimit: data.codeUsageLimit,
        codeReservationTtlMinutes: data.codeReservationTtlMinutes,
        status: data.status ?? CorporateBenefitPlanStatus.ACTIVE,
      },
      include: {
        contract: {
          include: {
            organization: {
              select: { id: true, name: true, companyCode: true },
            },
          },
        },
      },
    });
  }

  async addSpecialties(
    planId: string,
    specialtyIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (specialtyIds.length === 0) return;
    await this.getDb(tx).corporateBenefitPlanSpecialty.createMany({
      data: specialtyIds.map((specialtyId) => ({
        planId,
        specialtyId,
      })),
      skipDuplicates: true,
    });
  }

  async addPractitioners(
    planId: string,
    practitionerIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (practitionerIds.length === 0) return;
    await this.getDb(tx).corporateBenefitPlanPractitioner.createMany({
      data: practitionerIds.map((practitionerId) => ({
        planId,
        practitionerId,
      })),
      skipDuplicates: true,
    });
  }

  async replaceSpecialties(
    planId: string,
    specialtyIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    await this.getDb(tx).corporateBenefitPlanSpecialty.deleteMany({
      where: { planId },
    });
    await this.addSpecialties(planId, specialtyIds, tx);
  }

  async replacePractitioners(
    planId: string,
    practitionerIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    await this.getDb(tx).corporateBenefitPlanPractitioner.deleteMany({
      where: { planId },
    });
    await this.addPractitioners(planId, practitionerIds, tx);
  }

  async validateSpecialtyIds(
    specialtyIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    if (specialtyIds.length === 0) return true;
    const count = await this.getDb(tx).specialty.count({
      where: { id: { in: specialtyIds } },
    });
    return count === specialtyIds.length;
  }

  async validatePractitionerIds(
    practitionerIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    if (practitionerIds.length === 0) return true;
    const count = await this.getDb(tx).practitionerProfile.count({
      where: { id: { in: practitionerIds } },
    });
    return count === practitionerIds.length;
  }

  async createWithRelations(
    data: {
      contractId: string;
      name: string;
      coverageType: string;
      coveragePercent?: number;
      maxCoverageAmount?: Prisma.Decimal;
      maxTotalCoverage?: Prisma.Decimal;
      currency: string;
      codeUsageLimit: number;
      codeReservationTtlMinutes: number;
      status?: CorporateBenefitPlanStatus;
      specialtyIds?: string[];
      practitionerIds?: string[];
    },
    tx?: Prisma.TransactionClient,
  ) {
    const doCreate = async (dbTx: Prisma.TransactionClient) => {
      const plan = await dbTx.corporateBenefitPlan.create({
        data: {
          contractId: data.contractId,
          name: data.name,
          coverageType: data.coverageType as any,
          coveragePercent: data.coveragePercent,
          maxCoverageAmount: data.maxCoverageAmount as any,
          maxTotalCoverage: data.maxTotalCoverage as any,
          currency: data.currency.toUpperCase(),
          codeUsageLimit: data.codeUsageLimit,
          codeReservationTtlMinutes: data.codeReservationTtlMinutes,
          status: data.status ?? CorporateBenefitPlanStatus.ACTIVE,
        },
      });

      if (data.specialtyIds?.length) {
        await dbTx.corporateBenefitPlanSpecialty.createMany({
          data: data.specialtyIds.map((specialtyId) => ({
            planId: plan.id,
            specialtyId,
          })),
          skipDuplicates: true,
        });
      }

      if (data.practitionerIds?.length) {
        await dbTx.corporateBenefitPlanPractitioner.createMany({
          data: data.practitionerIds.map((practitionerId) => ({
            planId: plan.id,
            practitionerId,
          })),
          skipDuplicates: true,
        });
      }

      return plan;
    };

    if (tx) {
      return doCreate(tx);
    }
    return this.prisma.$transaction(doCreate);
  }

  async updateWithRelations(
    id: string,
    data: {
      name?: string;
      coverageType?: string;
      coveragePercent?: number;
      maxCoverageAmount?: Prisma.Decimal;
      maxTotalCoverage?: Prisma.Decimal;
      codeUsageLimit?: number;
      codeReservationTtlMinutes?: number;
      specialtyIds?: string[];
      practitionerIds?: string[];
    },
    tx?: Prisma.TransactionClient,
  ) {
    const doUpdate = async (dbTx: Prisma.TransactionClient) => {
      const updateData: Prisma.CorporateBenefitPlanUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.coverageType !== undefined)
        updateData.coverageType = data.coverageType as any;
      if (data.coveragePercent !== undefined)
        updateData.coveragePercent = data.coveragePercent;
      if (data.maxCoverageAmount !== undefined)
        updateData.maxCoverageAmount = data.maxCoverageAmount as any;
      if (data.maxTotalCoverage !== undefined)
        updateData.maxTotalCoverage = data.maxTotalCoverage as any;
      if (data.codeUsageLimit !== undefined)
        updateData.codeUsageLimit = data.codeUsageLimit;
      if (data.codeReservationTtlMinutes !== undefined)
        updateData.codeReservationTtlMinutes = data.codeReservationTtlMinutes;

      const plan = await dbTx.corporateBenefitPlan.update({
        where: { id },
        data: updateData,
        include: {
          contract: {
            include: {
              organization: {
                select: { id: true, name: true, companyCode: true },
              },
            },
          },
          specialties: { include: { specialty: true } },
          practitioners: {
            include: {
              practitioner: {
                select: { id: true, userId: true, publicSlug: true },
              },
            },
          },
          _count: { select: { codes: true, sponsorships: true } },
        },
      });

      if (data.specialtyIds !== undefined) {
        await dbTx.corporateBenefitPlanSpecialty.deleteMany({
          where: { planId: id },
        });
        if (data.specialtyIds.length > 0) {
          await dbTx.corporateBenefitPlanSpecialty.createMany({
            data: data.specialtyIds.map((specialtyId) => ({
              planId: id,
              specialtyId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (data.practitionerIds !== undefined) {
        await dbTx.corporateBenefitPlanPractitioner.deleteMany({
          where: { planId: id },
        });
        if (data.practitionerIds.length > 0) {
          await dbTx.corporateBenefitPlanPractitioner.createMany({
            data: data.practitionerIds.map((practitionerId) => ({
              planId: id,
              practitionerId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return plan;
    };

    if (tx) {
      return doUpdate(tx);
    }
    return this.prisma.$transaction(doUpdate);
  }

  async updateStatus(
    id: string,
    status: CorporateBenefitPlanStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitPlan.update({
      where: { id },
      data: { status },
      include: {
        contract: {
          include: {
            organization: {
              select: { id: true, name: true, companyCode: true },
            },
          },
        },
      },
    });
  }
}
