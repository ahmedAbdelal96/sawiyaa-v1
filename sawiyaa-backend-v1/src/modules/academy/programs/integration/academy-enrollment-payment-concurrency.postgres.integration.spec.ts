import * as dotenv from 'dotenv';
dotenv.config();

import { randomUUID } from 'node:crypto';
import {
  AcademyProgramEnrollmentStatus,
  AcademyProgramStatus,
  ManualPaymentAvailabilityMode,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase } from '../use-cases/get-public-academy-program-enrollment-payment-redirect.use-case';
import { GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase } from '../use-cases/get-patient-academy-program-enrollment-payment-redirect.use-case';
import { ManualPaymentService } from '@modules/payments/services/manual-payment.service';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('Academy Enrollment Payment Concurrency (PostgreSQL)', () => {
  let prisma: PrismaService;
  let enrollmentRepository: AcademyProgramEnrollmentRepository;
  let paymentRepository: PaymentRepository;
  let publicRedirectUseCase: GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase;
  let patientRedirectUseCase: GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase;
  let manualPaymentService: ManualPaymentService;

  let testProgramId: string;
  let testMethodId: string;
  const createdEnrollmentIds: string[] = [];
  const createdLearnerIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    enrollmentRepository = new AcademyProgramEnrollmentRepository(prisma);
    paymentRepository = new PaymentRepository(prisma);

    const initiateSessionPayment = jest.fn().mockImplementation(async (args) => ({
      status: PaymentStatus.CREATED,
      checkoutUrl: `https://paymob.example/checkout/${args.paymentId}`,
      providerPaymentRef: `paymob-ref-${args.paymentId}`,
    }));

    const paymentProviderRegistryService = {
      get: jest.fn().mockReturnValue({ initiateSessionPayment }),
    } as never;

    const paymentRuntimeConfigService = {
      resolveTrustedReturnUrl: jest.fn((url: string | null) => url ?? 'https://sawiyaa.com/return'),
      getAppBaseUrl: jest.fn().mockReturnValue('https://sawiyaa.com'),
    } as never;

    const validatePaymentStatusTransitionService =
      new ValidatePaymentStatusTransitionService();

    publicRedirectUseCase = new GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase(
      prisma,
      enrollmentRepository,
      paymentRepository,
      paymentProviderRegistryService,
      paymentRuntimeConfigService,
      validatePaymentStatusTransitionService,
    );

    patientRedirectUseCase = new GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase(
      prisma,
      enrollmentRepository,
      paymentRepository,
      paymentProviderRegistryService,
      paymentRuntimeConfigService,
      validatePaymentStatusTransitionService,
    );

    const storage = {
      store: jest.fn().mockImplementation(async (args) => {
        const file = await prisma.storedFile.create({
          data: {
            storageKey: `proofs/test-${randomUUID()}`,
            originalFileName: args.originalFileName ?? 'proof.jpg',
            mimeType: args.mimeType,
            extension: 'jpg',
            sizeBytes: 1024,
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            purpose: 'MANUAL_PAYMENT_PROOF',
            uploadedByUserId: args.uploadedByUserId ?? null,
          },
        });
        return { id: file.id };
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    } as never;

    const audit = {
      recordRequired: jest.fn().mockResolvedValue(undefined),
    } as never;

    const configRuntime = {
      getJson: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'payments.manualPayment.enabledDomains') return ['ACADEMY'];
        return null;
      }),
    } as never;

    const notificationWriter = {
      createInAppNotification: jest.fn().mockResolvedValue(undefined),
    } as never;

    manualPaymentService = new ManualPaymentService(
      prisma,
      configRuntime,
      storage,
      audit,
      {} as never,
      notificationWriter,
    );

    // Create test program
    const uniqueSlug = `prog-concurrency-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const program = await prisma.academyProgram.create({
      data: {
        slug: uniqueSlug,
        titleAr: 'برنامج التزامن التجريبي',
        titleEn: 'Concurrency Test Program',
        priceEgp: new Prisma.Decimal('500.00'),
        priceUsd: new Prisma.Decimal('20.00'),
        registrationOpen: true,
        status: AcademyProgramStatus.PUBLISHED,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    testProgramId = program.id;

    // Create manual payment method
    const uniqueMethodCode = `instapay-test-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const method = await prisma.manualPaymentMethod.create({
      data: {
        code: uniqueMethodCode,
        type: 'INSTAPAY',
        displayNameAr: 'انستاباي تجريبي',
        displayNameEn: 'Test InstaPay',
        accountHolderName: 'Sawiyaa Academy',
        accountIdentifier: 'sawiyaa@instapay',
        instructionsAr: 'حول المبلغ الموضح',
        instructionsEn: 'Transfer specified amount',
        availabilityMode: ManualPaymentAvailabilityMode.ALL,
        isEnabled: true,
      },
    });
    testMethodId = method.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    for (const enrollmentId of createdEnrollmentIds) {
      await prisma.manualPaymentSubmission.deleteMany({
        where: { payment: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollmentId } } },
      });
      await prisma.academyProgramPaymentAttempt.deleteMany({
        where: { academyProgramEnrollmentId: enrollmentId },
      });
      await prisma.academyProgramEnrollment.deleteMany({
        where: { id: enrollmentId },
      });
      await prisma.paymentEvent.deleteMany({
        where: { payloadJson: { path: ['academyProgramEnrollmentId'], equals: enrollmentId } },
      });
      await prisma.payment.deleteMany({
        where: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollmentId } },
      });
    }

    for (const learnerId of createdLearnerIds) {
      await prisma.academyLearner.deleteMany({ where: { id: learnerId } });
    }
    for (const userId of createdUserIds) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    if (testProgramId) {
      await prisma.academyProgram.deleteMany({ where: { id: testProgramId } });
    }
    if (testMethodId) {
      await prisma.manualPaymentMethod.deleteMany({ where: { id: testMethodId } });
    }

    await prisma.$disconnect();
  });

  async function createTestEnrollment(withUser = false) {
    let userId: string | null = null;
    if (withUser) {
      const user = await prisma.user.create({
        data: {
          displayName: 'Test Trainee',
        },
      });
      userId = user.id;
      createdUserIds.push(user.id);
    }

    const uniquePhone = `+2010${Math.floor(10000000 + Math.random() * 90000000)}`;
    const learner = await prisma.academyLearner.create({
      data: {
        userId,
        fullName: 'Test Concurrency Learner',
        phoneNumber: uniquePhone,
        email: `learner-${Date.now()}-${randomUUID().slice(0, 6)}@example.com`,
        countryCode: 'EG',
      },
    });
    createdLearnerIds.push(learner.id);

    const enrollment = await prisma.academyProgramEnrollment.create({
      data: {
        academyProgramId: testProgramId,
        academyLearnerId: learner.id,
        userId,
        publicAccessToken: randomUUID(),
        status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.CREATED,
        selectedAmountSnapshot: new Prisma.Decimal('500.00'),
        selectedCurrencyCode: 'EGP',
        seatReservedAt: new Date(),
        seatReservationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        contactFullName: learner.fullName,
        contactPhone: learner.phoneNumber,
        contactCountry: 'EG',
        lockedCountry: 'EG',
        paymentId: null,
      },
      include: {
        academyProgram: true,
        academyLearner: true,
        payment: true,
      },
    });
    createdEnrollmentIds.push(enrollment.id);

    return enrollment;
  }

  it('A. Card vs Card simultaneously: serializes and creates exactly ONE canonical Payment', async () => {
    const enrollment = await createTestEnrollment();

    // Fire 2 simultaneous Card payment redirect requests
    const [res1, res2] = await Promise.all([
      publicRedirectUseCase.execute({
        enrollmentId: enrollment.id,
        token: enrollment.publicAccessToken,
        locale: 'ar',
        returnUrl: 'https://sawiyaa.com/ar/return',
      }),
      publicRedirectUseCase.execute({
        enrollmentId: enrollment.id,
        token: enrollment.publicAccessToken,
        locale: 'ar',
        returnUrl: 'https://sawiyaa.com/ar/return',
      }),
    ]);

    // Both requests must return valid checkout URLs
    expect(res1.redirectUrl).toContain('https://paymob.example/checkout/');
    expect(res2.redirectUrl).toContain('https://paymob.example/checkout/');

    // Check database invariants
    const payments = await prisma.payment.findMany({
      where: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollment.id } },
    });
    expect(payments).toHaveLength(1);
    expect(payments[0].provider).toBe(PaymentProvider.PAYMOB);
    expect(payments[0].status).toBe(PaymentStatus.CREATED);

    const attempts = await prisma.academyProgramPaymentAttempt.findMany({
      where: { academyProgramEnrollmentId: enrollment.id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].paymentId).toBe(payments[0].id);

    const updatedEnrollment = await prisma.academyProgramEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(updatedEnrollment?.paymentId).toBe(payments[0].id);
  });

  it('B. Manual vs Manual simultaneously: serializes and creates exactly ONE canonical Payment', async () => {
    const enrollment = await createTestEnrollment();

    const proofBuffer = Buffer.from('test-proof-data');
    const submitPayload = {
      enrollmentId: enrollment.id,
      token: enrollment.publicAccessToken,
      countryIsoCode: 'EG',
      payload: {
        methodId: testMethodId,
        senderAccountName: 'Concurrent Learner',
      },
      proof: {
        buffer: proofBuffer,
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
      },
    };

    // Fire 2 simultaneous manual proof submissions
    const results = await Promise.allSettled([
      manualPaymentService.submit(submitPayload),
      manualPaymentService.submit(submitPayload),
    ]);

    // Exactly one must succeed, while the concurrent one is rejected cleanly because an active submission is now under review
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Check database invariants
    const payments = await prisma.payment.findMany({
      where: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollment.id } },
    });
    expect(payments).toHaveLength(1);
    expect(payments[0].provider).toBe(PaymentProvider.MANUAL);

    const attempts = await prisma.academyProgramPaymentAttempt.findMany({
      where: { academyProgramEnrollmentId: enrollment.id },
    });
    expect(attempts).toHaveLength(1);

    const submissions = await prisma.manualPaymentSubmission.findMany({
      where: { paymentId: payments[0].id },
    });
    expect(submissions).toHaveLength(1);

    const updatedEnrollment = await prisma.academyProgramEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(updatedEnrollment?.paymentId).toBe(payments[0].id);
  });

  it('C. Card vs Manual simultaneously: exactly ONE payment rail becomes canonical and provider is never mutated', async () => {
    const enrollment = await createTestEnrollment();

    const proofBuffer = Buffer.from('test-proof-data');

    // Fire Card redirect and Manual proof submission at the exact same instant
    const [cardResult, manualResult] = await Promise.allSettled([
      publicRedirectUseCase.execute({
        enrollmentId: enrollment.id,
        token: enrollment.publicAccessToken,
        locale: 'ar',
        returnUrl: 'https://sawiyaa.com/ar/return',
      }),
      manualPaymentService.submit({
        enrollmentId: enrollment.id,
        token: enrollment.publicAccessToken,
        countryIsoCode: 'EG',
        payload: {
          methodId: testMethodId,
          senderAccountName: 'Race Learner',
        },
        proof: {
          buffer: proofBuffer,
          mimetype: 'image/jpeg',
          originalname: 'receipt.jpg',
        },
      }),
    ]);

    // Inspect database state
    const payments = await prisma.payment.findMany({
      where: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollment.id } },
    });

    // CRITICAL INVARIANT: Exactly ONE Payment was created! No orphaned payments!
    expect(payments).toHaveLength(1);

    const winningPayment = payments[0];
    const attempts = await prisma.academyProgramPaymentAttempt.findMany({
      where: { academyProgramEnrollmentId: enrollment.id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].provider).toBe(winningPayment.provider);

    const updatedEnrollment = await prisma.academyProgramEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(updatedEnrollment?.paymentId).toBe(winningPayment.id);

    if (winningPayment.provider === PaymentProvider.PAYMOB) {
      // Card won the row lock first:
      // Card succeeded and returned a checkout URL
      expect(cardResult.status).toBe('fulfilled');
      if (cardResult.status === 'fulfilled') {
        expect(cardResult.value.redirectUrl).toContain('https://paymob.example/checkout/');
      }
      // Manual arrived second: observed non-MANUAL payment and cleanly rejected with ConflictException
      expect(manualResult.status).toBe('rejected');
      if (manualResult.status === 'rejected') {
        expect((manualResult.reason as any).response?.error).toBe('MANUAL_PAYMENT_NOT_SELECTED');
      }
    } else {
      // Manual won the row lock first:
      expect(winningPayment.provider).toBe(PaymentProvider.MANUAL);
      expect(manualResult.status).toBe('fulfilled');

      // Card arrived second: observed PaymentProvider.MANUAL and returned payment_unavailable safely without mutating
      expect(cardResult.status).toBe('fulfilled');
      if (cardResult.status === 'fulfilled') {
        expect(cardResult.value.redirectUrl).toContain('payment_unavailable');
      }
    }
  });

  it('D. Authenticated Patient Gateway Redirect vs Manual simultaneously: serializes correctly on user enrollment', async () => {
    const enrollment = await createTestEnrollment(true);

    const [patientCardResult, manualResult] = await Promise.allSettled([
      patientRedirectUseCase.execute({
        enrollmentId: enrollment.id,
        userId: enrollment.userId!,
        locale: 'ar',
        returnUrl: 'https://sawiyaa.com/ar/return',
      }),
      manualPaymentService.submit({
        enrollmentId: enrollment.id,
        userId: enrollment.userId!,
        countryIsoCode: 'EG',
        payload: {
          methodId: testMethodId,
          senderAccountName: 'Authenticated Patient',
        },
        proof: {
          buffer: Buffer.from('test-proof-data'),
          mimetype: 'image/jpeg',
        },
      }),
    ]);

    const payments = await prisma.payment.findMany({
      where: { metadataJson: { path: ['academyProgramEnrollmentId'], equals: enrollment.id } },
    });

    // Exactly one payment must exist
    expect(payments).toHaveLength(1);

    const attempts = await prisma.academyProgramPaymentAttempt.findMany({
      where: { academyProgramEnrollmentId: enrollment.id },
    });
    expect(attempts).toHaveLength(1);

    const updatedEnrollment = await prisma.academyProgramEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(updatedEnrollment?.paymentId).toBe(payments[0].id);
  });
});
