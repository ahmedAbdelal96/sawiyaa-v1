import { SessionPaymentCoverageType, SessionStatus } from '@prisma/client';
import { CancelSessionUseCase } from './cancel-session.use-case';

describe('CancelSessionUseCase package entitlement', () => {
  it('returns a patient-cancelled package reservation to the package exactly once', async () => {
    const session = {
      id: 'session-1',
      status: SessionStatus.UPCOMING,
      paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
      packagePurchaseId: 'purchase-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      patient: { id: 'patient-1' },
      practitioner: { id: 'practitioner-1' },
      scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
    } as any;
    const entitlementDecisionCreate = jest.fn().mockResolvedValue({});
    const tx = {
      sessionPackageEntitlementDecision: { create: entitlementDecisionCreate },
    } as any;
    const prisma = {
      $transaction: jest.fn(async (callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    } as any;
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(session),
      findByIdForUpdate: jest.fn().mockResolvedValue(session),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
    } as any;
    const evaluate = {
      evaluate: jest.fn().mockResolvedValue({
        cancellationAllowed: true,
        bookingType: 'STANDARD',
        policyId: 'policy-1',
        policyVersion: 1,
        ruleId: 'rule-1',
        ruleCode: 'STANDARD_PATIENT_CANCEL',
        ruleDisplayName: 'Patient cancellation',
        refundMode: 'NONE',
        refundPercent: '0',
        refundDestination: 'CUSTOMER_WALLET',
        policyDefaultRefundDestination: 'CUSTOMER_WALLET',
        hoursBeforeStart: 48,
      }),
    } as any;
    const cancellationEffects = {
      apply: jest.fn().mockResolvedValue({
        cancelledPaymentId: null,
        generatedRefundId: null,
        refundAmount: '0.00',
        actions: { paymentFound: false },
      }),
      postRefundLedgerIfNeeded: jest.fn(),
    } as any;
    const lifecycle = {
      transition: jest.fn().mockResolvedValue(session),
    } as any;
    const cancellationRecord = {
      createCancellationRecord: jest.fn().mockResolvedValue({}),
    } as any;
    const mapper = { toDetails: jest.fn().mockReturnValue({ id: session.id }) } as any;
    const notifications = {
      notifySessionCancelledByPatient: jest.fn().mockResolvedValue(undefined),
      cancelSessionReminders: jest.fn().mockResolvedValue(undefined),
    } as any;
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as any;

    const useCase = new CancelSessionUseCase(
      prisma,
      patientRepository,
      sessionRepository,
      cancellationRecord,
      mapper,
      lifecycle,
      evaluate,
      cancellationEffects,
      notifications,
    );

    await useCase.execute({
      userId: 'patient-user-1',
      locale: 'en',
      sessionId: session.id,
      reason: 'Need a different time',
    });

    expect(entitlementDecisionCreate).toHaveBeenCalledTimes(1);
    expect(entitlementDecisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: session.id,
        packagePurchaseId: 'purchase-1',
        decisionType: 'RESTORE_TO_PACKAGE',
        reasonCode: 'PATIENT_CANCELLATION',
        decidedByUserId: 'patient-user-1',
        idempotencyKey: `patient-cancel:${session.id}`,
      }),
    });
  });
});
