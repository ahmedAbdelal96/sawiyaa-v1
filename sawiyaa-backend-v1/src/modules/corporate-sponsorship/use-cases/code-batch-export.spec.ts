import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CorporateCodeBatchRepository } from '../repositories/corporate-code-batch.repository';
import {
  GenerateCodeBatchUseCase,
  ListCodeBatchesUseCase,
  GetCodeBatchUseCase,
  RevokeCodeBatchUseCase,
} from './code-batch.use-cases';
import { CorporateCodeHashService } from '../services/corporate-code-hash.service';
import { CorporateCodeGeneratorService } from '../services/corporate-code-generator.service';
import {
  CorporateBenefitPlanStatus,
  CorporateContractStatus,
  CorporateOrganizationStatus,
  CorporateBatchStatus,
  CorporateBillingMode,
} from '@prisma/client';

const TEST_PEPPER = 'test_corporate_pepper_32chars_min!!';

describe('Corporate Code Batch Use Cases', () => {
  let planRepo: jest.Mocked<CorporateBenefitPlanRepository>;
  let batchRepo: jest.Mocked<CorporateCodeBatchRepository>;
  let hashSvc: CorporateCodeHashService;
  let generator: CorporateCodeGeneratorService;

  beforeEach(async () => {
    hashSvc = new CorporateCodeHashService();
    Object.defineProperty(hashSvc, 'pepper', {
      value: TEST_PEPPER,
      writable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateCodeGeneratorService,
        {
          provide: CorporateBenefitPlanRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CorporateCodeBatchRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            createCode: jest.fn(),
            codeHashExists: jest.fn(),
            updateBatchGeneratedCount: jest.fn(),
            listByPlan: jest.fn(),
            getCodeStatusCounts: jest.fn(),
            revokeAvailableCodesInBatch: jest.fn(),
          },
        },
      ],
    }).compile();

    planRepo = module.get(CorporateBenefitPlanRepository);
    batchRepo = module.get(CorporateCodeBatchRepository);
    generator = module.get(CorporateCodeGeneratorService);
  });

  describe('Plain code isolation', () => {
    it('stores only hash/prefix/last4 in DB - codeHash is 64-char hex, not FYD-', async () => {
      batchRepo.create.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        generatedCount: 0,
        status: CorporateBatchStatus.GENERATING,
      } as never);
      batchRepo.update.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
        generatedCount: 2,
      } as never);
      batchRepo.createCode.mockResolvedValue({} as never);
      batchRepo.codeHashExists.mockResolvedValue(false as never);

      planRepo.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        status: CorporateBenefitPlanStatus.ACTIVE,
        currency: 'EGP',
        maxCoverageAmount: null,
        coveragePercent: 100,
        coverageType: 'FREE_SESSION',
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          billingMode: CorporateBillingMode.PREPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.ACTIVE,
          },
        },
      } as never);

      const useCase = new GenerateCodeBatchUseCase(
        planRepo,
        batchRepo,
        hashSvc,
        generator,
      );

      await useCase.execute({
        benefitPlanId: 'plan-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        createdByAdminId: 'admin-uuid',
      });

      const calls = batchRepo.createCode.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        const data = call[0] as {
          codeHash: string;
          codePrefix: string;
          codeLast4: string;
        };
        expect(data.codeHash).toHaveLength(64);
        expect(data.codeHash).toMatch(/^[a-f0-9]{64}$/);
        expect(data.codeHash).not.toMatch(/^FYD-/);
        expect(data.codePrefix).toMatch(/^FYD-.{4}$/);
        expect(data.codeLast4).toHaveLength(4);
        expect(data).not.toHaveProperty('rawCode');
        expect(data).not.toHaveProperty('benefitCode');
        expect(data).not.toHaveProperty('code');
      }
    });

    it('csvContent contains FYD- codes, CSV header has benefitCode', async () => {
      batchRepo.create.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        generatedCount: 0,
        status: CorporateBatchStatus.GENERATING,
      } as never);
      batchRepo.update.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
        generatedCount: 2,
      } as never);
      batchRepo.createCode.mockResolvedValue({} as never);
      batchRepo.codeHashExists.mockResolvedValue(false as never);

      planRepo.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        status: CorporateBenefitPlanStatus.ACTIVE,
        currency: 'EGP',
        maxCoverageAmount: null,
        coveragePercent: 100,
        coverageType: 'FREE_SESSION',
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          billingMode: CorporateBillingMode.PREPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.ACTIVE,
          },
        },
      } as never);

      const useCase = new GenerateCodeBatchUseCase(
        planRepo,
        batchRepo,
        hashSvc,
        generator,
      );

      const result = await useCase.execute({
        benefitPlanId: 'plan-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        createdByAdminId: 'admin-uuid',
      });

      expect(result.csvContent).toContain('FYD-');
      expect(result.csvContent).toContain('benefitCode');
    });

    it('result uses csvContent not csvData (no JSON API data property)', async () => {
      batchRepo.create.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 1,
        generatedCount: 0,
        status: CorporateBatchStatus.GENERATING,
      } as never);
      batchRepo.update.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
        generatedCount: 1,
      } as never);
      batchRepo.createCode.mockResolvedValue({} as never);
      batchRepo.codeHashExists.mockResolvedValue(false as never);

      planRepo.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        status: CorporateBenefitPlanStatus.ACTIVE,
        currency: 'EGP',
        maxCoverageAmount: null,
        coveragePercent: 100,
        coverageType: 'FREE_SESSION',
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          billingMode: CorporateBillingMode.PREPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.ACTIVE,
          },
        },
      } as never);

      const useCase = new GenerateCodeBatchUseCase(
        planRepo,
        batchRepo,
        hashSvc,
        generator,
      );

      const result = await useCase.execute({
        benefitPlanId: 'plan-uuid',
        name: 'Batch 1',
        totalCodes: 1,
        createdByAdminId: 'admin-uuid',
      });

      expect(result).toHaveProperty('csvContent');
      expect(result).not.toHaveProperty('csvData');
    });
  });

  describe('GetCodeBatchUseCase', () => {
    it('response does not contain full code or codeHash', async () => {
      batchRepo.findById.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        organizationId: 'org-uuid',
        contractId: 'contract-uuid',
        benefitPlanId: 'plan-uuid',
        totalCodes: 1,
        generatedCount: 1,
        status: CorporateBatchStatus.ACTIVE,
        createdByAdminId: 'admin-uuid',
        exportedAt: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          currency: 'EGP',
          billingMode: CorporateBillingMode.PREPAID,
        },
        benefitPlan: {
          id: 'plan-uuid',
          name: 'Plan 1',
          status: CorporateBenefitPlanStatus.ACTIVE,
          coverageType: 'FREE_SESSION',
        },
      } as never);
      batchRepo.getCodeStatusCounts.mockResolvedValue({
        available: 1,
        reserved: 0,
        used: 0,
        revoked: 0,
        expired: 0,
      } as never);

      const useCase = new GetCodeBatchUseCase(batchRepo);
      const result = await useCase.execute('batch-uuid');

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('FYD-');
      expect(resultStr).not.toContain('codeHash');
      expect(result).not.toHaveProperty('csvContent');
      expect(result).not.toHaveProperty('csvData');
    });
  });

  describe('ListCodeBatchesUseCase', () => {
    it('list result does not contain full codes', async () => {
      batchRepo.listByPlan.mockResolvedValue({
        items: [
          {
            id: 'batch-uuid',
            organizationId: 'org-uuid',
            contractId: 'contract-uuid',
            benefitPlanId: 'plan-uuid',
            name: 'Batch 1',
            totalCodes: 1,
            generatedCount: 1,
            status: CorporateBatchStatus.ACTIVE,
            createdByAdminId: 'admin-uuid',
            exportedAt: null,
            revokedAt: null,
            revokeReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: {
              id: 'org-uuid',
              name: 'Test Org',
              companyCode: 'TST',
            },
            contract: {
              id: 'contract-uuid',
              status: CorporateContractStatus.ACTIVE,
              currency: 'EGP',
              billingMode: CorporateBillingMode.PREPAID,
            },
            benefitPlan: {
              id: 'plan-uuid',
              name: 'Plan 1',
              status: CorporateBenefitPlanStatus.ACTIVE,
              coverageType: 'FREE_SESSION',
            },
          },
        ],
        total: 1,
      } as never);
      batchRepo.getCodeStatusCounts.mockResolvedValue({
        available: 1,
        reserved: 0,
        used: 0,
        revoked: 0,
        expired: 0,
      } as never);

      const useCase = new ListCodeBatchesUseCase(batchRepo);
      const result = await useCase.execute({
        benefitPlanId: 'plan-uuid',
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortDirection: 'desc' as const,
      });

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('FYD-');
      expect(resultStr).not.toContain('codeHash');
      expect(result).not.toHaveProperty('csvContent');
      expect(result).not.toHaveProperty('csvData');
    });
  });

  describe('RevokeCodeBatchUseCase', () => {
    it('revoke result does not contain full codes', async () => {
      batchRepo.findById.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
      } as never);
      batchRepo.revokeAvailableCodesInBatch.mockResolvedValue({
        count: 5,
      } as never);
      batchRepo.update.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        status: CorporateBatchStatus.REVOKED,
        revokedAt: new Date(),
        revokeReason: 'Test',
      } as never);
      batchRepo.getCodeStatusCounts.mockResolvedValue({
        available: 0,
        reserved: 0,
        used: 0,
        revoked: 5,
        expired: 0,
      } as never);

      const useCase = new RevokeCodeBatchUseCase(batchRepo);
      const result = await useCase.execute({
        batchId: 'batch-uuid',
        revokedByAdminId: 'admin-uuid',
        revokeReason: 'Test',
      });

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('FYD-');
      expect(resultStr).not.toContain('codeHash');
      expect(result).not.toHaveProperty('csvContent');
      expect(result).not.toHaveProperty('csvData');
    });
  });
});
