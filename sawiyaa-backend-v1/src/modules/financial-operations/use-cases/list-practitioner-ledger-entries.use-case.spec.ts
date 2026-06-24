import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ListPractitionerLedgerEntriesUseCase } from './list-practitioner-ledger-entries.use-case';

describe('ListPractitionerLedgerEntriesUseCase', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as FinancialOperationsPractitionerRepository;
  const ledgerRepository = {
    listPractitionerLedgerEntries: jest.fn(),
  } as unknown as LedgerRepository;
  const mapper = {
    toLedgerEntry: jest.fn((input) => input),
  } as unknown as FinancialOperationsMapper;

  const useCase = new ListPractitionerLedgerEntriesUseCase(
    practitionerRepository,
    ledgerRepository,
    mapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses deterministic self-scoped filters and pagination contract', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (
      ledgerRepository.listPractitionerLedgerEntries as jest.Mock
    ).mockResolvedValue([[{ id: 'entry_1' }], 1]);

    const result = await useCase.execute({
      userId: 'user_1',
      query: {
        page: 1,
        limit: 20,
        currencyCode: 'egp',
        referenceType: 'payment',
        effectiveFrom: '2026-04-01T00:00:00.000Z',
        effectiveTo: '2026-04-30T23:59:59.000Z',
      },
    });

    expect(ledgerRepository.listPractitionerLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'pract_1',
        currencyCode: 'EGP',
        referenceType: 'payment',
      }),
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('rejects invalid effective date range', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });

    await expect(
      useCase.execute({
        userId: 'user_1',
        query: {
          effectiveFrom: '2026-04-30T23:59:59.000Z',
          effectiveTo: '2026-04-01T00:00:00.000Z',
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
