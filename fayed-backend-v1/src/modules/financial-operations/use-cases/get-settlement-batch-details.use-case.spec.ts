import { NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementRepository } from '../repositories/settlement.repository';
import { GetSettlementBatchDetailsUseCase } from './get-settlement-batch-details.use-case';

describe('GetSettlementBatchDetailsUseCase', () => {
  const settlementRepository = {
    getSettlementBatchDetails: jest.fn(),
  } as unknown as SettlementRepository;

  const financialOperationsMapper = {
    toSettlementBatchDetails: jest.fn(),
  } as unknown as FinancialOperationsMapper;

  const useCase = new GetSettlementBatchDetailsUseCase(
    settlementRepository,
    financialOperationsMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns operational detail payload including empty child-state safely', async () => {
    (
      settlementRepository.getSettlementBatchDetails as jest.Mock
    ).mockResolvedValue({
      id: 'batch_1',
      settlements: [],
    });
    (
      financialOperationsMapper.toSettlementBatchDetails as jest.Mock
    ).mockReturnValue({
      id: 'batch_1',
      slug: 'set_2026_03_egp',
      status: 'GENERATED',
      currency: 'EGP',
      periodYear: 2026,
      periodMonth: 3,
      totalAmount: '0.00',
      settlementItemsCount: 0,
      generatedAt: null,
      finalizedAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      items: [],
      summary: {
        settlementItemsCount: 0,
        totalAmountNet: '0.00',
        statusCounts: {
          draft: 0,
          ready: 0,
          processing: 0,
          paid: 0,
          failed: 0,
          cancelled: 0,
        },
      },
    });

    const result = await useCase.execute('batch_1');

    expect(result.item.summary.settlementItemsCount).toBe(0);
    expect(result.item.items).toEqual([]);
  });

  it('throws not found when batch is missing', async () => {
    (
      settlementRepository.getSettlementBatchDetails as jest.Mock
    ).mockResolvedValue(null);

    await expect(useCase.execute('batch_missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
