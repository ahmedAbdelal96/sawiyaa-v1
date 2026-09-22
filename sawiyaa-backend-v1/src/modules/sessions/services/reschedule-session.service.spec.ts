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
      createEvent: jest.fn(),
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
    expect(sessions.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'RESCHEDULED',
        metadataJson: expect.objectContaining({
          previousStartAt: '2026-08-06T12:00:00.000Z',
          previousEndAt: '2026-08-06T12:30:00.000Z',
          newStartAt: '2026-08-07T14:00:00.000Z',
          newEndAt: '2026-08-07T14:30:00.000Z',
          scheduleRevision: 5,
        }),
      }),
      expect.anything(),
    );
  });

  it('uses the locked schedule as the historical previous state', async () => {
    const initial = {
      id: 'session-2',
      status: SessionStatus.UPCOMING,
      scheduleRevision: 2,
      patient: { id: 'patient-2' },
      practitioner: { id: 'practitioner-2' },
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-06T12:30:00.000Z'),
    };
    const locked = {
      ...initial,
      scheduleRevision: 2,
      scheduledStartAt: new Date('2026-08-07T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-07T12:30:00.000Z'),
    };
    const sessions = {
      findById: jest.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(locked),
      findByIdForUpdate: jest.fn().mockResolvedValue(locked),
      updateStatus: jest.fn(),
      createEvent: jest.fn(),
    };
    const policy = {
      resolve: jest.fn().mockResolvedValue({ join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 } }),
      withScheduleRevision: jest.fn((value, scheduleRevision) => ({ ...value, scheduleRevision })),
    };
    const notifications = { queueSessionReminders: jest.fn() };
    const prisma = { $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})) };
    const service = new RescheduleSessionService(prisma as never, sessions as never, policy as never, notifications as never);

    await service.execute({
      sessionId: initial.id,
      scheduledStartAt: new Date('2026-08-08T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-08T12:30:00.000Z'),
    });

    expect(sessions.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataJson: expect.objectContaining({
          previousStartAt: '2026-08-07T12:00:00.000Z',
          previousEndAt: '2026-08-07T12:30:00.000Z',
        }),
      }),
      expect.anything(),
    );
  });

  it('does not create history when the locked revision is stale', async () => {
    const current = {
      id: 'session-3',
      status: SessionStatus.UPCOMING,
      scheduleRevision: 4,
      patient: { id: 'patient-3' },
      practitioner: { id: 'practitioner-3' },
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-06T12:30:00.000Z'),
    };
    const sessions = {
      findById: jest.fn().mockResolvedValue(current),
      findByIdForUpdate: jest.fn().mockResolvedValue({ ...current, scheduleRevision: 5 }),
      updateStatus: jest.fn(),
      createEvent: jest.fn(),
    };
    const policy = {
      resolve: jest.fn().mockResolvedValue({ join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 } }),
      withScheduleRevision: jest.fn((value, scheduleRevision) => ({ ...value, scheduleRevision })),
    };
    const notifications = { queueSessionReminders: jest.fn() };
    const prisma = { $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})) };
    const service = new RescheduleSessionService(prisma as never, sessions as never, policy as never, notifications as never);

    await expect(service.execute({
      sessionId: current.id,
      scheduledStartAt: new Date('2026-08-08T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-08T12:30:00.000Z'),
    })).rejects.toMatchObject({ response: { error: 'SESSION_SCHEDULE_CHANGED' } });
    expect(sessions.createEvent).not.toHaveBeenCalled();
    expect(sessions.updateStatus).not.toHaveBeenCalled();
  });

  it('preserves each successive appointment change as a distinct event', async () => {
    const state: any = {
      id: 'session-4',
      status: SessionStatus.UPCOMING,
      scheduleRevision: 1,
      patient: { id: 'patient-4' },
      practitioner: { id: 'practitioner-4' },
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-06T12:30:00.000Z'),
    };
    const events: any[] = [];
    const sessions = {
      findById: jest.fn().mockImplementation(async () => ({ ...state })),
      findByIdForUpdate: jest.fn().mockImplementation(async () => ({ ...state })),
      updateStatus: jest.fn().mockImplementation(async (_id, data) => {
        Object.assign(state, data);
      }),
      createEvent: jest.fn().mockImplementation(async (data) => {
        events.push(data);
      }),
    };
    const policy = {
      resolve: jest.fn().mockResolvedValue({ join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 } }),
      withScheduleRevision: jest.fn((value, scheduleRevision) => ({ ...value, scheduleRevision })),
    };
    const notifications = { queueSessionReminders: jest.fn() };
    const prisma = { $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})) };
    const service = new RescheduleSessionService(prisma as never, sessions as never, policy as never, notifications as never);

    for (const [start, end] of [
      ['2026-08-07T12:00:00.000Z', '2026-08-07T12:30:00.000Z'],
      ['2026-08-08T12:00:00.000Z', '2026-08-08T12:30:00.000Z'],
      ['2026-08-09T12:00:00.000Z', '2026-08-09T12:30:00.000Z'],
    ]) {
      await service.execute({
        sessionId: state.id,
        scheduledStartAt: new Date(start),
        scheduledEndAt: new Date(end),
      });
    }

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.metadataJson.previousStartAt)).toEqual([
      '2026-08-06T12:00:00.000Z',
      '2026-08-07T12:00:00.000Z',
      '2026-08-08T12:00:00.000Z',
    ]);
    expect(events.map((event) => event.metadataJson.newStartAt)).toEqual([
      '2026-08-07T12:00:00.000Z',
      '2026-08-08T12:00:00.000Z',
      '2026-08-09T12:00:00.000Z',
    ]);
  });
});
