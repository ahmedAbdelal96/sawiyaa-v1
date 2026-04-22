import { NotFoundException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { GetFinanceOperationEventUseCase } from './get-finance-operation-event.use-case';

describe('GetFinanceOperationEventUseCase', () => {
  const paymentRepository = {
    findFinanceOperationEventById: jest.fn(),
  } as unknown as FinancialOperationsPaymentRepository;

  const useCase = new GetFinanceOperationEventUseCase(paymentRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns repository-backed event detail payload', async () => {
    (
      paymentRepository.findFinanceOperationEventById as jest.Mock
    ).mockResolvedValue({
      id: 'refund_1',
      operationType: 'REFUND',
      paymentId: 'payment_1',
      refundId: 'refund_1',
      provider: PaymentProvider.PAYMOB,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      paymentStatus: PaymentStatus.CAPTURED,
      refundStatus: RefundStatus.SUCCEEDED,
      externalRef: 'rf_123',
      summary: 'Refund succeeded',
      linkedSessionId: 'session_1',
      linkedPractitionerId: 'practitioner_1',
      occurredAt: new Date('2026-04-01T09:00:00.000Z'),
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
    });

    const result = await useCase.execute('refund_1');

    expect(result).toEqual({
      item: expect.objectContaining({
        id: 'refund_1',
        operationType: 'REFUND',
        refundStatus: RefundStatus.SUCCEEDED,
        linkedSessionId: 'session_1',
        linkedPractitionerId: 'practitioner_1',
        occurredAt: '2026-04-01T09:00:00.000Z',
      }),
    });
  });

  it('returns scoped not-found when event id is missing', async () => {
    (
      paymentRepository.findFinanceOperationEventById as jest.Mock
    ).mockResolvedValue(null);

    await expect(useCase.execute('event_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
