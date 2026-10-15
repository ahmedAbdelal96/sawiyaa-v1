import {
  ManualPaymentAvailabilityMode,
  ManualPaymentSubmissionStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { ManualPaymentService } from './manual-payment.service';

describe('ManualPaymentService decision concurrency', () => {
  it('re-reads the submission after the payment advisory lock', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      manualPaymentSubmission: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ paymentId: 'payment-1' })
          .mockResolvedValueOnce({
            id: 'submission-1',
            paymentId: 'payment-1',
            status: ManualPaymentSubmissionStatus.REJECTED,
            reviewedAt: new Date(),
            payment: { provider: PaymentProvider.MANUAL, status: PaymentStatus.CREATED },
          }),
      },
      academyProgramEnrollment: {
        findUnique: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new ManualPaymentService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reject({
        id: 'submission-1',
        payload: { reason: 'already decided' },
        actor: { id: 'admin-1' },
      }),
    ).rejects.toMatchObject({
      response: { error: 'MANUAL_PAYMENT_SUBMISSION_NOT_REVIEWABLE' },
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.manualPaymentSubmission.findUnique).toHaveBeenCalledTimes(2);
    expect(tx.academyProgramEnrollment.findUnique).not.toHaveBeenCalled();
  });
});

describe('ManualPaymentService.submit with deferred payment creation', () => {
  const futureDate = new Date(Date.now() + 60 * 60 * 1000);

  it('creates a canonical MANUAL payment and links it when enrollment.paymentId is null', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      academyProgramEnrollment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          paymentId: null,
          status: 'PENDING_PAYMENT',
          seatReservationExpiresAt: futureDate,
          selectedAmountSnapshot: '500.00',
          selectedCurrencyCode: 'EGP',
          academyProgramId: 'prog-1',
          academyLearnerId: 'learner-1',
          userId: 'user-1',
          academyProgram: { endAt: futureDate },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 'created-payment-1',
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.CREATED,
          amountTotal: '500.00',
          currencyCode: 'EGP',
        }),
      },
      paymentEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      academyProgramPaymentAttempt: {
        create: jest.fn().mockResolvedValue({}),
      },
      manualPaymentSubmission: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'sub-1',
          attemptNumber: 1,
          status: ManualPaymentSubmissionStatus.UNDER_REVIEW,
          submittedAt: new Date(),
        }),
      },
    };

    const prisma = {
      academyProgramEnrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          paymentId: null,
          status: 'PENDING_PAYMENT',
          seatReservationExpiresAt: futureDate,
          lockedCountry: 'EG',
        }),
      },
      manualPaymentMethod: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'method-1',
          type: 'INSTAPAY',
          availabilityMode: ManualPaymentAvailabilityMode.ALL,
          isEnabled: true,
          countries: [],
          displayNameAr: 'انستاباي',
          displayNameEn: 'InstaPay',
          accountHolderName: 'Sawiyaa',
          accountIdentifier: 'sawiyaa@instapay',
          instructionsAr: 'حول',
          instructionsEn: 'Transfer',
        }),
      },
      $transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    };

    const storage = {
      store: jest.fn().mockResolvedValue({ id: 'file-1' }),
      delete: jest.fn(),
    };
    const audit = {
      recordRequired: jest.fn().mockResolvedValue(undefined),
    };
    const configRuntime = {
      getJson: jest.fn().mockResolvedValue(['ACADEMY']),
    };

    const service = new ManualPaymentService(
      prisma as never,
      configRuntime as never,
      storage as never,
      audit as never,
      {} as never,
      {} as never,
    );

    const result = await service.submit({
      enrollmentId: 'enrollment-1',
      token: 'token-1',
      countryIsoCode: 'EG',
      payload: {
        methodId: 'method-1',
        senderAccountName: 'Ahmed Ali',
      },
      proof: {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      },
    });

    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.CREATED,
          amountTotal: '500.00',
          currencyCode: 'EGP',
        }),
      }),
    );
    expect(tx.academyProgramEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enrollment-1' },
        data: expect.objectContaining({
          paymentId: 'created-payment-1',
        }),
      }),
    );
    expect(tx.manualPaymentSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: 'created-payment-1',
        }),
      }),
    );
    expect(result.item).toBeDefined();
  });

  it('rejects when enrollment already has a gateway payment attached', async () => {
    const prisma = {
      academyProgramEnrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          paymentId: 'gateway-payment-1',
          status: 'PENDING_PAYMENT',
          seatReservationExpiresAt: futureDate,
          lockedCountry: 'EG',
        }),
      },
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'gateway-payment-1',
          provider: PaymentProvider.PAYMOB,
          status: PaymentStatus.CREATED,
        }),
      },
    };

    const configRuntime = {
      getJson: jest.fn().mockResolvedValue(['ACADEMY']),
    };

    const service = new ManualPaymentService(
      prisma as never,
      configRuntime as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submit({
        enrollmentId: 'enrollment-1',
        token: 'token-1',
        countryIsoCode: 'EG',
        payload: {
          methodId: 'method-1',
          senderAccountName: 'Ahmed Ali',
        },
        proof: {
          buffer: Buffer.from('test'),
          mimetype: 'image/jpeg',
        },
      }),
    ).rejects.toMatchObject({
      response: { error: 'MANUAL_PAYMENT_NOT_SELECTED' },
    });
  });
});

describe('ManualPaymentService.listPatientSubmissions', () => {
  it('returns an empty result without querying submissions when payment is deferred', async () => {
    const prisma = {
      academyProgramEnrollment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1', paymentId: null }),
      },
      manualPaymentSubmission: {
        findMany: jest.fn(),
      },
    };
    const service = new ManualPaymentService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.listPatientSubmissions({ enrollmentId: 'enrollment-1', token: 'token-1' }),
    ).resolves.toEqual({ items: [] });

    expect(prisma.manualPaymentSubmission.findMany).not.toHaveBeenCalled();
  });

  it('queries submissions only after a canonical payment is attached', async () => {
    const prisma = {
      academyProgramEnrollment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1', paymentId: 'payment-1' }),
      },
      manualPaymentSubmission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ManualPaymentService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.listPatientSubmissions({ enrollmentId: 'enrollment-1', token: 'token-1' }),
    ).resolves.toEqual({ items: [] });

    expect(prisma.manualPaymentSubmission.findMany).toHaveBeenCalledWith({
      where: { paymentId: 'payment-1' },
      include: { manualPaymentMethod: true },
      orderBy: { attemptNumber: 'desc' },
    });
  });
});
