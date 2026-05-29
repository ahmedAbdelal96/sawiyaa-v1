/* eslint-disable @typescript-eslint/unbound-method */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CorporateCodeBatchRepository } from '../repositories/corporate-code-batch.repository';
import { CorporateCodeHashService } from '../services/corporate-code-hash.service';
import { CorporateCodeGeneratorService } from '../services/corporate-code-generator.service';
import {
  GenerateCodeBatchUseCase,
  ListCodeBatchesUseCase,
  RevokeCodeBatchUseCase,
} from '../use-cases/code-batch.use-cases';
import {
  CorporateBenefitPlanStatus,
  CorporateContractStatus,
  CorporateOrganizationStatus,
  CorporateBatchStatus,
  CorporateBillingMode,
} from '@prisma/client';

const TEST_PEPPER = 'test_corporate_pepper_32chars_min!!';

describe('Corporate Code Batch Use Cases', () => {
  let planRepository: jest.Mocked<CorporateBenefitPlanRepository>;
  let batchRepository: jest.Mocked<CorporateCodeBatchRepository>;
  let hashService: CorporateCodeHashService;
  let generator: CorporateCodeGeneratorService;
  let module: TestingModule;

  beforeEach(async () => {
    // Create a real hash service with test pepper
    hashService = new CorporateCodeHashService();
    Object.defineProperty(hashService, 'pepper', {
      value: TEST_PEPPER,
      writable: true,
    });

    module = await Test.createTestingModule({
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

    generator = module.get(CorporateCodeGeneratorService);
    planRepository = module.get(CorporateBenefitPlanRepository);
    batchRepository = module.get(CorporateCodeBatchRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  // --- CorporateCodeHashService unit tests ---
  describe('CorporateCodeHashService', () => {
    it('generates consistent hash for same inputs', () => {
      const result1 = hashService.hashCode('TST001', 'FYD-ABCD-EFGH-IJKL');
      const result2 = hashService.hashCode('TST001', 'FYD-ABCD-EFGH-IJKL');
      expect(result1.codeHash).toBe(result2.codeHash);
      expect(result1.codeHash).toHaveLength(64);
      expect(result1.pepperVersion).toBe(1);
    });

    it('produces different hash for different company codes', () => {
      const result1 = hashService.hashCode('TST001', 'FYD-ABCD-EFGH-IJKL');
      const result2 = hashService.hashCode('TST002', 'FYD-ABCD-EFGH-IJKL');
      expect(result1.codeHash).not.toBe(result2.codeHash);
    });

    it('normalizes code: uppercase and remove hyphens', () => {
      const result1 = hashService.hashCode('TST001', 'fyd-abcd-efgh-ijkl');
      const result2 = hashService.hashCode('TST001', 'FYD-ABCD-EFGH-IJKL');
      expect(result1.codeHash).toBe(result2.codeHash);
    });

    it('verifyCode returns true for valid code', () => {
      const { codeHash, pepperVersion } = hashService.hashCode(
        'TST001',
        'FYD-ABCD-EFGH-IJKL',
      );
      expect(
        hashService.verifyCode(
          'TST001',
          'FYD-ABCD-EFGH-IJKL',
          codeHash,
          pepperVersion,
        ),
      ).toBe(true);
    });

    it('verifyCode returns false for wrong code', () => {
      const { codeHash, pepperVersion } = hashService.hashCode(
        'TST001',
        'FYD-ABCD-EFGH-IJKL',
      );
      expect(
        hashService.verifyCode(
          'TST001',
          'FYD-WXYZ-1234-5678',
          codeHash,
          pepperVersion,
        ),
      ).toBe(false);
    });
  });

  // --- CorporateCodeGeneratorService unit tests ---
  describe('CorporateCodeGeneratorService', () => {
    it('generates codes in FYD-XXXX-XXXX-XXXX format', () => {
      const code = generator.generateCode();
      expect(code.rawCode).toMatch(/^FYD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generator.generateCode().rawCode);
      }
      expect(codes.size).toBe(100);
    });

    it('extracts correct prefix and last4', () => {
      const code = generator.generateCode();
      expect(code.prefix).toBe(code.rawCode.substring(0, 8));
      expect(code.last4).toBe(code.rawCode.substring(code.rawCode.length - 4));
    });
  });

  // --- GenerateCodeBatchUseCase tests ---
  describe('GenerateCodeBatchUseCase', () => {
    let useCase: GenerateCodeBatchUseCase;

    beforeEach(() => {
      useCase = new GenerateCodeBatchUseCase(
        planRepository,
        batchRepository,
        hashService,
        generator,
      );
    });

    it('rejects inactive plan', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.SUSPENDED,
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
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 5,
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive contract', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.ACTIVE,
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.EXPIRED,
          billingMode: CorporateBillingMode.PREPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.ACTIVE,
          },
        },
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 5,
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive organization', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.ACTIVE,
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          billingMode: CorporateBillingMode.PREPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.SUSPENDED,
          },
        },
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 5,
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-PREPAID contract', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.ACTIVE,
        contract: {
          id: 'contract-uuid',
          status: CorporateContractStatus.ACTIVE,
          billingMode: CorporateBillingMode.POSTPAID,
          organization: {
            id: 'org-uuid',
            name: 'Test Org',
            companyCode: 'TST',
            status: CorporateOrganizationStatus.ACTIVE,
          },
        },
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 5,
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects totalCodes > 100000', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.ACTIVE,
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
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 100001,
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects past expiresAt', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        status: CorporateBenefitPlanStatus.ACTIVE,
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
      } as any);

      await expect(
        useCase.execute({
          benefitPlanId: 'plan-uuid',
          name: 'Batch 1',
          totalCodes: 5,
          expiresAt: '2020-01-01',
          createdByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates batch successfully with 5 codes', async () => {
      planRepository.findById.mockResolvedValue({
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
      } as any);

      batchRepository.create.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 5,
        generatedCount: 0,
        status: CorporateBatchStatus.GENERATING,
      } as any);

      batchRepository.codeHashExists.mockResolvedValue(false);
      batchRepository.createCode.mockResolvedValue({} as any);
      batchRepository.update.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 5,
        generatedCount: 5,
        status: CorporateBatchStatus.ACTIVE,
      } as any);

      const result = await useCase.execute({
        benefitPlanId: 'plan-uuid',
        name: 'Batch 1',
        totalCodes: 5,
        createdByAdminId: 'admin-uuid',
      });

      expect(result.batchId).toBe('batch-uuid');
      expect(result.generatedCount).toBe(5);
      expect(result.status).toBe(CorporateBatchStatus.ACTIVE);
      expect(result.csvContent).toContain('benefitCode');
      expect(result.csvContent).toContain('FYD-');
    });

    it('stores only hash, prefix, last4 - not plain code', async () => {
      planRepository.findById.mockResolvedValue({
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
      } as any);

      batchRepository.create.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        generatedCount: 0,
        status: CorporateBatchStatus.GENERATING,
      } as any);

      batchRepository.codeHashExists.mockResolvedValue(false);
      batchRepository.createCode.mockResolvedValue({} as any);
      batchRepository.update.mockResolvedValue({
        id: 'batch-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        generatedCount: 2,
        status: CorporateBatchStatus.ACTIVE,
      } as any);

      await useCase.execute({
        benefitPlanId: 'plan-uuid',
        name: 'Batch 1',
        totalCodes: 2,
        createdByAdminId: 'admin-uuid',
      });

      // Verify createCode was called with codeHash, not rawCode
      const createCodeCalls = batchRepository.createCode.mock.calls;
      for (const call of createCodeCalls) {
        const [data] = call;
        expect(data.codeHash).toHaveLength(64);
        expect(data.codePrefix).toMatch(/^FYD-.{4}$/);
        expect(data.codeLast4).toHaveLength(4);
        expect(data.codeHash).not.toMatch(/^FYD-/);
      }
    });
  });

  // --- ListCodeBatchesUseCase tests ---
  describe('ListCodeBatchesUseCase', () => {
    let useCase: ListCodeBatchesUseCase;

    beforeEach(() => {
      useCase = new ListCodeBatchesUseCase(batchRepository);
    });

    it('returns paginated list with status counts', async () => {
      batchRepository.listByPlan.mockResolvedValue({
        items: [
          {
            id: 'batch-uuid',
            organizationId: 'org-uuid',
            organization: {
              id: 'org-uuid',
              name: 'Test Org',
              companyCode: 'TST',
            },
            contractId: 'contract-uuid',
            contract: {
              id: 'contract-uuid',
              status: CorporateContractStatus.ACTIVE,
              currency: 'EGP',
              billingMode: CorporateBillingMode.PREPAID,
            },
            benefitPlanId: 'plan-uuid',
            benefitPlan: {
              id: 'plan-uuid',
              name: 'Plan 1',
              status: CorporateBenefitPlanStatus.ACTIVE,
              coverageType: 'FREE_SESSION',
            },
            name: 'Batch 1',
            totalCodes: 10,
            generatedCount: 10,
            expiresAt: null,
            status: CorporateBatchStatus.ACTIVE,
            createdByAdminId: 'admin-uuid',
            exportedAt: null,
            exportedByAdminId: null,
            revokedAt: null,
            revokedByAdminId: null,
            revokeReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { codes: 10 },
          },
        ],
        total: 1,
      });

      batchRepository.getCodeStatusCounts.mockResolvedValue({
        available: 8,
        reserved: 0,
        used: 2,
        revoked: 0,
        expired: 0,
      });

      const result = await useCase.execute({
        benefitPlanId: 'plan-uuid',
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].statusCounts.available).toBe(8);
      expect(result.total).toBe(1);
    });
  });

  // --- RevokeCodeBatchUseCase tests ---
  describe('RevokeCodeBatchUseCase', () => {
    let useCase: RevokeCodeBatchUseCase;

    beforeEach(() => {
      useCase = new RevokeCodeBatchUseCase(batchRepository);
    });

    it('revokes AVAILABLE codes in batch', async () => {
      batchRepository.findById.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
      } as any);

      batchRepository.revokeAvailableCodesInBatch.mockResolvedValue({
        count: 5,
      } as any);
      batchRepository.update.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.REVOKED,
        revokedAt: new Date(),
        revokeReason: 'Admin requested',
      } as any);
      batchRepository.getCodeStatusCounts.mockResolvedValue({
        available: 0,
        reserved: 0,
        used: 2,
        revoked: 5,
        expired: 0,
      });

      const result = await useCase.execute({
        batchId: 'batch-uuid',
        revokedByAdminId: 'admin-uuid',
        revokeReason: 'Admin requested',
      });

      expect(result.status).toBe(CorporateBatchStatus.REVOKED);
      expect(result.revokedCodesCount).toBe(5);
      expect(batchRepository.revokeAvailableCodesInBatch).toHaveBeenCalledWith(
        'batch-uuid',
        'admin-uuid',
        'Admin requested',
      );
    });

    it('does not revoke USED codes', async () => {
      batchRepository.findById.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.ACTIVE,
      } as any);

      batchRepository.revokeAvailableCodesInBatch.mockResolvedValue({
        count: 0,
      } as any); // all USED
      batchRepository.update.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.REVOKED,
      } as any);
      batchRepository.getCodeStatusCounts.mockResolvedValue({
        available: 0,
        reserved: 0,
        used: 5,
        revoked: 0,
        expired: 0,
      });

      const result = await useCase.execute({
        batchId: 'batch-uuid',
        revokedByAdminId: 'admin-uuid',
      });

      expect(result.revokedCodesCount).toBe(0);
      expect(result.statusCounts.used).toBe(5); // USED codes remain
    });

    it('rejects already revoked batch', async () => {
      batchRepository.findById.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.REVOKED,
      } as any);

      await expect(
        useCase.execute({
          batchId: 'batch-uuid',
          revokedByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects GENERATING batch', async () => {
      batchRepository.findById.mockResolvedValue({
        id: 'batch-uuid',
        status: CorporateBatchStatus.GENERATING,
      } as any);

      await expect(
        useCase.execute({
          batchId: 'batch-uuid',
          revokedByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing batch', async () => {
      batchRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          batchId: 'non-existent',
          revokedByAdminId: 'admin-uuid',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
