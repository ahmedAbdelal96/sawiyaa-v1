import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SessionReminderType } from '@prisma/client';
import { ConfigRuntimeService } from './config-runtime.service';

export type SessionReminderPolicy = {
  reminderOffsetsMinutes: number[];
  lateReminderEnabled: boolean;
  lateReminderMinutesAfterStart: number;
  inAppRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
};

export type SessionJoinWindowPolicy = {
  joinEarlyMinutes: number;
  joinAfterEndGraceMinutes: number;
};

export type SessionSchedulePolicySnapshot = {
  version: 1;
  scheduleRevision: number;
  capturedAt: string;
  reminder: SessionReminderPolicy;
  join: SessionJoinWindowPolicy;
};

export type SessionReminderPlanItem = {
  type: SessionReminderType;
  offsetMinutes: number;
  dueAt: Date;
};

/**
 * The only runtime source for session timing policy.
 *
 * ConfigRuntimeService supplies the documented definition defaults only when
 * a catalog value has never been initialized. A present but invalid database
 * value is rejected by the config resolver and is never replaced here.
 */
@Injectable()
export class SessionSchedulePolicyService {
  constructor(private readonly config: ConfigRuntimeService) {}

  async resolve(): Promise<SessionSchedulePolicySnapshot> {
    const [offsets, lateEnabled, lateMinutes, earlyMinutes, graceMinutes, inApp, email] =
      await Promise.all([
        this.config.getJson<number[]>('SESSION_REMINDER_OFFSETS_MINUTES'),
        this.config.getBoolean('SESSION_LATE_REMINDER_ENABLED'),
        this.config.getNumber('SESSION_LATE_REMINDER_MINUTES_AFTER_START'),
        this.config.getNumber('SESSION_JOIN_EARLY_MINUTES'),
        this.config.getNumber('SESSION_JOIN_AFTER_END_GRACE_MINUTES'),
        this.config.getBoolean('SESSION_IN_APP_REMINDERS_ENABLED'),
        this.config.getBoolean('SESSION_EMAIL_REMINDERS_ENABLED'),
      ]);

    if (
      offsets === null ||
      lateEnabled === null ||
      lateMinutes === null ||
      earlyMinutes === null ||
      graceMinutes === null ||
      inApp === null ||
      email === null
    ) {
      throw new InternalServerErrorException(
        'Session schedule policy is not initialized in Database Config',
      );
    }

    const normalizedOffsets = this.validateOffsets(offsets);
    this.assertIntegerInRange(
      'SESSION_LATE_REMINDER_MINUTES_AFTER_START',
      lateMinutes,
      1,
      60,
    );
    this.assertIntegerInRange(
      'SESSION_JOIN_EARLY_MINUTES',
      earlyMinutes,
      0,
      120,
    );
    this.assertIntegerInRange(
      'SESSION_JOIN_AFTER_END_GRACE_MINUTES',
      graceMinutes,
      0,
      120,
    );

    return {
      version: 1,
      scheduleRevision: 0,
      capturedAt: new Date().toISOString(),
      reminder: {
        reminderOffsetsMinutes: normalizedOffsets,
        lateReminderEnabled: lateEnabled,
        lateReminderMinutesAfterStart: lateMinutes,
        inAppRemindersEnabled: inApp,
        emailRemindersEnabled: email,
      },
      join: {
        joinEarlyMinutes: earlyMinutes,
        joinAfterEndGraceMinutes: graceMinutes,
      },
    };
  }

  withScheduleRevision(
    policy: SessionSchedulePolicySnapshot,
    scheduleRevision: number,
  ): SessionSchedulePolicySnapshot {
    if (!Number.isInteger(scheduleRevision) || scheduleRevision < 1) {
      throw new InternalServerErrorException(
        `Invalid session schedule revision: ${scheduleRevision}`,
      );
    }
    return { ...policy, scheduleRevision };
  }

