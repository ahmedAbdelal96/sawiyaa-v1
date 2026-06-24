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
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporatePresenter } from '../presenters/corporate.presenter';
import {
  CreateBenefitPlanUseCase,
  UpdateBenefitPlanUseCase,
  ListBenefitPlansUseCase,
} from '../use-cases/benefit-plan.use-cases';
import {
  CorporateCoverageType,
  CorporateBenefitPlanStatus,
} from '@prisma/client';

describe('Corporate Benefit Plan Use Cases', () => {
  let planRepository: jest.Mocked<CorporateBenefitPlanRepository>;
  let contractRepository: jest.Mocked<CorporateContractRepository>;
  let presenter: CorporatePresenter;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        CorporatePresenter,
        {
          provide: CorporateBenefitPlanRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            createWithRelations: jest.fn(),
            update: jest.fn(),
            updateWithRelations: jest.fn(),
            listByContract: jest.fn(),
            addSpecialties: jest.fn(),
            addPractitioners: jest.fn(),
            replaceSpecialties: jest.fn(),
            replacePractitioners: jest.fn(),
            validateSpecialtyIds: jest.fn(),
            validatePractitionerIds: jest.fn(),
          },
        },
        {
          provide: CorporateContractRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    presenter = module.get(CorporatePresenter);
    planRepository = module.get(CorporateBenefitPlanRepository);
    contractRepository = module.get(CorporateContractRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('CreateBenefitPlanUseCase', () => {
    let useCase: CreateBenefitPlanUseCase;

    beforeEach(() => {
      useCase = new CreateBenefitPlanUseCase(
        planRepository,
        contractRepository,
        presenter,
      );
    });

    it('rejects codeUsageLimit != 1 in V1', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FREE_SESSION,
          currency: 'EGP',
          codeUsageLimit: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects TTL < 5', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FREE_SESSION,
          currency: 'EGP',
          codeReservationTtlMinutes: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects TTL > 60', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FREE_SESSION,
          currency: 'EGP',
          codeReservationTtlMinutes: 120,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects DISCOUNT_PERCENT without coveragePercent', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.DISCOUNT_PERCENT,
          currency: 'EGP',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects DISCOUNT_PERCENT with coveragePercent < 1', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.DISCOUNT_PERCENT,
          coveragePercent: 0,
          currency: 'EGP',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects DISCOUNT_PERCENT with coveragePercent > 100', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.DISCOUNT_PERCENT,
          coveragePercent: 150,
          currency: 'EGP',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects FIXED_AMOUNT without maxCoverageAmount', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FIXED_AMOUNT,
          currency: 'EGP',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects FIXED_AMOUNT with maxCoverageAmount <= 0', async () => {
      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FIXED_AMOUNT,
          maxCoverageAmount: 0,
          currency: 'EGP',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects plan currency mismatch with contract currency', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        currency: 'EGP',
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      } as any);

      await expect(
        useCase.execute({
          contractId: 'contract-uuid',
          name: 'Test Plan',
          coverageType: CorporateCoverageType.FREE_SESSION,
          currency: 'USD',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts FREE_SESSION with coveragePercent = 100', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        currency: 'EGP',
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      } as any);
      planRepository.createWithRelations.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        coveragePercent: 100,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        coveragePercent: 100,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { codes: 0, sponsorships: 0 },
      } as any);

      const result = await useCase.execute({
        contractId: 'contract-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        coveragePercent: 100,
        currency: 'EGP',
      });

      expect(result).toBeDefined();
      expect(planRepository.createWithRelations).toHaveBeenCalled();
    });

    it('creates with specialty relations when specialtyIds provided', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        currency: 'EGP',
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      } as any);
      planRepository.validateSpecialtyIds.mockResolvedValue(true);
      planRepository.createWithRelations.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { codes: 0, sponsorships: 0 },
      } as any);

      const result = await useCase.execute({
        contractId: 'contract-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        specialtyIds: ['specialty-1', 'specialty-2'],
      });

      expect(result).toBeDefined();
      expect(planRepository.validateSpecialtyIds).toHaveBeenCalledWith([
        'specialty-1',
        'specialty-2',
      ]);
      expect(planRepository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          specialtyIds: ['specialty-1', 'specialty-2'],
        }),
      );
    });

    it('creates with practitioner relations when practitionerIds provided', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        currency: 'EGP',
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      } as any);
      planRepository.validatePractitionerIds.mockResolvedValue(true);
      planRepository.createWithRelations.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        codeUsageLimit: 1,
        codeReservationTtlMinutes: 15,
        status: CorporateBenefitPlanStatus.ACTIVE,
        contractId: 'contract-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { codes: 0, sponsorships: 0 },
      } as any);

      const result = await useCase.execute({
        contractId: 'contract-uuid',
        name: 'Test Plan',
        coverageType: CorporateCoverageType.FREE_SESSION,
        currency: 'EGP',
        practitionerIds: ['practitioner-1'],
      });

      expect(result).toBeDefined();
      expect(planRepository.validatePractitionerIds).toHaveBeenCalledWith([
        'practitioner-1',
      ]);
      expect(planRepository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ practitionerIds: ['practitioner-1'] }),
      );
    });
  });

  describe('UpdateBenefitPlanUseCase', () => {
    let useCase: UpdateBenefitPlanUseCase;

    beforeEach(() => {
      useCase = new UpdateBenefitPlanUseCase(planRepository, presenter);
    });

    it('rejects update when plan has generated codes', async () => {
      planRepository.findById.mockResolvedValue({
        id: 'plan-uuid',
        _count: { codes: 5, sponsorships: 0 },
      } as any);

      await expect(
        useCase.execute({
          id: 'plan-uuid',
          name: 'New Name',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ListBenefitPlansUseCase', () => {
    let useCase: ListBenefitPlansUseCase;

    beforeEach(() => {
      useCase = new ListBenefitPlansUseCase(
        planRepository,
        contractRepository,
        presenter,
      );
    });

    it('throws NotFoundException when contract does not exist', async () => {
      contractRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          contractId: 'non-existent-contract-id',
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns plans when contract exists', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        currency: 'EGP',
        organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      } as any);
      planRepository.listByContract.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await useCase.execute({
        contractId: 'contract-uuid',
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(planRepository.listByContract).toHaveBeenCalled();
    });
  });
});
