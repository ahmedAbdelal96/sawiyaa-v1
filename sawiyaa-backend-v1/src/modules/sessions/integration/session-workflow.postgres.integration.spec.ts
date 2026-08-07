import { randomUUID } from 'node:crypto';
import {
  SessionMode,
  SessionProvider,
  SessionStatus,
  SessionEventType,
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
  SessionFlowType,
  PractitionerType,
  PractitionerStatus,
  PaymentPurpose,
  PaymentProvider,
  PaymentStatus,
  PatientPackagePurchaseStatus,
  PackageSchedulePolicy,
  SessionPaymentCoverageType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionCodeGeneratorService } from '../services/session-code-generator.service';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { SessionOutcomePolicySnapshotService } from '../services/session-outcome-policy-snapshot.service';
import { SessionCompletionConfirmationSweeperService } from '../services/session-completion-confirmation-sweeper.service';
import { NormalizeSessionAttendanceReconciliationService } from '../services/normalize-session-attendance-reconciliation.service';
import { ReconcileSessionAttendanceUseCase } from '../use-cases/reconcile-session-attendance.use-case';
import { SessionOutcomeEvaluator } from '../services/session-outcome-evaluator.service';
import { GetAdminSessionAttendanceUseCase } from '../use-cases/get-admin-session-attendance.use-case';
import { OrchestrateSessionPaymentStatusService } from '../../payments/services/orchestrate-session-payment-status.service';
import { CompleteSessionTransactionService } from '../services/complete-session-transaction.service';
import { FinalizeSessionAutomaticallyAsCompletedUseCase } from '../use-cases/finalize-session-automatically-as-completed.use-case';
import { PostPackageSessionLedgerEntriesUseCase } from '../../financial-operations/use-cases/post-package-session-ledger-entries.use-case';
import { PackageSettlementService } from '../../financial-operations/services/package-settlement.service';
import { SessionEarningReviewService } from '../../financial-operations/services/session-earning-review.service';
import { LedgerRepository } from '../../financial-operations/repositories/ledger.repository';
import { PackageSettlementRepository } from '../../financial-operations/repositories/package-settlement.repository';
import { MoneyAmountService } from '../../financial-operations/services/money-amount.service';
import { CalculatePackageSessionAllocationService } from '../../financial-operations/services/calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from '../../financial-operations/services/extract-payment-ledger-breakdown.service';

const isolatedDatabaseUrl =
  process.env.SAWIYAA_PHASE3A_DATABASE_URL ??
  process.env.SAWIYAA_PHASE26_DATABASE_URL;
const NORMAL_DEVELOPMENT_DATABASE_NAME = 'fayed_db';

function assertIsolatedDatabase(urlValue: string | undefined): void {
  if (!urlValue) return;
  const databaseName = decodeURIComponent(new URL(urlValue).pathname.slice(1));
  if (
    databaseName === NORMAL_DEVELOPMENT_DATABASE_NAME ||
    !/(phase3a|phase3b1a|phase3b2a|phase26b|phase26|test|integration)/i.test(databaseName)
  ) {
    throw new Error(
      `Refusing PostgreSQL integration test database: ${databaseName}`,
    );
  }
}

assertIsolatedDatabase(isolatedDatabaseUrl);

const describeIfDatabase = isolatedDatabaseUrl ? describe : describe.skip;

