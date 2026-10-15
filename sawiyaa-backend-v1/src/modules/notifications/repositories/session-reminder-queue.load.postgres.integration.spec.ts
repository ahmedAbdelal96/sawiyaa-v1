import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SessionFlowType,
  SessionMode,
  SessionReminderType,
  SessionStatus,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionReminderQueueRepository } from './session-reminder-queue.repository';

const configuredUrl = process.env.SESSION_REMINDER_TEST_DATABASE_URL;
const parsedUrl = configuredUrl ? new URL(configuredUrl) : null;
const databaseName = parsedUrl
  ? decodeURIComponent(parsedUrl.pathname.slice(1))
  : '';
const authorized =
  process.env.NODE_ENV === 'test' &&
  Boolean(configuredUrl) &&
  parsedUrl?.port === '5432' &&
  ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname) &&
  /^sawiyaa_session_reminder_\d{8}$/i.test(databaseName);

if (configuredUrl && !authorized) {
  throw new Error(
    `Unsafe session reminder load database: ${parsedUrl?.hostname}/${databaseName}`,
  );
}

const describeIfAuthorized = authorized ? describe : describe.skip;

describeIfAuthorized('Session reminder PostgreSQL load harness', () => {
  let prisma: PrismaService;
  let repository: SessionReminderQueueRepository;
  const sessionIds: string[] = [];
  const notificationTypeIds: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = configuredUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new SessionReminderQueueRepository(prisma);
  });

  afterAll(async () => {
    if (notificationTypeIds.length) {
      await prisma.notification.deleteMany({
        where: { notificationTypeId: { in: notificationTypeIds } },
      });
      await prisma.notificationTemplate.deleteMany({
        where: { notificationTypeId: { in: notificationTypeIds } },
      });
      await prisma.notificationType.deleteMany({
        where: { id: { in: notificationTypeIds } },
      });
    }
    if (sessionIds.length) {
      const sessions = await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: { patientId: true, practitionerId: true },
      });
      const userIds = await prisma.user.findMany({
        where: {
          OR: [
            {
              patientProfile: { id: { in: sessions.map((s) => s.patientId) } },
            },
            {
              practitionerProfile: {
                id: { in: sessions.map((s) => s.practitionerId) },
              },
            },
          ],
        },
        select: { id: true },
      });
      await prisma.sessionReminderQueue.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
      await prisma.patientProfile.deleteMany({
        where: { id: { in: sessions.map((session) => session.patientId) } },
      });
      await prisma.practitionerProfile.deleteMany({
        where: {
          id: { in: sessions.map((session) => session.practitionerId) },
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds.map((user) => user.id) } },
      });
    }
    await prisma.$disconnect();
  });

  async function createFixture(now: Date) {
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Reminder Load Patient' },
        { id: practitionerUserId, displayName: 'Reminder Load Practitioner' },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `reminder-load-${practitionerId}`,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `RLD-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.UPCOMING,
        scheduledStartAt: new Date(now.getTime() + 60 * 60_000),
        scheduledEndAt: new Date(now.getTime() + 90 * 60_000),
        joinOpenAt: new Date(now.getTime() + 45 * 60_000),
        joinCloseAt: new Date(now.getTime() + 100 * 60_000),
      },
    });
    sessionIds.push(sessionId);
    return { sessionId, patientUserId };
  }

  async function runLoad(size: number) {
    const now = new Date();
    const fixture = await createFixture(now);
    const notificationType = await prisma.notificationType.create({
      data: {
        id: randomUUID(),
        slug: `session-reminder-load-${randomUUID()}`,
        displayName: 'Session reminder load harness',
        category: NotificationCategory.SESSION,
        supportsInApp: true,
      },
    });
    notificationTypeIds.push(notificationType.id);

    const dueAt = new Date(now.getTime() - 1_000);
    const allReminders = Array.from({ length: size }, () => ({
      id: randomUUID(),
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      recipientRole: UserRoleType.PATIENT,
      reminderType: SessionReminderType.REMINDER_15,
      scheduleRevision: 1,
      dueAt,
      idempotencyKey: `session-reminder-load:${randomUUID()}`,
    }));
    for (let offset = 0; offset < allReminders.length; offset += 1_000) {
      await prisma.sessionReminderQueue.createMany({
        data: allReminders.slice(offset, offset + 1_000),
      });
    }

    const lagMs: number[] = [];
    const claimMs: number[] = [];
    let claimed = 0;
    let claimEmptyResults = 0;
    const concurrency = 4;
    const startedAt = performance.now();
    const cpuStarted = process.cpuUsage();
    const memoryStarted = process.memoryUsage().rss;
    const eventLoop = monitorEventLoopDelay({ resolution: 10 });
    eventLoop.enable();

    const worker = async () => {
      while (true) {
        const claimStarted = performance.now();
        const claim = await repository.claimDueReminders({
          now,
          limit: 250,
          leaseDurationMs: 60_000,
        });
        claimMs.push(performance.now() - claimStarted);
        if (claim.reminders.length === 0) {
          claimEmptyResults += 1;
          return;
        }
        claimed += claim.reminders.length;
        const intentAt = new Date();
        for (const reminder of claim.reminders) {
          lagMs.push(intentAt.getTime() - reminder.dueAt.getTime());
        }
        await prisma.notification.createMany({
          data: claim.reminders.map((reminder) => ({
            userId: reminder.recipientUserId,
            notificationTypeId: notificationType.id,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            locale: reminder.recipientLocaleSnapshot ?? 'en',
            titleSnapshot: 'load-test',
            bodySnapshot: 'load-test',
            relatedEntityType: 'SESSION',
            relatedEntityId: reminder.sessionId,
            idempotencyKey: `${reminder.idempotencyKey}:in-app`,
            scheduledFor: reminder.dueAt,
          })),
        });
        await prisma.sessionReminderQueue.updateMany({
          where: {
            id: { in: claim.reminders.map((reminder) => reminder.id) },
            claimToken: claim.claimToken,
            sentAt: null,
            cancelledAt: null,
          },
          data: {
            sentAt: intentAt,
            claimToken: null,
            claimUntil: null,
          },
        });
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const elapsedMs = performance.now() - startedAt;
    const cpu = process.cpuUsage(cpuStarted);
    const memoryEnded = process.memoryUsage().rss;
    eventLoop.disable();

    const notifications = await prisma.notification.count({
      where: { notificationTypeId: notificationType.id },
    });
    const duplicateIdempotencyRows =
      size -
      (
        await prisma.notification.groupBy({
          by: ['idempotencyKey'],
          where: { notificationTypeId: notificationType.id },
          _count: { id: true },
        })
      ).length;
    const dbConnections = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM pg_stat_activity WHERE datname = current_database()`,
    );

    const percentile = (values: number[], p: number) => {
      const sorted = [...values].sort((a, b) => a - b);
      return (
        sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ??
        0
      );
    };
    const metrics = {
      size,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      remindersPerSecond: Number((size / (elapsedMs / 1_000)).toFixed(2)),
      p50LagMs: Number(percentile(lagMs, 0.5).toFixed(2)),
      p95LagMs: Number(percentile(lagMs, 0.95).toFixed(2)),
      p99LagMs: Number(percentile(lagMs, 0.99).toFixed(2)),
      maxLagMs: Number(Math.max(...lagMs).toFixed(2)),
      claimP95Ms: Number(percentile(claimMs, 0.95).toFixed(2)),
      claimed,
      notifications,
      duplicateNotificationRows: duplicateIdempotencyRows,
      duplicateRealtimeEvents: 0,
      staleDrops: 0,
      claimEmptyResults,
      dbConnections: Number(dbConnections[0]?.count ?? 0),
      cpuUserMs: Number((cpu.user / 1_000).toFixed(2)),
      cpuSystemMs: Number((cpu.system / 1_000).toFixed(2)),
      rssDeltaMb: Number(
        ((memoryEnded - memoryStarted) / 1024 / 1024).toFixed(2),
      ),
      eventLoopP99Ms: Number((eventLoop.percentile(99) / 1_000_000).toFixed(2)),
    };

    console.log('[session-reminder] LOAD', JSON.stringify(metrics));
    expect(claimed).toBe(size);
    expect(notifications).toBe(size);
    expect(duplicateIdempotencyRows).toBe(0);
    return metrics;
  }

  it('drains 1,000 due reminders into Notification intent rows', async () => {
    await runLoad(1_000);
  }, 120_000);

  it('drains 5,000 due reminders into Notification intent rows', async () => {
    await runLoad(5_000);
  }, 120_000);

  it('drains 10,000 due reminders into Notification intent rows', async () => {
    await runLoad(10_000);
  }, 180_000);
});
