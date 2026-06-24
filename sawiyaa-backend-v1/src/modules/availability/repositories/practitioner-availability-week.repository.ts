import { Injectable } from '@nestjs/common';
import {
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

export type PractitionerAvailabilityWeekWithSlots =
  Prisma.PractitionerAvailabilityWeekGetPayload<{
    include: {
      slots: true;
    };
  }>;

@Injectable()
export class PractitionerAvailabilityWeekRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPractitionerAndWeekStartDate(
    practitionerId: string,
    weekStartDate: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeek.findFirst({
      where: {
        practitionerId,
        weekStartDate,
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }

  findByIdForPractitioner(
    practitionerId: string,
    weekId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeek.findFirst({
      where: {
        id: weekId,
        practitionerId,
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }

  findManyByPractitionerAndWeekStarts(
    practitionerId: string,
    weekStartDates: Date[],
    tx?: Prisma.TransactionClient,
  ) {
    if (weekStartDates.length === 0) {
      return Promise.resolve([] as PractitionerAvailabilityWeekWithSlots[]);
    }

    return this.getDb(tx).practitionerAvailabilityWeek.findMany({
      where: {
        practitionerId,
        weekStartDate: {
          in: weekStartDates,
        },
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });
  }

  findPublishedByPractitionerAndWeekStarts(
    practitionerId: string,
    weekStartDates: Date[],
    tx?: Prisma.TransactionClient,
  ) {
    if (weekStartDates.length === 0) {
      return Promise.resolve([] as PractitionerAvailabilityWeekWithSlots[]);
    }

    return this.getDb(tx).practitionerAvailabilityWeek.findMany({
      where: {
        practitionerId,
        status: AvailabilityWeekStatus.PUBLISHED,
        weekStartDate: {
          in: weekStartDates,
        },
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });
  }

  createDraftWeek(
    input: {
      practitionerId: string;
      weekStartDate: Date;
      weekEndDate: Date;
      timezone: string;
      status?: AvailabilityWeekStatus;
      copiedFromWeekId?: string | null;
      slots?: Array<{
        weekday: AvailabilityWeekday;
        startMinuteOfDay: number;
        endMinuteOfDay: number;
        durationMinutes: number;
        timezone: string;
      }>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeek.create({
      data: {
        practitionerId: input.practitionerId,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        timezone: input.timezone,
        status: input.status ?? AvailabilityWeekStatus.DRAFT,
        copiedFromWeekId: input.copiedFromWeekId ?? null,
        slots: input.slots?.length
          ? {
              createMany: {
                data: input.slots,
              },
            }
          : undefined,
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }

  updateWeek(
    weekId: string,
    input: {
      timezone?: string;
      status?: AvailabilityWeekStatus;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
      copiedFromWeekId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeek.update({
      where: {
        id: weekId,
      },
      data: {
        timezone: input.timezone,
        status: input.status,
        publishedAt: input.publishedAt,
        archivedAt: input.archivedAt,
        copiedFromWeekId: input.copiedFromWeekId,
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }

  replaceWeekSlots(
    weekId: string,
    timezone: string,
    slots: Array<{
      weekday: AvailabilityWeekday;
      startMinuteOfDay: number;
      endMinuteOfDay: number;
      durationMinutes: number;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);

    return Promise.resolve()
      .then(() =>
        db.practitionerAvailabilityWeekSlot.deleteMany({
          where: {
            weekId,
          },
        }),
      )
      .then(() => {
        if (slots.length > 0) {
          return db.practitionerAvailabilityWeekSlot.createMany({
            data: slots.map((slot) => ({
              weekId,
              weekday: slot.weekday,
              startMinuteOfDay: slot.startMinuteOfDay,
              endMinuteOfDay: slot.endMinuteOfDay,
              durationMinutes: slot.durationMinutes,
              timezone,
            })),
          });
        }

        return undefined;
      })
      .then(() =>
        db.practitionerAvailabilityWeek.findUniqueOrThrow({
          where: {
            id: weekId,
          },
          include: {
            slots: {
              orderBy: [
                { weekday: 'asc' },
                { startMinuteOfDay: 'asc' },
                { endMinuteOfDay: 'asc' },
              ],
            },
          },
        }),
      );
  }

  replaceWeekTimezone(
    weekId: string,
    timezone: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeek.update({
      where: {
        id: weekId,
      },
      data: {
        timezone,
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }

  syncWeekSlotsTimezone(
    weekId: string,
    timezone: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerAvailabilityWeekSlot.updateMany({
      where: {
        weekId,
      },
      data: {
        timezone,
      },
    });
  }

  updateDraftWeekSlots(
    weekId: string,
    timezone: string,
    slots: Array<{
      weekday: AvailabilityWeekday;
      startMinuteOfDay: number;
      endMinuteOfDay: number;
      durationMinutes: number;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);

    return Promise.resolve()
      .then(() =>
        db.practitionerAvailabilityWeekSlot.deleteMany({
          where: {
            weekId,
          },
        }),
      )
      .then(() => {
        if (slots.length > 0) {
          return db.practitionerAvailabilityWeekSlot.createMany({
            data: slots.map((slot) => ({
              weekId,
              weekday: slot.weekday,
              startMinuteOfDay: slot.startMinuteOfDay,
              endMinuteOfDay: slot.endMinuteOfDay,
              durationMinutes: slot.durationMinutes,
              timezone,
            })),
          });
        }

        return undefined;
      })
      .then(() =>
        db.practitionerAvailabilityWeek.findUniqueOrThrow({
          where: {
            id: weekId,
          },
          include: {
            slots: {
              orderBy: [
                { weekday: 'asc' },
                { startMinuteOfDay: 'asc' },
                { endMinuteOfDay: 'asc' },
              ],
            },
          },
        }),
      );
  }

  async publishWeek(
    weekId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PractitionerAvailabilityWeekWithSlots> {
    return this.getDb(tx).practitionerAvailabilityWeek.update({
      where: {
        id: weekId,
      },
      data: {
        status: AvailabilityWeekStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        slots: {
          orderBy: [
            { weekday: 'asc' },
            { startMinuteOfDay: 'asc' },
            { endMinuteOfDay: 'asc' },
          ],
        },
      },
    });
  }
}
