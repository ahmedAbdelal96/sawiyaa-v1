import { Injectable } from '@nestjs/common';
import { Prisma, CorporateBatchStatus, CorporateCodeStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

export interface CodeBatchCreateData {
  organizationId: string;
  contractId: string;
  benefitPlanId: string;
  name: string;
  totalCodes: number;
  expiresAt?: Date;
  createdByAdminId: string;
}

export interface CodeBatchUpdateData {
  status?: CorporateBatchStatus;
  generatedCount?: number;
  exportedAt?: Date;
  exportedByAdminId?: string;
  revokedAt?: Date;
  revokedByAdminId?: string;
  revokeReason?: string;
}

@Injectable()
export class CorporateCodeBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateCodeBatch.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        _count: {
          select: { codes: true },
        },
      },
    });
  }

  async findByPlanId(planId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateCodeBatch.findMany({
      where: { benefitPlanId: planId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByPlan(args: {
    benefitPlanId: string;
    status?: CorporateBatchStatus;
    page: number;
    limit: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) {
    const { benefitPlanId, status, page, limit, sortBy, sortDirection } = args;

    const where: Prisma.CorporateCodeBatchWhereInput = { benefitPlanId };
    if (status) {
      where.status = status;
    }

    const BATCH_SORT_FIELDS = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'status',
      'expiresAt',
      'exportedAt',
    ]);
    const safeSortBy = BATCH_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';
    const orderBy: Record<string, 'asc' | 'desc'> = { [safeSortBy]: sortDirection };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.corporateCodeBatch.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: {
            select: { id: true, name: true, companyCode: true },
          },
          contract: {
            select: { id: true, status: true, currency: true, billingMode: true },
          },
          benefitPlan: {
            select: { id: true, name: true, status: true, coverageType: true },
          },
          _count: {
            select: { codes: true },
          },
        },
      }),
      this.prisma.corporateCodeBatch.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: CodeBatchCreateData, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateCodeBatch.create({
      data: {
        organizationId: data.organizationId,
        contractId: data.contractId,
        benefitPlanId: data.benefitPlanId,
        name: data.name,
        totalCodes: data.totalCodes,
        expiresAt: data.expiresAt,
        createdByAdminId: data.createdByAdminId,
        status: CorporateBatchStatus.GENERATING,
      },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
      },
    });
  }

  async update(id: string, data: CodeBatchUpdateData, tx?: Prisma.TransactionClient) {
    const updateData: Prisma.CorporateCodeBatchUpdateInput = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.generatedCount !== undefined) updateData.generatedCount = data.generatedCount;
    if (data.exportedAt !== undefined) updateData.exportedAt = data.exportedAt;
    if (data.exportedByAdminId !== undefined) updateData.exportedByAdminId = data.exportedByAdminId;
    if (data.revokedAt !== undefined) updateData.revokedAt = data.revokedAt;
    if (data.revokedByAdminId !== undefined) updateData.revokedByAdminId = data.revokedByAdminId;
    if (data.revokeReason !== undefined) updateData.revokeReason = data.revokeReason;

    return this.getDb(tx).corporateCodeBatch.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        _count: {
          select: { codes: true },
        },
      },
    });
  }

  async createCode(data: {
    organizationId: string;
    contractId: string;
    benefitPlanId: string;
    batchId: string;
    codeHash: string;
    codePrefix: string;
    codeLast4: string;
    pepperVersion: number;
    usageLimit?: number;
    expiresAt?: Date;
  }, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateBenefitCode.create({
      data: {
        organizationId: data.organizationId,
        contractId: data.contractId,
        benefitPlanId: data.benefitPlanId,
        batchId: data.batchId,
        codeHash: data.codeHash,
        codePrefix: data.codePrefix,
        codeLast4: data.codeLast4,
        pepperVersion: data.pepperVersion,
        usageLimit: data.usageLimit ?? 1,
        expiresAt: data.expiresAt,
        status: CorporateCodeStatus.AVAILABLE,
      },
    });
  }

  async codeHashExists(codeHash: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const count = await this.getDb(tx).corporateBenefitCode.count({
      where: { codeHash },
    });
    return count > 0;
  }

  async countByBatchAndStatus(
    batchId: string,
    status: CorporateCodeStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitCode.count({
      where: { batchId, status },
    });
  }

  async updateBatchGeneratedCount(id: string, generatedCount: number, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateCodeBatch.update({
      where: { id },
      data: { generatedCount },
    });
  }

  async revokeAvailableCodesInBatch(
    batchId: string,
    revokedByAdminId: string,
    revokeReason: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitCode.updateMany({
      where: {
        batchId,
        status: CorporateCodeStatus.AVAILABLE,
      },
      data: {
        status: CorporateCodeStatus.REVOKED,
        revokedAt: new Date(),
        revokedByAdminId,
        revokeReason,
      },
    });
  }

  async getCodeStatusCounts(batchId: string, tx?: Prisma.TransactionClient) {
    const [available, reserved, used, revoked, expired] = await Promise.all([
      this.countByBatchAndStatus(batchId, CorporateCodeStatus.AVAILABLE, tx),
      this.countByBatchAndStatus(batchId, CorporateCodeStatus.RESERVED, tx),
      this.countByBatchAndStatus(batchId, CorporateCodeStatus.USED, tx),
      this.countByBatchAndStatus(batchId, CorporateCodeStatus.REVOKED, tx),
      this.countByBatchAndStatus(batchId, CorporateCodeStatus.EXPIRED, tx),
    ]);
    return { available, reserved, used, revoked, expired };
  }
}
