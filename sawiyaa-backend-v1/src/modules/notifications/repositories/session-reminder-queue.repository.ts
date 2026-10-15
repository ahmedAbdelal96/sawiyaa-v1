import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, SessionReminderType, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { getSessionReminderFreshnessWindowMs } from '../services/session-reminder-freshness-policy';

type DbClient = PrismaService | Prisma.TransactionClient;

const sessionReminderClaimPriority = [
  SessionReminderType.STARTING_NOW,
  SessionReminderType.LATE_JOIN,
  SessionReminderType.REMINDER_15,
  SessionReminderType.REMINDER_60,
  SessionReminderType.PRE_START,
] as const;

const sessionReminderStagePriority = new Map<SessionReminderType, number>(
  sessionReminderClaimPriority.map((type, index) => [type, index]),
);

const dueReminderSelect = {
  id: true,
  sessionId: true,
  recipientUserId: true,
  recipientRole: true,
  reminderType: true,
  scheduleRevision: true,
  offsetMinutesSnapshot: true,
  recipientTimezoneSnapshot: true,
  recipientLocaleSnapshot: true,
  dueAt: true,
  sentAt: true,
  cancelledAt: true,
  idempotencyKey: true,
  session: {
    select: {
      id: true,
      status: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      joinOpenAt: true,
      joinCloseAt: true,
      scheduleRevision: true,
      schedulePolicySnapshotJson: true,
      patient: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
      practitioner: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} as const;

function toUtcTimestamp(date: Date): string {
  return date.toISOString().slice(0, -1).replace('T', ' ');
}

export type SessionReminderQueueItem = Prisma.SessionReminderQueueGetPayload<{
  select: typeof dueReminderSelect;
}>;

export type ClaimedSessionReminderQueueItem = SessionReminderQueueItem & {
  claimToken: string;
  claimUntil: Date;
};

export type SessionReminderQueueCreateInput = {
  sessionId: string;
  recipientUserId: string;
  recipientRole: UserRoleType;
  reminderType: SessionReminderType;
  scheduleRevision: number;
  offsetMinutesSnapshot?: number | null;
  dueAt: Date;
  recipientTimezoneSnapshot?: string | null;
  recipientLocaleSnapshot?: string | null;
  idempotencyKey: string;
};

export type StageableSessionReminder = {
  id: string;
  reminderType: SessionReminderType;
  scheduleRevision: number;
  dueAt: Date;
};

@Injectable()
export class SessionReminderQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  scheduleMany(
    reminders: SessionReminderQueueCreateInput[],
    tx?: Prisma.TransactionClient,
  ) {
    if (reminders.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.getDb(tx).sessionReminderQueue.createMany({
      data: reminders,
      skipDuplicates: true,
    });
  }

  listDueReminders(input: { now: Date; limit: number }) {
    return this.prisma.sessionReminderQueue.findMany({
      where: {
        sentAt: null,
        cancelledAt: null,
        dueAt: {
          lte: input.now,
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: input.limit,
      select: dueReminderSelect,
    });
  }

  async listStageableReminders(input: {
    now: Date;
    horizonMinutes: number;
    lookbackMinutes: number;
    limit: number;
  }): Promise<StageableSessionReminder[]> {
    const lowerBound = new Date(
      input.now.getTime() - Math.max(0, input.lookbackMinutes) * 60_000,
    );
    const upperBound = new Date(
      input.now.getTime() + Math.max(0, input.horizonMinutes) * 60_000,
    );
    const candidates = await this.prisma.sessionReminderQueue.findMany({
      where: {
        sentAt: null,
        cancelledAt: null,
        dueAt: { gte: lowerBound, lte: upperBound },
        OR: sessionReminderClaimPriority.map((reminderType) => ({
          reminderType,
          dueAt: {
            gt: new Date(
              input.now.getTime() -
                getSessionReminderFreshnessWindowMs(reminderType),
            ),
          },
        })),
      },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      take: Math.max(1, Math.floor(input.limit)),
      select: {
        id: true,
        reminderType: true,
        scheduleRevision: true,
        dueAt: true,
      },
    });

    return candidates
      .filter(
        (candidate) =>
          input.now.getTime() <=
          candidate.dueAt.getTime() +
            getSessionReminderFreshnessWindowMs(candidate.reminderType),
      )
      .sort(
        (left, right) =>
          (sessionReminderStagePriority.get(left.reminderType) ?? 99) -
            (sessionReminderStagePriority.get(right.reminderType) ?? 99) ||
          left.dueAt.getTime() - right.dueAt.getTime() ||
          left.id.localeCompare(right.id),
      );
  }

  async claimDueReminders(input: {
    now: Date;
    limit: number;
    leaseDurationMs: number;
  }): Promise<{
    claimToken: string;
    claimUntil: Date;
    reminders: ClaimedSessionReminderQueueItem[];
  }> {
    const claimToken = randomUUID();
    const claimUntil = new Date(input.now.getTime() + input.leaseDurationMs);
    const nowUtcTimestamp = toUtcTimestamp(input.now);
    const claimUntilUtcTimestamp = toUtcTimestamp(claimUntil);
    const limit = Math.max(1, Math.floor(input.limit));

    return this.prisma.$transaction(async (tx) => {
      const claimedIds: Array<{ id: string }> = [];

      // Each branch has a fixed reminder type so the active priority index can
      // provide dueAt/id order without a CASE sort over the whole backlog.
      for (const reminderType of sessionReminderClaimPriority) {
        const remaining = limit - claimedIds.length;
        if (remaining <= 0) {
          break;
        }

        const candidates = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "SessionReminderQueue"
          WHERE "reminderType" = CAST(${reminderType} AS "SessionReminderType")
            AND "dueAt" <= ${nowUtcTimestamp}::timestamp
            AND "sentAt" IS NULL
            AND "cancelledAt" IS NULL
            AND ("claimUntil" IS NULL OR "claimUntil" <= ${nowUtcTimestamp}::timestamp)
          ORDER BY "dueAt" ASC, "id" ASC
          LIMIT ${remaining}
          FOR UPDATE SKIP LOCKED
        `);

        claimedIds.push(...candidates);
      }

      if (claimedIds.length > 0) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "SessionReminderQueue"
          SET "claimToken" = ${claimToken},
              "claimUntil" = ${claimUntilUtcTimestamp}::timestamp,
              "updatedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          WHERE "id" IN (${Prisma.join(
            claimedIds.map(({ id }) => Prisma.sql`${id}::uuid`),
          )})
        `);
      }

      if (claimedIds.length === 0) {
        return { claimToken, claimUntil, reminders: [] };
      }

      const reminders = await tx.sessionReminderQueue.findMany({
        where: {
          id: { in: claimedIds.map(({ id }) => id) },
          claimToken,
          sentAt: null,
          cancelledAt: null,
        },
        select: dueReminderSelect,
      });
      const remindersById = new Map(
        reminders.map((reminder) => [reminder.id, reminder]),
      );

      return {
        claimToken,
        claimUntil,
        reminders: claimedIds
          .map(({ id }) => remindersById.get(id))
          .filter((reminder): reminder is SessionReminderQueueItem =>
            Boolean(reminder),
          )
          .map((reminder) => ({
            ...reminder,
            claimToken,
            claimUntil,
          })),
      };
    });
  }

  findClaimedReminder(input: {
    reminderId: string;
    claimToken: string;
    now: Date;
  }): Promise<SessionReminderQueueItem | null> {
    return this.prisma.sessionReminderQueue.findFirst({
      where: {
        id: input.reminderId,
        claimToken: input.claimToken,
        claimUntil: { gt: input.now },
        sentAt: null,
        cancelledAt: null,
      },
      select: dueReminderSelect,
    });
  }

  async claimReminderById(input: {
    reminderId: string;
    scheduleRevision: number;
    now: Date;
    leaseDurationMs: number;
  }): Promise<ClaimedSessionReminderQueueItem | null> {
    const claimToken = randomUUID();
    const claimUntil = new Date(input.now.getTime() + input.leaseDurationMs);
    const nowUtcTimestamp = toUtcTimestamp(input.now);
    const claimUntilUtcTimestamp = toUtcTimestamp(claimUntil);

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "SessionReminderQueue"
        WHERE "id" = ${input.reminderId}::uuid
          AND "scheduleRevision" = ${input.scheduleRevision}
          AND "dueAt" <= ${nowUtcTimestamp}::timestamp
          AND "sentAt" IS NULL
          AND "cancelledAt" IS NULL
          AND ("claimUntil" IS NULL OR "claimUntil" <= ${nowUtcTimestamp}::timestamp)
        FOR UPDATE SKIP LOCKED
      `);
      if (candidates.length === 0) return null;

      await tx.$executeRaw(Prisma.sql`
        UPDATE "SessionReminderQueue"
        SET "claimToken" = ${claimToken},
            "claimUntil" = ${claimUntilUtcTimestamp}::timestamp,
            "updatedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        WHERE "id" = ${input.reminderId}::uuid
      `);

      const reminder = await tx.sessionReminderQueue.findFirst({
        where: {
          id: input.reminderId,
          claimToken,
          sentAt: null,
          cancelledAt: null,
        },
        select: dueReminderSelect,
      });
      return reminder ? { ...reminder, claimToken, claimUntil } : null;
    });
  }

  markSent(
    input: { reminderId: string; sentAt: Date; claimToken?: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReminderQueue.updateMany({
      where: {
        id: input.reminderId,
        sentAt: null,
        cancelledAt: null,
        ...(input.claimToken ? { claimToken: input.claimToken } : {}),
      },
      data: {
        sentAt: input.sentAt,
        claimToken: null,
        claimUntil: null,
      },
    });
  }

  cancelReminder(
    input: { reminderId: string; cancelledAt: Date; claimToken?: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReminderQueue.updateMany({
      where: {
        id: input.reminderId,
        sentAt: null,
        cancelledAt: null,
        ...(input.claimToken ? { claimToken: input.claimToken } : {}),
      },
      data: {
        cancelledAt: input.cancelledAt,
        claimToken: null,
        claimUntil: null,
      },
    });
  }

  cancelFutureBySessionId(
    input: { sessionId: string; cancelledAt: Date },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReminderQueue.updateMany({
      where: {
        sessionId: input.sessionId,
        sentAt: null,
        cancelledAt: null,
      },
      data: {
        cancelledAt: input.cancelledAt,
        claimToken: null,
        claimUntil: null,
      },
    });
  }

  async replaceSessionPlan(input: {
    sessionId: string;
    reminders: SessionReminderQueueCreateInput[];
    cancelledAt: Date;
    schedulePolicySnapshot?: Prisma.InputJsonValue | null;
    joinOpenAt?: Date | null;
    joinCloseAt?: Date | null;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (
        input.schedulePolicySnapshot !== undefined ||
        input.joinOpenAt !== undefined ||
        input.joinCloseAt !== undefined
      ) {
        await tx.session.update({
          where: { id: input.sessionId },
          data: {
            ...(input.schedulePolicySnapshot !== undefined
              ? {
                  schedulePolicySnapshotJson:
                    input.schedulePolicySnapshot === null
                      ? Prisma.JsonNull
                      : input.schedulePolicySnapshot,
                }
              : {}),
            ...(input.joinOpenAt !== undefined
              ? { joinOpenAt: input.joinOpenAt }
              : {}),
            ...(input.joinCloseAt !== undefined
              ? { joinCloseAt: input.joinCloseAt }
              : {}),
          },
        });
      }
      await tx.sessionReminderQueue.updateMany({
        where: {
          sessionId: input.sessionId,
          sentAt: null,
          cancelledAt: null,
        },
        data: {
          cancelledAt: input.cancelledAt,
          claimToken: null,
          claimUntil: null,
        },
      });
      if (input.reminders.length > 0) {
        await tx.sessionReminderQueue.createMany({
          data: input.reminders,
          skipDuplicates: true,
        });
      }
    });
  }

  hasParticipantJoined(input: {
    sessionId: string;
    recipientUserId: string;
  }): Promise<boolean> {
    return this.prisma.sessionEvent
      .findFirst({
        where: {
          sessionId: input.sessionId,
          actorUserId: input.recipientUserId,
          eventType: 'JOIN_ALLOWED',
        },
        select: { id: true },
      })
      .then(async (joinAllowed) => {
        if (joinAllowed) return true;
        const attendance = await this.prisma.sessionAttendanceEvent.findFirst({
          where: {
            sessionId: input.sessionId,
            participantUserId: input.recipientUserId,
            attendanceEventType: 'JOINED',
          },
          select: { id: true },
        });
        return Boolean(attendance);
      });
  }
}
