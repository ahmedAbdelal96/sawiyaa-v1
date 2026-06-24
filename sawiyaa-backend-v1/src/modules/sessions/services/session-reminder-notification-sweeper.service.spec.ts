import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionReminderQueueRepository } from '@modules/notifications/repositories/session-reminder-queue.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { SessionReminderNotificationSweeperService } from './session-reminder-notification-sweeper.service';

describe('SessionReminderNotificationSweeperService', () => {
  function buildService(options?: {
    candidates?: Array<{
      id: string;
      sessionId: string;
      recipientUserId: string;
      recipientRole: 'PATIENT' | 'PRACTITIONER';
      reminderType: 'REMINDER_60' | 'REMINDER_15';
      dueAt: Date;
      idempotencyKey: string;
      session: {
        id: string;
        status: string;
        scheduledStartAt: Date | null;
        patient: { id: string; user: { id: string } };
        practitioner: { id: string; user: { id: string } };
      };
    }>;
  }) {
    const listDueReminders = jest.fn(() =>
      Promise.resolve(options?.candidates ?? []),
    );
    const markSent = jest.fn().mockResolvedValue({ count: 1 });
    const cancelFutureBySessionId = jest.fn().mockResolvedValue({ count: 1 });
    const cancelReminder = jest.fn().mockResolvedValue({ count: 1 });

    const sessionReminderQueueRepository = {
      listDueReminders,
      markSent,
      cancelFutureBySessionId,
      cancelReminder,
    } as unknown as SessionReminderQueueRepository;

    const dispatchScheduledSessionReminder = jest
      .fn()
      .mockResolvedValue({ delivered: true });
    const operationalNotificationService = {
      dispatchScheduledSessionReminder,
    } as unknown as OperationalNotificationService;

    const logger = {
      error: jest.fn(),
    } as unknown as AppLoggerService;

    const service = new SessionReminderNotificationSweeperService(
      sessionReminderQueueRepository,
      operationalNotificationService,
      logger,
    );

    return {
      service,
      listDueReminders,
      markSent,
      cancelFutureBySessionId,
      cancelReminder,
      dispatchScheduledSessionReminder,
      logger,
    };
  }

  it('reads only due reminders and marks successful dispatches as sent', async () => {
    const dueAt = new Date('2026-08-02T11:00:00.000Z');
    const setup = buildService({
      candidates: [
        {
          id: 'reminder_1',
          sessionId: 'session_1',
          recipientUserId: 'user_1',
          recipientRole: 'PATIENT',
          reminderType: 'REMINDER_60',
          dueAt,
          idempotencyKey: 'sessions.session-reminder-60:session_1:user_1',
          session: {
            id: 'session_1',
            status: 'CONFIRMED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_1', user: { id: 'user_1' } },
            practitioner: { id: 'pr_1', user: { id: 'user_2' } },
          },
        },
      ],
    });

    const handled = await setup.service.sweepOnce(
      new Date('2026-08-02T11:00:00.000Z'),
    );

    expect(setup.listDueReminders).toHaveBeenCalledWith({
      now: new Date('2026-08-02T11:00:00.000Z'),
      limit: 50,
    });
    expect(setup.dispatchScheduledSessionReminder).toHaveBeenCalledWith({
      reminder: expect.objectContaining({
        id: 'reminder_1',
        sessionId: 'session_1',
      }),
    });
    expect(setup.markSent).toHaveBeenCalledWith({
      reminderId: 'reminder_1',
      sentAt: new Date('2026-08-02T11:00:00.000Z'),
    });
    expect(handled).toBe(1);
  });

  it('cancels reminders for terminal sessions instead of retrying them forever', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'reminder_2',
          sessionId: 'session_2',
          recipientUserId: 'user_3',
          recipientRole: 'PATIENT',
          reminderType: 'REMINDER_15',
          dueAt: new Date('2026-08-02T11:45:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-15:session_2:user_3',
          session: {
            id: 'session_2',
            status: 'CANCELLED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_2', user: { id: 'user_3' } },
            practitioner: { id: 'pr_2', user: { id: 'user_4' } },
          },
        },
      ],
    });
    (setup.dispatchScheduledSessionReminder as jest.Mock).mockResolvedValueOnce(
      { delivered: false, skipReason: 'SESSION_STATUS_CANCELLED' },
    );

    const handled = await setup.service.sweepOnce(
      new Date('2026-08-02T11:45:00.000Z'),
    );

    expect(setup.cancelFutureBySessionId).toHaveBeenCalledWith({
      sessionId: 'session_2',
      cancelledAt: new Date('2026-08-02T11:45:00.000Z'),
    });
    expect(setup.markSent).not.toHaveBeenCalled();
    expect(handled).toBe(0);
  });

  it('cancels pending reminders for completed, expired, and no-show sessions', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'reminder_5',
          sessionId: 'session_5',
          recipientUserId: 'user_10',
          recipientRole: 'PATIENT',
          reminderType: 'REMINDER_60',
          dueAt: new Date('2026-08-02T11:00:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-60:session_5:user_10',
          session: {
            id: 'session_5',
            status: 'COMPLETED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_5', user: { id: 'user_10' } },
            practitioner: { id: 'pr_5', user: { id: 'user_11' } },
          },
        },
        {
          id: 'reminder_6',
          sessionId: 'session_6',
          recipientUserId: 'user_12',
          recipientRole: 'PATIENT',
          reminderType: 'REMINDER_15',
          dueAt: new Date('2026-08-02T11:45:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-15:session_6:user_12',
          session: {
            id: 'session_6',
            status: 'EXPIRED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_6', user: { id: 'user_12' } },
            practitioner: { id: 'pr_6', user: { id: 'user_13' } },
          },
        },
        {
          id: 'reminder_7',
          sessionId: 'session_7',
          recipientUserId: 'user_14',
          recipientRole: 'PRACTITIONER',
          reminderType: 'REMINDER_60',
          dueAt: new Date('2026-08-02T11:00:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-60:session_7:user_14',
          session: {
            id: 'session_7',
            status: 'NO_SHOW',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_7', user: { id: 'user_15' } },
            practitioner: { id: 'pr_7', user: { id: 'user_14' } },
          },
        },
      ],
    });
    (setup.dispatchScheduledSessionReminder as jest.Mock)
      .mockResolvedValueOnce({
        delivered: false,
        skipReason: 'SESSION_STATUS_COMPLETED',
      })
      .mockResolvedValueOnce({
        delivered: false,
        skipReason: 'SESSION_STATUS_EXPIRED',
      })
      .mockResolvedValueOnce({
        delivered: false,
        skipReason: 'SESSION_STATUS_NO_SHOW',
      });

    await setup.service.sweepOnce(new Date('2026-08-02T11:00:00.000Z'));

    expect(setup.cancelFutureBySessionId).toHaveBeenNthCalledWith(1, {
      sessionId: 'session_5',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });
    expect(setup.cancelFutureBySessionId).toHaveBeenNthCalledWith(2, {
      sessionId: 'session_6',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });
    expect(setup.cancelFutureBySessionId).toHaveBeenNthCalledWith(3, {
      sessionId: 'session_7',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });
  });

  it('cancels a single reminder when the recipient cannot be resolved', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'reminder_3',
          sessionId: 'session_3',
          recipientUserId: 'user_5',
          recipientRole: 'PRACTITIONER',
          reminderType: 'REMINDER_60',
          dueAt: new Date('2026-08-02T11:00:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-60:session_3:user_5',
          session: {
            id: 'session_3',
            status: 'CONFIRMED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_3', user: { id: 'user_6' } },
            practitioner: { id: 'pr_3', user: { id: 'user_7' } },
          },
        },
      ],
    });
    (setup.dispatchScheduledSessionReminder as jest.Mock).mockResolvedValueOnce(
      { delivered: false, skipReason: 'SESSION_RECIPIENT_NOT_FOUND' },
    );

    await setup.service.sweepOnce(new Date('2026-08-02T11:00:00.000Z'));

    expect(setup.cancelReminder).toHaveBeenCalledWith({
      reminderId: 'reminder_3',
      cancelledAt: new Date('2026-08-02T11:00:00.000Z'),
    });
  });

  it('does not crash when a sweep item fails', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'reminder_4',
          sessionId: 'session_4',
          recipientUserId: 'user_8',
          recipientRole: 'PATIENT',
          reminderType: 'REMINDER_60',
          dueAt: new Date('2026-08-02T11:00:00.000Z'),
          idempotencyKey: 'sessions.session-reminder-60:session_4:user_8',
          session: {
            id: 'session_4',
            status: 'CONFIRMED',
            scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
            patient: { id: 'patient_4', user: { id: 'user_8' } },
            practitioner: { id: 'pr_4', user: { id: 'user_9' } },
          },
        },
      ],
    });
    (setup.dispatchScheduledSessionReminder as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );

    const handled = await setup.service.sweepOnce(
      new Date('2026-08-02T11:00:00.000Z'),
    );

    expect(handled).toBe(0);
    expect(setup.logger.error).toHaveBeenCalled();
  });
});
