import { PaymentProvider, PaymentStatus, RefundStatus, RefundType } from '@prisma/client';
import { GetAdminPaymentOpsDetailsUseCase } from './get-admin-payment-ops-details.use-case';

describe('GetAdminPaymentOpsDetailsUseCase', () => {
  function buildUseCase() {
    const paymentRepository = {
      findAdminOpsById: jest.fn().mockResolvedValue({
        id: 'payment_1',
        paymentPurpose: 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PARTIALLY_REFUNDED,
        amountSubtotal: { toString: () => '120.00' },
        amountDiscount: { toString: () => '20.00' },
        amountTotal: { toString: () => '100.00' },
        currencyCode: 'USD',
        providerPaymentRef: 'pi_1',
        providerOrderRef: 'order_1',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        initiatedAt: new Date('2026-04-01T10:00:00.000Z'),
        capturedAt: new Date('2026-04-01T10:01:00.000Z'),
        failedAt: null,
        expiredAt: null,
        session: {
          id: 'session_1',
          status: 'REFUND_PENDING',
          sessionMode: 'VIDEO',
          scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
          scheduledEndAt: new Date('2026-04-02T10:30:00.000Z'),
          provider: 'DAILY',
          providerRoomId: 'room_1',
          providerSessionRef: 'https://room.daily.co',
        },
        refunds: [
          {
            id: 'refund_2',
            paymentId: 'payment_1',
            sessionId: 'session_1',
            refundType: RefundType.PARTIAL,
            status: RefundStatus.REQUESTED,
            amount: { toString: () => '20.00' },
            currencyCode: 'USD',
            refundReason: 'pending',
            providerRefundRef: null,
            requestedAt: new Date('2026-04-01T11:00:00.000Z'),
            processedAt: null,
            failedAt: null,
            createdAt: new Date('2026-04-01T11:00:00.000Z'),
          },
          {
            id: 'refund_1',
            paymentId: 'payment_1',
            sessionId: 'session_1',
            refundType: RefundType.PARTIAL,
            status: RefundStatus.SUCCEEDED,
            amount: { toString: () => '30.00' },
            currencyCode: 'USD',
            refundReason: 'partial',
            providerRefundRef: 're_1',
            requestedAt: new Date('2026-04-01T10:30:00.000Z'),
            processedAt: new Date('2026-04-01T10:31:00.000Z'),
            failedAt: null,
            createdAt: new Date('2026-04-01T10:30:00.000Z'),
          },
        ],
        events: [
          {
            id: 'event_1',
            eventType: 'PAYMENT_CAPTURED',
            providerEventRef: 'evt_1',
            createdAt: new Date('2026-04-01T10:01:00.000Z'),
          },
        ],
      }),
    };
    const paymentMapper = {
      toAdminOpsViewModel: jest.fn().mockReturnValue({ payment: { id: 'payment_1' } }),
    };

    const useCase = new GetAdminPaymentOpsDetailsUseCase(
      paymentRepository as never,
      paymentMapper as never,
    );

    return { useCase, paymentRepository, paymentMapper };
  }

  it('returns payment operational details snapshot', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({ paymentId: 'payment_1' });

    expect(setup.paymentRepository.findAdminOpsById).toHaveBeenCalledWith(
      'payment_1',
    );
    expect(setup.paymentMapper.toAdminOpsViewModel).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      item: { payment: { id: 'payment_1' } },
    });
  });
});

