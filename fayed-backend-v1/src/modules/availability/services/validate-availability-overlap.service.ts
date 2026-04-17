import { BadRequestException, Injectable } from '@nestjs/common';
import { WeeklyAvailabilitySlotInput } from '../types/availability.types';

/**
 * Overlap validation stays isolated from controllers so recurring schedule rules remain reusable.
 * V1 enforces 15-minute granularity to keep later slot generation predictable.
 */
@Injectable()
export class ValidateAvailabilityOverlapService {
  private readonly minimumGranularityMinutes = 15;

  validateWeeklySlots(slots: WeeklyAvailabilitySlotInput[]): void {
    const groupedByDay = new Map<number, WeeklyAvailabilitySlotInput[]>();

    for (const slot of slots) {
      this.validateMinuteRange(slot);

      const grouped = groupedByDay.get(slot.dayOfWeek) ?? [];
      grouped.push(slot);
      groupedByDay.set(slot.dayOfWeek, grouped);
    }

    for (const [dayOfWeek, daySlots] of groupedByDay.entries()) {
      const ordered = [...daySlots].sort(
        (left, right) =>
          left.startMinuteOfDay - right.startMinuteOfDay ||
          left.endMinuteOfDay - right.endMinuteOfDay,
      );

      for (let index = 1; index < ordered.length; index += 1) {
        const previous = ordered[index - 1];
        const current = ordered[index];

        if (current.startMinuteOfDay < previous.endMinuteOfDay) {
          throw new BadRequestException({
            messageKey: 'availability.errors.overlappingWeeklySlots',
            error: 'AVAILABILITY_WEEKLY_OVERLAP',
            messageParams: {
              dayOfWeek,
            },
          });
        }
      }
    }
  }

  validateExceptionRange(startsAtUtc: Date, endsAtUtc: Date): void {
    if (endsAtUtc.getTime() <= startsAtUtc.getTime()) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidExceptionRange',
        error: 'AVAILABILITY_INVALID_EXCEPTION_RANGE',
      });
    }
  }

  private validateMinuteRange(slot: WeeklyAvailabilitySlotInput): void {
    if (slot.endMinuteOfDay <= slot.startMinuteOfDay) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidWeeklySlotRange',
        error: 'AVAILABILITY_INVALID_WEEKLY_SLOT_RANGE',
      });
    }

    if (
      slot.startMinuteOfDay % this.minimumGranularityMinutes !== 0 ||
      slot.endMinuteOfDay % this.minimumGranularityMinutes !== 0
    ) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidGranularity',
        error: 'AVAILABILITY_INVALID_GRANULARITY',
      });
    }
  }
}
