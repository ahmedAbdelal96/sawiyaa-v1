import { BadRequestException } from '@nestjs/common';
import { PaymentProvider, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { ListFinanceOperationEventsUseCase } from './list-finance-operation-events.use-case';

describe('ListFinanceOperationEventsUseCase', () => {
  const paymentRepository = {
    listFinanceOperationEvents: jest.fn(),
  } as unknown as FinancialOperationsPaymentRepository;

  const useCase = new ListFinanceOperationEventsUseCase(paymentRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deterministic repository-backed event list payload', async () => {
    (paymentRepository.listFinanceOperationEvents as jest.Mock).mockResolvedValue([
      [
        {
          id: 'event_1',
          operationType: 'PAYMENT',
          paymentId: 'pay_1',
          refundId: null,
          provider: PaymentProvider.STRIPE,
          paymentPurpose: PaymentPurpose.SESSION_BOOKING,
          paymentStatus: PaymentStatus.CAPTURED,
          refundStatus: null,
          externalRef: 'evt_123',
          summary: 'Payment captured',
          linkedSessionId: 'session_1',
          linkedPractitionerId: 'practitioner_1',
          occurredAt: new Date('2026-04-01T10:00:00.000Z'),
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
        },
      ],
      1,
    ]);

    const result = await useCase.execute({
      page: 1,
      limit: 20,
      sortBy: 'OCCURRED_AT',
      sortOrder: 'DESC',
      provider: PaymentProvider.STRIPE,
    });

    expect(paymentRepository.listFinanceOperationEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        provider: PaymentProvider.STRIPE,
        sortBy: 'OCCURRED_AT',
        sortOrder: 'DESC',
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'event_1',
          operationType: 'PAYMENT',
          paymentId: 'pay_1',
          linkedSessionId: 'session_1',
          linkedPractitionerId: 'practitioner_1',
          occurredAt: '2026-04-01T10:00:00.000Z',
        }),
      ],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      },
      filters: {
        sortBy: 'OCCURRED_AT',
        sortOrder: 'DESC',
        operationType: null,
        provider: PaymentProvider.STRIPE,
        paymentPurpose: null,
        paymentStatus: null,
        refundStatus: null,
        paymentId: null,
        refundId: null,
        occurredFrom: null,
        occurredTo: null,
        query: null,
      },
    });
  });

  it('rejects invalid date range filters with machine-readable error', async () => {
    await expect(
      useCase.execute({
        occurredFrom: '2026-04-03T00:00:00.000Z',
        occurredTo: '2026-04-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund filters when operationType is PAYMENT', async () => {
    await expect(
      useCase.execute({
        operationType: 'PAYMENT',
        refundStatus: 'SUCCEEDED',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
