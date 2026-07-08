import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionStatus, AvailabilityWeekday } from '@prisma/client';
import { BLOCKING_SESSION_STATUSES } from '../utils/availability-session.constants';
import {
  getCalendarDateParts,
  addDaysToCalendarDate,
  zonedDateTimeToUtc,
} from '../utils/availability-timezone.util';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';

export interface SlotSignature {
  weekday: AvailabilityWeekday;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: number;
}

export interface SlotEditabilityMetadata {
  signature: string;
  canEdit: boolean;
  canRemove: boolean;
  isPast: boolean;
  isBookedOrReserved: boolean;
  reasonCode?: 'PAST' | 'BOOKED' | 'ARCHIVED';
}

@Injectable()
export class AvailabilitySlotEditabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateEditability(input: {
    practitionerId: string;
    weekStartDate: Date;
    weekEndDate: Date;
    timezone: string;
    slots: SlotSignature[];
    isArchived?: boolean;
    now?: Date;
  }): Promise<Map<string, SlotEditabilityMetadata>> {
    const now = input.now ?? new Date();
    const result = new Map<string, SlotEditabilityMetadata>();

    if (input.isArchived) {
      for (const slot of input.slots) {
        const sig = this.getSignature(slot);
        result.set(sig, {
          signature: sig,
          canEdit: false,
          canRemove: false,
          isPast: true,
          isBookedOrReserved: false,
          reasonCode: 'ARCHIVED',
        });
      }
      return result;
    }

    // Pad range check by 2 days on each side to safely cover all timezone alignments
    const paddingStart = new Date(input.weekStartDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const paddingEnd = new Date(input.weekEndDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.session.findMany({
      where: {
        practitionerId: input.practitionerId,
        scheduledStartAt: {
          lt: paddingEnd,
        },
        scheduledEndAt: {
          gt: paddingStart,
        },
        OR: [
          {
            status: {
              in: BLOCKING_SESSION_STATUSES,
            },
          },
          {
            status: SessionStatus.PENDING_PAYMENT,
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      select: {
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });

    const weekStart = getCalendarDateParts(input.weekStartDate, 'UTC');

    for (const slot of input.slots) {
      const localDate = addDaysToCalendarDate(
        weekStart,
        WEEKDAY_ENUM_TO_INDEX[slot.weekday],
      );
      const startsAt = zonedDateTimeToUtc(
        {
          ...localDate,
          hour: Math.floor(slot.startMinuteOfDay / 60),
          minute: slot.startMinuteOfDay % 60,
        },
        input.timezone,
      );
      const endsAt = zonedDateTimeToUtc(
        {
          ...localDate,
          hour: Math.floor(slot.endMinuteOfDay / 60),
          minute: slot.endMinuteOfDay % 60,
        },
        input.timezone,
      );

      const isPast = startsAt.getTime() < now.getTime();
      const hasConflict = sessions.some(
        (session) =>
          session.scheduledStartAt!.getTime() < endsAt.getTime() &&
          session.scheduledEndAt!.getTime() > startsAt.getTime(),
      );

      const isBookedOrReserved = hasConflict;
      const canEdit = !isPast && !isBookedOrReserved;
      const canRemove = !isPast && !isBookedOrReserved;

      let reasonCode: 'PAST' | 'BOOKED' | undefined;
      if (isPast) {
        reasonCode = 'PAST';
      } else if (isBookedOrReserved) {
        reasonCode = 'BOOKED';
      }

      const sig = this.getSignature(slot);
      result.set(sig, {
        signature: sig,
        canEdit,
        canRemove,
        isPast,
        isBookedOrReserved,
        reasonCode,
      });
    }

    return result;
  }

  getSignature(slot: SlotSignature): string {
    return `${WEEKDAY_ENUM_TO_INDEX[slot.weekday]}_${slot.durationMinutes}_${slot.startMinuteOfDay}_${slot.endMinuteOfDay}`;
  }
}