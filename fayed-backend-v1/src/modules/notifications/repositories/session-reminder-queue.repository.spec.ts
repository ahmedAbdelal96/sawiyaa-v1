import { SessionReminderType, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionReminderQueueRepository } from './session-reminder-queue.repository';

describe('SessionReminderQueueRepository', () => {
  function buildRepository() {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const findMany = jest.fn().mockResolvedValue([]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const prisma = {
      sessionReminderQueue: {
        createMany,
        findMany,
        updateMany,
      },
    } as unknown as PrismaService;

    return {
      repository: new SessionReminderQueueRepository(prisma),
      createMany,
      findMany,
      updateMany,
    };
  }

  it('creates reminders in bulk with duplicate skipping enabled', async () => {
    const setup = buildRepository();

    await setup.repository.scheduleMany([
      {
        sessionId: 'session_1',
        recipientUserId: 'user_1',
        recipientRole: UserRoleType.PATIENT,
        reminderType: SessionReminderType.REMINDER_60,
        dueAt: new Date('2026-08-02T11:00:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1',
      },
      {
        sessionId: 'session_1',
        recipientUserId: 'user_2',
        recipientRole: UserRoleType.PRACTITIONER,
        reminderType: SessionReminderType.REMINDER_15,
        dueAt: new Date('2026-08-02T11:45:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-15:session_1:user_2',
      },
    ]);

    expect(setup.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          sessionId: 'session_1',
          recipientUserId: 'user_1',
          recipientRole: UserRoleType.PATIENT,
          reminderType: SessionReminderType.REMINDER_60,
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('is safe to call scheduleMany repeatedly with the same reminder ids', async () => {
    const setup = buildRepository();
    const reminders = [
      {
        sessionId: 'session_1',
        recipientUserId: 'user_1',
        recipientRole: UserRoleType.PATIENT,
        reminderType: SessionReminderType.REMINDER_60,
        dueAt: new Date('2026-08-02T11:00:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1',
      },
    ];

    await setup.repository.scheduleMany(reminders);
    await setup.repository.scheduleMany(reminders);

    expect(setup.createMany).toHaveBeenCalledTimes(2);
    expect(setup.createMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
    expect(setup.createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
  });

  it('filters only due, unsent, uncancelled reminders', async () => {
    const setup = buildRepository();

    await setup.repository.listDueReminders({
      now: new Date('2026-08-02T11:00:00.000Z'),
      limit: 50,
    });

    expect(setup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sentAt: null,
          cancelledAt: null,
          dueAt: {
            lte: new Date('2026-08-02T11:00:00.000Z'),
          },
        }),
        take: 50,
      }),
    );
  });

  it('can mark reminders as sent or cancelled without touching already processed rows', async () => {
    const setup = buildRepository();

    await setup.repository.markSent({
      reminderId: 'reminder_1',
      sentAt: new Date('2026-08-02T11:00:00.000Z'),
    });

    await setup.repository.cancelReminder({
      reminderId: 'reminder_2',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });

    await setup.repository.cancelFutureBySessionId({
      sessionId: 'session_1',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });

    expect(setup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reminder_1',
          sentAt: null,
          cancelledAt: null,
        }),
      }),
    );
    expect(setup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reminder_2',
        }),
      }),
    );
    expect(setup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: 'session_1',
        }),
      }),
    );
  });
});
