import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CourseScheduleStatus,
  CourseStatus,
  CourseVisibility,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ResolveTrainingScheduleEnrollmentAvailabilityService } from '../services/resolve-training-schedule-enrollment-availability.service';
import { CreateTrainingEnrollmentUseCase } from './create-training-enrollment.use-case';

describe('CreateTrainingEnrollmentUseCase', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const trainingRepository = {
    findPatientProfileByUserId: jest.fn(),
    findScheduleById: jest.fn(),
    countEnrollmentsByScheduleIds: jest.fn(),
    findEnrollmentByScheduleAndUser: jest.fn(),
    createEnrollment: jest.fn(),
    updateEnrollment: jest.fn(),
    findEnrollmentByIdForUser: jest.fn(),
  } as unknown as TrainingRepository;
  const paymentRepository = {
    createPayment: jest.fn(),
    createEvent: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
  } as unknown as PaymentRepository;
  const paymentGeoContextService = {
    buildCountrySnapshot: jest.fn(),
  };
  const paymentProviderResolverService = {
    resolveProvider: jest.fn(),
  } as unknown as PaymentProviderResolverService;
  const paymentRuntimeConfigService = {
    resolveTrustedReturnUrl: jest.fn((value: string | null | undefined) =>
      value?.trim() ?? null,
    ),
    getAppBaseUrl: jest.fn(() => 'http://localhost:3000'),
  } as unknown as PaymentRuntimeConfigService;
  const paymentProviderRegistryService = {
    get: jest.fn(),
  } as unknown as PaymentProviderRegistryService;
  const validatePaymentStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidatePaymentStatusTransitionService;
  const resolveTrainingScheduleEnrollmentAvailabilityService = {
    resolve: jest.fn(),
  } as unknown as ResolveTrainingScheduleEnrollmentAvailabilityService;
  const trainingPresenter = {
    presentEnrollmentItem: jest.fn(),
  } as unknown as TrainingPresenter;

  const useCase = new CreateTrainingEnrollmentUseCase(
    prisma,
    trainingRepository,
    paymentRepository,
    paymentGeoContextService as any,
    paymentProviderResolverService,
    paymentRuntimeConfigService,
    paymentProviderRegistryService,
    validatePaymentStatusTransitionService,
    resolveTrainingScheduleEnrollmentAvailabilityService,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
      fn({
        trainingEnrollmentPaymentAttempt: {
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      }),
    );
  });

  it('rejects when schedule is not enrollable', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient_1',
      country: { isoCode: 'EGY' },
      user: { emails: [{ email: 'p@x.com' }] },
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      status: CourseScheduleStatus.DRAFT,
      enrollmentOpenAt: new Date(),
      enrollmentCloseAt: new Date(),
      startsAt: new Date(),
      maxEnrollmentsOverride: null,
      course: {
        id: 'course_1',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        maxEnrollments: 20,
      },
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 0,
    });
    (
      resolveTrainingScheduleEnrollmentAvailabilityService.resolve as jest.Mock
    ).mockReturnValue({
      isEnrollmentOpen: false,
      reason: 'WINDOW_CLOSED',
    });

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'en',
        scheduleId: 'schedule_1',
        payload: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate non-pending enrollment', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient_1',
      country: { isoCode: 'EGY' },
      user: { emails: [{ email: 'p@x.com' }] },
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      scheduleCode: 'SCH1',
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
      startsAt: new Date('2026-04-03T08:00:00.000Z'),
      priceOverrideAmount: { toString: () => '100.00' },
      currencyCodeOverride: 'EGP',
      maxEnrollmentsOverride: null,
      course: {
        id: 'course_1',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        maxEnrollments: 20,
      },
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 0,
    });
    (
      resolveTrainingScheduleEnrollmentAvailabilityService.resolve as jest.Mock
    ).mockReturnValue({
      isEnrollmentOpen: true,
      reason: 'OPEN',
    });
    (
      trainingRepository.findEnrollmentByScheduleAndUser as jest.Mock
    ).mockResolvedValue({
      id: 'enr_1',
      enrollmentStatus: 'ACTIVE',
    });

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'en',
        scheduleId: 'schedule_1',
        payload: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates pending enrollment and initiates payment on success path', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient_1',
      country: { isoCode: 'EGY' },
      user: { emails: [{ email: 'p@x.com' }] },
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      scheduleCode: 'SCH1',
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
      startsAt: new Date('2026-04-03T08:00:00.000Z'),
      priceOverrideAmount: { toString: () => '100.00' },
      currencyCodeOverride: 'EGP',
      maxEnrollmentsOverride: null,
      course: {
        id: 'course_1',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        maxEnrollments: 20,
      },
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 0,
    });
    (
      resolveTrainingScheduleEnrollmentAvailabilityService.resolve as jest.Mock
    ).mockReturnValue({
      isEnrollmentOpen: true,
      reason: 'OPEN',
    });
    (
      trainingRepository.findEnrollmentByScheduleAndUser as jest.Mock
    ).mockResolvedValue(null);
    (trainingRepository.createEnrollment as jest.Mock).mockResolvedValue({
      id: 'enr_1',
    });
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'pay_1',
      status: PaymentStatus.CREATED,
    });
    const providerAdapter = {
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'provider_1',
        status: PaymentStatus.PENDING,
      }),
    };
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue(
      providerAdapter,
    );
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'pay_1',
      status: PaymentStatus.PENDING,
    });
    (
      trainingRepository.findEnrollmentByIdForUser as jest.Mock
    ).mockResolvedValue({
      id: 'enr_1',
      courseId: 'course_1',
      courseScheduleId: 'schedule_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      enrolledAt: new Date(),
      cancelledAt: null,
      refundedAt: null,
      completedAt: null,
      course: { translations: [{ locale: 'en', title: 'Training' }] },
      courseSchedule: { scheduleCode: 'SCH1', startsAt: null, endsAt: null },
      payment: null,
    });
    (trainingPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enr_1',
    });

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      scheduleId: 'schedule_1',
      payload: {},
    });

    expect(result.item).toEqual({ id: 'enr_1' });
    expect(trainingRepository.createEnrollment).toHaveBeenCalled();
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalled();
  });

  it('preserves a trusted training returnUrl for paymob payments', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient_1',
      country: { isoCode: 'EGY' },
      user: { emails: [{ email: 'p@x.com' }] },
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      scheduleCode: 'SCH1',
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
      startsAt: new Date('2026-04-03T08:00:00.000Z'),
      priceOverrideAmount: { toString: () => '100.00' },
      currencyCodeOverride: 'EGP',
      maxEnrollmentsOverride: null,
      course: {
        id: 'course_1',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        maxEnrollments: 20,
      },
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 0,
    });
    (
      resolveTrainingScheduleEnrollmentAvailabilityService.resolve as jest.Mock
    ).mockReturnValue({
      isEnrollmentOpen: true,
      reason: 'OPEN',
    });
    (
      trainingRepository.findEnrollmentByScheduleAndUser as jest.Mock
    ).mockResolvedValue(null);
    (trainingRepository.createEnrollment as jest.Mock).mockResolvedValue({
      id: 'enr_1',
    });
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'pay_1',
      status: PaymentStatus.CREATED,
    });
    const providerAdapter = {
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'provider_1',
        status: PaymentStatus.PENDING,
      }),
    };
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue(
      providerAdapter,
    );
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'pay_1',
      status: PaymentStatus.PENDING,
    });
    (
      trainingRepository.findEnrollmentByIdForUser as jest.Mock
    ).mockResolvedValue({
      id: 'enr_1',
      courseId: 'course_1',
      courseScheduleId: 'schedule_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      enrolledAt: new Date(),
      cancelledAt: null,
      refundedAt: null,
      completedAt: null,
      course: { translations: [{ locale: 'en', title: 'Training' }] },
      courseSchedule: { scheduleCode: 'SCH1', startsAt: null, endsAt: null },
      payment: null,
    });
    (trainingPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enr_1',
    });

    await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      scheduleId: 'schedule_1',
      payload: {
        returnUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
      },
    });

    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
      }),
    );
  });

  it('forces a fresh checkout when forceRefreshPayment is true', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient_1',
      country: { isoCode: 'EGY' },
      user: { emails: [{ email: 'p@x.com' }] },
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      scheduleCode: 'SCH1',
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
      startsAt: new Date('2026-04-03T08:00:00.000Z'),
      priceOverrideAmount: { toString: () => '100.00' },
      currencyCodeOverride: 'EGP',
      maxEnrollmentsOverride: null,
      course: {
        id: 'course_1',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        maxEnrollments: 20,
      },
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 0,
    });
    (
      resolveTrainingScheduleEnrollmentAvailabilityService.resolve as jest.Mock
    ).mockReturnValue({
      isEnrollmentOpen: true,
      reason: 'OPEN',
    });
    (
      trainingRepository.findEnrollmentByScheduleAndUser as jest.Mock
    ).mockResolvedValue({
      id: 'enr_1',
      paymentId: 'payment-existing',
      enrollmentStatus: 'PENDING_PAYMENT',
    });
    (paymentRepository.findById as jest.Mock).mockResolvedValue({
      id: 'payment-existing',
      status: PaymentStatus.CREATED,
    });
    (trainingRepository.createEnrollment as jest.Mock).mockResolvedValue({
      id: 'enr_1',
    });
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'pay_2',
      status: PaymentStatus.CREATED,
    });
    const providerAdapter = {
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'provider_2',
        status: PaymentStatus.PENDING,
        checkoutUrl: 'https://paymob.example/fresh',
      }),
    };
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue(
      providerAdapter,
    );
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'pay_2',
      status: PaymentStatus.PENDING,
    });
    (
      trainingRepository.findEnrollmentByIdForUser as jest.Mock
    ).mockResolvedValue({
      id: 'enr_1',
      courseId: 'course_1',
      courseScheduleId: 'schedule_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      enrolledAt: new Date(),
      cancelledAt: null,
      refundedAt: null,
      completedAt: null,
      course: { translations: [{ locale: 'en', title: 'Training' }] },
      courseSchedule: { scheduleCode: 'SCH1', startsAt: null, endsAt: null },
      payment: null,
    });
    (trainingPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enr_1',
      payment: { checkoutUrl: 'https://paymob.example/fresh' },
    });

    await useCase.execute({
      userId: 'user_1',
      locale: 'en',
      scheduleId: 'schedule_1',
      payload: {
        forceRefreshPayment: true,
        returnUrl: 'http://localhost:3000/en/patient/training/enr_1/payment-return',
      },
    });

    expect(paymentRepository.findById).not.toHaveBeenCalled();
    expect(paymentRepository.createPayment).toHaveBeenCalledTimes(1);
    expect(providerAdapter.initiateSessionPayment).toHaveBeenCalledTimes(1);
  });
});
