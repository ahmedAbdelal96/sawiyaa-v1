/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method */
import { randomUUID } from 'node:crypto';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PatientPackagePurchaseStatus,
  PackageSchedulePolicy,
  PractitionerStatus,
  PractitionerType,
  SessionAdminDecisionType,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionCodeGeneratorService } from '../services/session-code-generator.service';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { SessionOutcomePolicySnapshotService } from '../services/session-outcome-policy-snapshot.service';
import { SessionOutcomeEvaluator } from '../services/session-outcome-evaluator.service';
import { GetAdminSessionAttendanceUseCase } from '../use-cases/get-admin-session-attendance.use-case';
import { CompleteSessionTransactionService } from '../services/complete-session-transaction.service';
import { CreateAdminSessionManualDecisionUseCase } from '../use-cases/create-admin-session-manual-decision.use-case';
import { ApplyManualNoShowFinancialEffectsService } from '../services/apply-manual-no-show-financial-effects.service';
import { ApplySessionCancellationFinancialEffectsService } from '../services/apply-session-cancellation-financial-effects.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from '@modules/customer-wallets/repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from '@modules/customer-wallets/repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '@modules/customer-wallets/repositories/customer-wallet-reservation.repository';
import { RefundEventRepository } from '@modules/payments/repositories/refund-event.repository';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { LedgerRepository } from '@modules/financial-operations/repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl
  ? decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
  : '';
if (
  databaseName === 'fayed_db' ||
  (databaseName && !/(phase3b1a|phase3b2a)/i.test(databaseName))
) {
  throw new Error(`Unsafe Phase 3B.1A database: ${databaseName}`);
}

