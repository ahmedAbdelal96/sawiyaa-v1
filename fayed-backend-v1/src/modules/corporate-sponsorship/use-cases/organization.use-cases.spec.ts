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
import { BadRequestException } from '@nestjs/common';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporatePresenter } from '../presenters/corporate.presenter';
import {
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  ListOrganizationsUseCase,
} from '../use-cases/organization.use-cases';
import { CorporateOrganizationStatus } from '@prisma/client';

describe('Corporate Organization Use Cases', () => {
  let presenter: CorporatePresenter;
  let repository: jest.Mocked<CorporateOrganizationRepository>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        CorporatePresenter,
        {
          provide: CorporateOrganizationRepository,
          useValue: {
            findByCompanyCode: jest.fn(),
            findById: jest.fn(),
            findByIdWithActiveContracts: jest.fn(),
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    presenter = module.get(CorporatePresenter);
    repository = module.get(CorporateOrganizationRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('CreateOrganizationUseCase', () => {
    let useCase: CreateOrganizationUseCase;

    beforeEach(() => {
      useCase = new CreateOrganizationUseCase(repository, presenter);
    });

    it('normalizes companyCode to uppercase', async () => {
      repository.findByCompanyCode.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: 'uuid-1',
        name: 'ACME Corp',
        companyCode: 'ACME',
        countryIsoCode: null,
        status: CorporateOrganizationStatus.ACTIVE,
        billingEmail: 'billing@acme.com',
        contactName: null,
        contactPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await useCase.execute({
        name: 'ACME Corp',
        companyCode: 'acme',
        billingEmail: 'billing@acme.com',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyCode: 'ACME' }),
      );
    });

    it('rejects duplicate companyCode', async () => {
      repository.findByCompanyCode.mockResolvedValue({
        id: 'existing-uuid',
        companyCode: 'ACME',
      } as any);

      await expect(
        useCase.execute({
          name: 'ACME Corp',
          companyCode: 'acme',
          billingEmail: 'billing@acme.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate uppercase companyCode', async () => {
      repository.findByCompanyCode.mockResolvedValue({
        id: 'existing-uuid',
        companyCode: 'ACME',
      } as any);

      await expect(
        useCase.execute({
          name: 'ACME Corp',
          companyCode: 'ACME',
          billingEmail: 'billing@acme.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ListOrganizationsUseCase', () => {
    let useCase: ListOrganizationsUseCase;

    beforeEach(() => {
      useCase = new ListOrganizationsUseCase(repository, presenter);
    });

    it('returns paginated results', async () => {
      const mockOrgs = [
        {
          id: 'uuid-1',
          name: 'Org 1',
          companyCode: 'ORG1',
          countryIsoCode: null,
          status: CorporateOrganizationStatus.ACTIVE,
          billingEmail: 'a@b.com',
          contactName: null,
          contactPhone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contracts: 2, batches: 1 },
        },
      ];

      repository.list.mockResolvedValue({ items: mockOrgs, total: 1 });

      const result = await useCase.execute({
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('filters by search term', async () => {
      repository.list.mockResolvedValue({ items: [], total: 0 });

      await useCase.execute({
        page: 1,
        limit: 20,
        search: 'acme',
      });

      expect(repository.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'acme' }),
      );
    });

    it('filters by status', async () => {
      repository.list.mockResolvedValue({ items: [], total: 0 });

      await useCase.execute({
        page: 1,
        limit: 20,
        status: CorporateOrganizationStatus.ACTIVE,
      });

      expect(repository.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: CorporateOrganizationStatus.ACTIVE }),
      );
    });
  });

  describe('UpdateOrganizationUseCase', () => {
    let useCase: UpdateOrganizationUseCase;

    beforeEach(() => {
      useCase = new UpdateOrganizationUseCase(repository, presenter);
    });

    it('prevents companyCode change when organization has contracts or batches', async () => {
      repository.findByIdWithActiveContracts.mockResolvedValue({
        id: 'uuid-1',
        companyCode: 'OLD',
        _count: { contracts: 2, batches: 1, codes: 0 },
      } as any);

      await expect(
        useCase.execute({
          id: 'uuid-1',
          companyCode: 'NEW',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows companyCode change when organization has no contracts or batches', async () => {
      repository.findByIdWithActiveContracts.mockResolvedValue({
        id: 'uuid-1',
        companyCode: 'OLD',
        _count: { contracts: 0, batches: 0, codes: 0 },
      } as any);
      repository.findByCompanyCode.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        id: 'uuid-1',
        companyCode: 'NEW',
        name: 'Test',
        countryIsoCode: null,
        status: CorporateOrganizationStatus.ACTIVE,
        billingEmail: 'a@b.com',
        contactName: null,
        contactPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await useCase.execute({
        id: 'uuid-1',
        companyCode: 'NEW',
      });

      expect(repository.update).toHaveBeenCalled();
    });

    it('rejects duplicate companyCode on update', async () => {
      repository.findByIdWithActiveContracts.mockResolvedValue({
        id: 'uuid-1',
        companyCode: 'OLD',
        _count: { contracts: 0, batches: 0, codes: 0 },
      } as any);
      repository.findByCompanyCode.mockResolvedValue({
        id: 'other-uuid',
        companyCode: 'NEW',
      } as any);

      await expect(
        useCase.execute({
          id: 'uuid-1',
          companyCode: 'NEW',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
