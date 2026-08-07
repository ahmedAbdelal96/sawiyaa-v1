import { SessionStatus } from '@prisma/client';
import { RescheduleSessionService } from './reschedule-session.service';

describe('RescheduleSessionService', () => {
  it('increments the revision, snapshots current policy, and rebuilds reminders', async () => {
    const current = {
      id: 'session-1',
      status: SessionStatus.UPCOMING,
      scheduleRevision: 4,
      schedulePolicySnapshotJson: null,
      patient: { id: 'patient-1' },
      practitioner: { id: 'practitioner-1' },
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-06T12:30:00.000Z'),
    };
    const updated = { ...current, scheduleRevision: 5 };
    const sessions = {
      findById: jest.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(updated),
      findByIdForUpdate: jest.fn().mockResolvedValue(current),
      updateStatus: jest.fn(),
    };
    const policy = {
      resolve: jest.fn().mockResolvedValue({
        version: 1,
        scheduleRevision: 0,
        capturedAt: '2026-08-06T00:00:00.000Z',
        reminder: {
          reminderOffsetsMinutes: [30, 10, 0],
          lateReminderEnabled: true,
          lateReminderMinutesAfterStart: 5,
          inAppRemindersEnabled: true,
          emailRemindersEnabled: true,
        },
        join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 },
      }),
      withScheduleRevision: jest.fn((value, scheduleRevision) => ({ ...value, scheduleRevision })),
    };
    const notifications = { queueSessionReminders: jest.fn() };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})),
    };
    const service = new RescheduleSessionService(
      prisma as never,
      sessions as never,
      policy as never,
      notifications as never,
    );

    await service.execute({
      sessionId: 'session-1',
      scheduledStartAt: new Date('2026-08-07T14:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-07T14:30:00.000Z'),
    });

    expect(policy.withScheduleRevision).toHaveBeenCalledWith(expect.anything(), 5);
    expect(sessions.updateStatus).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        scheduleRevision: 5,
        joinOpenAt: new Date('2026-08-07T13:45:00.000Z'),
        joinCloseAt: new Date('2026-08-07T14:40:00.000Z'),
      }),
      expect.anything(),
    );
    expect(notifications.queueSessionReminders).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleRevision: 5 }),
    );
  });
});
