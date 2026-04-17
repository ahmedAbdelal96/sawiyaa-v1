import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { ListPractitionerSettlementsUseCase } from './list-practitioner-settlements.use-case';

describe('ListPractitionerSettlementsUseCase', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as FinancialOperationsPractitionerRepository;
  const settlementRepository = {
    listPractitionerSettlements: jest.fn(),
  } as unknown as SettlementRepository;
  const mapper = {
    toPractitionerSettlement: jest.fn((input) => input),
  } as unknown as FinancialOperationsMapper;

  const useCase = new ListPractitionerSettlementsUseCase(
    practitionerRepository,
    settlementRepository,
    mapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deterministic empty settlements state with stable pagination', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (settlementRepository.listPractitionerSettlements as jest.Mock).mockResolvedValue([
      [],
      0,
    ]);

    const result = await useCase.execute({
      userId: 'user_1',
      query: {
        page: 1,
        limit: 20,
      },
    });

    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });

  it('applies self-scoped settlement filters', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (settlementRepository.listPractitionerSettlements as jest.Mock).mockResolvedValue([
      [{ id: 'set_1' }],
      1,
    ]);

    await useCase.execute({
      userId: 'user_1',
      query: {
        currencyCode: 'egp',
        createdFrom: '2026-04-01T00:00:00.000Z',
        createdTo: '2026-04-30T23:59:59.000Z',
      },
    });

    expect(settlementRepository.listPractitionerSettlements).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'pract_1',
        currencyCode: 'EGP',
      }),
    );
  });

  it('rejects invalid settlement created date range', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });

    await expect(
      useCase.execute({
        userId: 'user_1',
        query: {
          createdFrom: '2026-05-01T00:00:00.000Z',
          createdTo: '2026-04-01T00:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when practitioner profile is missing', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user_missing',
        query: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
