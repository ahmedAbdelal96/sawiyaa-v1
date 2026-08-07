import { Injectable } from '@nestjs/common';
import { Prisma, SessionReminderType, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

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

export type SessionReminderQueueItem = Prisma.SessionReminderQueueGetPayload<{
  select: typeof dueReminderSelect;
}>;

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

  markSent(input: { reminderId: string; sentAt: Date }, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).sessionReminderQueue.updateMany({
      where: {
        id: input.reminderId,
        sentAt: null,
        cancelledAt: null,
      },
      data: {
        sentAt: input.sentAt,
      },
    });
  }

  cancelReminder(
    input: { reminderId: string; cancelledAt: Date },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReminderQueue.updateMany({
      where: {
        id: input.reminderId,
        sentAt: null,
        cancelledAt: null,
      },
      data: {
        cancelledAt: input.cancelledAt,
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
            ...(input.joinOpenAt !== undefined ? { joinOpenAt: input.joinOpenAt } : {}),
            ...(input.joinCloseAt !== undefined ? { joinCloseAt: input.joinCloseAt } : {}),
          },
        });
      }
      await tx.sessionReminderQueue.updateMany({
        where: {
          sessionId: input.sessionId,
          sentAt: null,
          cancelledAt: null,
        },
        data: { cancelledAt: input.cancelledAt },
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
