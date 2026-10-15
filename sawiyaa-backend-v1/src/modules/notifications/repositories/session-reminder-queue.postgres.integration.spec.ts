import { randomUUID } from 'node:crypto';
import {
  Prisma,
  SessionFlowType,
  SessionMode,
  SessionReminderType,
  SessionStatus,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionReminderQueueRepository } from './session-reminder-queue.repository';
import { isSessionReminderStale } from '../services/session-reminder-freshness-policy';

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
    `Unsafe session reminder integration database: ${parsedUrl?.hostname}/${databaseName}`,
  );
}

const describeIfAuthorized = authorized ? describe : describe.skip;

describeIfAuthorized('Session reminder PostgreSQL lease integration', () => {
  let prisma: PrismaService;
  let repository: SessionReminderQueueRepository;
  const fixtureIds: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = configuredUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new SessionReminderQueueRepository(prisma);
  });

  afterAll(async () => {
    if (fixtureIds.length) {
      await prisma.sessionReminderQueue.deleteMany({
        where: { sessionId: { in: fixtureIds } },
      });
      await prisma.session.deleteMany({ where: { id: { in: fixtureIds } } });
    }
    await prisma.$disconnect();
  });

  async function createFixture(now = new Date()) {
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: 'Reminder Integration Patient' },
        {
          id: practitionerUserId,
          displayName: 'Reminder Integration Practitioner',
        },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `reminder-${practitionerId}`,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `REM-${sessionId.slice(0, 8)}`,
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
        schedulePolicySnapshotJson: {
          version: 1,
          scheduleRevision: 1,
          reminder: {
            reminderOffsetsMinutes: [60, 15, 0],
            lateReminderEnabled: true,
            lateReminderMinutesAfterStart: 5,
            inAppRemindersEnabled: true,
            emailRemindersEnabled: false,
          },
          join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 },
        },
      },
    });
    fixtureIds.push(sessionId);
    return { sessionId, patientUserId, practitionerUserId };
  }

  async function createReminder(input: {
    sessionId: string;
    recipientUserId: string;
    reminderType?: SessionReminderType;
    dueAt: Date;
    id?: string;
  }) {
    return prisma.sessionReminderQueue.create({
      data: {
        id: input.id ?? randomUUID(),
        sessionId: input.sessionId,
        recipientUserId: input.recipientUserId,
        recipientRole: UserRoleType.PATIENT,
        reminderType: input.reminderType ?? SessionReminderType.REMINDER_15,
        scheduleRevision: 1,
        dueAt: input.dueAt,
        recipientTimezoneSnapshot: 'UTC',
        recipientLocaleSnapshot: 'en',
        idempotencyKey: `reminder-integration:${randomUUID()}`,
      },
    });
  }

  it('gives two, four, and eight simultaneous dispatchers disjoint ownership', async () => {
    for (const dispatcherCount of [2, 4, 8]) {
      const now = new Date();
      const fixture = await createFixture(now);
      const reminders = await Promise.all(
        Array.from({ length: dispatcherCount * 10 }, () =>
          createReminder({
            sessionId: fixture.sessionId,
            recipientUserId: fixture.patientUserId,
            dueAt: new Date(now.getTime() - 1_000),
          }),
        ),
      );

      const claims = await Promise.all(
        Array.from({ length: dispatcherCount }, () =>
          repository.claimDueReminders({
            now,
            limit: 10,
            leaseDurationMs: 60_000,
          }),
        ),
      );
      const claimedIds = claims.flatMap((claim) =>
        claim.reminders.map((reminder) => reminder.id),
      );

      expect(claimedIds).toHaveLength(reminders.length);
      expect(new Set(claimedIds).size).toBe(reminders.length);
    }
  });

  it('claims deterministic urgency order before less urgent due work', async () => {
    const now = new Date();
    const fixture = await createFixture(now);
    const orderedTypes = [
      SessionReminderType.REMINDER_60,
      SessionReminderType.REMINDER_15,
      SessionReminderType.STARTING_NOW,
      SessionReminderType.LATE_JOIN,
    ];
    for (const reminderType of orderedTypes) {
      await createReminder({
        sessionId: fixture.sessionId,
        recipientUserId: fixture.patientUserId,
        reminderType,
        dueAt: new Date(now.getTime() - 1_000),
      });
    }

    const claim = await repository.claimDueReminders({
      now,
      limit: orderedTypes.length,
      leaseDurationMs: 60_000,
    });

    expect(claim.reminders.map((reminder) => reminder.reminderType)).toEqual([
      SessionReminderType.STARTING_NOW,
      SessionReminderType.LATE_JOIN,
      SessionReminderType.REMINDER_15,
      SessionReminderType.REMINDER_60,
    ]);
  });

  it('does not claim a future UTC due time when PostgreSQL uses a local timezone', async () => {
    const now = new Date();
    const fixture = await createFixture(now);
    const reminder = await createReminder({
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      dueAt: new Date(now.getTime() + 60 * 60 * 1_000),
    });

    const claim = await repository.claimDueReminders({
      now,
      limit: 1,
      leaseDurationMs: 60_000,
    });

    expect(claim.reminders).toHaveLength(0);
    expect(
      await prisma.sessionReminderQueue.findUnique({
        where: { id: reminder.id },
        select: { claimToken: true },
      }),
    ).toMatchObject({ claimToken: null });
  });

  it('reclaims an expired lease and rejects the old owner finalization', async () => {
    const now = new Date();
    const fixture = await createFixture(now);
    const reminder = await createReminder({
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      dueAt: new Date(now.getTime() - 1_000),
    });

    const first = await repository.claimDueReminders({
      now,
      limit: 1,
      leaseDurationMs: 1_000,
    });
    const beforeExpiry = await repository.claimDueReminders({
      now: new Date(now.getTime() + 500),
      limit: 1,
      leaseDurationMs: 1_000,
    });
    const second = await repository.claimDueReminders({
      now: new Date(now.getTime() + 1_001),
      limit: 1,
      leaseDurationMs: 1_000,
    });

    expect(first.reminders[0]?.id).toBe(reminder.id);
    expect(beforeExpiry.reminders).toHaveLength(0);
    expect(second.reminders[0]?.id).toBe(reminder.id);
    await expect(
      repository.markSent({
        reminderId: reminder.id,
        sentAt: new Date(now.getTime() + 1_002),
        claimToken: first.claimToken,
      }),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      repository.markSent({
        reminderId: reminder.id,
        sentAt: new Date(now.getTime() + 1_003),
        claimToken: second.claimToken,
      }),
    ).resolves.toMatchObject({ count: 1 });
  });

  it('removes a claimed row from execution after cancellation and reschedule', async () => {
    const now = new Date();
    const fixture = await createFixture(now);
    const oldReminder = await createReminder({
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      dueAt: new Date(now.getTime() - 1_000),
    });
    const oldClaim = await repository.claimDueReminders({
      now,
      limit: 1,
      leaseDurationMs: 60_000,
    });

    const newReminderId = randomUUID();
    await repository.replaceSessionPlan({
      sessionId: fixture.sessionId,
      reminders: [
        {
          id: newReminderId,
          sessionId: fixture.sessionId,
          recipientUserId: fixture.patientUserId,
          recipientRole: UserRoleType.PATIENT,
          reminderType: SessionReminderType.REMINDER_15,
          scheduleRevision: 2,
          dueAt: new Date(now.getTime() + 1_000),
          idempotencyKey: `reminder-integration:replacement:${randomUUID()}`,
        },
      ],
      cancelledAt: now,
      schedulePolicySnapshot: null,
    });

    expect(
      await repository.findClaimedReminder({
        reminderId: oldReminder.id,
        claimToken: oldClaim.claimToken,
        now,
      }),
    ).toBeNull();
    expect(
      await prisma.sessionReminderQueue.findUnique({
        where: { id: newReminderId },
        select: { scheduleRevision: true, cancelledAt: true },
      }),
    ).toMatchObject({ scheduleRevision: 2, cancelledAt: null });
  });

  it('recognizes a participant join after claim and drops stale reminders', async () => {
    const now = new Date();
    const fixture = await createFixture(now);
    const claimedReminder = await createReminder({
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      reminderType: SessionReminderType.STARTING_NOW,
      dueAt: new Date(now.getTime() - 10_000),
    });
    const claim = await repository.claimDueReminders({
      now,
      limit: 1,
      leaseDurationMs: 60_000,
    });

    await prisma.sessionEvent.create({
      data: {
        sessionId: fixture.sessionId,
        eventType: 'JOIN_ALLOWED',
        actorUserId: fixture.patientUserId,
        occurredAt: now,
      },
    });
    expect(
      await repository.hasParticipantJoined({
        sessionId: fixture.sessionId,
        recipientUserId: fixture.patientUserId,
      }),
    ).toBe(true);

    const staleReminder = await createReminder({
      sessionId: fixture.sessionId,
      recipientUserId: fixture.patientUserId,
      reminderType: SessionReminderType.STARTING_NOW,
      dueAt: new Date(now.getTime() - 91_000),
    });
    expect(
      isSessionReminderStale({
        reminderType: staleReminder.reminderType,
        dueAt: staleReminder.dueAt,
        now,
      }),
    ).toBe(true);
    await repository.cancelReminder({
      reminderId: staleReminder.id,
      cancelledAt: now,
    });

    expect(
      await repository.findClaimedReminder({
        reminderId: claimedReminder.id,
        claimToken: claim.claimToken,
        now,
      }),
    ).not.toBeNull();
    expect(
      await prisma.sessionReminderQueue.findUnique({
        where: { id: staleReminder.id },
        select: { sentAt: true, cancelledAt: true },
      }),
    ).toMatchObject({ sentAt: null, cancelledAt: now });
  });

  it('prints the exact priority-specific claim plans for the local PostgreSQL proof', async () => {
    const now = new Date();
    for (const reminderType of [
      SessionReminderType.STARTING_NOW,
      SessionReminderType.LATE_JOIN,
      SessionReminderType.REMINDER_15,
      SessionReminderType.REMINDER_60,
      SessionReminderType.PRE_START,
    ]) {
      const plan = await prisma.$queryRaw<
        Array<{ 'QUERY PLAN': Array<Record<string, unknown>> }>
      >(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT "id"
        FROM "SessionReminderQueue"
        WHERE "reminderType" = CAST(${reminderType} AS "SessionReminderType")
          AND "dueAt" <= ${now}
          AND "sentAt" IS NULL
          AND "cancelledAt" IS NULL
          AND ("claimUntil" IS NULL OR "claimUntil" <= ${now})
        ORDER BY "dueAt", "id"
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      `);

      expect(plan[0]?.['QUERY PLAN']).toBeDefined();
      console.log(
        '[session-reminder] EXPLAIN ANALYZE',
        reminderType,
        JSON.stringify(plan[0]?.['QUERY PLAN']),
      );
    }
  });
});
