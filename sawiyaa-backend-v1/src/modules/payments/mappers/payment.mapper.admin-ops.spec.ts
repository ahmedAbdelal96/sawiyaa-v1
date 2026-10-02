import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentMapper } from './payment.mapper';

describe('PaymentMapper admin investigation projection', () => {
  it('projects a support-safe session, failure diagnosis, and redacted timeline', () => {
    const mapper = new PaymentMapper();
    const result = mapper.toAdminOpsViewModel({
      id: 'payment-1',
      paymentPurpose: 'SESSION_BOOKING',
      provider: PaymentProvider.PAYMOB,
      status: PaymentStatus.FAILED,
      amountSubtotal: { toString: () => '520.00' } as never,
      amountDiscount: { toString: () => '0.00' } as never,
      amountTotal: { toString: () => '520.00' } as never,
      amountFromWallet: { toString: () => '0.00' } as never,
      amountFromGateway: { toString: () => '520.00' } as never,
      currencyCode: 'EGP',
      providerPaymentRef: 'provider-payment-1',
      providerOrderRef: 'provider-order-1',
      createdAt: new Date('2026-09-22T10:00:00.000Z'),
      initiatedAt: new Date('2026-09-22T10:00:00.000Z'),
      capturedAt: null,
      failedAt: new Date('2026-09-22T10:02:00.000Z'),
      expiredAt: null,
      metadataJson: {
        failureReason: 'CARD_DECLINED',
        providerSecret: 'must-not-leak',
      },
      patient: { id: 'patient-1', displayName: 'Patient', user: { displayName: 'Patient' } },
      patientPackagePurchase: null,
      academyProgramEnrollment: null,
      session: {
        id: 'session-1',
        sessionCode: 'SW-000001',
        status: 'PENDING_PAYMENT',
        sessionMode: 'VIDEO',
        scheduledStartAt: new Date('2026-09-23T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-09-23T10:50:00.000Z'),
        provider: 'DAILY',
        providerRoomId: null,
        providerSessionRef: null,
        durationMinutes: 50,
        cancellationRecord: null,
      },
      refunds: [],
      events: [
        {
          id: 'event-1',
          eventType: 'PAYMENT_FAILED',
          providerEventRef: 'evt-1',
          reason: 'CARD_DECLINED',
          occurredAt: new Date('2026-09-22T10:02:00.000Z'),
          createdAt: new Date('2026-09-22T10:02:00.000Z'),
        },
      ],
      sessionEvents: [
        {
          id: 'session-event-1',
          eventType: 'PAYMENT_PENDING',
          occurredAt: new Date('2026-09-22T09:59:00.000Z'),
          createdAt: new Date('2026-09-22T09:59:00.000Z'),
        },
      ],
      walletEntries: [],
      journalEntries: [],
      exceptions: [],
    } as never);

    expect(result.sessionSummary).toMatchObject({
      id: 'session-1',
      sessionCode: 'SW-000001',
      status: 'PENDING_PAYMENT',
      bookingState: 'PENDING_PAYMENT',
      paymentState: 'FAILED',
      durationMinutes: 50,
    });
    expect(result.failureDiagnosis).toMatchObject({
      category: 'CARD_DECLINED',
      provider: PaymentProvider.PAYMOB,
      attemptNumber: 1,
      retryAvailable: true,
      recommendedNextAction: 'RETRY_PAYMENT',
    });
    expect(result.timeline.map((entry) => entry.id)).toEqual([
      'session-event-1',
      'event-1',
    ]);
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });
});