const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('Phase 3B.1A manual no-show PostgreSQL proof', () => {
  const prisma = new PrismaService();
  const repository = new SessionRepository(
    prisma,
    new SessionCodeGeneratorService(prisma),
  );
  const policySnapshots = new SessionOutcomePolicySnapshotService(prisma);
  const lifecycle = new SessionLifecycleService(
    repository,
    new ValidateSessionStatusTransitionService(),
    policySnapshots,
  );
  const money = new MoneyAmountService();
  const earningReview = new SessionEarningReviewService(
    prisma,
    new LedgerRepository(prisma),
    new ExtractPaymentLedgerBreakdownService(money),
    new CalculatePackageSessionAllocationService(money),
    {} as never,
    {} as never,
  );
  const walletAccounting = new CustomerWalletAccountingService(
    prisma,
    new CustomerWalletRepository(prisma),
    new CustomerWalletEntryRepository(prisma),
    new CustomerWalletReservationRepository(prisma),
  );
  const cancellation = new ApplySessionCancellationFinancialEffectsService(
    walletAccounting,
    { execute: jest.fn() } as never,
    earningReview,
    new RefundEventRepository(prisma),
  );
  const manualEffects = new ApplyManualNoShowFinancialEffectsService(
    earningReview,
    cancellation,
  );
  const attendance = new GetAdminSessionAttendanceUseCase(
    prisma,
    repository,
    new SessionOutcomeEvaluator(),
    policySnapshots,
  );
  const manual = new CreateAdminSessionManualDecisionUseCase(
    prisma,
    repository,
    attendance,
    lifecycle,
    { execute: jest.fn() } as unknown as CompleteSessionTransactionService,
    manualEffects,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  async function createFixture(input: {
    coverage: SessionPaymentCoverageType;
    outcome: SessionAdminDecisionType;
  }) {
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const adminUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();
    const purchaseId =
      input.coverage === SessionPaymentCoverageType.PACKAGE
        ? randomUUID()
        : null;
    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Phase 3B1A Patient' },
        { id: practitionerUserId, displayName: 'Phase 3B1A Practitioner' },
        { id: adminUserId, displayName: 'Phase 3B1A Admin' },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `phase3b1a-${practitionerId}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `P3B1A-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        paymentCoverageType: input.coverage,
        packagePurchaseId: null,
        packageSessionIndex: purchaseId ? 1 : null,
        packageSessionCount: purchaseId ? 1 : null,
        scheduledStartAt: new Date('2026-08-01T09:00:00Z'),
        scheduledEndAt: new Date('2026-08-01T09:30:00Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: `phase3b1a-room-${sessionId}`,
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId: purchaseId ? null : sessionId,
        patientId,
        practitionerId,
        paymentPurpose: purchaseId
          ? PaymentPurpose.SESSION_PACKAGE_PURCHASE
          : PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        commissionPlatformRatePercent: 20,
        capturedAt: new Date('2026-08-01T10:00:00Z'),
      },
    });
    if (purchaseId) {
      await prisma.patientPackagePurchase.create({
        data: {
          id: purchaseId,
          practitionerId,
          patientId,
          paymentId,
          status: PatientPackagePurchaseStatus.ACTIVE,
          paidAt: new Date('2026-08-01T10:00:00Z'),
          activatedAt: new Date('2026-08-01T10:00:00Z'),
          titleSnapshot: 'Phase 3B1A package',
          descriptionSnapshot: 'Disposable package',
          slugSnapshot: `phase3b1a-${purchaseId}`,
          packageVersionSnapshot: 1,
          sessionCountSnapshot: 1,
          currencyCodeSnapshot: 'EGP',
          selectedBaseSessionPriceSnapshot: 100,
          undiscountedTotalSnapshot: 100,
          discountAmountSnapshot: 0,
          patientPayableTotalSnapshot: 100,
          platformDiscountShareSnapshot: 0,
          practitionerDiscountShareSnapshot: 0,
          commissionModeSnapshot: 'FIXED',
          platformOriginalShareSnapshot: 20,
          practitionerOriginalShareSnapshot: 80,
          platformFinalShareSnapshot: 20,
          practitionerFinalShareSnapshot: 80,
          sessionDurationMinutesSnapshot: 30,
          sessionModeSnapshot: SessionMode.VIDEO,
          schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: 100,
        },
      });
      await prisma.session.update({
        where: { id: sessionId },
        data: { packagePurchaseId: purchaseId },
      });
    }
    return {
      sessionId,
      patientId,
      practitionerId,
      patientUserId,
      practitionerUserId,
      adminUserId,
      paymentId,
      purchaseId,
      outcome: input.outcome,
    };
  }

  async function decide(fixture: Awaited<ReturnType<typeof createFixture>>) {
    return manual.execute({
      sessionId: fixture.sessionId,
      decisionType: fixture.outcome,
      decidedByUserId: fixture.adminUserId,
      reasonCode: fixture.outcome,
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
  }

  async function cleanup(fixture: Awaited<ReturnType<typeof createFixture>>) {
    await prisma.customerWalletEntry.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.refundEvent.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.refund.deleteMany({ where: { sessionId: fixture.sessionId } });
    await prisma.sessionEarningReview.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.sessionEvent.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.sessionAdminDecision.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.sessionPackageEntitlementDecision.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    if (fixture.purchaseId) {
      await prisma.session.update({
        where: { id: fixture.sessionId },
        data: { packagePurchaseId: null },
      });
    }
    await prisma.session.delete({ where: { id: fixture.sessionId } });
    if (fixture.purchaseId)
      await prisma.patientPackagePurchase.delete({
        where: { id: fixture.purchaseId },
      });
    await prisma.payment.delete({ where: { id: fixture.paymentId } });
    await prisma.patientProfile.delete({ where: { id: fixture.patientId } });
    await prisma.practitionerProfile.delete({
      where: { id: fixture.practitionerId },
    });
    await prisma.user.deleteMany({ where: { id: fixture.adminUserId } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [fixture.patientUserId, fixture.practitionerUserId] },
      },
    });
  }

  it('proves patient no-show package and replay idempotency', async () => {
    const fixture = await createFixture({
      coverage: SessionPaymentCoverageType.PACKAGE,
      outcome: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
    });
    try {
      await decide(fixture);
      await decide(fixture);
      const session = await prisma.session.findUnique({
        where: { id: fixture.sessionId },
      });
      const packageDecision =
        await prisma.sessionPackageEntitlementDecision.findUnique({
          where: { sessionId: fixture.sessionId },
        });
      const reviews = await prisma.sessionEarningReview.count({
        where: { sessionId: fixture.sessionId },
      });
      const wallets = await prisma.customerWalletEntry.count({
        where: { sessionId: fixture.sessionId },
      });
      expect(session?.status).toBe(SessionStatus.PATIENT_NO_SHOW);
      expect(packageDecision?.decisionType).toBe('COUNT_AS_USED');
      expect(reviews).toBe(1);
      expect(wallets).toBe(0);
      expect(
        await prisma.sessionAdminDecision.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it('proves direct patient no-show has review but no refund', async () => {
    const fixture = await createFixture({
      coverage: SessionPaymentCoverageType.SELF_PAY,
      outcome: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
    });
    try {
      await decide(fixture);
      const payment = await prisma.payment.findUnique({
        where: { id: fixture.paymentId },
      });
      expect(payment?.status).toBe(PaymentStatus.CAPTURED);
      expect(
        await prisma.refund.count({ where: { sessionId: fixture.sessionId } }),
      ).toBe(0);
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it('proves practitioner no-show package restore and direct wallet credit', async () => {
    const packageFixture = await createFixture({
      coverage: SessionPaymentCoverageType.PACKAGE,
      outcome: SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW,
    });
    const directFixture = await createFixture({
      coverage: SessionPaymentCoverageType.SELF_PAY,
      outcome: SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW,
    });
    try {
      await decide(packageFixture);
      await decide(packageFixture);
      expect(
        (
          await prisma.sessionPackageEntitlementDecision.findUnique({
            where: { sessionId: packageFixture.sessionId },
          })
        )?.decisionType,
      ).toBe('RESTORE_TO_PACKAGE');
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: packageFixture.sessionId },
        }),
      ).toBe(0);

      await decide(directFixture);
      await decide(directFixture);
      const wallet = await prisma.customerWallet.findUnique({
        where: {
          patientId_currencyCode: {
            patientId: directFixture.patientId,
            currencyCode: 'EGP',
          },
        },
      });
      const entries = await prisma.customerWalletEntry.findMany({
        where: { sessionId: directFixture.sessionId },
      });
      expect(wallet?.availableBalance.toString()).toBe('100');
      expect(entries).toHaveLength(1);
      expect(entries[0].amount.toString()).toBe('100');
      expect(entries[0].patientId).toBe(directFixture.patientId);
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: directFixture.sessionId },
        }),
      ).toBe(0);
      expect(
        await prisma.payment.count({
          where: { sessionId: directFixture.sessionId },
        }),
      ).toBe(1);
    } finally {
      await cleanup(packageFixture);
      await cleanup(directFixture);
    }
  });

  it('proves both no-show has no automatic financial or package effect', async () => {
    const fixture = await createFixture({
      coverage: SessionPaymentCoverageType.PACKAGE,
      outcome: SessionAdminDecisionType.MARK_BOTH_NO_SHOW,
    });
    try {
      await decide(fixture);
      await decide(fixture);
      expect(
        (await prisma.session.findUnique({ where: { id: fixture.sessionId } }))
          ?.status,
      ).toBe(SessionStatus.BOTH_NO_SHOW);
      expect(
        await prisma.sessionPackageEntitlementDecision.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(0);
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(0);
      expect(
        await prisma.refund.count({ where: { sessionId: fixture.sessionId } }),
      ).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it('proves semantic mapping, rollback, and conflicting terminal decisions', async () => {
    const fixture = await createFixture({
      coverage: SessionPaymentCoverageType.SELF_PAY,
      outcome: SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW,
    });
    try {
      const apply = manualEffects.apply.bind(manualEffects);
      jest
        .spyOn(manualEffects, 'apply')
        .mockImplementationOnce(async (input) => {
          await apply(input);
          throw new Error('phase3b1a injected failure');
        });
      await expect(decide(fixture)).rejects.toThrow(
        'phase3b1a injected failure',
      );
      expect(
        (await prisma.session.findUnique({ where: { id: fixture.sessionId } }))
          ?.status,
      ).toBe(SessionStatus.AWAITING_COMPLETION_CONFIRMATION);
      expect(
        await prisma.refund.count({ where: { sessionId: fixture.sessionId } }),
      ).toBe(0);
      expect(
        await prisma.customerWalletEntry.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(0);
      manualEffects.apply.mockRestore();
      await decide(fixture);
      const conflict = {
        ...fixture,
        outcome: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
      };
      await expect(decide(conflict)).rejects.toMatchObject({
        response: expect.objectContaining({
          error: 'SESSION_FINAL_OUTCOME_CORRECTION_NOT_SUPPORTED',
        }),
      });
      expect(
        (await prisma.session.findUnique({ where: { id: fixture.sessionId } }))
          ?.status,
      ).toBe(SessionStatus.PRACTITIONER_NO_SHOW);
    } finally {
      await cleanup(fixture);
    }
  });

  it('rolls back package decision and earning review when failure is injected after their writes', async () => {
    const packageFixture = await createFixture({
      coverage: SessionPaymentCoverageType.PACKAGE,
      outcome: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
    });
    const directFixture = await createFixture({
      coverage: SessionPaymentCoverageType.SELF_PAY,
      outcome: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
    });
    try {
      const originalApply = manualEffects.apply.bind(manualEffects);
      jest
        .spyOn(manualEffects, 'apply')
        .mockImplementationOnce(async (input) => {
          await originalApply(input);
          throw new Error('phase3b1a package failure');
        });
      await expect(decide(packageFixture)).rejects.toThrow(
        'phase3b1a package failure',
      );
      expect(
        (
          await prisma.session.findUnique({
            where: { id: packageFixture.sessionId },
          })
        )?.status,
      ).toBe(SessionStatus.AWAITING_COMPLETION_CONFIRMATION);
      expect(
        await prisma.sessionPackageEntitlementDecision.count({
          where: { sessionId: packageFixture.sessionId },
        }),
      ).toBe(0);
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: packageFixture.sessionId },
        }),
      ).toBe(0);
      manualEffects.apply.mockRestore();

      jest
        .spyOn(manualEffects, 'apply')
        .mockImplementationOnce(async (input) => {
          await originalApply(input);
          throw new Error('phase3b1a earning failure');
        });
      await expect(decide(directFixture)).rejects.toThrow(
        'phase3b1a earning failure',
      );
      expect(
        (
          await prisma.session.findUnique({
            where: { id: directFixture.sessionId },
          })
        )?.status,
      ).toBe(SessionStatus.AWAITING_COMPLETION_CONFIRMATION);
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: directFixture.sessionId },
        }),
      ).toBe(0);
      manualEffects.apply.mockRestore();
    } finally {
      if (jest.isMockFunction(manualEffects.apply)) {
        manualEffects.apply.mockRestore();
      }
      await cleanup(packageFixture);
      await cleanup(directFixture);
    }
  });
});
