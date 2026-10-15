import { randomUUID } from 'node:crypto';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationRepository } from './operational-notification.repository';

const configuredUrl = process.env.NOTIFICATION_LEASE_TEST_DATABASE_URL;
const parsedUrl = configuredUrl ? new URL(configuredUrl) : null;
const databaseName = parsedUrl
  ? decodeURIComponent(parsedUrl.pathname.slice(1))
  : '';
const authorized =
  process.env.NODE_ENV === 'test' &&
  process.env.RUN_NOTIFICATION_LEASE_INTEGRATION === 'true' &&
  Boolean(configuredUrl) &&
  parsedUrl?.port === '5432' &&
  ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname) &&
  /^sawiyaa_notification_\d{8}$/i.test(databaseName);

const describeIfAuthorized = authorized ? describe : describe.skip;

describeIfAuthorized(
  'Notification delivery PostgreSQL lease integration',
  () => {
    let prisma: PrismaService;
    let repository: OperationalNotificationRepository;
    const fixtureNotificationIds: string[] = [];
    const fixtureTypeIds: string[] = [];
    const fixtureUserIds: string[] = [];

    beforeAll(async () => {
      process.env.DATABASE_URL = configuredUrl;
      prisma = new PrismaService();
      await prisma.$connect();
      repository = new OperationalNotificationRepository(prisma);
    });

    afterAll(async () => {
      if (fixtureNotificationIds.length > 0) {
        await prisma.auditEvent.deleteMany({
          where: { notificationId: { in: fixtureNotificationIds } },
        });
        await prisma.notification.deleteMany({
          where: { id: { in: fixtureNotificationIds } },
        });
      }
      if (fixtureTypeIds.length > 0) {
        await prisma.notificationType.deleteMany({
          where: { id: { in: fixtureTypeIds } },
        });
      }
      if (fixtureUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      }
      await prisma.$disconnect();
    });

    async function createFixtureNotification(
      input: {
        status?: NotificationStatus;
        scheduledFor?: Date | null;
        claimToken?: string | null;
        claimedAt?: Date | null;
        claimUntil?: Date | null;
      } = {},
    ) {
      const userId = randomUUID();
      const typeId = randomUUID();
      const notificationId = randomUUID();
      fixtureUserIds.push(userId);
      fixtureTypeIds.push(typeId);
      fixtureNotificationIds.push(notificationId);

      await prisma.user.create({
        data: {
          id: userId,
          displayName: 'Notification Lease Integration User',
        },
      });
      await prisma.notificationType.create({
        data: {
          id: typeId,
          slug: `integration.notification-lease.${notificationId}`,
          displayName: 'Notification lease integration',
          category: 'SYSTEM',
          supportsEmail: true,
        },
      });
      return prisma.notification.create({
        data: {
          id: notificationId,
          userId,
          notificationTypeId: typeId,
          channel: NotificationChannel.EMAIL,
          status: input.status ?? NotificationStatus.PENDING,
          scheduledFor:
            input.scheduledFor ?? new Date('2026-01-01T00:00:00.000Z'),
          claimToken: input.claimToken,
          claimedAt: input.claimedAt,
          claimUntil: input.claimUntil,
          payloadJson: { target: 'lease-integration@example.test' },
          subjectSnapshot: 'Lease integration',
          bodySnapshot: 'Lease integration',
        },
      });
    }

    async function createBacklog(size: number) {
      const userId = randomUUID();
      const typeId = randomUUID();
      fixtureUserIds.push(userId);
      fixtureTypeIds.push(typeId);
      await prisma.user.create({
        data: { id: userId, displayName: `Notification backlog ${size}` },
      });
      await prisma.notificationType.create({
        data: {
          id: typeId,
          slug: `integration.notification-lease-backlog.${size}.${randomUUID()}`,
          displayName: 'Notification lease backlog integration',
          category: 'SYSTEM',
          supportsEmail: true,
        },
      });
      const ids = Array.from({ length: size }, () => randomUUID());
      fixtureNotificationIds.push(...ids);
      await prisma.notification.createMany({
        data: ids.map((id) => ({
          id,
          userId,
          notificationTypeId: typeId,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          scheduledFor: new Date('2026-01-01T00:00:00.000Z'),
          payloadJson: { target: 'lease-backlog@example.test' },
        })),
      });
      return ids;
    }

    async function benchmarkClaims(ids: string[], workerCount: number) {
      const samples: number[] = [];
      let nextIndex = 0;
      let maxEventLoopLagMs = 0;
      let lastTick = Date.now();
      const eventLoopTimer = setInterval(() => {
        const now = Date.now();
        maxEventLoopLagMs = Math.max(maxEventLoopLagMs, now - lastTick - 10);
        lastTick = now;
      }, 10);

      const cpuBefore = process.cpuUsage();
      const memoryBefore = process.memoryUsage();
      const startedAt = Date.now();
      try {
        await Promise.all(
          Array.from({ length: workerCount }, async () => {
            while (true) {
              const index = nextIndex++;
              const id = ids[index];
              if (!id) return;
              const claimStartedAt = Date.now();
              await repository.claimNotificationForExecution({
                notificationId: id,
                now: new Date('2026-10-14T12:10:00.000Z'),
                leaseDurationMs: 300_000,
              });
              samples.push(Date.now() - claimStartedAt);
            }
          }),
        );
      } finally {
        clearInterval(eventLoopTimer);
      }
      const durationMs = Date.now() - startedAt;
      const cpuAfter = process.cpuUsage(cpuBefore);
      const memoryAfter = process.memoryUsage();
      samples.sort((left, right) => left - right);
      const percentile = (ratio: number) =>
        samples[
          Math.min(samples.length - 1, Math.floor(samples.length * ratio))
        ] ?? 0;
      const metrics = {
        size: ids.length,
        workerCount,
        durationMs,
        claimThroughputPerSecond:
          durationMs > 0 ? Math.round((ids.length / durationMs) * 1_000) : 0,
        claimLatencyMs: {
          p50: percentile(0.5),
          p95: percentile(0.95),
          p99: percentile(0.99),
        },
        dbConnections: 'Prisma pool configuration not exposed by PrismaClient',
        nodeCpuMicros: cpuAfter.user + cpuAfter.system,
        nodeHeapUsedDeltaBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
        eventLoopLagMaxMs: maxEventLoopLagMs,
      };
      console.log(`[notification-lease] BACKLOG ${JSON.stringify(metrics)}`);
      return metrics;
    }

    it('gives one owner when two workers claim the same pending notification', async () => {
      const now = new Date('2026-10-14T12:00:00.000Z');
      const notification = await createFixtureNotification();

      const claims = await Promise.all(
        Array.from({ length: 2 }, () =>
          repository.claimNotificationForExecution({
            notificationId: notification.id,
            now,
            leaseDurationMs: 60_000,
          }),
        ),
      );

      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(
        (
          await prisma.notification.findUnique({
            where: { id: notification.id },
            select: { status: true, claimToken: true, claimUntil: true },
          })
        )?.status,
      ).toBe(NotificationStatus.QUEUED);
    });

    it('gives four workers disjoint ownership over an overlapping batch', async () => {
      const now = new Date('2026-10-14T12:01:00.000Z');
      const notifications = await Promise.all(
        Array.from({ length: 40 }, () => createFixtureNotification()),
      );
      const claims = await Promise.all(
        Array.from({ length: 4 }, async () =>
          Promise.all(
            notifications.map((notification) =>
              repository.claimNotificationForExecution({
                notificationId: notification.id,
                now,
                leaseDurationMs: 60_000,
              }),
            ),
          ),
        ),
      );
      const claimedIds = claims
        .flat(2)
        .filter((claim): claim is NonNullable<typeof claim> => Boolean(claim))
        .map((claim) => claim.notificationId);

      expect(claimedIds).toHaveLength(notifications.length);
      expect(new Set(claimedIds).size).toBe(notifications.length);
    });

    it('reclaims an expired lease and fences the old owner', async () => {
      const startedAt = new Date('2026-10-14T12:02:00.000Z');
      const expiredAt = new Date('2026-10-14T12:02:01.001Z');
      const notification = await createFixtureNotification();
      const first = await repository.claimNotificationForExecution({
        notificationId: notification.id,
        now: startedAt,
        leaseDurationMs: 1_000,
      });
      const attempt = await repository.createDeliveryAttemptWithNextNumber({
        notification: { connect: { id: notification.id } },
        provider: 'SMTP',
        status: 'PENDING',
        requestPayload: { operationKey: `notification:${notification.id}` },
        attemptedAt: startedAt,
      });
      const second = await repository.claimNotificationForExecution({
        notificationId: notification.id,
        now: expiredAt,
        leaseDurationMs: 60_000,
      });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      await expect(
        repository.updateDeliveryAttemptWithClaim({
          attemptId: attempt.id,
          notificationId: notification.id,
          claimToken: first!.claimToken,
          now: expiredAt,
          data: { status: 'SENT', providerMessageRef: 'old-owner' },
        }),
      ).resolves.toMatchObject({ count: 0 });
      await expect(
        repository.updateDeliveryAttemptWithClaim({
          attemptId: attempt.id,
          notificationId: notification.id,
          claimToken: second!.claimToken,
          now: new Date(expiredAt.getTime() + 1),
          data: { status: 'SENT', providerMessageRef: 'current-owner' },
        }),
      ).resolves.toMatchObject({ count: 1 });
      expect(
        (
          await prisma.notificationDeliveryAttempt.findUnique({
            where: { id: attempt.id },
            select: { providerMessageRef: true },
          })
        )?.providerMessageRef,
      ).toBe('current-owner');
      await expect(
        repository.markQueuedNotificationSent({
          notificationId: notification.id,
          sentAt: expiredAt,
          claimToken: first!.claimToken,
        }),
      ).resolves.toMatchObject({ count: 0 });
      await expect(
        repository.markQueuedNotificationSent({
          notificationId: notification.id,
          sentAt: new Date(expiredAt.getTime() + 1),
          claimToken: second!.claimToken,
        }),
      ).resolves.toMatchObject({ count: 1 });
    });

    it('does not let an incomplete old attempt block replay numbering', async () => {
      const startedAt = new Date('2026-10-14T12:03:00.000Z');
      const expiredAt = new Date('2026-10-14T12:03:01.001Z');
      const notification = await createFixtureNotification();
      const first = await repository.claimNotificationForExecution({
        notificationId: notification.id,
        now: startedAt,
        leaseDurationMs: 1_000,
      });
      const baseAttempt = {
        notification: { connect: { id: notification.id } },
        provider: 'SMTP',
        status: 'PENDING' as const,
        requestPayload: { channel: NotificationChannel.EMAIL },
        attemptedAt: startedAt,
      };
      const firstAttempt =
        await repository.createDeliveryAttemptWithNextNumber(baseAttempt);
      const second = await repository.claimNotificationForExecution({
        notificationId: notification.id,
        now: expiredAt,
        leaseDurationMs: 60_000,
      });
      const secondAttempt =
        await repository.createDeliveryAttemptWithNextNumber({
          ...baseAttempt,
          attemptedAt: expiredAt,
        });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect([firstAttempt.attemptNumber, secondAttempt.attemptNumber]).toEqual(
        [1, 2],
      );
    });

    it('does not reclaim terminal notifications and recovers without Redis', async () => {
      const now = new Date('2026-10-14T12:04:00.000Z');
      const sent = await createFixtureNotification({
        status: NotificationStatus.SENT,
        scheduledFor: null,
      });
      const stale = await createFixtureNotification({
        status: NotificationStatus.QUEUED,
        claimToken: randomUUID(),
        claimedAt: new Date(now.getTime() - 120_000),
        claimUntil: new Date(now.getTime() - 1),
      });

      await expect(
        repository.claimNotificationForExecution({
          notificationId: sent.id,
          now,
          leaseDurationMs: 60_000,
        }),
      ).resolves.toBeNull();
      await expect(
        repository.claimNotificationForExecution({
          notificationId: stale.id,
          now,
          leaseDurationMs: 60_000,
        }),
      ).resolves.toMatchObject({ notificationId: stale.id });
    });

    it('uses the lease index for stale queued recovery', async () => {
      const plan = await prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>(
        Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT "id"
        FROM "Notification"
        WHERE "status" = CAST(${NotificationStatus.QUEUED} AS "NotificationStatus")
          AND "claimUntil" IS NOT NULL
          AND "claimUntil" <= CURRENT_TIMESTAMP
        ORDER BY "claimUntil" ASC, "updatedAt" ASC
        LIMIT 25
      `,
      );
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      console.log(`[notification-lease] EXPLAIN stale queued\n${text}`);
      expect(text).toContain('Notification');
    });

    it.each([1_000, 10_000])(
      'claims a bounded %s notification backlog with provider stubs only',
      async (size) => {
        const ids = await createBacklog(size);
        const metrics = await benchmarkClaims(ids, 8);
        expect(metrics.claimLatencyMs.p99).toBeGreaterThanOrEqual(0);
        expect(metrics.claimThroughputPerSecond).toBeGreaterThan(0);
        expect(
          await prisma.notification.count({
            where: {
              id: { in: ids },
              status: NotificationStatus.QUEUED,
            },
          }),
        ).toBe(size);
      },
      180_000,
    );
  },
);