  buildReminderPlan(input: {
    policy: SessionSchedulePolicySnapshot;
    scheduledStartAt: Date;
  }): SessionReminderPlanItem[] {
    const { policy, scheduledStartAt } = input;
    const preStart = policy.reminder.reminderOffsetsMinutes.map(
      (offsetMinutes): SessionReminderPlanItem => ({
        type:
          offsetMinutes === 0
            ? SessionReminderType.STARTING_NOW
            : offsetMinutes === 60
              ? SessionReminderType.REMINDER_60
              : offsetMinutes === 15
                ? SessionReminderType.REMINDER_15
                : SessionReminderType.PRE_START,
        offsetMinutes,
        dueAt: new Date(scheduledStartAt.getTime() - offsetMinutes * 60_000),
      }),
    );
    if (!policy.reminder.lateReminderEnabled) return preStart;
    return [
      ...preStart,
      {
        type: SessionReminderType.LATE_JOIN,
        offsetMinutes: -policy.reminder.lateReminderMinutesAfterStart,
        dueAt: new Date(
          scheduledStartAt.getTime() +
            policy.reminder.lateReminderMinutesAfterStart * 60_000,
        ),
      },
    ];
  }

  parseSnapshot(value: unknown): SessionSchedulePolicySnapshot | null {
    if (value === null || value === undefined) return null;
    if (!value || typeof value !== 'object') {
      throw new InternalServerErrorException(
        'Persisted session schedule policy snapshot is invalid',
      );
    }

    const candidate = value as Partial<SessionSchedulePolicySnapshot>;
    const reminder = candidate.reminder as Partial<SessionReminderPolicy> | undefined;
    const join = candidate.join as Partial<SessionJoinWindowPolicy> | undefined;
    if (
      candidate.version !== 1 ||
      !Number.isInteger(candidate.scheduleRevision) ||
      !candidate.capturedAt ||
      !reminder ||
      !join
    ) {
      throw new InternalServerErrorException(
        'Persisted session schedule policy snapshot is invalid',
      );
    }

    const offsets = this.validateOffsets(reminder.reminderOffsetsMinutes);
    const scheduleRevision = candidate.scheduleRevision as number;
    const capturedAt = candidate.capturedAt as string;
    const joinEarlyMinutes = reminder ? join.joinEarlyMinutes : undefined;
    const joinAfterEndGraceMinutes = reminder
      ? join.joinAfterEndGraceMinutes
      : undefined;
    this.assertIntegerInRange(
      'SESSION_LATE_REMINDER_MINUTES_AFTER_START',
      reminder.lateReminderMinutesAfterStart,
      1,
      60,
    );
    this.assertIntegerInRange('SESSION_JOIN_EARLY_MINUTES', joinEarlyMinutes, 0, 120);
    this.assertIntegerInRange(
      'SESSION_JOIN_AFTER_END_GRACE_MINUTES',
      joinAfterEndGraceMinutes,
      0,
      120,
    );
    if (
      typeof reminder.lateReminderEnabled !== 'boolean' ||
      typeof reminder.inAppRemindersEnabled !== 'boolean' ||
      typeof reminder.emailRemindersEnabled !== 'boolean'
    ) {
      throw new InternalServerErrorException(
        'Persisted session schedule policy snapshot has invalid channel flags',
      );
    }

    return {
      version: 1,
      scheduleRevision,
      capturedAt,
      reminder: {
        reminderOffsetsMinutes: offsets,
        lateReminderEnabled: reminder.lateReminderEnabled,
        lateReminderMinutesAfterStart: reminder.lateReminderMinutesAfterStart,
        inAppRemindersEnabled: reminder.inAppRemindersEnabled,
        emailRemindersEnabled: reminder.emailRemindersEnabled,
      },
      join: {
        joinEarlyMinutes,
        joinAfterEndGraceMinutes,
      },
    };
  }

  private validateOffsets(value: unknown): number[] {
    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      value.some((offset) => !Number.isInteger(offset) || offset < 0 || offset > 24 * 60)
    ) {
      throw new InternalServerErrorException(
        'SESSION_REMINDER_OFFSETS_MINUTES must contain unique non-negative integer minutes',
      );
    }
    const unique = new Set(value);
    if (unique.size !== value.length) {
      throw new InternalServerErrorException(
        'SESSION_REMINDER_OFFSETS_MINUTES must not contain duplicates',
      );
    }
    return [...value].sort((left, right) => right - left);
  }

  private assertIntegerInRange(
    key: string,
    value: unknown,
    minimum: number,
    maximum: number,
  ): asserts value is number {
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new InternalServerErrorException(
        `${key} must be an integer between ${minimum} and ${maximum}`,
      );
    }
  }
}
