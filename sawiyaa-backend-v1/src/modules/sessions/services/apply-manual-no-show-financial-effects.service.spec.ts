/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { SessionPaymentCoverageType, SessionStatus } from '@prisma/client';
import { ApplyManualNoShowFinancialEffectsService } from './apply-manual-no-show-financial-effects.service';

describe('ApplyManualNoShowFinancialEffectsService', () => {
  const earning = {
    syncForPatientNoShow: jest.fn(),
    syncForPackageEntitlementDecision: jest.fn(),
  } as any;
  const cancellation = {
    apply: jest.fn(),
    postRefundLedgerIfNeeded: jest.fn(),
  } as any;
  const service = new ApplyManualNoShowFinancialEffectsService(
    earning,
    cancellation,
  );

  const baseSession = {
    id: 'session-1',
    status: SessionStatus.PATIENT_NO_SHOW,
    patientId: 'patient-1',
    practitionerId: 'practitioner-1',
    paymentCoverageType: SessionPaymentCoverageType.SELF_PAY,
    packagePurchaseId: null,
    flowType: 'STANDARD',
    scheduledStartAt: new Date('2026-07-01T10:00:00Z'),
    scheduledEndAt: new Date('2026-07-01T11:00:00Z'),
  } as any;

  const tx = {
    sessionPackageEntitlementDecision: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    sessionEvent: { create: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    earning.syncForPatientNoShow.mockResolvedValue({ reviewId: 'review-1' });
    earning.syncForPackageEntitlementDecision.mockResolvedValue({
      reviewId: 'review-1',
    });
    cancellation.apply.mockResolvedValue({
      generatedRefundId: 'refund-1',
      refundAmount: '100.00',
    });
  });

  const input = (session: any, outcome: any) => ({
    tx,
    session,
    outcome,
    adminUserId: 'admin-1',
    reasonCode: outcome,
    decidedAt: new Date('2026-07-01T12:00:00Z'),
  });

  it('maps patient no-show direct payment to earning review without refund', async () => {
    const result = await service.apply(input(baseSession, 'PATIENT_NO_SHOW'));

    expect(result).toMatchObject({
      walletEffect: 'NONE',
      earningEffect: 'NORMAL_REVIEW',
    });
    expect(earning.syncForPatientNoShow).toHaveBeenCalled();
    expect(cancellation.apply).not.toHaveBeenCalled();
  });

  it('maps practitioner no-show direct payment to a wallet-only refund', async () => {
    const result = await service.apply(
      input(
        { ...baseSession, status: SessionStatus.PRACTITIONER_NO_SHOW },
        'PRACTITIONER_NO_SHOW',
      ),
    );

    expect(result).toMatchObject({
      walletEffect: 'PATIENT_WALLET_CREDIT',
      earningEffect: 'NONE',
      refundId: 'refund-1',
    });
    expect(cancellation.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellationReason: 'PRACTITIONER_NO_SHOW_REFUND',
        evaluation: expect.objectContaining({
          refundDestination: 'CUSTOMER_WALLET',
          refundPercent: '100.00',
        }),
      }),
    );
    expect(cancellation.postRefundLedgerIfNeeded).toHaveBeenCalledWith(
      'refund-1',
      tx,
    );
    expect(earning.syncForPatientNoShow).not.toHaveBeenCalled();
  });

  it('applies package count/restore decisions and no automatic effect for both', async () => {
    const packageSession = {
      ...baseSession,
      paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
      packagePurchaseId: 'purchase-1',
    };

    await expect(
      service.apply(input(packageSession, 'PATIENT_NO_SHOW')),
    ).resolves.toMatchObject({ packageDecision: 'COUNT_AS_USED' });
    expect(tx.sessionPackageEntitlementDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ decisionType: 'COUNT_AS_USED' }),
      }),
    );

    tx.sessionPackageEntitlementDecision.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.apply(input(packageSession, 'PRACTITIONER_NO_SHOW')),
    ).resolves.toMatchObject({ packageDecision: 'RESTORE_TO_PACKAGE' });
    expect(
      tx.sessionPackageEntitlementDecision.create,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ decisionType: 'RESTORE_TO_PACKAGE' }),
      }),
    );

    await expect(
      service.apply(input(packageSession, 'BOTH_NO_SHOW')),
    ).resolves.toMatchObject({
      packageDecision: null,
      walletEffect: 'NONE',
      earningEffect: 'NONE',
    });
  });

  it('replays an existing package decision without creating another one', async () => {
    tx.sessionPackageEntitlementDecision.findUnique.mockResolvedValueOnce({
      idempotencyKey: 'manual-no-show:session-1:PATIENT_NO_SHOW',
    });

    await service.apply(
      input(
        {
          ...baseSession,
          paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
          packagePurchaseId: 'purchase-1',
        },
        'PATIENT_NO_SHOW',
      ),
    );

    expect(tx.sessionPackageEntitlementDecision.create).not.toHaveBeenCalled();
    expect(earning.syncForPackageEntitlementDecision).not.toHaveBeenCalled();
  });
});
