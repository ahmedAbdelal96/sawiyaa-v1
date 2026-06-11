/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access */
import { ConflictException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { CreateAcademyEnrollmentUseCase } from './create-academy-enrollment.use-case';
import { AcademyRepository } from '../repositories/academy.repository';
import { AcademyPresenter } from '../presenters/academy.presenter';

describe('CreateAcademyEnrollmentUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => unknown) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const academyRepository = {
    findPublicCourseBySlug: jest.fn(),
    findLearnerByPhoneNumber: jest.fn(),
    upsertLearner: jest.fn(),
    findEnrollmentByCourseAndLearner: jest.fn(),
    createEnrollment: jest.fn(),
    createActivityLog: jest.fn(),
    createPaymentAttempt: jest.fn(),
    updateEnrollment: jest.fn(),
    updatePaymentAttempt: jest.fn(),
    findEnrollmentByIdForAdmin: jest.fn(),
  } as unknown as AcademyRepository;

  const paymentRepository = {
    createPayment: jest.fn(),
    createEvent: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as PaymentRepository;

  const paymentGeoContextService = {
    resolveCountryResolution: jest.fn(),
    buildCountrySnapshot: jest.fn(),
  } as unknown as PaymentGeoContextService;

  const paymentProviderResolverService = {
    resolveProvider: jest.fn(),
  } as unknown as PaymentProviderResolverService;

  const paymentProviderRegistryService = {
    get: jest.fn(),
  } as unknown as PaymentProviderRegistryService;

  const paymentRuntimeConfigService = {
    getAppBaseUrl: jest.fn(() => 'https://app.fayed.example'),
    resolveTrustedReturnUrlBase: jest.fn((value: string | null) => value),
  } as unknown as PaymentRuntimeConfigService;

  const validatePaymentStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidatePaymentStatusTransitionService;

  const academyPresenter = {
    presentEnrollmentItem: jest.fn(),
  } as unknown as AcademyPresenter;

  const useCase = new CreateAcademyEnrollmentUseCase(
    prisma,
    academyRepository,
    paymentRepository,
    paymentGeoContextService,
    paymentProviderResolverService,
    paymentProviderRegistryService,
    paymentRuntimeConfigService,
    validatePaymentStatusTransitionService,
    academyPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps learner unique constraint conflicts to a conflict exception', async () => {
    (academyRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue({
      id: 'course_1',
      slug: 'anxiety-foundations-101',
      title: 'Anxiety Foundations 101',
      priceAmountEgp: null,
      priceAmountUsd: null,
      priceAmount: null,
      currencyCode: null,
    });
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
      null,
    );
    (
      paymentGeoContextService.resolveCountryResolution as jest.Mock
    ).mockResolvedValue({
      resolvedCountryCode: 'EG',
      declaredCountryCode: 'EG',
      countrySource: 'PHONE',
      countryMismatch: false,
      phoneCountryCode: 'EG',
    });
    (academyRepository.upsertLearner as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      useCase.execute({
        slug: 'anxiety-foundations-101',
        locale: 'ar',
        payload: {
          fullName: 'Learner Dup',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'dupacademy@example.com',
          sourceLabel: 'test',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reuses an existing enrollment when a race creates the same record twice', async () => {
    (academyRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue({
      id: 'course_1',
      slug: 'anxiety-foundations-101',
      title: 'Anxiety Foundations 101',
      priceAmountEgp: null,
      priceAmountUsd: null,
      priceAmount: null,
      currencyCode: null,
    });
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
      null,
    );
    (
      paymentGeoContextService.resolveCountryResolution as jest.Mock
    ).mockResolvedValue({
      resolvedCountryCode: 'EG',
      declaredCountryCode: 'EG',
      countrySource: 'PHONE',
      countryMismatch: false,
      phoneCountryCode: 'EG',
    });
    (academyRepository.upsertLearner as jest.Mock).mockResolvedValue({
      id: 'learner_1',
      fullName: 'Learner One',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'learner.one@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'test',
    });
    (academyRepository.findEnrollmentByCourseAndLearner as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'enrollment_1',
        publicAccessToken: 'existing-token',
        enrollmentStatus: 'CONFIRMED',
        paymentStatus: PaymentStatus.CAPTURED,
        registeredAt: new Date('2026-06-08T10:00:00.000Z'),
        confirmedAt: new Date('2026-06-08T10:00:00.000Z'),
        cancelledAt: null,
        failedAt: null,
        failedReason: null,
        notesInternal: null,
        academyCourse: {
          id: 'course_1',
          slug: 'anxiety-foundations-101',
          title: 'Anxiety Foundations 101',
          meetingUrl: null,
          whatsappGroupUrl: null,
        },
        academyLearner: {
          fullName: 'Learner One',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'learner.one@example.com',
          countryCode: 'EG',
          countryCodeDeclared: null,
          countryCodeSource: 'PHONE',
          countryCodeMismatch: false,
          sourceLabel: 'test',
        },
        paymentAttempts: [],
        payment: null,
      });
    (academyRepository.createEnrollment as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    (academyRepository.createActivityLog as jest.Mock).mockResolvedValue({});
    (academyPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enrollment_1',
    });

    const result = await useCase.execute({
      slug: 'anxiety-foundations-101',
      locale: 'ar',
      payload: {
        fullName: 'Learner One',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'learner.one@example.com',
        sourceLabel: 'test',
        returnUrlBase: 'fayed://academy/enrollments/',
      },
    });

    expect(result).toEqual({
      item: { id: 'enrollment_1' },
    });
    const createActivityLogMock =
      academyRepository.createActivityLog as jest.Mock;
    expect(createActivityLogMock).toHaveBeenCalledTimes(1);
  });

  it('truncates long provider values before saving academy payment attempts', async () => {
    (academyRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue({
      id: 'course_1',
      slug: 'anxiety-foundations-101',
      title: 'Anxiety Foundations 101',
      priceAmountEgp: null,
      priceAmountUsd: '100',
      priceAmount: null,
      currencyCode: null,
    });
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
      null,
    );
    (
      paymentGeoContextService.resolveCountryResolution as jest.Mock
    ).mockResolvedValue({
      resolvedCountryCode: 'EG',
      declaredCountryCode: 'EG',
      countrySource: 'PHONE',
      countryMismatch: false,
      phoneCountryCode: 'EG',
    });
    (academyRepository.upsertLearner as jest.Mock).mockResolvedValue({
      id: 'learner_1',
      fullName: 'Learner One',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'learner.one@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'test',
    });
    (academyRepository.findEnrollmentByCourseAndLearner as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'enrollment_1',
        publicAccessToken: 'token_1',
        enrollmentStatus: 'PENDING_PAYMENT',
        paymentStatus: PaymentStatus.CREATED,
        registeredAt: new Date('2026-06-08T10:00:00.000Z'),
        confirmedAt: null,
        cancelledAt: null,
        failedAt: null,
        failedReason: null,
        notesInternal: null,
        academyCourse: {
          id: 'course_1',
          slug: 'anxiety-foundations-101',
          title: 'Anxiety Foundations 101',
          meetingUrl: null,
          whatsappGroupUrl: null,
        },
        academyLearner: {
          fullName: 'Learner One',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'learner.one@example.com',
          countryCode: 'EG',
          countryCodeDeclared: null,
          countryCodeSource: 'PHONE',
          countryCodeMismatch: false,
          sourceLabel: 'test',
        },
        paymentAttempts: [],
        payment: null,
      });
    (academyRepository.createEnrollment as jest.Mock).mockResolvedValue({
      id: 'enrollment_1',
    });
    (academyRepository.createPaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_1',
    });
    (academyRepository.updatePaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_1',
    });
    (
      academyRepository.findEnrollmentByIdForAdmin as jest.Mock
    ).mockResolvedValue({
      id: 'enrollment_1',
      publicAccessToken: 'token_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      paymentStatus: PaymentStatus.PENDING,
      registeredAt: new Date('2026-06-08T10:00:00.000Z'),
      confirmedAt: null,
      cancelledAt: null,
      failedAt: null,
      failedReason: null,
      notesInternal: null,
      academyCourse: {
        id: 'course_1',
        slug: 'anxiety-foundations-101',
        title: 'Anxiety Foundations 101',
        meetingUrl: null,
        whatsappGroupUrl: null,
      },
      academyLearner: {
        fullName: 'Learner One',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'learner.one@example.com',
        countryCode: 'EG',
        countryCodeDeclared: null,
        countryCodeSource: 'PHONE',
        countryCodeMismatch: false,
        sourceLabel: 'test',
      },
      paymentAttempts: [],
      payment: null,
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.CREATED,
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.PENDING,
    });
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue({
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'p'.repeat(250),
        providerOrderRef: 'o'.repeat(250),
        providerCustomerRef: 'c'.repeat(250),
        checkoutUrl: `https://example.com/${'x'.repeat(600)}`,
        clientSecret: 's'.repeat(700),
        status: PaymentStatus.PENDING,
      }),
    });
    (
      validatePaymentStatusTransitionService.assertCanTransition as jest.Mock
    ).mockReturnValue(undefined);
    (academyPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enrollment_1',
    });

    const result = await useCase.execute({
      slug: 'anxiety-foundations-101',
      locale: 'ar',
      payload: {
        fullName: 'Learner One',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'learner.one@example.com',
        sourceLabel: 'test',
        returnUrlBase: 'fayed://academy/enrollments/',
      },
    });

    expect(result).toEqual({
      item: { id: 'enrollment_1' },
    });
    const updatePaymentAttemptMock =
      academyRepository.updatePaymentAttempt as jest.Mock;
    expect(updatePaymentAttemptMock).toHaveBeenCalledWith(
      'attempt_1',
      expect.objectContaining({
        providerPaymentRef: expect.any(String),
        providerOrderRef: expect.any(String),
        providerCustomerRef: expect.any(String),
        checkoutUrl: expect.any(String),
        clientSecret: expect.any(String),
      }),
      expect.anything(),
    );
    type PaymentAttemptUpdateArgs = {
      providerPaymentRef: string | null;
      providerOrderRef: string | null;
      providerCustomerRef: string | null;
      checkoutUrl: string | null;
      clientSecret: string | null;
    };
    const updateArgs = updatePaymentAttemptMock.mock
      .calls[0][1] as PaymentAttemptUpdateArgs;
    expect(updateArgs.providerPaymentRef).toHaveLength(191);
    expect(updateArgs.providerOrderRef).toHaveLength(191);
    expect(updateArgs.providerCustomerRef).toHaveLength(191);
    expect(updateArgs.checkoutUrl).toHaveLength(500);
    expect(updateArgs.clientSecret).toHaveLength(500);

    const registryGetMock = paymentProviderRegistryService.get as jest.Mock;
    const providerAdapter = registryGetMock.mock.results[0]?.value as
      | {
          initiateSessionPayment: jest.Mock;
        }
      | undefined;
    expect(providerAdapter?.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: expect.stringMatching(
          /^fayed:\/\/academy\/enrollments\/enrollment_1\/payment-return\?token=/,
        ),
      }),
    );
  });

  it('preserves an Expo Web localhost:8081 returnUrlBase for paid academy enrollment flows', async () => {
    (academyRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue({
      id: 'course_1',
      slug: 'anxiety-foundations-101',
      title: 'Anxiety Foundations 101',
      priceAmountEgp: '100',
      priceAmountUsd: null,
      priceAmount: null,
      currencyCode: 'EGP',
    });
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
      null,
    );
    (
      paymentGeoContextService.resolveCountryResolution as jest.Mock
    ).mockResolvedValue({
      resolvedCountryCode: 'EG',
      declaredCountryCode: 'EG',
      countrySource: 'PHONE',
      countryMismatch: false,
      phoneCountryCode: 'EG',
    });
    (academyRepository.upsertLearner as jest.Mock).mockResolvedValue({
      id: 'learner_1',
      fullName: 'Learner One',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'learner.one@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'test',
    });
    (academyRepository.findEnrollmentByCourseAndLearner as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'enrollment_1',
        publicAccessToken: 'token_1',
        enrollmentStatus: 'PENDING_PAYMENT',
        paymentStatus: PaymentStatus.CREATED,
        registeredAt: new Date('2026-06-08T10:00:00.000Z'),
        confirmedAt: null,
        cancelledAt: null,
        failedAt: null,
        failedReason: null,
        notesInternal: null,
        academyCourse: {
          id: 'course_1',
          slug: 'anxiety-foundations-101',
          title: 'Anxiety Foundations 101',
          meetingUrl: null,
          whatsappGroupUrl: null,
        },
        academyLearner: {
          fullName: 'Learner One',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'learner.one@example.com',
          countryCode: 'EG',
          countryCodeDeclared: null,
          countryCodeSource: 'PHONE',
          countryCodeMismatch: false,
          sourceLabel: 'test',
        },
        paymentAttempts: [],
        payment: null,
      });
    (academyRepository.createEnrollment as jest.Mock).mockResolvedValue({
      id: 'enrollment_1',
    });
    (academyRepository.createPaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_1',
    });
    (academyRepository.updatePaymentAttempt as jest.Mock).mockResolvedValue({
      id: 'attempt_1',
    });
    (
      academyRepository.findEnrollmentByIdForAdmin as jest.Mock
    ).mockResolvedValue({
      id: 'enrollment_1',
      publicAccessToken: 'token_1',
      enrollmentStatus: 'PENDING_PAYMENT',
      paymentStatus: PaymentStatus.PENDING,
      registeredAt: new Date('2026-06-08T10:00:00.000Z'),
      confirmedAt: null,
      cancelledAt: null,
      failedAt: null,
      failedReason: null,
      notesInternal: null,
      academyCourse: {
        id: 'course_1',
        slug: 'anxiety-foundations-101',
        title: 'Anxiety Foundations 101',
        meetingUrl: null,
        whatsappGroupUrl: null,
      },
      academyLearner: {
        fullName: 'Learner One',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'learner.one@example.com',
        countryCode: 'EG',
        countryCodeDeclared: null,
        countryCodeSource: 'PHONE',
        countryCodeMismatch: false,
        sourceLabel: 'test',
      },
      paymentAttempts: [],
      payment: null,
    });
    (paymentRepository.createPayment as jest.Mock).mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.CREATED,
    });
    (paymentRepository.createEvent as jest.Mock).mockResolvedValue({});
    (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.PENDING,
    });
    (
      paymentProviderResolverService.resolveProvider as jest.Mock
    ).mockReturnValue(PaymentProvider.PAYMOB);
    (paymentProviderRegistryService.get as jest.Mock).mockReturnValue({
      initiateSessionPayment: jest.fn().mockResolvedValue({
        providerPaymentRef: 'pay_1',
        providerOrderRef: 'order_1',
        providerCustomerRef: 'customer_1',
        checkoutUrl: 'https://paymob.example/checkout/fresh',
        clientSecret: 'secret_1',
        status: PaymentStatus.PENDING,
      }),
    });
    (
      validatePaymentStatusTransitionService.assertCanTransition as jest.Mock
    ).mockReturnValue(undefined);
    (academyPresenter.presentEnrollmentItem as jest.Mock).mockReturnValue({
      id: 'enrollment_1',
    });

    await useCase.execute({
      slug: 'anxiety-foundations-101',
      locale: 'ar',
      payload: {
        fullName: 'Learner One',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'learner.one@example.com',
        sourceLabel: 'test',
        returnUrlBase: 'http://localhost:8081/academy/enrollments/',
      },
    });

    const registryGetMock = paymentProviderRegistryService.get as jest.Mock;
    const providerAdapter = registryGetMock.mock.results[0]?.value as
      | {
          initiateSessionPayment: jest.Mock;
        }
      | undefined;
    expect(providerAdapter?.initiateSessionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectionUrl: expect.stringContaining('http://localhost:8081/academy/enrollments/enrollment_1/payment-return'),
      }),
    );
  });
});
