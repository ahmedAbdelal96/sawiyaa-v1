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
  dueAt: true,
  sentAt: true,
  cancelledAt: true,
  idempotencyKey: true,
  session: {
    select: {
      id: true,
      status: true,
      scheduledStartAt: true,
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
  dueAt: Date;
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
}
