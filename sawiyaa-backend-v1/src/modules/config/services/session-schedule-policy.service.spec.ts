import { SessionReminderType } from '@prisma/client';
import { SessionSchedulePolicyService } from './session-schedule-policy.service';

describe('SessionSchedulePolicyService', () => {
  function build(overrides: Record<string, unknown> = {}) {
    const values = {
      SESSION_REMINDER_OFFSETS_MINUTES: [60, 15, 0],
      SESSION_LATE_REMINDER_ENABLED: true,
      SESSION_LATE_REMINDER_MINUTES_AFTER_START: 5,
      SESSION_JOIN_EARLY_MINUTES: 15,
      SESSION_JOIN_AFTER_END_GRACE_MINUTES: 10,
      SESSION_IN_APP_REMINDERS_ENABLED: true,
      SESSION_EMAIL_REMINDERS_ENABLED: true,
      ...overrides,
    };
    const config = {
      getJson: jest.fn((key: string) => Promise.resolve(values[key])),
      getBoolean: jest.fn((key: string) => Promise.resolve(values[key])),
      getNumber: jest.fn((key: string) => Promise.resolve(values[key])),
    };
    return {
      config,
      service: new SessionSchedulePolicyService(config as never),
    };
  }

  it('resolves the documented default stages and join window', async () => {
    const { service } = build();
    const policy = await service.resolve();
    expect(policy.reminder.reminderOffsetsMinutes).toEqual([60, 15, 0]);
    expect(policy.reminder.lateReminderEnabled).toBe(true);
    expect(policy.reminder.lateReminderMinutesAfterStart).toBe(5);
    expect(policy.join).toEqual({ joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 });
  });

  it('builds exact UTC T-60, T-15, T0, and T+5 instants', async () => {
    const { service } = build();
    const policy = await service.resolve();
    const plan = service.buildReminderPlan({
      policy,
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
    });
    expect(plan.map((item) => [item.type, item.dueAt.toISOString()])).toEqual([
      [SessionReminderType.REMINDER_60, '2026-08-06T11:00:00.000Z'],
      [SessionReminderType.REMINDER_15, '2026-08-06T11:45:00.000Z'],
      [SessionReminderType.STARTING_NOW, '2026-08-06T12:00:00.000Z'],
      [SessionReminderType.LATE_JOIN, '2026-08-06T12:05:00.000Z'],
    ]);
  });

  it('uses changed offsets for a new plan and does not mutate an old snapshot', async () => {
    const initial = build();
    const oldPolicy = await initial.service.resolve();
    const changed = build({ SESSION_REMINDER_OFFSETS_MINUTES: [30, 10, 0] });
    const newPolicy = await changed.service.resolve();
    const start = new Date('2026-08-06T12:00:00.000Z');
    expect(initial.service.buildReminderPlan({ policy: oldPolicy, scheduledStartAt: start })).toHaveLength(4);
    expect(changed.service.buildReminderPlan({ policy: newPolicy, scheduledStartAt: start }).map((item) => item.dueAt.toISOString())).toEqual([
      '2026-08-06T11:30:00.000Z',
      '2026-08-06T11:50:00.000Z',
      '2026-08-06T12:00:00.000Z',
      '2026-08-06T12:05:00.000Z',
    ]);
    expect(initial.service.buildReminderPlan({ policy: oldPolicy, scheduledStartAt: start })[0].dueAt.toISOString()).toBe('2026-08-06T11:00:00.000Z');
  });

  it('removes the late stage without cancelling pre-start stages', async () => {
    const { service } = build({ SESSION_LATE_REMINDER_ENABLED: false });
    const plan = service.buildReminderPlan({
      policy: await service.resolve(),
      scheduledStartAt: new Date('2026-08-06T12:00:00.000Z'),
    });
    expect(plan.map((item) => item.type)).toEqual([
      SessionReminderType.REMINDER_60,
      SessionReminderType.REMINDER_15,
      SessionReminderType.STARTING_NOW,
    ]);
  });

  it('rejects duplicate offsets and invalid persisted snapshots', async () => {
    const duplicate = build({ SESSION_REMINDER_OFFSETS_MINUTES: [30, 30, 0] });
    await expect(duplicate.service.resolve()).rejects.toThrow();
    const { service } = build();
    expect(() => service.parseSnapshot({ version: 1, scheduleRevision: 1 })).toThrow();
  });
});
