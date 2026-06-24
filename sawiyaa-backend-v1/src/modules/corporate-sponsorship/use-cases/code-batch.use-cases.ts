import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CorporateCodeBatchRepository } from '../repositories/corporate-code-batch.repository';
import { CorporateCodeHashService } from '../services/corporate-code-hash.service';
import { CorporateCodeGeneratorService } from '../services/corporate-code-generator.service';
import {
  CorporateBenefitPlanStatus,
  CorporateContractStatus,
  CorporateOrganizationStatus,
  CorporateBatchStatus,
  CorporateBillingMode,
} from '@prisma/client';

interface GenerateCodeBatchInput {
  benefitPlanId: string;
  name: string;
  totalCodes: number;
  expiresAt?: string;
  createdByAdminId: string;
}

interface GenerateCodeBatchResult {
  batchId: string;
  name: string;
  totalCodes: number;
  generatedCount: number;
  status: CorporateBatchStatus;
  expiresAt?: string;
  csvContent: string;
}

const CHUNK_SIZE = 1000;
const MAX_HASH_COLLISION_RETRIES = 5;

@Injectable()
export class GenerateCodeBatchUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly batchRepository: CorporateCodeBatchRepository,
    private readonly hashService: CorporateCodeHashService,
    private readonly generator: CorporateCodeGeneratorService,
  ) {}

  async execute(input: GenerateCodeBatchInput): Promise<GenerateCodeBatchResult> {
    if (input.totalCodes < 1) {
      throw new BadRequestException('totalCodes must be at least 1');
    }
    if (input.totalCodes > 100000) {
      throw new BadRequestException('totalCodes cannot exceed 100000');
    }

    if (input.expiresAt) {
      const expiresDate = new Date(input.expiresAt);
      if (expiresDate <= new Date()) {
        throw new BadRequestException('expiresAt must be a future date');
      }
    }

    const plan = await this.planRepository.findById(input.benefitPlanId);
    if (!plan) {
      throw new NotFoundException(`Benefit plan with ID ${input.benefitPlanId} not found`);
    }

    if (plan.status !== CorporateBenefitPlanStatus.ACTIVE) {
      throw new BadRequestException('Benefit plan must be ACTIVE to generate codes');
    }

    if (plan.contract.status !== CorporateContractStatus.ACTIVE) {
      throw new BadRequestException('Contract must be ACTIVE to generate codes');
    }

    if (plan.contract.organization.status !== CorporateOrganizationStatus.ACTIVE) {
      throw new BadRequestException('Organization must be ACTIVE to generate codes');
    }

    if (plan.contract.billingMode !== CorporateBillingMode.PREPAID) {
      throw new BadRequestException('Only PREPAID contracts support code generation in V1');
    }

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;

    const batch = await this.batchRepository.create({
      organizationId: plan.contract.organization.id,
      contractId: plan.contractId,
      benefitPlanId: plan.id,
      name: input.name,
      totalCodes: input.totalCodes,
      expiresAt,
      createdByAdminId: input.createdByAdminId,
    });

    try {
      const generatedCodes = await this.generateCodesInChunks(
        batch.id,
        plan.contract.organization.companyCode,
        plan.contractId,
        plan.id,
        plan.contract.organization.id,
        input.totalCodes,
        expiresAt,
      );

      const csvContent = this.buildCsv(
        plan.contract.organization.name,
        plan.contract.organization.companyCode,
        plan.name,
        plan.coverageType,
        plan.currency,
        plan.maxCoverageAmount ? Number(plan.maxCoverageAmount) : null,
        plan.coveragePercent,
        generatedCodes,
        expiresAt,
      );

      await this.batchRepository.update(batch.id, {
        status: CorporateBatchStatus.ACTIVE,
        generatedCount: generatedCodes.length,
        exportedAt: new Date(),
        exportedByAdminId: input.createdByAdminId,
      });

      return {
        batchId: batch.id,
        name: batch.name,
        totalCodes: input.totalCodes,
        generatedCount: generatedCodes.length,
        status: CorporateBatchStatus.ACTIVE,
        expiresAt: input.expiresAt,
        csvContent,
      };
    } catch (error) {
      await this.batchRepository.update(batch.id, {
        status: CorporateBatchStatus.FAILED,
      });
      throw error;
    }
  }

  private async generateCodesInChunks(
    batchId: string,
    companyCode: string,
    contractId: string,
    planId: string,
    organizationId: string,
    totalCodes: number,
    expiresAt?: Date,
  ): Promise<Array<{ rawCode: string; prefix: string; last4: string }>> {
    const generatedCodes: Array<{ rawCode: string; prefix: string; last4: string }> = [];
    let attempt = 0;

    for (let i = 0; i < totalCodes; i++) {
      let code = this.generator.generateCode();
      let retries = 0;

      while (retries < MAX_HASH_COLLISION_RETRIES) {
        const { codeHash, pepperVersion } = this.hashService.hashCode(companyCode, code.rawCode);
        const exists = await this.batchRepository.codeHashExists(codeHash);

        if (!exists) {
          await this.batchRepository.createCode({
            organizationId,
            contractId,
            benefitPlanId: planId,
            batchId,
            codeHash,
            codePrefix: code.prefix,
            codeLast4: code.last4,
            pepperVersion,
            usageLimit: 1,
            expiresAt,
          });

          generatedCodes.push({ rawCode: code.rawCode, prefix: code.prefix, last4: code.last4 });
          break;
        }

        retries++;
        code = this.generator.generateCode();
      }

      if (retries >= MAX_HASH_COLLISION_RETRIES) {
        throw new Error(`Failed to generate unique code after ${MAX_HASH_COLLISION_RETRIES} retries`);
      }

      attempt++;
      if (attempt % CHUNK_SIZE === 0) {
        await this.batchRepository.updateBatchGeneratedCount(batchId, attempt);
      }
    }

    return generatedCodes;
  }

  private buildCsv(
    orgName: string,
    companyCode: string,
    batchName: string,
    coverageType: string,
    currency: string,
    maxCoverageAmount: number | null,
    coveragePercent: number | null,
    codes: Array<{ rawCode: string; prefix: string; last4: string }>,
    expiresAt?: Date,
  ): string {
    const headers = [
      'organizationName',
      'companyCode',
      'batchName',
      'benefitCode',
      'expiresAt',
      'coverageType',
      'currency',
      'maxCoverageAmount',
      'coveragePercent',
    ];

    const rows = codes.map((code) => [
      `"${orgName.replace(/"/g, '""')}"`,
      `"${companyCode}"`,
      `"${batchName.replace(/"/g, '""')}"`,
      code.rawCode,
      expiresAt ? expiresAt.toISOString() : '',
      coverageType,
      currency,
      maxCoverageAmount !== null ? maxCoverageAmount.toString() : '',
      coveragePercent !== null ? coveragePercent.toString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

// --- List Code Batches ---

interface ListCodeBatchesInput {
  benefitPlanId: string;
  status?: CorporateBatchStatus;
  page: number;
  limit: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface ListCodeBatchesResult {
  items: Array<{
    id: string;
    organizationId: string;
    organizationName: string;
    companyCode: string;
    contractId: string;
    benefitPlanId: string;
    name: string;
    totalCodes: number;
    generatedCount: number;
    expiresAt?: string;
    status: CorporateBatchStatus;
    exportedAt?: string;
    createdAt: string;
    updatedAt: string;
    revokedAt?: string;
    revokeReason?: string;
    statusCounts: {
      available: number;
      reserved: number;
      used: number;
      revoked: number;
      expired: number;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListCodeBatchesUseCase {
  constructor(
    private readonly batchRepository: CorporateCodeBatchRepository,
  ) {}

  async execute(input: ListCodeBatchesInput): Promise<ListCodeBatchesResult> {
    const { items, total } = await this.batchRepository.listByPlan({
      benefitPlanId: input.benefitPlanId,
      status: input.status,
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });

    const itemsWithCounts = await Promise.all(
      items.map(async (batch) => {
        const statusCounts = await this.batchRepository.getCodeStatusCounts(batch.id);
        return {
          id: batch.id,
          organizationId: batch.organizationId,
          organizationName: batch.organization.name,
          companyCode: batch.organization.companyCode,
          contractId: batch.contractId,
          benefitPlanId: batch.benefitPlanId,
          name: batch.name,
          totalCodes: batch.totalCodes,
          generatedCount: batch.generatedCount,
          expiresAt: batch.expiresAt?.toISOString(),
          status: batch.status,
          exportedAt: batch.exportedAt?.toISOString(),
          createdAt: batch.createdAt.toISOString(),
          updatedAt: batch.updatedAt.toISOString(),
          revokedAt: batch.revokedAt?.toISOString(),
          revokeReason: batch.revokeReason ?? undefined,
          statusCounts,
        };
      }),
    );

    return {
      items: itemsWithCounts,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit),
    };
  }
}

// --- Get Code Batch ---

@Injectable()
export class GetCodeBatchUseCase {
  constructor(
    private readonly batchRepository: CorporateCodeBatchRepository,
  ) {}

  async execute(batchId: string) {
    const batch = await this.batchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Code batch with ID ${batchId} not found`);
    }

    const statusCounts = await this.batchRepository.getCodeStatusCounts(batchId);

    return {
      id: batch.id,
      organizationId: batch.organizationId,
      organizationName: batch.organization.name,
      companyCode: batch.organization.companyCode,
      contractId: batch.contractId,
      benefitPlanId: batch.benefitPlanId,
      name: batch.name,
      totalCodes: batch.totalCodes,
      generatedCount: batch.generatedCount,
      expiresAt: batch.expiresAt?.toISOString(),
      status: batch.status,
      exportedAt: batch.exportedAt?.toISOString(),
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      revokedAt: batch.revokedAt?.toISOString(),
      revokeReason: batch.revokeReason ?? undefined,
      statusCounts,
    };
  }
}

// --- Revoke Code Batch ---

interface RevokeCodeBatchInput {
  batchId: string;
  revokedByAdminId: string;
  revokeReason?: string;
}

@Injectable()
export class RevokeCodeBatchUseCase {
  constructor(
    private readonly batchRepository: CorporateCodeBatchRepository,
  ) {}

  async execute(input: RevokeCodeBatchInput) {
    const batch = await this.batchRepository.findById(input.batchId);
    if (!batch) {
      throw new NotFoundException(`Code batch with ID ${input.batchId} not found`);
    }

    if (batch.status === CorporateBatchStatus.REVOKED) {
      throw new BadRequestException('Batch is already revoked');
    }

    if (batch.status === CorporateBatchStatus.FAILED) {
      throw new BadRequestException('Cannot revoke a failed batch');
    }

    if (batch.status === CorporateBatchStatus.GENERATING) {
      throw new BadRequestException('Cannot revoke a batch that is still generating');
    }

    const revokeResult = await this.batchRepository.revokeAvailableCodesInBatch(
      input.batchId,
      input.revokedByAdminId,
      input.revokeReason ?? 'Batch revoked by admin',
    );

    const updatedBatch = await this.batchRepository.update(input.batchId, {
      status: CorporateBatchStatus.REVOKED,
      revokedAt: new Date(),
      revokedByAdminId: input.revokedByAdminId,
      revokeReason: input.revokeReason,
    });

    const statusCounts = await this.batchRepository.getCodeStatusCounts(input.batchId);

    return {
      id: updatedBatch.id,
      name: updatedBatch.name,
      status: updatedBatch.status,
      revokedAt: updatedBatch.revokedAt?.toISOString(),
      revokeReason: updatedBatch.revokeReason ?? undefined,
      revokedCodesCount: revokeResult.count,
      statusCounts,
    };
  }
}
