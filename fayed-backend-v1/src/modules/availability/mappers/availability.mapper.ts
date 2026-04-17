import { Injectable } from '@nestjs/common';
import { AvailabilityException, AvailabilitySlot } from '@prisma/client';
import {
  AvailabilityCombinedViewModel,
  AvailabilityExceptionViewModel,
  WeeklyAvailabilitySlotViewModel,
} from '../types/availability.types';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';

/**
 * AvailabilityMapper stabilizes external response contracts.
 * Controllers never expose Prisma records directly so the module can evolve without leaking persistence details.
 */
@Injectable()
export class AvailabilityMapper {
  toWeeklySlot(slot: AvailabilitySlot): WeeklyAvailabilitySlotViewModel {
    return {
      id: slot.id,
      dayOfWeek: WEEKDAY_ENUM_TO_INDEX[slot.weekday],
      weekday: slot.weekday,
      startMinuteOfDay: slot.startMinuteOfDay,
      endMinuteOfDay: slot.endMinuteOfDay,
      timezone: slot.timezone,
      isActive: slot.isActive,
      effectiveFrom: slot.effectiveFrom?.toISOString().slice(0, 10) ?? null,
      effectiveTo: slot.effectiveTo?.toISOString().slice(0, 10) ?? null,
    };
  }

  toException(exception: AvailabilityException): AvailabilityExceptionViewModel {
    return {
      id: exception.id,
      type: exception.type,
      startsAt: exception.startsAtUtc.toISOString(),
      endsAt: exception.endsAtUtc.toISOString(),
      reason: exception.reason ?? null,
      source: exception.source,
      isActive: exception.isActive,
    };
  }

  toCombinedViewModel(input: {
    timezone: string;
    weeklySlots: AvailabilitySlot[];
    exceptions: AvailabilityException[];
  }): AvailabilityCombinedViewModel {
    return {
      timezone: input.timezone,
      weeklySlots: input.weeklySlots.map((slot) => this.toWeeklySlot(slot)),
      exceptions: input.exceptions.map((exception) => this.toException(exception)),
    };
  }
}
