import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import { SessionReminderQueueRepository } from '@modules/notifications/repositories/session-reminder-queue.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { SessionReminderRedisExecutionService } from './session-reminder-redis-execution.service';

describe('SessionReminderRedisExecutionService', () => {
  const reminder = {
    id: 'reminder_1',
    sessionId: 'session_1',
    recipientUserId: 'user_1',
    recipientRole: 'PATIENT' as const,
    reminderType: 'REMINDER_15' as const,
    scheduleRevision: 2,
    dueAt: new Date('2026-08-02T11:45:00.000Z'),
    idempotencyKey: 'session-reminder:1',
    session: {
      id: 'session_1',
      status: 'CONFIRMED',
      scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
      patient: { id: 'patient_1', user: { id: 'user_1' } },
      practitioner: { id: 'pr_1', user: { id: 'user_2' } },
    },
    claimToken: 'claim_1',
    claimUntil: new Date('2026-08-02T12:01:00.000Z'),
  };

  function build() {
    const claimReminderById = jest.fn().mockResolvedValue(reminder);
    const markSent = jest.fn().mockResolvedValue({ count: 1 });
    const cancelReminder = jest.fn().mockResolvedValue({ count: 1 });
    const cancelFutureBySessionId = jest.fn().mockResolvedValue({ count: 1 });
    const repository = {
      claimReminderById,
      markSent,
      cancelReminder,
      cancelFutureBySessionId,
    } as unknown as SessionReminderQueueRepository;
    const dispatchScheduledSessionReminder = jest
      .fn()
      .mockResolvedValue({ delivered: true });
    const operational = {
      dispatchScheduledSessionReminder,
    } as unknown as OperationalNotificationService;
    const recordExecution = jest.fn();
    const queue = { recordExecution } as unknown as SessionReminderQueueService;
    const logger = { error: jest.fn() } as unknown as AppLoggerService;
    const service = new SessionReminderRedisExecutionService(
      repository,
      operational,
      queue,
      logger,
    );
    return {
      service,
      repository,
      operational,
      queue,
      claimReminderById,
      markSent,
      dispatchScheduledSessionReminder,
      recordExecution,
    };
  }

  it('takes the PostgreSQL lease before creating the notification intent', async () => {
    const setup = build();
    await setup.service.execute({
      reminderId: reminder.id,
      scheduleRevision: reminder.scheduleRevision,
      now: new Date('2026-08-02T11:45:00.000Z'),
    });
    expect(setup.claimReminderById).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderId: reminder.id,
        scheduleRevision: reminder.scheduleRevision,
      }),
    );
    expect(setup.dispatchScheduledSessionReminder).toHaveBeenCalledWith({
      reminder,
    });
    expect(setup.markSent).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderId: reminder.id,
        claimToken: 'claim_1',
      }),
    );
  });

  it('safely no-ops an old or replayed Redis job when the lease is not won', async () => {
    const setup = build();
    setup.claimReminderById.mockResolvedValueOnce(null);
    const result = await setup.service.execute({
      reminderId: reminder.id,
      scheduleRevision: 1,
    });
    expect(result.outcome).toBe('NOOP');
    expect(setup.dispatchScheduledSessionReminder).not.toHaveBeenCalled();
    expect(setup.recordExecution).toHaveBeenCalledWith('NOOP');
  });
});
