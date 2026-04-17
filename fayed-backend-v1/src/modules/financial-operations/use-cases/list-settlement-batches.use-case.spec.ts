import { BadRequestException } from '@nestjs/common';
import { SettlementBatchStatus } from '@prisma/client';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementRepository } from '../repositories/settlement.repository';
import { ListSettlementBatchesUseCase } from './list-settlement-batches.use-case';

describe('ListSettlementBatchesUseCase', () => {
  const settlementRepository = {
    listSettlementBatches: jest.fn(),
  } as unknown as SettlementRepository;

  const financialOperationsMapper = {
    toSettlementBatchListItem: jest.fn(),
  } as unknown as FinancialOperationsMapper;

  const useCase = new ListSettlementBatchesUseCase(
    settlementRepository,
    financialOperationsMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deterministic pagination contract for settlement list', async () => {
    (settlementRepository.listSettlementBatches as jest.Mock).mockResolvedValue([
      [{ id: 'batch_1' }],
      1,
    ]);
    (financialOperationsMapper.toSettlementBatchListItem as jest.Mock).mockReturnValue({
      id: 'batch_1',
      slug: 'set_2026_03_egp',
      status: 'GENERATED',
      currency: 'EGP',
      periodYear: 2026,
      periodMonth: 3,
      totalAmount: '100.00',
      settlementItemsCount: 2,
      generatedAt: null,
      finalizedAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    const result = await useCase.execute({
      page: 1,
      limit: 20,
      status: SettlementBatchStatus.GENERATED,
      currencyCode: 'egp',
      periodYear: 2026,
      periodMonth: 3,
      createdFrom: '2026-03-01T00:00:00.000Z',
      createdTo: '2026-03-31T23:59:59.000Z',
    });

    expect(settlementRepository.listSettlementBatches).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: 'EGP',
        status: SettlementBatchStatus.GENERATED,
        periodYear: 2026,
        periodMonth: 3,
      }),
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('rejects invalid created date range', async () => {
    await expect(
      useCase.execute({
        createdFrom: '2026-03-31T23:59:59.000Z',
        createdTo: '2026-03-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