describeIfDatabase('Phase 2.6 PostgreSQL session workflow proof', () => {
  const prisma = isolatedDatabaseUrl
    ? new PrismaService()
    : ({} as PrismaService);
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
  const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createFixture(input: {
    status?: SessionStatus;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    durationMinutes?: number;
  }) {
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Phase26 Patient' },
        { id: practitionerUserId, displayName: 'Phase26 Practitioner' },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `phase26-${practitionerId}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `P26-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: input.durationMinutes ?? 30,
        status: input.status ?? SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        provider: SessionProvider.DAILY,
        providerRoomId: 'phase26-room',
      },
    });
    return {
      sessionId,
      patientId,
      practitionerId,
      patientUserId,
      practitionerUserId,
    };
  }

  async function cleanup(fixture: Awaited<ReturnType<typeof createFixture>>) {
    await prisma.session.delete({ where: { id: fixture.sessionId } });
    await prisma.patientProfile.delete({ where: { id: fixture.patientId } });
    await prisma.practitionerProfile.delete({
      where: { id: fixture.practitionerId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [fixture.patientUserId, fixture.practitionerUserId] },
      },
    });
  }

  async function seedCompletionEvidence(
    fixture: Awaited<ReturnType<typeof createFixture>>,
    input: { overlapSeconds: number; meetingStarted?: boolean } = {
      overlapSeconds: 1260,
    },
  ) {
    const start = new Date('2026-08-03T14:00:00.000Z');
    const overlapEnd = new Date(start.getTime() + input.overlapSeconds * 1000);
    await prisma.sessionOutcomePolicySnapshot.create({
      data: {
        sessionId: fixture.sessionId,
        version: 1,
        completionOverlapPercent: 70,
        minimumOverlapMinutes: 20,
        patientNoShowGraceMinutes: 15,
        practitionerNoShowGraceMinutes: 10,
        finalizationGraceMinutes: 15,
        lateEvidenceWaitingMinutes: 0,
        capturedAt: start,
        source: 'phase3a-fixture',
      },
    });
    await prisma.sessionAttendanceEvent.createMany({
      data: [
        [
          SessionAttendanceParticipantRole.PATIENT,
          fixture.patientUserId,
          'phase3a-helper-p-join',
          'phase3a-helper-p-left',
        ],
        [
          SessionAttendanceParticipantRole.PRACTITIONER,
          fixture.practitionerUserId,
          'phase3a-helper-pr-join',
          'phase3a-helper-pr-left',
        ],
      ].flatMap(([role, userId, joinRef, leftRef]) => [
        {
          sessionId: fixture.sessionId,
          provider: SessionProvider.DAILY,
          attendanceEventType: SessionAttendanceEventType.JOINED,
          participantRole: role,
          participantUserId: userId,
          providerEventType: 'participant.joined',
          providerEventRef: joinRef,
          providerRoomRef: 'phase3a-room',
          providerParticipantRef: `${role}-device`,
          occurredAt: start,
          ingestionKey: `${joinRef}-key`,
          ingestionMetaJson: { trustLevel: 'TRUSTED' },
        },
        {
          sessionId: fixture.sessionId,
          provider: SessionProvider.DAILY,
          attendanceEventType: SessionAttendanceEventType.LEFT,
          participantRole: role,
          participantUserId: userId,
          providerEventType: 'participant.left',
          providerEventRef: leftRef,
          providerRoomRef: 'phase3a-room',
          providerParticipantRef: `${role}-device`,
          occurredAt: overlapEnd,
          ingestionKey: `${leftRef}-key`,
          ingestionMetaJson: { trustLevel: 'TRUSTED' },
        },
      ]),
    });
    await prisma.sessionAttendanceReconciliation.create({
      data: {
        sessionId: fixture.sessionId,
        provider: SessionProvider.DAILY,
        observationVersion: 1,
        status: SessionReconciliationStatus.CONFIRMED,
        roomFound: true,
        meetingStarted: input.meetingStarted ?? true,
        meetingEnded: true,
        patientIdentityConfirmed: true,
        patientJoined: true,
        patientTotalPresenceSeconds: input.overlapSeconds,
        practitionerIdentityConfirmed: true,
        practitionerJoined: true,
        practitionerTotalPresenceSeconds: input.overlapSeconds,
        unknownParticipantCount: 0,
        providerMeetingId: `phase3a-meeting-${fixture.sessionId}`,
        reconciledAt: new Date('2026-08-03T15:00:00.000Z'),
        providerDataObservedUntil: new Date('2026-08-03T14:30:00.000Z'),
        confidence: SessionReconciliationConfidence.HIGH,
        reasonCodesJson: [],
        attemptNumber: 1,
        requestStatus: 'SUCCEEDED',
        failureCategory: null,
        eligibleForAutomaticFinalization: true,
      },
    });
  }

  async function createPackageFixture() {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    const paymentId = randomUUID();
    const purchaseId = randomUUID();
    await prisma.payment.create({
      data: {
        id: paymentId,
        patientId: fixture.patientId,
        practitionerId: fixture.practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        commissionPlatformRatePercent: 20,
        capturedAt: new Date('2026-08-03T13:00:00.000Z'),
      },
    });
    await prisma.patientPackagePurchase.create({
      data: {
        id: purchaseId,
        practitionerId: fixture.practitionerId,
        patientId: fixture.patientId,
        paymentId,
        status: PatientPackagePurchaseStatus.ACTIVE,
        paidAt: new Date('2026-08-03T13:00:00.000Z'),
        activatedAt: new Date('2026-08-03T13:00:00.000Z'),
        titleSnapshot: 'Phase 3A package',
        descriptionSnapshot: 'Disposable package fixture',
        slugSnapshot: `phase3a-${purchaseId}`,
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
      where: { id: fixture.sessionId },
      data: {
        packagePurchaseId: purchaseId,
        packageSessionIndex: 1,
        packageSessionCount: 1,
        paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
      },
    });
    return { ...fixture, paymentId, purchaseId };
  }

  async function cleanupPackageFixture(
    fixture: Awaited<ReturnType<typeof createPackageFixture>>,
  ) {
    await prisma.sessionEarningReview.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.packageSettlement.deleteMany({
      where: { purchaseId: fixture.purchaseId },
    });
    await prisma.session.update({
      where: { id: fixture.sessionId },
      data: { packagePurchaseId: null },
    });
    await prisma.patientPackagePurchase.delete({
      where: { id: fixture.purchaseId },
    });
    await prisma.payment.delete({ where: { id: fixture.paymentId } });
    await cleanup(fixture);
  }

  async function createDirectPaymentFixture() {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    const paymentId = randomUUID();
    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId: fixture.sessionId,
        patientId: fixture.patientId,
        practitionerId: fixture.practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        commissionPlatformRatePercent: 20,
        capturedAt: new Date('2026-08-03T13:00:00.000Z'),
      },
    });
    return { ...fixture, paymentId };
  }

  async function cleanupDirectPaymentFixture(
    fixture: Awaited<ReturnType<typeof createDirectPaymentFixture>>,
  ) {
    await prisma.sessionEarningReview.deleteMany({
      where: { sessionId: fixture.sessionId },
    });
    await prisma.payment.delete({ where: { id: fixture.paymentId } });
    await cleanup(fixture);
  }

  function buildRealCompletionServices() {
    const ledgerRepository = new LedgerRepository(prisma);
    const moneyAmount = new MoneyAmountService();
    const earningReview = new SessionEarningReviewService(
      prisma,
      ledgerRepository,
      new ExtractPaymentLedgerBreakdownService(moneyAmount),
      new CalculatePackageSessionAllocationService(moneyAmount),
      {} as never,
      {} as never,
    );
    const packageSettlement = new PackageSettlementService(
      prisma,
      ledgerRepository,
      new PackageSettlementRepository(prisma),
      {} as never,
      earningReview,
    );
    const packageLedger = new PostPackageSessionLedgerEntriesUseCase(
      prisma,
      packageSettlement,
    );
    return {
      packageLedger,
      earningReview,
      completion: new CompleteSessionTransactionService(
        lifecycle,
        repository,
        packageLedger,
        earningReview,
      ),
    };
  }

  function buildFinalizer() {
    const attendance = new GetAdminSessionAttendanceUseCase(
      prisma,
      repository,
      new SessionOutcomeEvaluator(),
      policySnapshots,
    );
    const packageLedger = { execute: jest.fn().mockResolvedValue(null) };
    const earningReview = {
      syncForSessionCompletion: jest.fn().mockResolvedValue(null),
    };
    const completion = new CompleteSessionTransactionService(
      lifecycle,
      repository,
      packageLedger as never,
      earningReview as never,
    );
    return {
      finalizer: new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma,
        repository,
        attendance,
        completion,
      ),
      packageLedger,
      earningReview,
      completion,
    };
  }

  async function runManualCompletionContender(input: {
    sessionId: string;
    completion: CompleteSessionTransactionService;
    actor: 'ADMIN' | 'PRACTITIONER';
    actorUserId: string;
    beforeCompletion?: () => Promise<void>;
  }) {
    return prisma.$transaction(async (tx) => {
      const session = await repository.findByIdForUpdate(input.sessionId, tx);
      if (!session) return 'MISSING';
      if (input.beforeCompletion) await input.beforeCompletion();
      if (session.status === SessionStatus.COMPLETED) {
        return 'ALREADY_COMPLETED';
      }
      if (session.status === SessionStatus.CANCELLED) {
        return 'SKIPPED_CONFLICT';
      }
      await input.completion.execute({
        session,
        tx,
        at: new Date('2026-08-03T16:00:00.000Z'),
        actorUserId: input.actorUserId,
        source: 'HTTP_REQUEST',
        metadata: {
          completionMode:
            input.actor === 'ADMIN'
              ? 'ADMIN_MANUAL_COMPLETION'
              : 'PRACTITIONER_COMPLETION',
        },
      });
      return 'COMPLETED';
    });
  }

  async function runManualRace(actor: 'ADMIN' | 'PRACTITIONER') {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    await seedCompletionEvidence(fixture);
    const automatic = buildFinalizer();
    let lockAcquired!: () => void;
    const locked = new Promise<void>((resolve) => {
      lockAcquired = resolve;
    });
    let release!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const manual = runManualCompletionContender({
      sessionId: fixture.sessionId,
      completion: automatic.completion,
      actor,
      actorUserId:
        actor === 'ADMIN' ? fixture.patientUserId : fixture.practitionerUserId,
      beforeCompletion: async () => {
        lockAcquired();
        await releasePromise;
      },
    });
    await locked;
    const automaticResult = automatic.finalizer.execute({
      sessionId: fixture.sessionId,
      evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
      workerRunId: `phase3a2-${actor.toLowerCase()}`,
    });
    release();
    const [manualResult, finalizerResult] = await Promise.all([
      manual,
      automaticResult,
    ]);
    return {
      fixture,
      manualResult,
      finalizerResult,
      packageCalls: automatic.packageLedger.execute.mock.calls.length,
      earningCalls:
        automatic.earningReview.syncForSessionCompletion.mock.calls.length,
    };
  }

  it('captures one policy snapshot and moves ended IN_PROGRESS through the real lifecycle/sweeper path', async () => {
    const now = new Date('2026-08-03T16:00:00.000Z');
    const fixture = await createFixture({
      scheduledStartAt: new Date('2026-08-03T15:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T15:30:00.000Z'),
    });
    try {
      await prisma.$transaction((tx) =>
        lifecycle.transition({
          session: {
            id: fixture.sessionId,
            status: SessionStatus.PENDING_PAYMENT,
          },
          to: SessionStatus.UPCOMING,
          tx,
          at: new Date('2026-08-03T14:00:00.000Z'),
        }),
      );
      const first = await prisma.sessionOutcomePolicySnapshot.findUnique({
        where: { sessionId: fixture.sessionId },
      });
      expect(first).toEqual(
        expect.objectContaining({
          sessionId: fixture.sessionId,
          version: 1,
          completionOverlapPercent: 70,
          minimumOverlapMinutes: 20,
          finalizationGraceMinutes: 15,
          lateEvidenceWaitingMinutes: 0,
        }),
      );
      const eventCountBefore = await prisma.sessionEvent.count({
        where: { sessionId: fixture.sessionId },
      });

      const firstClaim = await prisma.$transaction((tx) =>
        lifecycle.transitionIfCurrentStatus({
          sessionId: fixture.sessionId,
          expectedStatuses: [SessionStatus.UPCOMING],
          to: SessionStatus.UPCOMING,
          tx,
          at: now,
        }),
      );
      expect(firstClaim.outcome).toBe('idempotent');
      const second = await prisma.sessionOutcomePolicySnapshot.findUnique({
        where: { sessionId: fixture.sessionId },
      });
      const eventCountAfter = await prisma.sessionEvent.count({
        where: { sessionId: fixture.sessionId },
      });
      expect(second).toEqual(first);
      expect(eventCountAfter).toBe(eventCountBefore);

      await prisma.$transaction((tx) =>
        lifecycle.transition({
          session: {
            id: fixture.sessionId,
            status: SessionStatus.UPCOMING,
          },
          to: SessionStatus.IN_PROGRESS,
          tx,
          at: new Date('2026-08-03T14:01:00.000Z'),
        }),
      );
      const sweeper = new SessionCompletionConfirmationSweeperService(
        prisma,
        repository,
        lifecycle,
        logger as never,
      );
      const result = await sweeper.sweepOnce(now);
      expect(result.transitioned).toBe(1);
      const saved = await prisma.session.findUnique({
        where: { id: fixture.sessionId },
        select: { status: true },
      });
      expect(saved?.status).toBe(
        SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      );
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            newStatus: SessionStatus.BOTH_NO_SHOW,
          },
        }),
      ).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it('captures one snapshot through the direct payment boundary and ignores replayed callbacks', async () => {
    const fixture = await createFixture({
      scheduledStartAt: new Date('2026-08-03T15:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T15:30:00.000Z'),
    });
    try {
      const notifications = { notifySessionConfirmed: jest.fn() };
      const paymentBoundary = new OrchestrateSessionPaymentStatusService(
        prisma,
        repository,
        lifecycle,
        { execute: jest.fn() } as never,
        notifications as never,
      );
      const staleInput = {
        id: fixture.sessionId,
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2026-08-03T15:00:00.000Z'),
      };

      await paymentBoundary.markSessionConfirmedFromPayment({
        session: staleInput,
      });
      await paymentBoundary.markSessionConfirmedFromPayment({
        session: staleInput,
      });

      expect(
        await prisma.sessionOutcomePolicySnapshot.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            eventType: SessionEventType.PAYMENT_CONFIRMED,
          },
        }),
      ).toBe(1);
      expect(notifications.notifySessionConfirmed).toHaveBeenCalledTimes(1);
      expect(
        await prisma.session.findUnique({
          where: { id: fixture.sessionId },
          select: { status: true },
        }),
      ).toEqual({ status: SessionStatus.UPCOMING });
    } finally {
      await cleanup(fixture);
    }
  });

  it('persists fake-provider reconciliation and evaluates both absence without writing a terminal or financial effect', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await prisma.sessionOutcomePolicySnapshot.create({
        data: {
          sessionId: fixture.sessionId,
          version: 1,
          completionOverlapPercent: 70,
          minimumOverlapMinutes: 20,
          patientNoShowGraceMinutes: 15,
          practitionerNoShowGraceMinutes: 10,
          finalizationGraceMinutes: 15,
          lateEvidenceWaitingMinutes: 0,
          capturedAt: new Date(),
          source: 'phase26-fixture',
        },
      });
      const provider = {
        reconcileSession: jest.fn().mockResolvedValue({
          status: SessionReconciliationStatus.CONFIRMED,
          provider: SessionProvider.DAILY,
          roomFound: true,
          meetingStarted: false,
          meetingEnded: true,
          patient: {
            identityConfirmed: true,
            joined: false,
            totalPresenceSeconds: 0,
            firstJoinedAt: null,
            lastLeftAt: null,
          },
          practitioner: {
            identityConfirmed: true,
            joined: false,
            totalPresenceSeconds: 0,
            firstJoinedAt: null,
            lastLeftAt: null,
          },
          unknownParticipantCount: 0,
          providerMeetingId: 'phase26-meeting',
          reconciledAt: new Date('2026-08-03T16:00:00.000Z'),
          providerDataObservedUntil: new Date('2026-08-03T14:30:00.000Z'),
          confidence: SessionReconciliationConfidence.HIGH,
          reasonCodes: [],
          attemptNumber: 1,
          requestStatus: 'SUCCEEDED',
          failureCategory: null,
          eligibleForAutomaticFinalization: true,
        }),
      };
      const reconcile = new ReconcileSessionAttendanceUseCase(
        prisma,
        repository,
        new NormalizeSessionAttendanceReconciliationService(),
        provider,
      );
      await reconcile.execute({
        sessionId: fixture.sessionId,
        observationVersion: 1,
      });
      await reconcile.execute({
        sessionId: fixture.sessionId,
        observationVersion: 1,
      });
      expect(
        await prisma.sessionAttendanceReconciliation.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);

      const admin = new GetAdminSessionAttendanceUseCase(
        prisma,
        repository,
        new SessionOutcomeEvaluator(),
        policySnapshots,
      );
      const response = await admin.execute({ sessionId: fixture.sessionId });
      expect(response.outcomeEvaluation).toEqual(
        expect.objectContaining({
          classification: 'AUTO_BOTH_NO_SHOW',
          confidence: 'HIGH',
          eligibleForAutomaticFinalization: true,
          recommendedTerminalStatus: 'BOTH_NO_SHOW',
        }),
      );
      expect(response.reconciliation?.status).toBe(
        SessionReconciliationStatus.CONFIRMED,
      );
      expect(response.reconciliation?.patient.joined).toBe(false);
      expect(JSON.stringify(response)).not.toContain('phase26-secret');
      expect(
        await prisma.session.findUnique({
          where: { id: fixture.sessionId },
          select: { status: true },
        }),
      ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
      expect(
        await prisma.payment.count({ where: { sessionId: fixture.sessionId } }),
      ).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it('automatically completes exact 30-minute overlap once and blocks no-show automation', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await prisma.sessionOutcomePolicySnapshot.create({
        data: {
          sessionId: fixture.sessionId,
          version: 1,
          completionOverlapPercent: 70,
          minimumOverlapMinutes: 20,
          patientNoShowGraceMinutes: 15,
          practitionerNoShowGraceMinutes: 10,
          finalizationGraceMinutes: 15,
          lateEvidenceWaitingMinutes: 0,
          capturedAt: new Date('2026-08-03T14:00:00.000Z'),
          source: 'phase3a-fixture',
        },
      });
      const start = new Date('2026-08-03T14:00:00.000Z');
      const overlapEnd = new Date('2026-08-03T14:21:00.000Z');
      await prisma.sessionAttendanceEvent.createMany({
        data: [
          [
            SessionAttendanceParticipantRole.PATIENT,
            fixture.patientUserId,
            'phase3a-p-join',
            'phase3a-p-left',
          ],
          [
            SessionAttendanceParticipantRole.PRACTITIONER,
            fixture.practitionerUserId,
            'phase3a-pr-join',
            'phase3a-pr-left',
          ],
        ].flatMap(([role, userId, joinRef, leftRef]) => [
          {
            sessionId: fixture.sessionId,
            provider: SessionProvider.DAILY,
            attendanceEventType: SessionAttendanceEventType.JOINED,
            participantRole: role,
            participantUserId: userId,
            providerEventType: 'participant.joined',
            providerEventRef: joinRef,
            providerRoomRef: 'phase3a-room',
            providerParticipantRef: `${role}-device`,
            occurredAt: start,
            ingestionKey: `${joinRef}-key`,
            ingestionMetaJson: { trustLevel: 'TRUSTED' },
          },
          {
            sessionId: fixture.sessionId,
            provider: SessionProvider.DAILY,
            attendanceEventType: SessionAttendanceEventType.LEFT,
            participantRole: role,
            participantUserId: userId,
            providerEventType: 'participant.left',
            providerEventRef: leftRef,
            providerRoomRef: 'phase3a-room',
            providerParticipantRef: `${role}-device`,
            occurredAt: overlapEnd,
            ingestionKey: `${leftRef}-key`,
            ingestionMetaJson: { trustLevel: 'TRUSTED' },
          },
        ]),
      });
      await prisma.sessionAttendanceReconciliation.create({
        data: {
          sessionId: fixture.sessionId,
          provider: SessionProvider.DAILY,
          observationVersion: 1,
          status: SessionReconciliationStatus.CONFIRMED,
          roomFound: true,
          meetingStarted: true,
          meetingEnded: true,
          patientIdentityConfirmed: true,
          patientJoined: true,
          patientTotalPresenceSeconds: 1260,
          practitionerIdentityConfirmed: true,
          practitionerJoined: true,
          practitionerTotalPresenceSeconds: 1260,
          unknownParticipantCount: 0,
          providerMeetingId: 'phase3a-meeting',
          reconciledAt: new Date('2026-08-03T15:00:00.000Z'),
          providerDataObservedUntil: new Date('2026-08-03T14:30:00.000Z'),
          confidence: SessionReconciliationConfidence.HIGH,
          reasonCodesJson: [],
          attemptNumber: 1,
          requestStatus: 'SUCCEEDED',
          failureCategory: null,
          eligibleForAutomaticFinalization: true,
        },
      });

      const attendance = new GetAdminSessionAttendanceUseCase(
        prisma,
        repository,
        new SessionOutcomeEvaluator(),
        policySnapshots,
      );
      const packageLedger = { execute: jest.fn().mockResolvedValue(null) };
      const earningReview = {
        syncForSessionCompletion: jest.fn().mockResolvedValue(null),
      };
      const completion = new CompleteSessionTransactionService(
        lifecycle,
        repository,
        packageLedger as never,
        earningReview as never,
      );
      const finalizer = new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma,
        repository,
        attendance,
        completion,
      );
      const evaluatedAt = new Date('2026-08-03T16:00:00.000Z');
      await expect(
        finalizer.execute({ sessionId: fixture.sessionId, evaluatedAt }),
      ).resolves.toBe('COMPLETED');
      await expect(
        finalizer.execute({ sessionId: fixture.sessionId, evaluatedAt }),
      ).resolves.toBe('ALREADY_COMPLETED');

      expect(
        await prisma.session.count({
          where: { id: fixture.sessionId, status: SessionStatus.COMPLETED },
        }),
      ).toBe(1);
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
            metadataJson: {
              path: ['completionMode'],
              equals: 'AUTOMATIC_COMPLETION',
            },
          },
        }),
      ).toBe(1);
      expect(packageLedger.execute).toHaveBeenCalledTimes(1);
      expect(earningReview.syncForSessionCompletion).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it('does not automatically finalize a confirmed both-absent reconciliation', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await prisma.sessionOutcomePolicySnapshot.create({
        data: {
          sessionId: fixture.sessionId,
          version: 1,
          completionOverlapPercent: 70,
          minimumOverlapMinutes: 20,
          patientNoShowGraceMinutes: 15,
          practitionerNoShowGraceMinutes: 10,
          finalizationGraceMinutes: 15,
          lateEvidenceWaitingMinutes: 0,
          capturedAt: new Date('2026-08-03T14:00:00.000Z'),
          source: 'phase3a-fixture',
        },
      });
      await prisma.sessionAttendanceReconciliation.create({
        data: {
          sessionId: fixture.sessionId,
          provider: SessionProvider.DAILY,
          observationVersion: 1,
          status: SessionReconciliationStatus.CONFIRMED,
          roomFound: true,
          meetingStarted: false,
          meetingEnded: true,
          patientIdentityConfirmed: true,
          patientJoined: false,
          patientTotalPresenceSeconds: 0,
          practitionerIdentityConfirmed: true,
          practitionerJoined: false,
          practitionerTotalPresenceSeconds: 0,
          unknownParticipantCount: 0,
          providerMeetingId: 'phase3a-no-show-meeting',
          reconciledAt: new Date('2026-08-03T15:00:00.000Z'),
          providerDataObservedUntil: new Date('2026-08-03T14:30:00.000Z'),
          confidence: SessionReconciliationConfidence.HIGH,
          reasonCodesJson: [],
          attemptNumber: 1,
          requestStatus: 'SUCCEEDED',
          failureCategory: null,
          eligibleForAutomaticFinalization: true,
        },
      });
      const attendance = new GetAdminSessionAttendanceUseCase(
        prisma,
        repository,
        new SessionOutcomeEvaluator(),
        policySnapshots,
      );
      const completion = new CompleteSessionTransactionService(
        lifecycle,
        repository,
        { execute: jest.fn() } as never,
        { syncForSessionCompletion: jest.fn() } as never,
      );
      const finalizer = new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma,
        repository,
        attendance,
        completion,
      );

      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('SKIPPED_NOT_ELIGIBLE');
      expect(
        await prisma.session.findUnique({
          where: { id: fixture.sessionId },
          select: { status: true },
        }),
      ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
          },
        }),
      ).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it('automatically completes an exact 60-minute threshold at 2520 seconds', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T13:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:00:00.000Z'),
    });
    try {
      await seedCompletionEvidence(fixture, { overlapSeconds: 2520 });
      const { finalizer } = buildFinalizer();
      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('COMPLETED');
      expect(
        await prisma.session.count({
          where: { id: fixture.sessionId, status: SessionStatus.COMPLETED },
        }),
      ).toBe(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it.each([
    ['30-minute', 1259],
    ['60-minute', 2519],
  ])(
    'does not complete below the %s threshold',
    async (_label, overlapSeconds) => {
      const durationMinutes = overlapSeconds === 1259 ? 30 : 60;
      const fixture = await createFixture({
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        scheduledStartAt: new Date('2026-08-03T13:00:00.000Z'),
        scheduledEndAt: new Date(
          `2026-08-03T${durationMinutes === 30 ? '13:30' : '14:00'}:00.000Z`,
        ),
        durationMinutes,
      });
      try {
        await seedCompletionEvidence(fixture, { overlapSeconds });
        const { finalizer, packageLedger, earningReview } = buildFinalizer();
        await expect(
          finalizer.execute({
            sessionId: fixture.sessionId,
            evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
          }),
        ).resolves.toBe('SKIPPED_NOT_ELIGIBLE');
        expect(
          await prisma.session.findUnique({
            where: { id: fixture.sessionId },
            select: { status: true },
          }),
        ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
        expect(packageLedger.execute).not.toHaveBeenCalled();
        expect(earningReview.syncForSessionCompletion).not.toHaveBeenCalled();
      } finally {
        await cleanup(fixture);
      }
    },
  );

  it('allows only one winner when two PostgreSQL finalizers run concurrently', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await seedCompletionEvidence(fixture);
      const first = buildFinalizer();
      const second = buildFinalizer();
      const results = await Promise.all([
        first.finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
          workerRunId: 'phase3a-concurrent-1',
        }),
        second.finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
          workerRunId: 'phase3a-concurrent-2',
        }),
      ]);
      expect(results.sort()).toEqual(['ALREADY_COMPLETED', 'COMPLETED']);
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
          },
        }),
      ).toBe(1);
      expect(
        first.packageLedger.execute.mock.calls.length +
          second.packageLedger.execute.mock.calls.length,
      ).toBe(1);
      expect(
        first.earningReview.syncForSessionCompletion.mock.calls.length +
          second.earningReview.syncForSessionCompletion.mock.calls.length,
      ).toBe(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it('completes a package session with one settlement progress update and one earning review', async () => {
    const fixture = await createPackageFixture();
    try {
      await seedCompletionEvidence(fixture);
      const attendance = new GetAdminSessionAttendanceUseCase(
        prisma,
        repository,
        new SessionOutcomeEvaluator(),
        policySnapshots,
      );
      const finalizer = new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma,
        repository,
        attendance,
        buildRealCompletionServices().completion,
      );
      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('COMPLETED');
      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('ALREADY_COMPLETED');

      expect(
        await prisma.packageSettlement.count({
          where: { purchaseId: fixture.purchaseId },
        }),
      ).toBe(1);
      expect(
        await prisma.packageSettlement.findUnique({
          where: { purchaseId: fixture.purchaseId },
          select: { completedSessionsCount: true },
        }),
      ).toEqual({ completedSessionsCount: 1 });
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);
      expect(
        await prisma.sessionEarningReview.count({
          where: {
            idempotencyKey: `session-earning-review:PACKAGE_SESSION:${fixture.sessionId}`,
          },
        }),
      ).toBe(1);
      expect(
        await prisma.practitionerSettlement.count({
          where: { sourceReview: { sessionId: fixture.sessionId } },
        }),
      ).toBe(0);
    } finally {
      await cleanupPackageFixture(fixture);
    }
  });

  it.each(['after-package-write', 'after-earning-write'])(
    'rolls back all package completion effects when failure is injected %s',
    async (failurePoint) => {
      const fixture = await createPackageFixture();
      try {
        await seedCompletionEvidence(fixture);
        const attendance = new GetAdminSessionAttendanceUseCase(
          prisma,
          repository,
          new SessionOutcomeEvaluator(),
          policySnapshots,
        );
        const real = buildRealCompletionServices();
        const failingEarning = {
          syncForSessionCompletion: jest.fn(
            async (input: { sessionId: string; tx: never }) => {
              if (failurePoint === 'after-earning-write') {
                await real.earningReview.syncForSessionCompletion(input);
              }
              throw new Error(`PHASE3A_TEST_FAILURE_${failurePoint}`);
            },
          ),
        };
        const failingCompletion = new CompleteSessionTransactionService(
          lifecycle,
          repository,
          real.packageLedger,
          failingEarning as never,
        );
        const failingFinalizer =
          new FinalizeSessionAutomaticallyAsCompletedUseCase(
            prisma,
            repository,
            attendance,
            failingCompletion,
          );

        await expect(
          failingFinalizer.execute({
            sessionId: fixture.sessionId,
            evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
          }),
        ).rejects.toThrow(`PHASE3A_TEST_FAILURE_${failurePoint}`);
        expect(
          await prisma.session.findUnique({
            where: { id: fixture.sessionId },
            select: { status: true },
          }),
        ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
        expect(
          await prisma.packageSettlement.count({
            where: { purchaseId: fixture.purchaseId },
          }),
        ).toBe(0);
        expect(
          await prisma.sessionEarningReview.count({
            where: { sessionId: fixture.sessionId },
          }),
        ).toBe(0);
        expect(
          await prisma.sessionEvent.count({
            where: {
              sessionId: fixture.sessionId,
              newStatus: SessionStatus.COMPLETED,
            },
          }),
        ).toBe(0);

        const retry = new FinalizeSessionAutomaticallyAsCompletedUseCase(
          prisma,
          repository,
          attendance,
          real.completion,
        );
        await expect(
          retry.execute({
            sessionId: fixture.sessionId,
            evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
          }),
        ).resolves.toBe('COMPLETED');
        expect(
          await prisma.packageSettlement.count({
            where: { purchaseId: fixture.purchaseId },
          }),
        ).toBe(1);
        expect(
          await prisma.sessionEarningReview.count({
            where: { sessionId: fixture.sessionId },
          }),
        ).toBe(1);
      } finally {
        await cleanupPackageFixture(fixture);
      }
    },
  );

  it('proves automatic completion versus cancellation has one terminal winner', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await seedCompletionEvidence(fixture);
      const automatic = buildFinalizer();
      let lockAcquired!: () => void;
      const locked = new Promise<void>((resolve) => (lockAcquired = resolve));
      let release!: () => void;
      const releasePromise = new Promise<void>(
        (resolve) => (release = resolve),
      );
      const cancellation = prisma.$transaction(async (tx) => {
        const session = await repository.findByIdForUpdate(
          fixture.sessionId,
          tx,
        );
        lockAcquired();
        await releasePromise;
        if (
          !session ||
          session.status !== SessionStatus.AWAITING_COMPLETION_CONFIRMATION
        ) {
          return 'SKIPPED_CONFLICT';
        }
        await lifecycle.transition({
          session,
          to: SessionStatus.CANCELLED,
          tx,
          at: new Date('2026-08-03T16:00:00.000Z'),
          reason: 'PHASE3A2_CANCELLATION_RACE',
        });
        return 'CANCELLED';
      });
      await locked;
      const automaticResult = automatic.finalizer.execute({
        sessionId: fixture.sessionId,
        evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
      });
      release();
      const [cancelResult, finalizerResult] = await Promise.all([
        cancellation,
        automaticResult,
      ]);
      expect(cancelResult).toBe('CANCELLED');
      expect(finalizerResult).toBe('SKIPPED_STATUS');
      expect(
        await prisma.session.findUnique({
          where: { id: fixture.sessionId },
          select: { status: true },
        }),
      ).toEqual({ status: SessionStatus.CANCELLED });
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
          },
        }),
      ).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it('proves automatic versus Admin completion has one logical completion', async () => {
    const result = await runManualRace('ADMIN');
    try {
      expect(result.manualResult).toBe('COMPLETED');
      expect(result.finalizerResult).toBe('ALREADY_COMPLETED');
      expect(result.packageCalls).toBe(1);
      expect(result.earningCalls).toBe(1);
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: result.fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
          },
        }),
      ).toBe(1);
    } finally {
      await cleanup(result.fixture);
    }
  });

  it('proves automatic versus practitioner completion has one logical completion', async () => {
    const result = await runManualRace('PRACTITIONER');
    try {
      expect(result.manualResult).toBe('COMPLETED');
      expect(result.finalizerResult).toBe('ALREADY_COMPLETED');
      expect(result.packageCalls).toBe(1);
      expect(result.earningCalls).toBe(1);
      expect(
        await prisma.sessionEvent.count({
          where: {
            sessionId: result.fixture.sessionId,
            newStatus: SessionStatus.COMPLETED,
          },
        }),
      ).toBe(1);
    } finally {
      await cleanup(result.fixture);
    }
  });

  it('blocks a genuinely new trusted event while allowing reevaluation later', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await seedCompletionEvidence(fixture);
      const automatic = buildFinalizer();
      let lockAcquired!: () => void;
      const locked = new Promise<void>((resolve) => (lockAcquired = resolve));
      let release!: () => void;
      const releasePromise = new Promise<void>(
        (resolve) => (release = resolve),
      );
      const lateEvent = prisma.$transaction(async (tx) => {
        await repository.findByIdForUpdate(fixture.sessionId, tx);
        lockAcquired();
        await releasePromise;
        await repository.createAttendanceEvent(
          {
            sessionId: fixture.sessionId,
            provider: SessionProvider.DAILY,
            attendanceEventType: SessionAttendanceEventType.LEFT,
            participantRole: SessionAttendanceParticipantRole.PATIENT,
            participantUserId: fixture.patientUserId,
            providerEventType: 'participant.left',
            providerEventRef: 'phase3a2-late-event',
            providerRoomRef: 'phase3a-room',
            providerParticipantRef: 'late-device',
            occurredAt: new Date('2026-08-03T15:05:00.000Z'),
            ingestionKey: 'phase3a2-late-event-key',
            ingestionMetaJson: { trustLevel: 'TRUSTED' },
          },
          tx,
        );
        await repository.markAttendanceReconciliationStale?.(
          fixture.sessionId,
          new Date('2026-08-03T15:05:00.000Z'),
          tx,
        );
      });
      await locked;
      const finalizerResult = automatic.finalizer.execute({
        sessionId: fixture.sessionId,
        evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
      });
      release();
      await lateEvent;
      await expect(finalizerResult).resolves.toBe('SKIPPED_STALE');
      expect(
        await prisma.session.findUnique({
          where: { id: fixture.sessionId },
          select: { status: true },
        }),
      ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
      expect(automatic.packageLedger.execute).not.toHaveBeenCalled();
      expect(
        automatic.earningReview.syncForSessionCompletion,
      ).not.toHaveBeenCalled();
    } finally {
      await cleanup(fixture);
    }
  });

  it('does not falsely block completion for a duplicate trusted event', async () => {
    const fixture = await createFixture({
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      scheduledStartAt: new Date('2026-08-03T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-03T14:30:00.000Z'),
    });
    try {
      await seedCompletionEvidence(fixture);
      const original = await prisma.sessionAttendanceEvent.findFirstOrThrow({
        where: {
          sessionId: fixture.sessionId,
          ingestionKey: 'phase3a-helper-p-join-key',
        },
      });
      await expect(
        prisma.sessionAttendanceEvent.create({ data: original }),
      ).rejects.toThrow();
      const automatic = buildFinalizer();
      await expect(
        automatic.finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('COMPLETED');
    } finally {
      await cleanup(fixture);
    }
  });

  it('proves direct payment completion and replay do not create financial mutations', async () => {
    const fixture = await createDirectPaymentFixture();
    try {
      await seedCompletionEvidence(fixture);
      const before = {
        paymentEvents: await prisma.paymentEvent.count({
          where: { paymentId: fixture.paymentId },
        }),
        refunds: await prisma.refund.count({
          where: { paymentId: fixture.paymentId },
        }),
        walletEntries: await prisma.customerWalletEntry.count({
          where: { paymentId: fixture.paymentId },
        }),
        payouts: await prisma.practitionerSettlementPayout.count({
          where: { practitionerId: fixture.practitionerId },
        }),
        settlements: await prisma.practitionerSettlement.count({
          where: { practitionerId: fixture.practitionerId },
        }),
      };
      const attendance = new GetAdminSessionAttendanceUseCase(
        prisma,
        repository,
        new SessionOutcomeEvaluator(),
        policySnapshots,
      );
      const real = buildRealCompletionServices();
      const finalizer = new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma,
        repository,
        attendance,
        real.completion,
      );
      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('COMPLETED');
      await expect(
        finalizer.execute({
          sessionId: fixture.sessionId,
          evaluatedAt: new Date('2026-08-03T16:00:00.000Z'),
        }),
      ).resolves.toBe('ALREADY_COMPLETED');
      expect(
        await prisma.payment.findUnique({
          where: { id: fixture.paymentId },
          select: { status: true },
        }),
      ).toEqual({ status: PaymentStatus.CAPTURED });
      expect(
        await prisma.sessionEarningReview.count({
          where: { sessionId: fixture.sessionId },
        }),
      ).toBe(1);
      expect(
        await prisma.paymentEvent.count({
          where: { paymentId: fixture.paymentId },
        }),
      ).toBe(before.paymentEvents);
      expect(
        await prisma.refund.count({ where: { paymentId: fixture.paymentId } }),
      ).toBe(before.refunds);
      expect(
        await prisma.customerWalletEntry.count({
          where: { paymentId: fixture.paymentId },
        }),
      ).toBe(before.walletEntries);
      expect(
        await prisma.practitionerSettlementPayout.count({
          where: { practitionerId: fixture.practitionerId },
        }),
      ).toBe(before.payouts);
      expect(
        await prisma.practitionerSettlement.count({
          where: { practitionerId: fixture.practitionerId },
        }),
      ).toBe(before.settlements);
    } finally {
      await cleanupDirectPaymentFixture(fixture);
    }
  });
});
