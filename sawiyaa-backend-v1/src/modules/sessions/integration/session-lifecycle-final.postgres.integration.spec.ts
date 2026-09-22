import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@common/prisma/prisma.service';
import { MarkSessionInProgressFromAttendanceService } from '../services/mark-session-in-progress-from-attendance.service';
import { CompleteSessionTransactionService } from '../services/complete-session-transaction.service';
import { GetSessionGeneralChatConversationUseCase } from '@modules/chat/use-cases/get-session-general-chat-conversation.use-case';

const databaseUrl = process.env.DATABASE_URL;
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
const databaseName = parsedDatabaseUrl
  ? decodeURIComponent(parsedDatabaseUrl.pathname.slice(1))
  : '';
const explicitSessionLifecycleOptIn =
  process.env.NODE_ENV === 'test' &&
  process.env.SAWIYAA_ALLOW_SESSION_LIFECYCLE_FINAL === 'true' &&
  parsedDatabaseUrl?.port === '5432' &&
  ['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname) &&
  /^sawiyaa_session_lifecycle_final_\d{8}$/i.test(databaseName);
const describeIfAuthorized = explicitSessionLifecycleOptIn ? describe : describe.skip;

if (databaseUrl && !explicitSessionLifecycleOptIn) {
  throw new Error(
    `Unsafe final session lifecycle database: ${parsedDatabaseUrl?.hostname}/${databaseName}`,
  );
}

describeIfAuthorized('Final session lifecycle PostgreSQL proof', () => {
  let moduleRef: Awaited<ReturnType<typeof Test.createTestingModule>>;
  let prisma: PrismaService;
  let attendance: MarkSessionInProgressFromAttendanceService;
  let completeSession: CompleteSessionTransactionService;
  let sessionChat: GetSessionGeneralChatConversationUseCase;
  let patientUserId: string;
  let practitionerUserId: string;
  let patientId: string;
  let practitionerId: string;
  const sessionIds: string[] = [];
  const paymentIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = moduleRef.get(PrismaService);
    attendance = moduleRef.get(MarkSessionInProgressFromAttendanceService);
    completeSession = moduleRef.get(CompleteSessionTransactionService);
    sessionChat = moduleRef.get(GetSessionGeneralChatConversationUseCase);
    await prisma.$connect();

    patientUserId = randomUUID();
    practitionerUserId = randomUUID();
    patientId = randomUUID();
    practitionerId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Final Lifecycle Patient' },
        { id: practitionerUserId, displayName: 'Final Lifecycle Practitioner' },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `final-lifecycle-${practitionerId}`,
        practitionerType: 'OTHER',
        status: 'DRAFT',
      },
    });
  });

  afterAll(async () => {
    const reviewIds = (
      await prisma.sessionEarningReview.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true },
      })
    ).map((review) => review.id);
    if (reviewIds.length) {
      await prisma.financialOperationIdempotency.deleteMany({ where: { reviewId: { in: reviewIds } } });
      await prisma.practitionerEarningAdjustment.deleteMany({ where: { sessionEarningReviewId: { in: reviewIds } } });
      await prisma.ledgerEntry.deleteMany({ where: { sessionEarningReviewId: { in: reviewIds } } });
      await prisma.sessionEarningReview.deleteMany({ where: { id: { in: reviewIds } } });
    }
    if (sessionIds.length) {
      await prisma.sessionAttendanceEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.sessionAttendanceReconciliation.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.sessionEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
    }
    if (paymentIds.length) {
      await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    }
    await prisma.patientProfile.deleteMany({ where: { id: patientId } });
    await prisma.practitionerProfile.deleteMany({ where: { id: practitionerId } });
    await prisma.user.deleteMany({ where: { id: { in: [patientUserId, practitionerUserId] } } });
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function createSession(input: {
    status: SessionStatus;
    provider?: SessionProvider;
    scheduled?: boolean;
  }) {
    const id = randomUUID();
    const now = new Date();
    const scheduledStartAt = input.scheduled
      ? new Date(now.getTime() - 60_000)
      : null;
    const scheduledEndAt = input.scheduled
      ? new Date(now.getTime() + 1_800_000)
      : null;
    const session = await prisma.session.create({
      data: {
        id,
        sessionCode: `FL-${id.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: input.status,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
        provider: input.provider ?? SessionProvider.NONE,
        providerRoomId: input.provider ? `room-${id}` : null,
        providerSessionRef: input.provider ? `ref-${id}` : null,
        scheduledStartAt,
        scheduledEndAt,
        joinOpenAt: scheduledStartAt,
        joinCloseAt: scheduledEndAt,
      },
    });
    sessionIds.push(session.id);
    return session;
  }

  it('serializes concurrent trusted attendance without regressing IN_PROGRESS', async () => {
    const session = await createSession({
      status: SessionStatus.UPCOMING,
      provider: SessionProvider.DAILY,
      scheduled: true,
    });
    const occurredAt = new Date();
    const evidence = {
      sessionId: session.id,
      participantUserId: patientUserId,
      participantRole: 'PATIENT' as const,
      eventType: 'JOINED' as const,
      providerEventId: 'final-join-race-a',
      ingestionKey: 'final-join-race-a',
      providerOccurredAt: occurredAt,
      receivedAt: new Date(occurredAt.getTime() + 1_000),
      trustLevel: 'TRUSTED' as const,
      lifecycleEligible: true,
    };

    const results = await Promise.all([
      prisma.$transaction((tx) => attendance.execute({ evidence, tx })),
      prisma.$transaction((tx) =>
        attendance.execute({
          evidence: {
            ...evidence,
            providerEventId: 'final-join-race-b',
            ingestionKey: 'final-join-race-b',
          },
          tx,
        }),
      ),
    ]);

    expect(results.filter((result) => result === 'transitioned')).toHaveLength(1);
    expect(results.filter((result) => result === 'idempotent')).toHaveLength(1);
    expect(
      await prisma.session.findUniqueOrThrow({ where: { id: session.id }, select: { status: true } }),
    ).toMatchObject({ status: SessionStatus.IN_PROGRESS });
    expect(
      await prisma.sessionEvent.count({
        where: { sessionId: session.id, eventType: SessionEventType.SESSION_READY_TO_JOIN },
      }),
    ).toBe(1);
    expect(
      await prisma.sessionEvent.count({
        where: { sessionId: session.id, eventType: SessionEventType.SESSION_STARTED },
      }),
    ).toBe(1);
  });

  it('does not reopen terminal or unresolved sessions from late attendance', async () => {
    const statuses = [
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.EXPIRED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
      SessionStatus.AWAITING_ADMIN_RESOLUTION,
    ];

    for (const status of statuses) {
      const session = await createSession({ status, provider: SessionProvider.DAILY, scheduled: true });
      const result = await prisma.$transaction((tx) =>
        attendance.execute({
          evidence: {
            sessionId: session.id,
            participantUserId: patientUserId,
            participantRole: 'PATIENT',
            eventType: 'JOINED',
            providerEventId: `final-terminal-${status}`,
            ingestionKey: `final-terminal-${status}`,
            providerOccurredAt: new Date(),
            trustLevel: 'TRUSTED',
            lifecycleEligible: true,
          },
          tx,
        }),
      );
      expect(result).toBe('skipped');
      expect(
        await prisma.session.findUniqueOrThrow({ where: { id: session.id }, select: { status: true } }),
      ).toMatchObject({ status });
      expect(await prisma.sessionEvent.count({ where: { sessionId: session.id } })).toBe(0);
    }
  });

  it('makes concurrent completion idempotent with one terminal event and review', async () => {
    const session = await createSession({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
    const paymentId = randomUUID();
    paymentIds.push(paymentId);
    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId: session.id,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 400,
        amountDiscount: 0,
        amountTotal: 400,
        amountFromWallet: 0,
        amountFromGateway: 400,
        currencyCode: 'EGP',
        commissionPlatformRatePercent: 20,
        capturedAt: new Date(),
      },
    });

    const snapshot = { id: session.id, status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION } as const;
    const completionAt = new Date();
    const results = await Promise.all([
      prisma.$transaction((tx) =>
        completeSession.execute({ session: snapshot, tx, at: completionAt, reason: 'FINAL_LIFECYCLE_PROOF' }),
      ),
      prisma.$transaction((tx) =>
        completeSession.execute({ session: snapshot, tx, at: completionAt, reason: 'FINAL_LIFECYCLE_PROOF' }),
      ),
    ]);

    expect(results).toHaveLength(2);
    expect(
      await prisma.session.findUniqueOrThrow({ where: { id: session.id }, select: { status: true } }),
    ).toMatchObject({ status: SessionStatus.COMPLETED });
    expect(
      await prisma.sessionEvent.count({
        where: { sessionId: session.id, eventType: SessionEventType.SESSION_COMPLETED },
      }),
    ).toBe(1);
    expect(await prisma.sessionEarningReview.count({ where: { sessionId: session.id } })).toBe(1);
  });

  it('uses persisted canonical status for session-backed chat availability', async () => {
    const session = await createSession({ status: SessionStatus.PENDING_PRACTITIONER_CONFIRMATION });
    const authenticatedUser = { id: patientUserId, roles: [] };

    const pending = await sessionChat.execute({ authenticatedUser, sessionId: session.id });
    expect(pending.chatAvailability).toMatchObject({ canRead: false, canSend: false });

    await prisma.session.update({ where: { id: session.id }, data: { status: SessionStatus.UPCOMING } });
    const upcoming = await sessionChat.execute({ authenticatedUser, sessionId: session.id });
    expect(upcoming.chatAvailability).toMatchObject({ canRead: true, canSend: false, reason: 'SESSION_NOT_STARTED' });

    await prisma.session.update({ where: { id: session.id }, data: { status: SessionStatus.IN_PROGRESS } });
    const active = await sessionChat.execute({ authenticatedUser, sessionId: session.id });
    expect(active.chatAvailability).toMatchObject({ canRead: true, canSend: true, readOnly: false });
  });
});
