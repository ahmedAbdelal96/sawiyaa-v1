import { BadRequestException, Injectable } from '@nestjs/common';
import {
  WeeklyAvailabilityDurationMinutes,
  WeeklyAvailabilitySlotDraftInput,
  WeeklyAvailabilitySlotInput,
} from '../types/availability.types';

/**
 * Overlap validation stays isolated from controllers so recurring schedule rules remain reusable.
 * V1 enforces 30-minute granularity to keep recurring slot generation predictable.
 */
@Injectable()
export class ValidateAvailabilityOverlapService {
  private readonly minimumGranularityMinutes = 30;

  validateWeeklySlots(
    slots: WeeklyAvailabilitySlotDraftInput[],
  ): WeeklyAvailabilitySlotInput[] {
    const normalized: WeeklyAvailabilitySlotInput[] = slots.map((slot) => ({
      ...slot,
      durationMinutes: this.normalizeDuration(slot.durationMinutes),
    }));

    const groupedByDayAndDuration = new Map<
      string,
      WeeklyAvailabilitySlotInput[]
    >();

    for (const slot of normalized) {
      this.validateMinuteRange(slot);

      const groupedKey = `${slot.dayOfWeek}:${slot.durationMinutes}`;
      const grouped = groupedByDayAndDuration.get(groupedKey) ?? [];
      grouped.push(slot);
      groupedByDayAndDuration.set(groupedKey, grouped);
    }

    for (const [groupedKey, daySlots] of groupedByDayAndDuration.entries()) {
      const ordered = [...daySlots].sort(
        (left, right) =>
          left.startMinuteOfDay - right.startMinuteOfDay ||
          left.endMinuteOfDay - right.endMinuteOfDay,
      );

      const [dayOfWeek] = groupedKey.split(':');

      for (let index = 1; index < ordered.length; index += 1) {
        const previous = ordered[index - 1];
        const current = ordered[index];

        if (current.startMinuteOfDay < previous.endMinuteOfDay) {
          throw new BadRequestException({
            messageKey: 'availability.errors.overlappingWeeklySlots',
            error: 'AVAILABILITY_WEEKLY_OVERLAP',
            messageParams: {
              dayOfWeek: Number(dayOfWeek),
            },
          });
        }
      }
    }

    return normalized;
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
    if (slot.durationMinutes !== 30 && slot.durationMinutes !== 60) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidDurationMinutes',
        error: 'AVAILABILITY_INVALID_DURATION_MINUTES',
      });
    }

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

    const durationMinutes =
      slot.endMinuteOfDay - slot.startMinuteOfDay;

    if (durationMinutes !== slot.durationMinutes) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidWeeklySlotDuration',
        error: 'AVAILABILITY_INVALID_WEEKLY_SLOT_DURATION',
      });
    }
  }

  private normalizeDuration(
    durationMinutes?: WeeklyAvailabilityDurationMinutes,
  ): WeeklyAvailabilityDurationMinutes {
    return durationMinutes === undefined ? 30 : durationMinutes;
  }

}
