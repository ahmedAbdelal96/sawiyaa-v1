import { BadRequestException } from '@nestjs/common';
import {
  AcademyProgramEnrollmentStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { CreateAcademyProgramEnrollmentUseCase } from './create-academy-program-enrollment.use-case';

const paidProgram = {
  id: 'program-1',
  slug: 'paid-program',
  registrationOpen: true,
  maxSeats: null,
  priceEgp: { toString: () => '500.00' },
  priceUsd: { toString: () => '20.00' },
};

function createUseCase(program = paidProgram) {
  const enrollmentRepository = {
    findEnrollmentByProgramAndLearner: jest.fn().mockResolvedValue(null),
    countActiveLearnersByProgramId: jest.fn().mockResolvedValue(0),
    createEnrollment: jest.fn().mockResolvedValue({ id: 'enrollment-1' }),
    createPaymentAttempt: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
    updateEnrollment: jest.fn().mockResolvedValue(undefined),
    updatePaymentAttempt: jest.fn().mockResolvedValue(undefined),
    findEnrollmentByIdForAdmin: jest.fn().mockResolvedValue({ id: 'enrollment-1' }),
  };
  const paymentRepository = {
    createPayment: jest.fn().mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.CREATED,
    }),
    createEvent: jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn().mockResolvedValue({ status: PaymentStatus.CREATED }),
  };
  const programRepository = {
    findPublicProgramBySlug: jest.fn().mockResolvedValue(program),
  };
  const transactionClient = {
    $executeRaw: jest.fn(),
    academyProgram: {
      findUnique: jest.fn().mockResolvedValue(program),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: object) => unknown) => callback(transactionClient)),
    user: { create: jest.fn() },
  };
  const initiateSessionPayment = jest.fn().mockResolvedValue({
    status: PaymentStatus.CREATED,
    providerPaymentRef: 'provider-payment-1',
  });
  const useCase = new CreateAcademyProgramEnrollmentUseCase(
    { get: jest.fn().mockReturnValue(15) } as never,
    { getJson: jest.fn().mockResolvedValue(['ACADEMY']) } as never,
    prisma as never,
    programRepository as never,
    enrollmentRepository as never,
    paymentRepository as never,
    {
      buildCountrySnapshot: jest.fn().mockReturnValue({}),
    } as never,
    {
      resolveRoute: jest.fn().mockReturnValue({
        currencyCode: 'USD',
        paymentMethod: 'CARD',
        provider: PaymentProvider.PAYMOB,
        integrationKey: 'paymob-usd-card',
        environment: 'development',
        enabled: true,
        priority: 100,
        source: 'DATABASE',
      }),
    } as never,
    {
      get: jest.fn().mockReturnValue({ initiateSessionPayment }),
    } as never,
    {
      getAppBaseUrl: jest.fn().mockReturnValue('https://web.example/'),
      resolveTrustedReturnUrlBase: jest.fn().mockReturnValue(null),
    } as never,
    { assertCanTransition: jest.fn() } as never,
    {
      resolve: jest.fn().mockResolvedValue({
        learner: { id: 'learner-1', email: 'learner@example.com', countryCode: 'US' },
        countryResolution: {
          declaredCountryCode: 'US',
          resolvedCountryCode: 'US',
          countrySource: 'TRUSTED_COUNTRY',
          countryMismatch: false,
          phoneCountryCode: 'US',
        },
      }),
    } as never,
    { presentEnrollmentItem: jest.fn().mockReturnValue({ id: 'enrollment-1' }) } as never,
    { notifyIfTargetExceeded: jest.fn() } as never,
  );

  return {
    useCase,
    enrollmentRepository,
    paymentRepository,
    prisma,
    programRepository,
    transactionClient,
    initiateSessionPayment,
  };
}

const input = {
  slug: 'paid-program',
  locale: 'en' as const,
  currentUser: { id: 'user-1', roles: [] } as never,
  payload: {
    fullName: 'Learner',
    phoneNumber: '+15555550123',
    email: 'learner@example.com',
  },
  requestCountryIsoCode: 'US',
};

describe('CreateAcademyProgramEnrollmentUseCase pricing', () => {
  it('rejects zero-priced seed data before creating an enrollment or payment', async () => {
    const { useCase, enrollmentRepository, paymentRepository, prisma } = createUseCase({
      ...paidProgram,
      priceEgp: { toString: () => '0.00' },
      priceUsd: { toString: () => '0.00' },
    });

    await expect(useCase.execute(input)).rejects.toMatchObject<Partial<BadRequestException>>({
      response: expect.objectContaining({ error: 'ACADEMY_PROGRAM_MISSING_PRICING' }),
    });

    expect(enrollmentRepository.createEnrollment).not.toHaveBeenCalled();
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a paid enrollment and payment from the selected USD amount and currency', async () => {
    const { useCase, enrollmentRepository, paymentRepository, initiateSessionPayment } = createUseCase();

    await useCase.execute(input);

    expect(enrollmentRepository.createEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.CREATED,
        selectedAmountSnapshot: '20.00',
        selectedCurrencyCode: 'USD',
      }),
      expect.anything(),
    );
    expect(paymentRepository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountTotal: '20.00',
        amountFromWallet: '0',
        amountFromGateway: '20.00',
        currencyCode: 'USD',
      }),
      expect.anything(),
    );
    expect(initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({ routeIntegrationKey: 'paymob-usd-card' }),
    );
  });

  it('rejects a new enrollment when the locked program row is at capacity', async () => {
    const { useCase, enrollmentRepository, paymentRepository } = createUseCase({
      ...paidProgram,
      maxSeats: 1,
    });
    enrollmentRepository.countActiveLearnersByProgramId.mockResolvedValue(1);

    await expect(useCase.execute(input)).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'ACADEMY_PROGRAM_SEAT_CAPACITY_REACHED',
      }),
    });

    expect(enrollmentRepository.createEnrollment).not.toHaveBeenCalled();
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
  });
});
