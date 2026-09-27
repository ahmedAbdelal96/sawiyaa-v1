import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionReconciliationStatus,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import operationsQueueConfig from '@config/operations-queue.config';
import videoConfig from '@config/video.config';
import { OperationsQueueModule } from '@common/queue/operations-queue.module';
import { PrismaModule } from '@common/prisma/prisma.module';
import { OperationsQueueService } from '@common/queue/operations-queue.service';
import {
  dailyAttendanceReconciliationJobId,
  OPERATIONS_QUEUE_NAME,
} from '@common/queue/operations-queue.constants';
import { SessionCodeGeneratorService } from '@modules/sessions/services/session-code-generator.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { NormalizeSessionAttendanceReconciliationService } from '@modules/sessions/services/normalize-session-attendance-reconciliation.service';
import { DailySessionAttendanceReconciliationAdapter } from '@modules/sessions/providers/daily-session-attendance-reconciliation.adapter';
import { SESSION_ATTENDANCE_RECONCILIATION_PROVIDER } from '@modules/sessions/providers/session-attendance-reconciliation.tokens';
import { ReconcileSessionAttendanceUseCase } from '@modules/sessions/use-cases/reconcile-session-attendance.use-case';
import { SessionAttendanceReconciliationSweeperService } from '@modules/sessions/services/session-attendance-reconciliation-sweeper.service';
import { DailyAttendanceQueueWorkerService } from './daily-attendance-worker.service';
import { Queue, QueueEvents } from 'bullmq';

const databaseUrl = process.env.DATABASE_URL;
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
const databaseName = parsedDatabaseUrl
  ? decodeURIComponent(parsedDatabaseUrl.pathname.slice(1))
  : '';
const authorized =
  process.env.NODE_ENV === 'test' &&
  process.env.RUN_DAILY_ATTENDANCE_QUEUE_INTEGRATION === 'true' &&
  parsedDatabaseUrl?.port === '5432' &&
  ['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname) &&
  /^sawiyaa_daily_attendance_worker_\d{8}$/i.test(databaseName) &&
  process.env.DAILY_ATTENDANCE_QUEUE_ENABLED === 'true';
const describeIfAuthorized = authorized ? describe : describe.skip;

if (
  process.env.RUN_DAILY_ATTENDANCE_QUEUE_INTEGRATION === 'true' &&
  databaseUrl &&
  !authorized
) {
  throw new Error(
    `Unsafe Daily attendance integration database: ${parsedDatabaseUrl?.hostname}/${databaseName}`,
  );
}

describeIfAuthorized('Daily attendance operations worker PostgreSQL integration', () => {
  jest.setTimeout(30_000);

  let moduleRef: Awaited<ReturnType<typeof Test.createTestingModule>>;
  let prisma: PrismaService;
  let operationsQueue: OperationsQueueService;
  let sweeper: SessionAttendanceReconciliationSweeperService;
  let worker: DailyAttendanceQueueWorkerService;
  let queue: Queue;
  let events: QueueEvents;
  const createdSessionIds: string[] = [];
  const createdPatientIds: string[] = [];
  const createdPractitionerIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.DAILY_API_KEY = 'daily-integration-key';
    process.env.DAILY_API_BASE_URL = 'https://api.daily.co/v1';
    process.env.OPERATIONS_QUEUE_REDIS_URL =
      process.env.OPERATIONS_QUEUE_REDIS_URL ?? 'redis://127.0.0.1:6379';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total_count: 0, data: [] }),
      } as Response);

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [operationsQueueConfig, videoConfig],
        }),
        PrismaModule,
        OperationsQueueModule,
      ],
      providers: [
        SessionCodeGeneratorService,
        SessionRepository,
        NormalizeSessionAttendanceReconciliationService,
        DailySessionAttendanceReconciliationAdapter,
        {
          provide: SESSION_ATTENDANCE_RECONCILIATION_PROVIDER,
          useExisting: DailySessionAttendanceReconciliationAdapter,
        },
        ReconcileSessionAttendanceUseCase,
        DailyAttendanceQueueWorkerService,
      ],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    operationsQueue = moduleRef.get(OperationsQueueService);
    worker = moduleRef.get(DailyAttendanceQueueWorkerService);
    sweeper = new SessionAttendanceReconciliationSweeperService(
      moduleRef.get(SessionRepository),
      moduleRef.get(ReconcileSessionAttendanceUseCase),
      { error: jest.fn(), warn: jest.fn() } as never,
      operationsQueue,
    );
    await moduleRef.init();

    const redisConnection = { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: 1 };
    const queueEventsConnection = { ...redisConnection, maxRetriesPerRequest: null };
    queue = new Queue(OPERATIONS_QUEUE_NAME, {
      connection: redisConnection,
      prefix: 'sawiyaa:operations',
    });
    events = new QueueEvents(OPERATIONS_QUEUE_NAME, {
      connection: queueEventsConnection,
      prefix: 'sawiyaa:operations',
    });
    await Promise.all([queue.waitUntilReady(), events.waitUntilReady()]);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await worker?.onModuleDestroy();
    await events?.close();
    await queue?.obliterate({ force: true });
    await queue?.close();
    if (createdSessionIds.length) {
      await prisma.sessionAttendanceReconciliation.deleteMany({
        where: { sessionId: { in: createdSessionIds } },
      });
      await prisma.session.deleteMany({ where: { id: { in: createdSessionIds } } });
    }
    if (createdPatientIds.length) {
      await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientIds } } });
    }
    if (createdPractitionerIds.length) {
      await prisma.practitionerProfile.deleteMany({ where: { id: { in: createdPractitionerIds } } });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await moduleRef?.close();
  });

  it('publishes through operations, executes in the worker, and persists evidence only', async () => {
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    createdUserIds.push(patientUserId, practitionerUserId);
    createdPatientIds.push(patientId);
    createdPractitionerIds.push(practitionerId);
    createdSessionIds.push(sessionId);

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Attendance Queue Patient' },
        { id: practitionerUserId, displayName: 'Attendance Queue Practitioner' },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `attendance-queue-${practitionerId}`,
        practitionerType: 'OTHER',
        status: 'DRAFT',
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `AQ-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
        provider: SessionProvider.DAILY,
        providerRoomId: `room-${sessionId}`,
        providerSessionRef: `ref-${sessionId}`,
        scheduledStartAt: new Date(Date.now() - 3_600_000),
        scheduledEndAt: new Date(Date.now() - 1_800_000),
      },
    });

    const swept = await sweeper.sweepOnce();
    expect(swept).toMatchObject({ scanned: 1, enqueued: 1, enqueueFailed: 0 });
    expect(global.fetch).not.toHaveBeenCalled();

    const jobId = dailyAttendanceReconciliationJobId({
      sessionId,
      observationVersion: 1,
    });
    const job = await queue.getJob(jobId);
    expect(job).not.toBeNull();
    await job!.waitUntilFinished(events, 10_000);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(
      await prisma.sessionAttendanceReconciliation.findMany({
        where: { sessionId },
        select: { observationVersion: true, status: true },
      }),
    ).toEqual([{ observationVersion: 1, status: SessionReconciliationStatus.PARTIAL }]);
    expect(
      await prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: { status: true },
      }),
    ).toEqual({ status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION });
  });
});
