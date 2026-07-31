import { NestFactory } from '@nestjs/core';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  AuthProvider,
  SessionFlowType,
  SessionMode,
  SessionStatus,
  SettlementPayoutMethod,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SessionEarningReviewService } from '../../src/modules/financial-operations/services/session-earning-review.service';
import { assertQaFinanceSeedAllowed } from '../seed/shared/financial-fixture-gate';
import { SessionLifecycleService } from '../../src/modules/sessions/services/session-lifecycle.service';
import { SessionRepository } from '../../src/modules/sessions/repositories/session.repository';
import { AdminSettlementWorkflowUseCase } from '../../src/modules/financial-operations/use-cases/admin-settlement-workflow.use-case';
import { SettlementAdjustmentService } from '../../src/modules/financial-operations/services/settlement-adjustment.service';

/**
 * Creates disposable QA source records and runs the real completion/review
 * services. It deliberately never creates settlements, wallets, or ledger
 * entries directly; those are owned by the application services.
 */
async function createScenario(input: {
  prisma: PrismaService;
  lifecycle: SessionLifecycleService;
  reviewService: SessionEarningReviewService;
  sessionRepository: SessionRepository;
  patientId: string;
  practitionerId: string;
  actorUserId: string;
  currencyCode: string;
  amount: Prisma.Decimal;
  commissionRate: Prisma.Decimal;
  label: string;
  scenarioCode: string;
}) {
  const now = new Date();
  const datasetTag = 'QA_FINANCE_SETTLEMENT_DATASET_V1';
  const providerPaymentRef = `QA_FINANCE_TEST_${input.scenarioCode}`;

  const existingPayment = await input.prisma.payment.findFirst({
    where: { providerPaymentRef },
    select: { session: { select: { id: true, status: true, sessionCode: true } } },
  });
  const existingSession = existingPayment?.session;
  if (existingSession) {
    const existingReview = await input.prisma.sessionEarningReview.findUnique({
      where: { sessionId_sourceType: { sessionId: existingSession.id, sourceType: 'DIRECT_SESSION' } },
      select: { id: true },
    });
    const existingSettlement = existingReview
      ? await input.prisma.practitionerSettlement.findUnique({
          where: { sourceReviewId: existingReview.id },
          select: { id: true },
        })
      : null;
    if (existingSettlement) {
      return {
        session: existingSession,
        review: { reviewId: existingReview!.id },
        settlement: await input.prisma.practitionerSettlement.findUniqueOrThrow({
          where: { id: existingSettlement.id },
          select: {
            id: true, status: true, practitionerId: true, sourceReviewId: true,
            originalAmount: true, originalCurrencyCode: true, walletCurrencyCode: true,
            exchangeRate: true, convertedAmount: true, amountGross: true,
            amountAdjustments: true, finalWalletCredit: true,
          },
        }),
      };
    }
  }

  const completed = await input.prisma.$transaction(async (tx) => {
    const session = await input.sessionRepository.createSession({
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.DRAFT,
        requestedStartAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        scheduledStartAt: new Date(now.getTime() + 25 * 60 * 60 * 1000),
        scheduledEndAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
        joinOpenAt: new Date(now.getTime() + 24.5 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        timezoneSnapshot: 'Africa/Cairo',
        provider: 'NONE',
        paymentCoverageType: 'DIRECT_PAYMENT',
      }, tx, 'qa_settlement_fixture');
    await tx.payment.create({
      data: {
        sessionId: session.id,
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: input.amount,
        amountDiscount: new Prisma.Decimal(0),
        amountTotal: input.amount,
        amountFromWallet: new Prisma.Decimal(0),
        amountFromGateway: input.amount,
        currencyCode: input.currencyCode,
        commissionPlatformRatePercent: input.commissionRate,
        commissionPractitionerRatePercent: new Prisma.Decimal(100).sub(input.commissionRate),
        providerPaymentRef,
        providerOrderRef: providerPaymentRef,
        initiatedAt: now,
        authorizedAt: now,
        capturedAt: now,
        metadataJson: { qaDataset: datasetTag, qaTag: 'QA_FINANCE_', scenarioCode: input.scenarioCode, label: input.label },
      },
    });
    let lifecycleSession: { id: string; status: SessionStatus } = session;
    for (const status of [SessionStatus.PENDING_PAYMENT, SessionStatus.UPCOMING, SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED]) {
      lifecycleSession = await input.lifecycle.transition({
        session: lifecycleSession,
        to: status,
        tx,
        actorUserId: input.actorUserId,
        reason: 'QA_SETTLEMENT_RUNTIME_FIXTURE',
        metadata: { qaDataset: datasetTag, qaTag: 'QA_FINANCE_', scenarioCode: input.scenarioCode, label: input.label },
      });
    }
    const review = await input.reviewService.syncForSessionCompletion({ sessionId: session.id, tx });
    return { session: lifecycleSession, review };
  });

  if (!completed.review?.reviewId) {
    throw new Error(`QA fixture could not create an earning review for ${completed.session.id}`);
  }

  const settlement = await input.prisma.practitionerSettlement.findUniqueOrThrow({
    where: { sourceReviewId: completed.review.reviewId },
    select: {
      id: true,
      status: true,
      practitionerId: true,
      sourceReviewId: true,
      originalAmount: true,
      originalCurrencyCode: true,
      walletCurrencyCode: true,
      exchangeRate: true,
      convertedAmount: true,
      amountGross: true,
      amountAdjustments: true,
      finalWalletCredit: true,
    },
  });

  return { session: completed.session, review: completed.review, settlement };
}

async function readSettlement(prisma: PrismaService, settlementId: string) {
  return prisma.practitionerSettlement.findUniqueOrThrow({
    where: { id: settlementId },
    select: {
      id: true,
      status: true,
      practitionerId: true,
      sourceReviewId: true,
      originalAmount: true,
      originalCurrencyCode: true,
      walletCurrencyCode: true,
      exchangeRate: true,
      convertedAmount: true,
      amountGross: true,
      amountAdjustments: true,
      finalWalletCredit: true,
      amountPaidTotal: true,
    },
  });
}

async function finalizeScenario(input: {
  prisma: PrismaService;
  workflow: AdminSettlementWorkflowUseCase;
  settlementId: string;
  accountantUserId: string;
  action: 'APPROVE' | 'REJECT' | 'PAY_OUT';
  exchangeRate?: string;
  payoutReference?: string;
}) {
  if (input.action === 'REJECT') {
    await input.workflow.reject({
      settlementId: input.settlementId,
      actorUserId: input.accountantUserId,
      reason: 'QA fixture rejection: operational review required.',
    });
  } else {
    await input.workflow.approve({
      settlementId: input.settlementId,
      actorUserId: input.accountantUserId,
      exchangeRate: input.exchangeRate ?? null,
    });

    if (input.action === 'PAY_OUT') {
      const approved = await readSettlement(input.prisma, input.settlementId);
      await input.workflow.payout({
        settlementId: input.settlementId,
        actorUserId: input.accountantUserId,
        body: {
          settlementId: input.settlementId,
          amountPaid: approved.finalWalletCredit.toString(),
          payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
          externalReference: input.payoutReference,
          notes: 'QA fixture payout.',
        },
      });
    }
  }

  return readSettlement(input.prisma, input.settlementId);
}

async function createFailedPaymentScenario(input: {
  prisma: PrismaService;
  sessionRepository: SessionRepository;
  patientId: string;
  practitionerId: string;
}) {
  const providerPaymentRef = 'QA_FINANCE_TEST_I_FAILED_PAYMENT';
  const existingPayment = await input.prisma.payment.findFirst({ where: { providerPaymentRef }, select: { session: { select: { id: true, status: true } } } });
  const existing = existingPayment?.session;
  if (existing) return { sessionId: existing.id, status: existing.status, paymentReference: providerPaymentRef };
  const now = new Date();
  const session = await input.sessionRepository.createSession({
      patientId: input.patientId,
      practitionerId: input.practitionerId,
      flowType: SessionFlowType.SCHEDULED,
      sessionMode: SessionMode.VIDEO,
      durationMinutes: 60,
      status: SessionStatus.PENDING_PAYMENT,
      requestedStartAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      scheduledStartAt: new Date(now.getTime() + 25 * 60 * 60 * 1000),
      scheduledEndAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      joinOpenAt: new Date(now.getTime() + 24.5 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      timezoneSnapshot: 'Africa/Cairo',
      provider: 'NONE',
      paymentCoverageType: 'DIRECT_PAYMENT',
    }, undefined, 'qa_failed_payment_fixture');
  await input.prisma.payment.create({
    data: {
      sessionId: session.id,
      patientId: input.patientId,
      practitionerId: input.practitionerId,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.FAILED,
      amountSubtotal: new Prisma.Decimal(100),
      amountDiscount: new Prisma.Decimal(0),
      amountTotal: new Prisma.Decimal(100),
      amountFromWallet: new Prisma.Decimal(0),
      amountFromGateway: new Prisma.Decimal(100),
      currencyCode: 'EGP',
      commissionPlatformRatePercent: new Prisma.Decimal(30),
      commissionPractitionerRatePercent: new Prisma.Decimal(70),
      providerPaymentRef,
      providerOrderRef: providerPaymentRef,
      initiatedAt: now,
      failedAt: now,
      metadataJson: { qaDataset: 'QA_FINANCE_SETTLEMENT_DATASET_V1', qaTag: 'QA_FINANCE_', scenarioCode: 'I_FAILED_PAYMENT', label: 'Failed payment: no settlement' },
    },
  });
  return { sessionId: session.id, status: session.status, paymentReference: providerPaymentRef };
}

function pickPractitioner<T extends { id: string }>(
  requestedId: string | undefined,
  candidates: T[],
  usedIds: Set<string>,
) {
  const requested = requestedId
    ? candidates.find((item) => item.id === requestedId)
    : undefined;
  const selected = requested ?? candidates.find((item) => !usedIds.has(item.id));
  if (selected) usedIds.add(selected.id);
  return selected;
}

const QA_IDS = {
  admin: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  staff: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  patients: [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa101',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa102',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa103',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa104',
  ],
  practitioners: [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa201',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa202',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa203',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa204',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa205',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa206',
  ],
  practitionerProfiles: [
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb201',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb202',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb203',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb204',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb205',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb206',
  ],
  patientProfiles: [
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb101',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb102',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb103',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb104',
  ],
} as const;

async function ensureQaPrerequisites(prisma: PrismaService) {
  const egypt = await prisma.country.findFirst({ where: { isoCode: { in: ['EG', 'EGY'] } }, select: { id: true, isoCode: true } });
  const outsideEgypt = await prisma.country.findFirst({ where: { isoCode: { in: ['AE', 'US', 'SA'] } }, select: { id: true, isoCode: true } });
  if (!egypt || !outsideEgypt) throw new Error('QA fixture requires Egypt and one non-Egypt country in reference data.');

  const users = [
    { id: QA_IDS.admin, email: 'qa.finance.admin@sawiyaa.test', displayName: 'QA Finance Admin', role: UserRoleType.ADMIN },
    { id: QA_IDS.staff, email: 'qa.finance.staff@sawiyaa.test', displayName: 'QA Finance Staff', role: UserRoleType.FINANCE_STAFF },
    ...QA_IDS.patients.map((id, index) => ({ id, email: `qa.patient.${index + 1}@sawiyaa.test`, displayName: `QA Patient ${index + 1}`, role: UserRoleType.PATIENT })),
    ...QA_IDS.practitioners.map((id, index) => ({ id, email: `qa.practitioner.${index + 1}@sawiyaa.test`, displayName: `Dr. QA Finance Practitioner ${index + 1}`, role: UserRoleType.PRACTITIONER })),
  ];
  const passwordHash = await hash('QA_Finance_Only_12345!', 10);
  for (const user of users) {
    await prisma.user.upsert({ where: { id: user.id }, create: { id: user.id, displayName: user.displayName, status: UserStatus.ACTIVE, defaultLocale: 'en', timezone: 'Africa/Cairo' }, update: { displayName: user.displayName, status: UserStatus.ACTIVE } });
    await prisma.userRole.upsert({ where: { userId_role: { userId: user.id, role: user.role } }, create: { userId: user.id, role: user.role }, update: {} });
    await prisma.userEmail.upsert({ where: { email: user.email }, create: { userId: user.id, email: user.email, isPrimary: true, isVerified: true }, update: { userId: user.id, isPrimary: true, isVerified: true } });
    if (user.id === QA_IDS.admin || user.id === QA_IDS.staff) {
      await prisma.authIdentity.upsert({ where: { provider_providerSubject: { provider: AuthProvider.PASSWORD, providerSubject: user.email } }, create: { userId: user.id, provider: AuthProvider.PASSWORD, providerSubject: user.email, passwordHash, isEnabled: true }, update: { userId: user.id, passwordHash, isEnabled: true } });
    }
  }
  for (let index = 0; index < QA_IDS.patients.length; index += 1) {
    await prisma.patientProfile.upsert({ where: { userId: QA_IDS.patients[index] }, create: { id: QA_IDS.patientProfiles[index], userId: QA_IDS.patients[index], countryId: index === 2 ? outsideEgypt.id : egypt.id, displayName: users[index + 2].displayName, gender: index % 2 ? 'MALE' : 'FEMALE' }, update: { countryId: index === 2 ? outsideEgypt.id : egypt.id, displayName: users[index + 2].displayName } });
  }
  const practitionerCountries = [egypt.id, egypt.id, outsideEgypt.id, outsideEgypt.id, egypt.id, egypt.id];
  const profiles: Array<{ id: string; userId: string; country: { isoCode: string } | null }> = [];
  for (let index = 0; index < QA_IDS.practitioners.length; index += 1) {
    profiles.push(await prisma.practitionerProfile.upsert({ where: { userId: QA_IDS.practitioners[index] }, create: { id: QA_IDS.practitionerProfiles[index], userId: QA_IDS.practitioners[index], countryId: practitionerCountries[index], publicSlug: `qa-finance-practitioner-${index + 1}`, professionalTitle: 'QA Finance Practitioner', status: 'APPROVED', complianceState: 'VERIFIED', operationalStatus: 'ACTIVE', preferredPayoutCurrencyCode: index === 2 || index === 3 ? 'USD' : 'EGP' }, update: { countryId: practitionerCountries[index], status: 'APPROVED', complianceState: 'VERIFIED', operationalStatus: 'ACTIVE', preferredPayoutCurrencyCode: index === 2 || index === 3 ? 'USD' : 'EGP' }, select: { id: true, userId: true, country: { select: { isoCode: true } } } }));
  }
  return { accountantId: QA_IDS.admin, patientIds: QA_IDS.patientProfiles, practitioners: profiles };
}

async function main() {
  assertQaFinanceSeedAllowed('settlement-qa-scenario');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const prisma = app.get(PrismaService);
    const lifecycle = app.get(SessionLifecycleService);
    const reviewService = app.get(SessionEarningReviewService);
    const sessionRepository = app.get(SessionRepository);
    const workflow = app.get(AdminSettlementWorkflowUseCase);
    const adjustmentService = app.get(SettlementAdjustmentService);
    const qa = await ensureQaPrerequisites(prisma);
    const practitioners = qa.practitioners;
    // These profiles are owned by this fixture. Existing QA scenario codes
    // are reused; unrelated production/development profiles are never used.
    const availablePractitioners = practitioners;
    const patients = qa.patientIds.map((id) => ({ id }));
    const usedIds = new Set<string>();
    const nonEgypt = availablePractitioners.filter(
      (item) => !['EG', 'EGY'].includes(item.country?.isoCode?.toUpperCase() ?? ''),
    );
    const egypt = availablePractitioners.filter((item) =>
      ['EG', 'EGY'].includes(item.country?.isoCode?.toUpperCase() ?? ''),
    );
    const requested = (name: string) => process.env[name]?.trim();
    const underReviewPractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_UNDER_REVIEW_PRACTITIONER_ID'),
      egypt,
      usedIds,
    );
    const approvedPractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_APPROVED_PRACTITIONER_ID') ??
        requested('QA_SETTLEMENT_APPROVE_PRACTITIONER_ID'),
      egypt,
      usedIds,
    );
    const paidOutPractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_PAID_OUT_PRACTITIONER_ID'),
      nonEgypt,
      usedIds,
    );
    const usdNativePractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_USD_NATIVE_PRACTITIONER_ID'),
      nonEgypt,
      usedIds,
    );
    const rejectedPractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_REJECTED_PRACTITIONER_ID') ??
        requested('QA_SETTLEMENT_REJECT_PRACTITIONER_ID'),
      egypt,
      usedIds,
    );
    const conversionPractitioner = pickPractitioner(
      requested('QA_SETTLEMENT_CONVERSION_PRACTITIONER_ID'),
      egypt,
      usedIds,
    );
    const selectedPractitioners = [
      underReviewPractitioner,
      approvedPractitioner,
      paidOutPractitioner,
      rejectedPractitioner,
      conversionPractitioner,
      usdNativePractitioner,
    ];
    if (selectedPractitioners.some((item) => !item) || !patients[0]) {
      throw new Error(
        'QA fixture requires four QA Egypt practitioners, two QA non-Egypt practitioners, and one patient. Set the QA_SETTLEMENT_*_PRACTITIONER_ID variables explicitly only to QA profiles when overriding selection.',
      );
    }
    const accountant = { id: qa.accountantId };
    const amount = new Prisma.Decimal(process.env.QA_SETTLEMENT_AMOUNT ?? '100');
    const commissionRate = new Prisma.Decimal(process.env.QA_PLATFORM_COMMISSION_RATE ?? '30');
    const fxRate = process.env.QA_SETTLEMENT_USD_TO_EGP_RATE ?? '50';
    const patientId = patients[0].id;
    const create = (practitioner: { id: string; userId: string }, currencyCode: string, label: string, scenarioCode: string) =>
      createScenario({
        prisma,
        lifecycle,
        reviewService,
        sessionRepository,
        patientId,
        practitionerId: practitioner.id,
        actorUserId: practitioner.userId,
        currencyCode,
        amount,
        commissionRate,
        label,
        scenarioCode,
      });

    const underReview = await create(underReviewPractitioner!, 'EGP', 'Settlement needs review', 'A_UNDER_REVIEW');
    const approvedSource = await create(approvedPractitioner!, 'EGP', 'Settlement ready for payout', 'B_CREDITED');
    const approved = await finalizeScenario({
      prisma,
      workflow,
      settlementId: approvedSource.settlement.id,
      accountantUserId: accountant.id,
      action: 'APPROVE',
      exchangeRate: approvedSource.settlement.originalCurrencyCode !== approvedSource.settlement.walletCurrencyCode ? fxRate : undefined,
    });
    const paidOutSource = await create(paidOutPractitioner!, 'USD', 'Already paid out settlement', 'C_PAID_OUT');
    const paidOut = await finalizeScenario({
      prisma,
      workflow,
      settlementId: paidOutSource.settlement.id,
      accountantUserId: accountant.id,
      action: 'PAY_OUT',
      payoutReference: 'QA_FINANCE_TEST_PAYOUT_C_PAID_OUT',
    });
    const adjustmentSource = await createScenario({
      prisma,
      lifecycle,
      reviewService,
      sessionRepository,
      patientId,
      practitionerId: rejectedPractitioner!.id,
      actorUserId: rejectedPractitioner!.userId,
      currencyCode: 'EGP',
      amount: new Prisma.Decimal(1000),
      commissionRate: new Prisma.Decimal(0),
      label: 'Adjustments: 1000 EGP - 100 EGP - 50 EGP',
      scenarioCode: 'D_ADJUSTMENTS',
    });
    await prisma.$transaction(async (tx) => {
      const existingAdjustments = await tx.settlementAdjustment.findMany({
        where: { settlementId: adjustmentSource.settlement.id },
        select: { type: true, amount: true, reason: true },
      });
      if (!existingAdjustments.some((item) => item.type === 'ADMINISTRATIVE_FEE' && item.amount.eq(100) && item.reason === 'QA administrative fee')) {
        await adjustmentService.apply({ db: tx, settlementId: adjustmentSource.settlement.id, type: 'ADMINISTRATIVE_FEE', amount: new Prisma.Decimal(100), reason: 'QA administrative fee', actorUserId: accountant.id });
      }
      if (!existingAdjustments.some((item) => item.type === 'TAX' && item.amount.eq(50) && item.reason === 'QA tax withholding')) {
        await adjustmentService.apply({ db: tx, settlementId: adjustmentSource.settlement.id, type: 'TAX', amount: new Prisma.Decimal(50), reason: 'QA tax withholding', actorUserId: accountant.id });
      }
    });
    const adjusted = await finalizeScenario({
      prisma,
      workflow,
      settlementId: adjustmentSource.settlement.id,
      accountantUserId: accountant.id,
      action: 'APPROVE',
    });
    const conversionSource = await create(conversionPractitioner!, 'USD', 'Cross currency snapshot', 'E_USD_TO_EGP');
    const conversion = await finalizeScenario({
      prisma,
      workflow,
      settlementId: conversionSource.settlement.id,
      accountantUserId: accountant.id,
      action: 'APPROVE',
      exchangeRate: fxRate,
    });
    const usdNativeSource = await create(usdNativePractitioner!, 'USD', 'USD native settlement', 'F_USD_NATIVE');
    const usdNative = await finalizeScenario({
      prisma,
      workflow,
      settlementId: usdNativeSource.settlement.id,
      accountantUserId: accountant.id,
      action: 'APPROVE',
    });
    const failedPayment = await createFailedPaymentScenario({ prisma, sessionRepository, patientId, practitionerId: underReviewPractitioner!.id });

    console.log(JSON.stringify({
      ok: true,
      accountantUserId: accountant.id,
      scenarios: {
        UNDER_REVIEW: { scenario: '[QA Finance Scenario A]', settlement: underReview.settlement },
        CREDITED: { scenario: '[QA Finance Scenario B]', settlement: approved },
        PAID_OUT: { scenario: '[QA Finance Scenario C]', settlement: paidOut },
        ADJUSTMENTS: { scenario: '[QA Finance Scenario D]', settlement: adjusted },
        USD_TO_EGP: { scenario: '[QA Finance Scenario E]', settlement: conversion },
        USD_NATIVE: { scenario: '[QA Finance Scenario F]', settlement: usdNative },
        FAILED_PAYMENT: { scenario: '[QA Finance Scenario I]', payment: failedPayment },
      },
      optionalScenarios: {
        REFUND: 'REFUND_QA_SCENARIOS_BLOCKED_PROVIDER_INTEGRATION',
        RECONCILIATION: 'RECONCILIATION_QA_SCENARIO_SKIPPED_TO_AVOID_CORRUPTION',
      },
      instructions: 'All wallet, ledger, settlement, and payout records were generated by application services. Query the Admin and Practitioner APIs to verify the returned settlement IDs.',
    }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
