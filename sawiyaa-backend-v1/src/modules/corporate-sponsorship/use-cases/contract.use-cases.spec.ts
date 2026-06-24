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
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporatePresenter } from '../presenters/corporate.presenter';
import {
  ListContractsUseCase,
  CreateContractUseCase,
  UpdateContractStatusUseCase,
} from '../use-cases/contract.use-cases';
import { CorporateContractStatus, CorporateMarket } from '@prisma/client';

describe('Corporate Contract Use Cases', () => {
  let contractRepository: jest.Mocked<CorporateContractRepository>;
  let organizationRepository: jest.Mocked<CorporateOrganizationRepository>;
  let presenter: CorporatePresenter;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        CorporatePresenter,
        {
          provide: CorporateContractRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            listByOrganization: jest.fn(),
          },
        },
        {
          provide: CorporateOrganizationRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    presenter = module.get(CorporatePresenter);
    contractRepository = module.get(CorporateContractRepository);
    organizationRepository = module.get(CorporateOrganizationRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('CreateContractUseCase', () => {
    let useCase: CreateContractUseCase;

    beforeEach(() => {
      useCase = new CreateContractUseCase(contractRepository, presenter);
    });

    it('rejects endDate <= startDate', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-12-31',
          endDate: '2025-01-01',
          billingMode: 'PREPAID',
          currency: 'EGP',
          market: CorporateMarket.EGYPT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid currency format', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          billingMode: 'PREPAID',
          currency: 'egp',
          market: CorporateMarket.EGYPT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects EGYPT market with non-EGP currency', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          billingMode: 'PREPAID',
          currency: 'USD',
          market: CorporateMarket.EGYPT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects INTERNATIONAL market with non-USD currency', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          billingMode: 'PREPAID',
          currency: 'EGP',
          market: CorporateMarket.INTERNATIONAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks POSTPAID billing mode in V1', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          billingMode: 'POSTPAID',
          currency: 'EGP',
          market: CorporateMarket.EGYPT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks HYBRID billing mode in V1', async () => {
      await expect(
        useCase.execute({
          organizationId: 'org-uuid',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          billingMode: 'HYBRID',
          currency: 'USD',
          market: CorporateMarket.INTERNATIONAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts valid PREPAID contract for EGYPT', async () => {
      contractRepository.create.mockResolvedValue({
        id: 'contract-uuid',
        organizationId: 'org-uuid',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        status: CorporateContractStatus.DRAFT,
        billingMode: 'PREPAID',
        currency: 'EGP',
        market: CorporateMarket.EGYPT,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await useCase.execute({
        organizationId: 'org-uuid',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        billingMode: 'PREPAID',
        currency: 'EGP',
        market: CorporateMarket.EGYPT,
      });

      expect(result).toBeDefined();
      expect(contractRepository.create).toHaveBeenCalled();
    });
  });

  describe('ListContractsUseCase', () => {
    let useCase: ListContractsUseCase;

    beforeEach(() => {
      useCase = new ListContractsUseCase(
        contractRepository,
        organizationRepository,
        presenter,
      );
    });

    it('throws NotFoundException when organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          organizationId: 'non-existent-org-id',
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns contracts when organization exists', async () => {
      organizationRepository.findById.mockResolvedValue({
        id: 'org-uuid',
        name: 'Test Org',
        companyCode: 'TST',
      } as any);
      contractRepository.listByOrganization.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await useCase.execute({
        organizationId: 'org-uuid',
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(contractRepository.listByOrganization).toHaveBeenCalled();
    });
  });

  describe('UpdateContractStatusUseCase', () => {
    let useCase: UpdateContractStatusUseCase;

    beforeEach(() => {
      useCase = new UpdateContractStatusUseCase(contractRepository, presenter);
    });

    it('allows DRAFT -> ACTIVE transition', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        status: CorporateContractStatus.DRAFT,
        endDate: new Date('2025-12-31'),
      } as any);
      contractRepository.updateStatus.mockResolvedValue({
        id: 'contract-uuid',
        status: CorporateContractStatus.ACTIVE,
      } as any);

      const result = await useCase.execute({
        id: 'contract-uuid',
        status: CorporateContractStatus.ACTIVE,
      });

      expect(result.status).toBe(CorporateContractStatus.ACTIVE);
    });

    it('rejects invalid transition DRAFT -> EXPIRED', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        status: CorporateContractStatus.DRAFT,
        endDate: new Date('2025-12-31'),
      } as any);

      await expect(
        useCase.execute({
          id: 'contract-uuid',
          status: CorporateContractStatus.EXPIRED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects forcing EXPIRED before endDate', async () => {
      contractRepository.findById.mockResolvedValue({
        id: 'contract-uuid',
        status: CorporateContractStatus.ACTIVE,
        endDate: new Date('2099-12-31'),
      } as any);

      await expect(
        useCase.execute({
          id: 'contract-uuid',
          status: CorporateContractStatus.EXPIRED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
