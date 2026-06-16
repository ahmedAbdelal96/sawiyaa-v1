import { Injectable } from '@nestjs/common';
import { AvailabilitySlot, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * AvailabilitySlotRepository owns recurring weekly slot persistence only.
 * Replace operations remain transactional so weekly schedule state never lands half-written.
 */
@Injectable()
export class AvailabilitySlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listActiveByPractitioner(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilitySlot.findMany({
      where: {
        practitionerId,
        isActive: true,
      },
      orderBy: [
        { weekday: 'asc' },
        { durationMinutes: 'asc' },
        { startMinuteOfDay: 'asc' },
        { endMinuteOfDay: 'asc' },
      ],
    });
  }

  listActiveByPractitioners(
    practitionerIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (practitionerIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(tx).availabilitySlot.findMany({
      where: {
        practitionerId: {
          in: practitionerIds,
        },
        isActive: true,
      },
      orderBy: [
        { practitionerId: 'asc' },
        { weekday: 'asc' },
        { durationMinutes: 'asc' },
        { startMinuteOfDay: 'asc' },
        { endMinuteOfDay: 'asc' },
      ],
    });
  }

  replaceWeeklySlots(
    practitionerId: string,
    timezone: string,
    slots: Array<{
      weekday: AvailabilitySlot['weekday'];
      durationMinutes: AvailabilitySlot['durationMinutes'];
      startMinuteOfDay: number;
      endMinuteOfDay: number;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.deleteMany({
        where: {
          practitionerId,
        },
      });

      if (slots.length > 0) {
        await tx.availabilitySlot.createMany({
          data: slots.map((slot) => ({
            practitionerId,
            weekday: slot.weekday,
            durationMinutes: slot.durationMinutes,
            startMinuteOfDay: slot.startMinuteOfDay,
            endMinuteOfDay: slot.endMinuteOfDay,
            timezone,
            isActive: true,
          })),
        });
      }

      return this.listActiveByPractitioner(practitionerId, tx);
    });
  }
}
