import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { TrainingRepository } from '../repositories/training.repository';
import { CreateTrainingEnrollmentUseCase } from './create-training-enrollment.use-case';
import { GetPatientTrainingEnrollmentPaymentRedirectUseCase } from './get-patient-training-enrollment-payment-redirect.use-case';

describe('GetPatientTrainingEnrollmentPaymentRedirectUseCase', () => {
  const trainingRepository = {
    findEnrollmentByIdForUser: jest.fn(),
  } as unknown as TrainingRepository;
  const createTrainingEnrollmentUseCase = {
    execute: jest.fn(),
  } as unknown as CreateTrainingEnrollmentUseCase;
  const paymentRuntimeConfigService = {
    resolveTrustedReturnUrl: jest.fn((value: string | null | undefined) =>
      value?.trim() ?? null,
    ),
    getAppBaseUrl: jest.fn(() => 'http://localhost:3000'),
  } as unknown as PaymentRuntimeConfigService;

  const useCase = new GetPatientTrainingEnrollmentPaymentRedirectUseCase(
    trainingRepository,
    createTrainingEnrollmentUseCase,
    paymentRuntimeConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the fresh checkout url for pending payments', async () => {
    (trainingRepository.findEnrollmentByIdForUser as jest.Mock).mockResolvedValue(
      {
        id: 'enr_1',
        courseScheduleId: 'schedule_1',
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
        payment: {
          status: PaymentStatus.PENDING,
        },
      },
    );
    (createTrainingEnrollmentUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        payment: {
          checkoutUrl: 'https://paymob.example/fresh',
        },
      },
    });

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      enrollmentId: 'enr_1',
      returnUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
    });

    expect(result.redirectUrl).toBe('https://paymob.example/fresh');
    expect(createTrainingEnrollmentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule_1',
        payload: expect.objectContaining({
          forceRefreshPayment: true,
          returnUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
        }),
      }),
    );
  });

  it('redirects to the caller surface when payment is already confirmed', async () => {
    (trainingRepository.findEnrollmentByIdForUser as jest.Mock).mockResolvedValue(
      {
        id: 'enr_1',
        courseScheduleId: 'schedule_1',
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        payment: {
          status: PaymentStatus.CAPTURED,
        },
      },
    );

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      enrollmentId: 'enr_1',
      returnUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
    });

    expect(result.redirectUrl).toContain('redirect_status=succeeded');
    expect(createTrainingEnrollmentUseCase.execute).not.toHaveBeenCalled();
  });

  it('falls back safely when the return url is invalid', async () => {
    (trainingRepository.findEnrollmentByIdForUser as jest.Mock).mockResolvedValue(
      null,
    );
    (
      paymentRuntimeConfigService.resolveTrustedReturnUrl as jest.Mock
    ).mockReturnValue(null);

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      enrollmentId: 'enr_1',
      returnUrl: 'https://evil.example/en/patient/training/enr_1/payment-return',
      callerSurfaceUrl: 'http://localhost:3000',
    });

    expect(result.redirectUrl).toContain('http://localhost:3000/en/patient/training/enr_1/payment-return');
    expect(result.redirectUrl).toContain('redirect_status=payment_unavailable');
  });
});
