import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { PackagePurchasePresenter } from './package-purchase.presenter';

describe('PackagePurchasePresenter', () => {
  const presenter = new PackagePurchasePresenter();

  it('returns patient-safe purchase data without internal split fields', () => {
    const result = presenter.toViewModel({
      purchase: {
        id: 'purchase-1',
        status: 'PENDING_PAYMENT',
        planCodeSnapshot: 'SESSIONS_4',
        sessionCountSnapshot: 4,
        discountPercentSnapshot: '10.00',
        practitionerId: 'practitioner-1',
        sessionDurationMinutesSnapshot: 60,
        sessionModeSnapshot: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        selectedBaseSessionPriceSnapshot: '100.00',
        undiscountedTotalSnapshot: '400.00',
        discountAmountSnapshot: '40.00',
        patientPayableTotalSnapshot: '360.00',
        paymentExpiresAt: new Date('2026-01-01T00:15:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        sessions: [
          {
            id: 'session-live',
            sessionCode: 'SES-LIVE',
            status: SessionStatus.READY_TO_JOIN,
            provider: SessionProvider.DAILY,
            providerRoomId: 'room-live',
            providerSessionRef: 'ref-live',
            scheduledStartAt: new Date('2026-01-01T09:58:00.000Z'),
            scheduledEndAt: new Date('2026-01-01T11:00:00.000Z'),
            durationMinutes: 60,
            sessionMode: SessionMode.VIDEO,
            packageSessionIndex: 1,
          },
          {
            id: 'session-ended',
            sessionCode: 'SES-ENDED',
            status: SessionStatus.READY_TO_JOIN,
            provider: SessionProvider.DAILY,
            providerRoomId: 'room-ended',
            providerSessionRef: 'ref-ended',
            scheduledStartAt: new Date('2025-12-31T08:00:00.000Z'),
            scheduledEndAt: new Date('2025-12-31T09:00:00.000Z'),
            durationMinutes: 60,
            sessionMode: SessionMode.VIDEO,
            packageSessionIndex: 2,
          },
        ],
      },
      now: new Date('2026-01-01T10:30:00.000Z'),
    });

    expect(result).toMatchObject({
      id: 'purchase-1',
      planCode: 'SESSIONS_4',
      patientPayableTotal: '360.00',
    });
    expect(result).not.toHaveProperty('platformDiscountShare');
    expect(result).not.toHaveProperty('commissionMode');
    expect(result.linkedSessions.items[0]).toMatchObject({
      packageSessionIndex: 1,
      presentationStatus: 'READY_TO_JOIN',
      joinAvailability: {
        canJoin: true,
        blockedReason: null,
      },
    });
    expect(result.linkedSessions.items[1]).toMatchObject({
      packageSessionIndex: 2,
      presentationStatus: 'READY_TO_JOIN',
      joinAvailability: {
        canJoin: false,
        blockedReason: 'SESSION_JOIN_WINDOW_CLOSED',
      },
    });
  });
});
