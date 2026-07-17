import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';

describe('MarkPaymentSucceededUseCase', () => {
  function buildUseCase(input?: {
    sessionStatus?: string | null;
    paymentPurpose?: string;
    sponsorshipId?: string | null;
  }) {
    const basePayment = {
      id: 'payment_1',
      paymentPurpose: input?.paymentPurpose ?? 'SESSION_BOOKING',
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.PENDING,
      sessionId:
        input?.paymentPurpose === 'SESSION_PACKAGE_PURCHASE'
          ? null
          : 'session_1',
      patientId: 'patient_1',
      practitionerId: 'pr_1',
      couponId: null,
      currencyCode: 'USD',
      amountFromWallet: { gt: () => false, toString: () => '0.00' },
      amountSubtotal: { toString: () => '100.00' },
      amountDiscount: { toString: () => '0.00' },
      couponPlatformShareSnapshot: null,
      couponPractitionerShareSnapshot: null,
      metadataJson: input?.sponsorshipId
        ? { sponsorshipId: input.sponsorshipId }
        : {},
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      session: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            input?.sessionStatus
              ? { id: 'session_1', status: input.sessionStatus }
              : null,
          ),
      },
    };
    const paymentRepository = {
      findById: jest.fn().mockResolvedValue(basePayment),
      createEvent: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({
        ...basePayment,
        status: PaymentStatus.CAPTURED,
        amountTotal: { toFixed: () => '100.00', toString: () => '100.00' },
      }),
    };
    const validatePaymentStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const orchestrateSessionPaymentStatusService = {
      markSessionConfirmedFromPayment: jest.fn().mockResolvedValue({}),
    };
    const orchestrateAcademyProgramEnrollmentPaymentStatusService = {
      markEnrollmentConfirmedFromPayment: jest.fn().mockResolvedValue({}),
      markEnrollmentPaymentFailed: jest.fn().mockResolvedValue({}),
      markEnrollmentPaymentExpired: jest.fn().mockResolvedValue({}),
    };
    const paymentMapper = {
      toViewModel: jest.fn().mockReturnValue({ id: 'payment_1' }),
    };
    const operationalNotificationService = {
      notifyPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    };
    const sessionEarningReviewService = {
      syncForSessionCompletion: jest.fn().mockResolvedValue(null),
    };
    const customerWalletAccountingService = {
      captureReservationForPayment: jest.fn().mockResolvedValue(null),
    };
    const redeemCouponUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const reconcilePackagePurchasePaymentUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const corporateSponsorshipConsumeService = {
      consumeAfterPayment: jest.fn().mockResolvedValue({
        consumed: true,
        sponsorshipId: 'sponsorship-1',
        codeId: 'code-1',
        idempotent: false,
      }),
    };
    const corporateLedgerRepository = {
      findBySponsorshipIdAndEvent: jest.fn().mockResolvedValue(null),
      createCodeConsumedEntry: jest.fn().mockResolvedValue({}),
    };
    const logger = {
      info: jest.fn(),
    };

    const useCase = new MarkPaymentSucceededUseCase(
      prisma as never,
      paymentRepository as never,
      validatePaymentStatusTransitionService as never,
      orchestrateSessionPaymentStatusService as never,
      orchestrateAcademyProgramEnrollmentPaymentStatusService as never,
      paymentMapper as never,
      sessionEarningReviewService as never,
      customerWalletAccountingService as never,
      redeemCouponUseCase as never,
      operationalNotificationService as never,
      reconcilePackagePurchasePaymentUseCase as never,
      corporateSponsorshipConsumeService as never,
      logger as never,
    );

    return {
      useCase,
      prisma,
      paymentRepository,
      orchestrateSessionPaymentStatusService,
      orchestrateAcademyProgramEnrollmentPaymentStatusService,
      sessionEarningReviewService,
      operationalNotificationService,
      reconcilePackagePurchasePaymentUseCase,
      corporateSponsorshipConsumeService,
    };
  }

  it('confirms session when payment succeeds and session is pending payment', async () => {
    const setup = buildUseCase({ sessionStatus: 'PENDING_PAYMENT' });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.sessionEarningReviewService.syncForSessionCompletion,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.operationalNotificationService.notifyPaymentSucceeded,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not confirm session when session is already cancelled-like terminal state', async () => {
    const setup = buildUseCase({ sessionStatus: 'CANCELLED' });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
  });

  it('skips package purchase orchestration', async () => {
    const setup = buildUseCase({
      sessionStatus: null,
      paymentPurpose: 'SESSION_PACKAGE_PURCHASE',
    });

    await setup.useCase.execute({
      paymentId: 'payment_1',
      providerEventRef: 'evt_1',
      payload: {},
    });

    expect(
      setup.sessionEarningReviewService.syncForSessionCompletion,
    ).not.toHaveBeenCalled();
    expect(
      setup.operationalNotificationService.notifyPaymentSucceeded,
    ).not.toHaveBeenCalled();
    expect(
      setup.reconcilePackagePurchasePaymentUseCase.execute,
    ).toHaveBeenCalledTimes(1);
    expect(setup.prisma.session.findUnique).not.toHaveBeenCalled();
    expect(
      setup.orchestrateSessionPaymentStatusService
        .markSessionConfirmedFromPayment,
    ).not.toHaveBeenCalled();
    expect(setup.paymentRepository.findById).toHaveBeenCalledTimes(1);
    expect(setup.paymentRepository.updateStatus).toHaveBeenCalledTimes(1);
  });

  describe('Corporate Sponsorship Consume', () => {
    it('does not call consume service when payment has no sponsorship metadata', async () => {
      const setup = buildUseCase({ sessionStatus: 'PENDING_PAYMENT' });

      await setup.useCase.execute({
        paymentId: 'payment_1',
        providerEventRef: 'evt_1',
        payload: {},
      });

      expect(
        setup.corporateSponsorshipConsumeService.consumeAfterPayment,
      ).not.toHaveBeenCalled();
    });

    it('calls consumeAfterPayment when payment has sponsorship metadata', async () => {
      const setup = buildUseCase({
        sessionStatus: 'PENDING_PAYMENT',
        sponsorshipId: 'sponsorship-uuid',
      });

      await setup.useCase.execute({
        paymentId: 'payment_1',
        providerEventRef: 'evt_1',
        payload: {},
      });

      expect(
        setup.corporateSponsorshipConsumeService.consumeAfterPayment,
      ).toHaveBeenCalledTimes(1);
      expect(
        setup.corporateSponsorshipConsumeService.consumeAfterPayment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sponsorshipId: 'sponsorship-uuid',
          sessionId: 'session_1',
          paymentId: 'payment_1',
          paidAmount: '100.00',
          currency: 'USD',
        }),
        expect.anything(),
      );
    });

    it('continues success when consume returns idempotent result', async () => {
      const setup = buildUseCase({
        sessionStatus: 'PENDING_PAYMENT',
        sponsorshipId: 'sponsorship-uuid',
      });
      setup.corporateSponsorshipConsumeService.consumeAfterPayment.mockResolvedValueOnce({
        consumed: false,
        sponsorshipId: 'sponsorship-uuid',
        codeId: 'code-1',
        idempotent: true,
      });

      const result = await setup.useCase.execute({
        paymentId: 'payment_1',
        providerEventRef: 'evt_1',
        payload: {},
      });

      expect(result).toBeDefined();
      expect(
        setup.orchestrateSessionPaymentStatusService
          .markSessionConfirmedFromPayment,
      ).toHaveBeenCalledTimes(1);
    });

    it('does not require codeHash or codeId in payment metadata to consume', async () => {
      const setup = buildUseCase({
        sessionStatus: 'PENDING_PAYMENT',
        sponsorshipId: 'sponsorship-uuid',
      });

      const paymentWithMinimalMetadata = {
        id: 'payment_1',
        paymentPurpose: 'SESSION_BOOKING',
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        sessionId: 'session_1',
        patientId: 'patient_1',
        practitionerId: 'pr_1',
        couponId: null,
        currencyCode: 'USD',
        amountFromWallet: { gt: () => false, toString: () => '0.00' },
        amountSubtotal: { toString: () => '100.00' },
        amountDiscount: { toString: () => '0.00' },
        couponPlatformShareSnapshot: null,
        couponPractitionerShareSnapshot: null,
        metadataJson: { sponsorshipId: 'sponsorship-uuid' },
      };
      setup.paymentRepository.findById.mockResolvedValueOnce(
        paymentWithMinimalMetadata as never,
      );

      await setup.useCase.execute({
        paymentId: 'payment_1',
        providerEventRef: 'evt_1',
        payload: {},
      });

      expect(
        setup.corporateSponsorshipConsumeService.consumeAfterPayment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sponsorshipId: 'sponsorship-uuid',
        }),
        expect.anything(),
      );
    });

    it('rejects when consume service throws', async () => {
      const setup = buildUseCase({
        sessionStatus: 'PENDING_PAYMENT',
        sponsorshipId: 'sponsorship-uuid',
      });
      setup.corporateSponsorshipConsumeService.consumeAfterPayment.mockRejectedValueOnce(
        new Error('consume failed'),
      );

      await expect(
        setup.useCase.execute({
          paymentId: 'payment_1',
          providerEventRef: 'evt_1',
          payload: {},
        }),
      ).rejects.toThrow('consume failed');

      expect(
        setup.orchestrateSessionPaymentStatusService
          .markSessionConfirmedFromPayment,
      ).not.toHaveBeenCalled();
    });
  });
});
